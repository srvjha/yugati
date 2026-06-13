import { createTRPCRouter, protectedProcedure } from '../trpc';
import { CalendarService } from '@/server/services/calendar.service';
import {
  ListEventsSchema, GetEventSchema, CreateEventSchema,
  UpdateEventSchema, DeleteEventSchema, AvailabilitySchema,
} from '../schemas/calendar';

export const calendarRouter = createTRPCRouter({

  listEvents: protectedProcedure
    .input(ListEventsSchema)
    .query(({ ctx, input }) => new CalendarService(ctx.tenantId).listEvents(input)),

  getEvent: protectedProcedure
    .input(GetEventSchema)
    .query(({ ctx, input }) => new CalendarService(ctx.tenantId).getEvent(input.id, input.calendarId)),

  createEvent: protectedProcedure
    .input(CreateEventSchema)
    .mutation(({ ctx, input }) => new CalendarService(ctx.tenantId).createEvent(input)),

  updateEvent: protectedProcedure
    .input(UpdateEventSchema)
    .mutation(({ ctx, input }) => new CalendarService(ctx.tenantId).updateEvent(input.id, input)),

  deleteEvent: protectedProcedure
    .input(DeleteEventSchema)
    .mutation(({ ctx, input }) => new CalendarService(ctx.tenantId).deleteEvent(input.id, input.calendarId)),

  getAvailability: protectedProcedure
    .input(AvailabilitySchema)
    .query(({ ctx, input }) => new CalendarService(ctx.tenantId).getAvailability(input)),

});
