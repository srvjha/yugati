import { createTRPCRouter } from '../trpc';
import { gmailRouter }    from '@/features/manual/gmail/router';
import { calendarRouter } from '@/features/manual/calendar/router';
import { statsRouter }    from '@/features/manual/stats/router';

export const appRouter = createTRPCRouter({
  gmail:    gmailRouter,
  calendar: calendarRouter,
  stats:    statsRouter,
});

export type AppRouter = typeof appRouter;
