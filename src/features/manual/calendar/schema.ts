import { z } from 'zod';
import { emailSchema, idSchema, isoDateSchema, isoDateTimeSchema } from '@/features/schemas';

const EventTimeSchema = z
  .object({
    dateTime: isoDateTimeSchema.optional(),
    date:     isoDateSchema.optional(),
    timeZone: z.string().trim().optional(),
  })
  .refine(
    (d) => Boolean(d.dateTime) !== Boolean(d.date),
    { message: "Provide either 'dateTime' (timed) or 'date' (all-day), not both" },
  )
  .refine(
    (d) => !d.dateTime || Boolean(d.timeZone),
    { message: "'timeZone' is required for timed events", path: ['timeZone'] },
  );

const AttendeeSchema = z.object({
  email:       emailSchema,
  displayName: z.string().max(100).optional(),
  optional:    z.boolean().optional(),
});

export const ListEventsSchema = z
  .object({
    calendarId:   z.string().default('primary'),
    timeMin:      isoDateTimeSchema.optional(),
    timeMax:      isoDateTimeSchema.optional(),
    maxResults:   z.number().int().min(1).max(2500).default(20),
    pageToken:    z.string().optional(),
    singleEvents: z.boolean().default(true),
  })
  .refine(
    (d) => !(d.timeMin && d.timeMax) || new Date(d.timeMin) < new Date(d.timeMax),
    { message: 'timeMin must be before timeMax', path: ['timeMax'] },
  );

export const GetEventSchema = z.object({
  id:         idSchema,
  calendarId: z.string().default('primary'),
});

export const DeleteEventSchema = z.object({
  id:          idSchema,
  calendarId:  z.string().default('primary'),
  sendUpdates: z.enum(['all', 'externalOnly', 'none']).default('all'),
});

export const CreateEventSchema = z
  .object({
    calendarId:  z.string().default('primary'),
    summary:     z.string().min(1, 'Summary is required').max(1024).trim(),
    description: z.string().max(8192).optional(),
    location:    z.string().max(1024).optional(),
    start:       EventTimeSchema,
    end:         EventTimeSchema,
    attendees:   z.array(AttendeeSchema).max(200).optional(),
    recurrence:  z.array(z.string()).optional(),
    sendUpdates: z.enum(['all', 'externalOnly', 'none']).default('all'),
    addMeet:     z.boolean().optional(),
  })
  .refine(
    (d) => {
      if (d.start.dateTime && d.end.dateTime) return new Date(d.start.dateTime) < new Date(d.end.dateTime);
      return true;
    },
    { message: 'Event start must be before end', path: ['end'] },
  );

export const UpdateEventSchema = z.object({
  id:          idSchema,
  calendarId:  z.string().default('primary'),
  summary:     z.string().max(1024).optional(),
  description: z.string().max(8192).optional(),
  location:    z.string().max(1024).optional(),
  start:       EventTimeSchema.optional(),
  end:         EventTimeSchema.optional(),
  attendees:   z.array(AttendeeSchema).max(200).optional(),
  sendUpdates: z.enum(['all', 'externalOnly', 'none']).default('all'),
});

export const AvailabilitySchema = z
  .object({
    timeMin:     isoDateTimeSchema,
    timeMax:     isoDateTimeSchema,
    calendarIds: z.array(z.string().min(1)).min(1).max(50).default(['primary']),
    timeZone:    z.string().optional(),
  })
  .refine(
    (d) => new Date(d.timeMin) < new Date(d.timeMax),
    { message: 'timeMin must be before timeMax', path: ['timeMax'] },
  )
  .refine(
    (d) => new Date(d.timeMax).getTime() - new Date(d.timeMin).getTime() <= 7 * 24 * 60 * 60 * 1000,
    { message: 'Window cannot exceed 7 days', path: ['timeMax'] },
  );

