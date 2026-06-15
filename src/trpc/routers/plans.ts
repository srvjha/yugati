import { protectedProcedure, createTRPCRouter } from '../trpc';
import { getUserPlan } from '@/lib/usage';
import { PLANS }       from '@/lib/plans';
import { db }          from '@/server/db';
import { orders }      from '@/server/db/schema';
import { eq, desc }    from 'drizzle-orm';
import type { PlanId } from '@/lib/plans';

export const plansRouter = createTRPCRouter({
  // Current plan + usage — used by sidebar pill and billing page
  getMyPlan: protectedProcedure.query(async ({ ctx }) => {
    const row   = await getUserPlan(ctx.tenantId);
    const planId = (row.plan ?? 'free') as PlanId;
    const limits = PLANS[planId];

    return {
      planId,
      planName:           limits.name,
      priceInr:           limits.priceInr,
      subscriptionStatus: row.subscriptionStatus,
      currentPeriodEnd:   row.currentPeriodEnd,
      resetAt:            row.usageResetAt,
      usage: {
        messages: { used: row.messagesUsed, limit: limits.messages  },
        voice:    { used: row.voiceUsed,    limit: limits.voice     },
        compose:  { used: row.composeUsed,  limit: limits.compose   },
      },
    };
  }),

  // Order history for billing page
  getOrders: protectedProcedure.query(async ({ ctx }) => {
    return db.query.orders.findMany({
      where: eq(orders.userId, ctx.tenantId),
      orderBy: [desc(orders.createdAt)],
    });
  }),
});
