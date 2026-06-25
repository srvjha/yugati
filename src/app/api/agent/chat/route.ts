import { auth } from '@/lib/auth';
import { streamChat } from '@/features/agent/agent';
import { initCorsair } from '@/server/corsair';
import { headers } from 'next/headers';
import { rateLimiters, demoIpLimiter } from '@/lib/rate-limit';
import { checkAndIncrement, getUserPlan } from '@/lib/usage';
import { PLANS } from '@/lib/plans';
import type { PlanId } from '@/lib/plans';
import { z } from 'zod';
import { db } from '@/server/db';
import { user } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const maxDuration = 60;

const chatMessageSchema = z.object({
  role:    z.enum(['user', 'assistant']),
  content: z.string().max(20_000),
});

const bodySchema = z.object({
  messages:       z.array(chatMessageSchema).min(1).max(100),
  conversationId: z.string().uuid().optional(),
  agentMode:      z.enum(['guided', 'auto']).optional(),
  skipGuardrail:  z.boolean().optional(),
});

const enc = new TextEncoder();
function sse(payload: Record<string, unknown>) {
  return enc.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function POST(request: Request) {
  await initCorsair();

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid request body' }, { status: 400 });
  const { messages, conversationId, agentMode, skipGuardrail } = parsed.data;

  const u = await db.query.user.findFirst({ where: eq(user.id, session.user.id), columns: { banned: true } });
  if (u?.banned) return Response.json({ error: 'Account suspended' }, { status: 403 });

  // Demo account is shared — apply per-IP cap (5 requests / 2 hours) to prevent one visitor from burning all credits.
  if (session.user.email === 'yugati09@gmail.com') {
    const hdrs = await headers();
    const ip   = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim()
               ?? hdrs.get('x-real-ip')
               ?? 'unknown';
    const { success: ipOk, reset: ipReset } = await demoIpLimiter.limit(ip);
    if (!ipOk) {
      const retryMins = Math.ceil((ipReset - Date.now()) / 60_000);
      return Response.json(
        { error: `Demo limit reached — 5 AI requests per 2 hours. Try again in ${retryMins} minute${retryMins === 1 ? '' : 's'}.` },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((ipReset - Date.now()) / 1000)) } },
      );
    }
  }

  // Per-plan character limit
  const userPlan  = await getUserPlan(session.user.id);
  const planId    = (userPlan.plan ?? 'free') as PlanId;
  const charLimit = PLANS[planId].charLimit;
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  if (lastUserMsg && lastUserMsg.content.length > charLimit) {
    return Response.json(
      { error: `Message too long. Your ${PLANS[planId].name} plan allows up to ${charLimit} characters.` },
      { status: 400 },
    );
  }

  // Per-plan rate limit
  const { success, limit, reset } = await rateLimiters[planId].limit(session.user.id);
  if (!success) {
    const retryAfterSec = Math.ceil((reset - Date.now()) / 1000);
    return Response.json(
      { error: `Too many requests — ${limit} req/min limit reached. Try again in ${retryAfterSec}s.` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    );
  }

  // Monthly message quota
  const usage = await checkAndIncrement(session.user.id, 'messagesUsed');
  if (!usage.allowed) {
    return Response.json(
      { error: `Monthly limit reached. You've used all ${usage.limit} messages on the ${PLANS[planId].name} plan. Upgrade to continue.` },
      { status: 429 },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const hdrs = await headers();
        const meta = {
          ipAddress: hdrs.get('x-forwarded-for') ?? hdrs.get('x-real-ip') ?? undefined,
          userAgent: hdrs.get('user-agent') ?? undefined,
        };

        const gen = streamChat(
          session.user.id, messages, conversationId,
          session.user.name ?? undefined, agentMode ?? 'guided', meta,
          skipGuardrail ?? false,
        );

        // 55s deadline — multi-step tasks (e.g. summarise 5 emails) need 6+ tool calls
        const deadline = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Agent timed out — please try again.')), 55_000)
        );

        while (true) {
          const { done, value } = await Promise.race([gen.next(), deadline]);
          if (done) break;
          controller.enqueue(sse(value));
          // Terminal events — stop iterating after emitting
          if (value.type === 'done' || value.type === 'blocked' || value.type === 'error') break;
        }
      } catch (err) {
        console.error('[agent/chat] unhandled error:', err);
        controller.enqueue(sse({ type: 'error', message: err instanceof Error ? err.message : 'Internal server error' }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
