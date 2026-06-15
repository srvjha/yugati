import { db }        from '@/server/db';
import { userPlans }  from '@/server/db/schema';
import { eq }         from 'drizzle-orm';
import { PLANS }      from '@/lib/plans';
import type { PlanId } from '@/lib/plans';

function nextResetDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Returns the user's plan row, creating a free-plan row if it doesn't exist yet.
export async function getUserPlan(userId: string) {
  let row = await db.query.userPlans.findFirst({ where: eq(userPlans.userId, userId) });

  if (!row) {
    const id = uid();
    await db.insert(userPlans).values({
      id,
      userId,
      plan:         'free',
      messagesUsed: 0,
      voiceUsed:    0,
      composeUsed:  0,
      usageResetAt: nextResetDate(),
    });
    row = await db.query.userPlans.findFirst({ where: eq(userPlans.userId, userId) });
  }

  return row!;
}

type UsageField = 'messagesUsed' | 'voiceUsed' | 'composeUsed';

// Checks quota and increments the counter atomically.
// Returns { allowed, used, limit } so the caller can surface the right error.
export async function checkAndIncrement(userId: string, field: UsageField) {
  let row = await getUserPlan(userId);

  // Reset counters if billing cycle rolled over
  if (new Date() > row.usageResetAt) {
    await db.update(userPlans).set({
      messagesUsed: 0,
      voiceUsed:    0,
      composeUsed:  0,
      usageResetAt: nextResetDate(),
      updatedAt:    new Date(),
    }).where(eq(userPlans.userId, userId));
    row = await getUserPlan(userId);
  }

  const plan  = (row.plan ?? 'free') as PlanId;
  const limit = PLANS[plan][field === 'messagesUsed' ? 'messages'
                          : field === 'voiceUsed'    ? 'voice'
                          : 'compose'] as number;

  const used = row[field];

  if (used >= limit) {
    return { allowed: false, used, limit, plan };
  }

  await db.update(userPlans)
    .set({ [field]: used + 1, updatedAt: new Date() })
    .where(eq(userPlans.userId, userId));

  return { allowed: true, used: used + 1, limit, plan };
}
