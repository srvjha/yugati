import { corsair } from '@/server/corsair';

type EventTime = { dateTime?: string; date?: string; timeZone?: string };

export class CalendarService {
  private readonly c: ReturnType<typeof corsair.withTenant>;

  constructor(tenantId: string) {
    this.c = corsair.withTenant(tenantId);
  }

  listEvents(opts: { calendarId?: string; timeMin?: string; timeMax?: string; maxResults?: number; singleEvents?: boolean } = {}) {
    return this.c.googlecalendar.api.events.getMany({
      calendarId:   opts.calendarId ?? 'primary',
      timeMin:      opts.timeMin,
      timeMax:      opts.timeMax,
      maxResults:   opts.maxResults ?? 20,
      singleEvents: opts.singleEvents ?? true,
      orderBy:      'startTime',
    });
  }

  getEvent(eventId: string, calendarId = 'primary') {
    return this.c.googlecalendar.api.events.get({ calendarId, id: eventId });
  }

  createEvent(opts: {
    summary: string;
    start: EventTime;
    end: EventTime;
    description?: string;
    calendarId?: string;
    attendees?: { email: string }[];
    addMeet?: boolean;
  }) {
    const calendarId = opts.calendarId ?? 'primary';
    const baseEvent  = {
      summary:     opts.summary,
      description: opts.description,
      start:       opts.start,
      end:         opts.end,
      attendees:   opts.attendees,
    };

    if (!opts.addMeet) {
      return this.c.googlecalendar.api.events.create({ calendarId, event: baseEvent });
    }

    // Create first, then patch to attach a Meet link (SDK create doesn't forward conferenceDataVersion).
    return this.c.googlecalendar.api.events.create({ calendarId, event: baseEvent }).then((event) => {
      if (!event.id) return event;
      return this.c.googlecalendar.api.events.update({
        calendarId,
        id: event.id,
        conferenceDataVersion: 1,
        event: {
          ...baseEvent,
          conferenceData: { createRequest: { requestId: event.id, conferenceSolutionKey: { type: 'hangoutsMeet' } } } as unknown as Record<string, unknown>,
        } as unknown as Parameters<typeof this.c.googlecalendar.api.events.update>[0]['event'],
      });
    });
  }

  updateEvent(eventId: string, opts: {
    summary?: string;
    start?: EventTime;
    end?: EventTime;
    description?: string;
    calendarId?: string;
  }) {
    return this.c.googlecalendar.api.events.update({
      calendarId: opts.calendarId ?? 'primary',
      id: eventId,
      event: {
        summary:     opts.summary,
        description: opts.description,
        start:       opts.start,
        end:         opts.end,
      },
    });
  }

  deleteEvent(eventId: string, calendarId = 'primary') {
    return this.c.googlecalendar.api.events.delete({ calendarId, id: eventId });
  }

  getAvailability(opts: { timeMin: string; timeMax: string; calendarIds?: string[] }) {
    const items = (opts.calendarIds ?? ['primary']).map((id) => ({ id }));
    return this.c.googlecalendar.api.calendar.getAvailability({
      timeMin: opts.timeMin,
      timeMax: opts.timeMax,
      items,
    });
  }
}
