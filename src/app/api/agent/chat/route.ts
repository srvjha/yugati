import { auth } from '@/lib/auth';
import { runChat } from '@/features/agent/agent';
import type { ChatMessage } from '@/features/agent/types';
import { initCorsair } from '@/server/corsair';
import { headers } from 'next/headers';

export const runtime = 'nodejs';

const enc = new TextEncoder();
function sse(payload: Record<string, unknown>) {
  return enc.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function POST(request: Request) {
  await initCorsair();

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { messages, conversationId } = await request.json() as {
    messages:        ChatMessage[];
    conversationId?: string;
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await runChat(
          session.user.id,
          messages,
          conversationId,
          session.user.name ?? undefined,
        );

        if (result.status === 'blocked') {
          controller.enqueue(sse({ type: 'blocked', reason: result.reason, conversationId: result.conversationId }));
          controller.close();
          return;
        }

        if (result.status === 'error') {
          controller.enqueue(sse({ type: 'error', message: result.message }));
          controller.close();
          return;
        }

        // Stream the output in chunks so the UI renders progressively
        const text = result.output;
        const CHUNK = 10;
        for (let i = 0; i < text.length; i += CHUNK) {
          controller.enqueue(sse({ type: 'delta', text: text.slice(i, i + CHUNK) }));
          await new Promise((r) => setTimeout(r, 4));
        }

        controller.enqueue(sse({ type: 'done', conversationId: result.conversationId }));
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
