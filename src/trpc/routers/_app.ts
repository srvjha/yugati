import { createTRPCRouter } from '../trpc';
import { gmailRouter }    from '@/features/manual/gmail/router';
import { calendarRouter } from '@/features/manual/calendar/router';
import { statsRouter }    from '@/features/manual/stats/router';
import { plansRouter }    from './plans';
import { userRouter }     from './user';
import { adminRouter }    from './admin';

export const appRouter = createTRPCRouter({
  gmail:    gmailRouter,
  calendar: calendarRouter,
  stats:    statsRouter,
  plans:    plansRouter,
  user:     userRouter,
  admin:    adminRouter,
});

export type AppRouter = typeof appRouter;
