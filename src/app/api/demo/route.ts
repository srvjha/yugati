import { NextResponse }  from 'next/server';
import { randomUUID }    from 'crypto';
import { eq, and }       from 'drizzle-orm';
import { hashPassword }  from 'better-auth/crypto';
import { db }            from '@/server/db';
import { user, account, userPlans } from '@/server/db/schema';

const DEMO_EMAIL    = 'yugati09@gmail.com';
const DEMO_PASSWORD = 'Yug@ti#0179';

export async function GET(request: Request) {
  const origin  = new URL(request.url).origin;

  // 1. Find demo user
  const [demoUser] = await db.select().from(user).where(eq(user.email, DEMO_EMAIL)).limit(1);
  if (!demoUser) {
    return NextResponse.redirect(new URL('/?demo=notfound', origin));
  }

  const now     = new Date();
  const yearOut = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  // 2. Ensure admin role + premium plan (idempotent)
  await db.update(user).set({ role: 'admin', updatedAt: now }).where(eq(user.id, demoUser.id));

  const [plan] = await db.select({ id: userPlans.id }).from(userPlans).where(eq(userPlans.userId, demoUser.id)).limit(1);
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

  // 3. Ensure credential account exists
  const [cred] = await db.select({ id: account.id }).from(account)
    .where(and(eq(account.userId, demoUser.id), eq(account.providerId, 'credential'))).limit(1);
  if (!cred) {
    const hashed = await hashPassword(DEMO_PASSWORD);
    await db.insert(account).values({
      id: randomUUID(), accountId: demoUser.id, providerId: 'credential',
      userId: demoUser.id, password: hashed, createdAt: now, updatedAt: now,
    });
  }

  // 4. Let better-auth do the sign-in — it handles session creation and cookie signing
  const signInRes = await fetch(`${origin}/api/auth/sign-in/email`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': origin },
    body:    JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
    // @ts-expect-error: duplex is required for streaming bodies in some runtimes
    duplex: 'half',
  });

  if (!signInRes.ok) {
    return NextResponse.redirect(new URL('/?demo=error', origin));
  }

  // 5. Forward the Set-Cookie from better-auth's response, then redirect
  const res = NextResponse.redirect(new URL('/dashboard', origin));
  const setCookieHeaders = signInRes.headers.getSetCookie?.() ?? [signInRes.headers.get('set-cookie') ?? ''];
  for (const cookie of setCookieHeaders.filter(Boolean)) {
    res.headers.append('set-cookie', cookie);
  }
  return res;
}
