import { z } from 'zod';
import { protectedProcedure, createTRPCRouter } from '../trpc';
import { db } from '@/server/db';
import { userPreferences } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export const userRouter = createTRPCRouter({
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const pref = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, ctx.tenantId),
    });
    return { focuses: pref?.focuses ?? [], onboardingDone: pref?.onboardingDone ?? false };
  }),

  savePreferences: protectedProcedure
    .input(z.object({ focuses: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await db
        .insert(userPreferences)
        .values({ userId: ctx.tenantId, focuses: input.focuses, onboardingDone: true })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: { focuses: input.focuses, onboardingDone: true, updatedAt: new Date() },
        });
    }),
});
