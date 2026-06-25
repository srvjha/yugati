import { NextResponse }                from 'next/server';
import { randomUUID }                  from 'crypto';
import { eq, and }                     from 'drizzle-orm';
import { hashPassword }                from 'better-auth/crypto';
import { db }                          from '@/server/db';
import { user, session, account, userPlans } from '@/server/db/schema';
import { env }                         from '@/env';

const DEMO_EMAIL    = 'yugati09@gmail.com';
const DEMO_PASSWORD = 'Yug@ti#0179';
const BASE_URL      = env.NEXT_PUBLIC_APP_URL;
const SECRET        = env.BETTER_AUTH_SECRET;
const COOKIE_NAME   = 'better-auth.session_token';

// Signs a cookie value the same way better-call does (HMAC-SHA256 + btoa)
async function signCookieValue(value: string, secret: string): Promise<string> {
  const key    = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  const sig    = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  return encodeURIComponent(`${value}.${sig}`);
}

export async function GET(request: Request) {
  // 1. Find demo user
  const [demoUser] = await db.select().from(user).where(eq(user.email, DEMO_EMAIL)).limit(1);
  if (!demoUser) {
    return NextResponse.redirect(new URL('/?demo=notfound', BASE_URL));
  }

  const now     = new Date();
  const yearOut = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  // 2. Upgrade to admin + premium (idempotent)
  await db.update(user).set({ role: 'admin', updatedAt: now }).where(eq(user.id, demoUser.id));

  const [plan] = await db.select().from(userPlans).where(eq(userPlans.userId, demoUser.id)).limit(1);
  if (plan) {
    await db.update(userPlans)
      .set({ plan: 'premium', subscriptionStatus: 'active', currentPeriodEnd: yearOut, updatedAt: now })
      .where(eq(userPlans.userId, demoUser.id));
  } else {
    await db.insert(userPlans).values({
      id: randomUUID(), userId: demoUser.id, plan: 'premium',
      messagesUsed: 0, voiceUsed: 0, composeUsed: 0,
      usageResetAt: yearOut, subscriptionStatus: 'active', currentPeriodEnd: yearOut,
    });
  }

  // 3. Ensure credential account exists (enables email+password login too)
  const [cred] = await db.select().from(account)
    .where(and(eq(account.userId, demoUser.id), eq(account.providerId, 'credential'))).limit(1);
  if (!cred) {
    const hashed = await hashPassword(DEMO_PASSWORD);
    await db.insert(account).values({
      id: randomUUID(), accountId: demoUser.id, providerId: 'credential',
      userId: demoUser.id, password: hashed, createdAt: now, updatedAt: now,
    });
  }

  // 4. Create a 7-day session in the DB
  const token     = randomUUID();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(session).values({
    id: randomUUID(), token, userId: demoUser.id,
    expiresAt, createdAt: now, updatedAt: now,
    userAgent: request.headers.get('user-agent') ?? undefined,
  });

  // 5. Sign the token (matches better-call's signCookieValue format) and set cookie
  const cookieValue = await signCookieValue(token, SECRET);
  const res         = NextResponse.redirect(new URL('/dashboard', BASE_URL));
  res.headers.set('Set-Cookie',
    `${COOKIE_NAME}=${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
  );
  return res;
}
