import 'dotenv/config';
import { db }        from '@/server/db';
import { user, userPlans } from '@/server/db/schema';
import { eq }        from 'drizzle-orm';

const ADMIN_EMAIL = 'jhasaurav0209001@gmail.com';

async function main() {
  const adminUser = await db.query.user.findFirst({ where: eq(user.email, ADMIN_EMAIL) });
  if (!adminUser) {
    console.error(`User ${ADMIN_EMAIL} not found — sign in once first so the row exists.`);
    process.exit(1);
  }

  await db.update(user).set({ role: 'admin' }).where(eq(user.id, adminUser.id));

  const far = new Date('2099-01-01');
  const existing = await db.query.userPlans.findFirst({ where: eq(userPlans.userId, adminUser.id) });

  if (existing) {
    await db.update(userPlans).set({
      plan: 'premium',
      usageResetAt: far,
      subscriptionStatus: 'active',
      updatedAt: new Date(),
    }).where(eq(userPlans.userId, adminUser.id));
  } else {
    await db.insert(userPlans).values({
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      userId: adminUser.id,
      plan: 'premium',
      messagesUsed: 0,
      voiceUsed: 0,
      composeUsed: 0,
      usageResetAt: far,
      subscriptionStatus: 'active',
    });
  }

  console.log(`✓ ${ADMIN_EMAIL} → role: admin, plan: premium`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
