import { createTRPCRouter } from '../trpc';
import { gmailRouter }    from '@/features/manual/gmail/router';
import { calendarRouter } from '@/features/manual/calendar/router';

export const appRouter = createTRPCRouter({
  gmail:    gmailRouter,
  calendar: calendarRouter,
});

export type AppRouter = typeof appRouter;
