import { createTRPCRouter, protectedProcedure } from '@/trpc/trpc';
import { StatsService } from './service';

export const statsRouter = createTRPCRouter({

  overview: protectedProcedure
    .query(({ ctx }) => new StatsService(ctx.tenantId).getOverview()),

  emailActivity: protectedProcedure
    .query(({ ctx }) => new StatsService(ctx.tenantId).getEmailActivity()),

  calendarActivity: protectedProcedure
    .query(({ ctx }) => new StatsService(ctx.tenantId).getCalendarActivity()),

  aiInsights: protectedProcedure
    .query(({ ctx }) => new StatsService(ctx.tenantId).getAiInsights()),

  connectionStatus: protectedProcedure
    .query(({ ctx }) => new StatsService(ctx.tenantId).getConnectionStatus()),

});
