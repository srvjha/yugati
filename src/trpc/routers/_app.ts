import { createTRPCRouter } from '../trpc';
import { gmailRouter }    from '@/features/manual/gmail/router';
import { calendarRouter } from '@/features/manual/calendar/router';
import { statsRouter }    from '@/features/manual/stats/router';
import { plansRouter }    from './plans';
import { userRouter }     from './user';

export const appRouter = createTRPCRouter({
  gmail:    gmailRouter,
  calendar: calendarRouter,
  stats:    statsRouter,
  plans:    plansRouter,
  user:     userRouter,
});

export type AppRouter = typeof appRouter;
