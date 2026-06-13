import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { CalendarService } from '@/server/services/calendar.service';


export const calendarRouter = createTRPCRouter({

  listEvents: protectedProcedure
    .input(z.object({
      calendarId: z.string().optional(),
      timeMin: z.string().optional(),
      timeMax: z.string().optional(),
      maxResults: z.number().optional(),
      pageToken: z.string().optional(),
    }).optional())
    .query(({ ctx, input }) => new CalendarService(ctx.tenantId).listEvents(input ?? {})),

  getEvent: protectedProcedure
    .input(z.object({ id: z.string(), calendarId: z.string().optional() }))
    .query(({ ctx, input }) => new CalendarService(ctx.tenantId).getEvent(input.id, input.calendarId)),

  createEvent: protectedProcedure
    .input(z.object({
      calendarId: z.string().optional(),
      summary: z.string(),
      description: z.string().optional(),
      location: z.string().optional(),
      start: z.object({ dateTime: z.string().optional(), date: z.string().optional(), timeZone: z.string().optional() }),
      end: z.object({ dateTime: z.string().optional(), date: z.string().optional(), timeZone: z.string().optional() }),
      attendees: z.array(z.object({ email: z.string() })).optional(),
      recurrence: z.array(z.string()).optional(),
      sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional(),
    }))
    .mutation(({ ctx, input }) => new CalendarService(ctx.tenantId).createEvent(input)),

  updateEvent: protectedProcedure
    .input(z.object({
      id: z.string(),
      calendarId: z.string().optional(),
      summary: z.string().optional(),
      description: z.string().optional(),
      location: z.string().optional(),
      start: z.object({ dateTime: z.string().optional(), date: z.string().optional(), timeZone: z.string().optional() }).optional(),
      end: z.object({ dateTime: z.string().optional(), date: z.string().optional(), timeZone: z.string().optional() }).optional(),
      attendees: z.array(z.object({ email: z.string() })).optional(),
      sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional(),
    }))
    .mutation(({ ctx, input }) => new CalendarService(ctx.tenantId).updateEvent(input.id, input)),

  deleteEvent: protectedProcedure
    .input(z.object({ id: z.string(), calendarId: z.string().optional(), sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional() }))
    .mutation(({ ctx, input }) => new CalendarService(ctx.tenantId).deleteEvent(input.id, input.calendarId)),

  getAvailability: protectedProcedure
    .input(z.object({
      timeMin: z.string(),
      timeMax: z.string(),
      calendarIds: z.array(z.string()).optional(),
      timeZone: z.string().optional(),
    }))
    .query(({ ctx, input }) => new CalendarService(ctx.tenantId).getAvailability(input)),

});
