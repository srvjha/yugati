import { corsair } from "@/server/corsair";

type EventTime = { dateTime?: string; date?: string; timeZone?: string };

export class CalendarService {
  private readonly c: ReturnType<typeof corsair.withTenant>;

  constructor(tenantId: string) {
    this.c = corsair.withTenant(tenantId);
  }

  listEvents(opts: {
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  } = {}) {
    return this.c.googlecalendar.api.events.getMany({
      calendarId: opts.calendarId ?? "primary",
      timeMin: opts.timeMin,
      timeMax: opts.timeMax,
      maxResults: opts.maxResults ?? 20,
    });
  }

  getEvent(eventId: string, calendarId = "primary") {
    return this.c.googlecalendar.api.events.get({ calendarId, id: eventId });
  }

  createEvent(opts: {
    summary: string;
    start: EventTime;
    end: EventTime;
    description?: string;
    calendarId?: string;
    attendees?: { email: string }[];
  }) {
    return this.c.googlecalendar.api.events.create({
      calendarId: opts.calendarId ?? "primary",
      event: {
        summary: opts.summary,
        description: opts.description,
        start: opts.start,
        end: opts.end,
        attendees: opts.attendees,
      },
    });
  }

  updateEvent(
    eventId: string,
    opts: {
      summary?: string;
      start?: EventTime;
      end?: EventTime;
      description?: string;
      calendarId?: string;
    },
  ) {
    return this.c.googlecalendar.api.events.update({
      calendarId: opts.calendarId ?? "primary",
      id: eventId,
      event: {
        summary: opts.summary,
        description: opts.description,
        start: opts.start,
        end: opts.end,
      },
    });
  }

  deleteEvent(eventId: string, calendarId = "primary") {
    return this.c.googlecalendar.api.events.delete({ calendarId, id: eventId });
  }

  getAvailability(opts: { timeMin: string; timeMax: string; calendarIds?: string[] }) {
    const items = (opts.calendarIds ?? ["primary"]).map((id) => ({ id }));
    return this.c.googlecalendar.api.calendar.getAvailability({
      timeMin: opts.timeMin,
      timeMax: opts.timeMax,
      items,
    });
  }
}
