import { createTRPCRouter } from '../trpc';
import { gmailRouter }    from './gmail';
import { calendarRouter } from './calendar';

export const appRouter = createTRPCRouter({
  gmail:    gmailRouter,
  calendar: calendarRouter,
});

export type AppRouter = typeof appRouter;
