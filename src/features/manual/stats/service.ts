import OpenAI       from 'openai';
import { corsair }  from '@/server/corsair';
import { db }       from '@/server/db';
import { corsairAccounts, corsairIntegrations } from '@/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function header(headers: { name?: string; value?: string }[], name: string): string {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function parseFromEmail(from: string): { name: string; email: string; domain: string } {
  const match = from.match(/(?:"?([^"<]*)"?\s*)?<?([^>]+@([^>]+))>?/);
  const email  = match?.[2]?.trim() ?? from.trim();
  const domain = match?.[3]?.trim() ?? email.split('@')[1] ?? 'unknown';
  const rawName = match?.[1]?.trim();
  const name    = rawName ? rawName : (email.split('@')[0] ?? email);
  return { name, email, domain };
}

function isoDay(epochMs: number): string {
  return new Date(epochMs).toISOString().split('T')[0]!;
}

function last30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(isoDay(d.getTime()));
  }
  return days;
}

function minutesBetween(start?: string, end?: string): number {
  if (!start || !end) return 0;
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60_000);
}

function domainToCountry(domain: string): string {
  const tld = domain.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    com: 'Global / US', net: 'Global / US', org: 'Global',
    uk: 'United Kingdom', in: 'India', de: 'Germany',
    fr: 'France', jp: 'Japan', au: 'Australia',
    ca: 'Canada', br: 'Brazil', ru: 'Russia',
    it: 'Italy', es: 'Spain', nl: 'Netherlands',
    sg: 'Singapore', nz: 'New Zealand', mx: 'Mexico',
    kr: 'South Korea', cn: 'China', ch: 'Switzerland',
    se: 'Sweden', no: 'Norway', dk: 'Denmark',
    fi: 'Finland', be: 'Belgium', at: 'Austria',
    pt: 'Portugal', pl: 'Poland', ar: 'Argentina',
    za: 'South Africa', ae: 'UAE', il: 'Israel',
    io: 'Global (Tech)', ai: 'AI / Tech',
  };
  return map[tld] ?? `Other (.${tld})`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class StatsService {
  private readonly c: ReturnType<typeof corsair.withTenant>;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.c = corsair.withTenant(tenantId);
  }

  // ── Overview: counts + this-week calendar summary ──────────────────────────

  async getOverview() {
    const now      = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    type LabelDetail = { messagesTotal?: number; messagesUnread?: number };

    // labels.list does NOT return messagesTotal/Unread — must call labels.get per label
    const [inbox, sent, draft, calThisWeek] = await Promise.all([
      this.c.gmail.api.labels.get({ id: 'INBOX' }).catch(() => null) as Promise<LabelDetail | null>,
      this.c.gmail.api.labels.get({ id: 'SENT'  }).catch(() => null) as Promise<LabelDetail | null>,
      this.c.gmail.api.labels.get({ id: 'DRAFT' }).catch(() => null) as Promise<LabelDetail | null>,
      this.c.googlecalendar.api.events.getMany({
        calendarId:   'primary',
        timeMin:      weekStart.toISOString(),
        timeMax:      weekEnd.toISOString(),
        maxResults:   250,
        singleEvents: true,
      }).catch(() => ({ items: [] })),
    ]);

    const calItems = (calThisWeek as { items?: { start?: { dateTime?: string }; end?: { dateTime?: string } }[] }).items ?? [];
    const timedMeetings = calItems.filter((e) => e.start?.dateTime);
    const meetingMinutes = timedMeetings.reduce(
      (sum, e) => sum + minutesBetween(e.start?.dateTime, e.end?.dateTime),
      0,
    );

    return {
      inboxTotal:           inbox?.messagesTotal  ?? 0,
      unreadCount:          inbox?.messagesUnread ?? 0,
      sentTotal:            sent?.messagesTotal   ?? 0,
      draftCount:           draft?.messagesTotal  ?? 0,
      meetingsThisWeek:     timedMeetings.length,
      meetingHoursThisWeek: Math.round(meetingMinutes / 60 * 10) / 10,
    };
  }

  // ── Email activity: volume, senders, hourly, categories ───────────────────

  async getEmailActivity() {
    type DbMsg = { id?: string; internalDate?: string; labelIds?: string[]; from?: string; payload?: { headers?: { name?: string; value?: string }[] } };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const afterQuery = `after:${Math.floor(thirtyDaysAgo.getTime() / 1000)}`;

    const listRes = await this.c.gmail.api.messages.list({
      maxResults: 100,
      labelIds:   ['INBOX'],
      q:          afterQuery,
    }).catch(() => ({ messages: [] }));

    const ids = ((listRes as { messages?: { id?: string }[] }).messages ?? [])
      .map((m) => m.id).filter(Boolean) as string[];

    const metaItems = await Promise.all(
      ids.slice(0, 50).map((id) =>
        this.c.gmail.api.messages.get({ id, format: 'metadata' }).catch(() => null),
      ),
    );
    const msgs: DbMsg[] = metaItems.filter(Boolean) as DbMsg[];

    // ── Daily volume ──
    const dayMap: Record<string, number> = {};
    const days = last30Days();
    days.forEach((d) => { dayMap[d] = 0; });

    // ── Hourly ──
    const hourMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourMap[h] = 0;

    // ── Senders ──
    const senderMap: Record<string, { name: string; count: number; domain: string }> = {};

    // ── Domains / countries ──
    const domainMap: Record<string, number> = {};

    // ── Category labels ──
    const catMap: Record<string, number> = {
      CATEGORY_PERSONAL:   0,
      CATEGORY_SOCIAL:     0,
      CATEGORY_PROMOTIONS: 0,
      CATEGORY_UPDATES:    0,
      CATEGORY_FORUMS:     0,
    };

    for (const msg of msgs) {
      const epochMs   = parseInt(msg.internalDate ?? '0');
      const headers   = msg.payload?.headers ?? [];
      const from      = header(headers, 'From');
      const day       = isoDay(epochMs);
      const hour      = new Date(epochMs).getHours();
      const { name, email, domain } = parseFromEmail(from);

      if (dayMap[day] !== undefined) dayMap[day]++;
      hourMap[hour]++;

      if (email) {
        if (!senderMap[email]) senderMap[email] = { name, count: 0, domain };
        senderMap[email]!.count++;
      }

      if (domain) {
        domainMap[domain] = (domainMap[domain] ?? 0) + 1;
      }

      for (const labelId of msg.labelIds ?? []) {
        if (catMap[labelId] !== undefined) catMap[labelId]++;
      }
    }

    // Build category array (put any unlabelled ones in Personal)
    const categorised = Object.values(catMap).reduce((a, b) => a + b, 0);
    catMap['CATEGORY_PERSONAL'] = Math.max(
      catMap['CATEGORY_PERSONAL']!,
      msgs.length - categorised,
    );

    // Country breakdown from domains
    const countryMap: Record<string, number> = {};
    for (const [domain, count] of Object.entries(domainMap)) {
      const country = domainToCountry(domain);
      countryMap[country] = (countryMap[country] ?? 0) + count;
    }

    return {
      byDay: days.map((date) => ({ date, count: dayMap[date] ?? 0 })),
      byHour: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourMap[h] ?? 0 })),
      topSenders: Object.entries(senderMap)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([email, v]) => ({ email, name: v.name, domain: v.domain, count: v.count })),
      byCategory: [
        { name: 'Personal',   value: catMap['CATEGORY_PERSONAL']!,   color: '#3b82f6' },
        { name: 'Social',     value: catMap['CATEGORY_SOCIAL']!,      color: '#8b5cf6' },
        { name: 'Promotions', value: catMap['CATEGORY_PROMOTIONS']!,  color: '#f59e0b' },
        { name: 'Updates',    value: catMap['CATEGORY_UPDATES']!,     color: '#10b981' },
        { name: 'Forums',     value: catMap['CATEGORY_FORUMS']!,      color: '#ec4899' },
      ].filter((c) => c.value > 0),
      byCountry: Object.entries(countryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([country, count]) => ({ country, count })),
      totalFetched: msgs.length,
    };
  }

  // ── Calendar activity: events last 30 days ─────────────────────────────────

  async getCalendarActivity() {
    const now     = new Date();
    const past30  = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const res = await this.c.googlecalendar.api.events.getMany({
      calendarId:   'primary',
      timeMin:      past30.toISOString(),
      timeMax:      now.toISOString(),
      maxResults:   500,
      singleEvents: true,
    }).catch(() => ({ items: [] }));

    type CalEvent = {
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      attendees?: { email?: string; displayName?: string }[];
      hangoutLink?: string;
      status?: string;
    };

    const events = ((res as { items?: CalEvent[] }).items ?? [])
      .filter((e) => e.status !== 'cancelled');

    // By day
    const days = last30Days();
    const dayMap: Record<string, number> = {};
    days.forEach((d) => { dayMap[d] = 0; });
    const hoursMap: Record<string, number> = {};
    days.forEach((d) => { hoursMap[d] = 0; });

    // Meeting type
    let videoMeetings  = 0;
    let timedMeetings  = 0;
    let allDayEvents   = 0;

    // Duration distribution
    const durationBuckets = { 'Under 30m': 0, '30–60m': 0, '1–2h': 0, 'Over 2h': 0 };

    // Top attendees
    const attendeeMap: Record<string, number> = {};

    for (const ev of events) {
      const day = ev.start?.dateTime
        ? isoDay(new Date(ev.start.dateTime).getTime())
        : ev.start?.date ?? '';

      if (dayMap[day] !== undefined) dayMap[day]++;

      if (ev.start?.dateTime) {
        timedMeetings++;
        const mins = minutesBetween(ev.start.dateTime, ev.end?.dateTime);
        if (hoursMap[day] !== undefined) hoursMap[day] += mins / 60;

        if (mins < 30)       durationBuckets['Under 30m']++;
        else if (mins < 60)  durationBuckets['30–60m']++;
        else if (mins < 120) durationBuckets['1–2h']++;
        else                 durationBuckets['Over 2h']++;

        if (ev.hangoutLink) videoMeetings++;
      } else {
        allDayEvents++;
      }

      for (const att of ev.attendees ?? []) {
        if (att.email) {
          attendeeMap[att.email] = (attendeeMap[att.email] ?? 0) + 1;
        }
      }
    }

    // Day-of-week load
    const dowLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dowMap: Record<string, number> = {};
    dowLabels.forEach((d) => { dowMap[d] = 0; });
    for (const ev of events.filter((e) => e.start?.dateTime)) {
      const dow = dowLabels[new Date(ev.start!.dateTime!).getDay()]!;
      dowMap[dow]++;
    }

    return {
      byDay: days.map((date) => ({
        date,
        meetings: dayMap[date] ?? 0,
        hours:    Math.round((hoursMap[date] ?? 0) * 10) / 10,
      })),
      byDow: dowLabels.map((d) => ({ day: d, count: dowMap[d] ?? 0 })),
      meetingTypes: [
        { name: 'Video (Meet)',  value: videoMeetings,              color: '#3b82f6' },
        { name: 'In-Person',     value: Math.max(0, timedMeetings - videoMeetings), color: '#10b981' },
        { name: 'All-day',       value: allDayEvents,               color: '#8b5cf6' },
      ].filter((c) => c.value > 0),
      durationDist: Object.entries(durationBuckets).map(([name, value]) => ({ name, value })),
      topAttendees: Object.entries(attendeeMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([email, count]) => ({ email, name: email.split('@')[0] ?? email, count })),
      totalEvents: events.length,
      timedMeetings,
      totalMeetingHours: Math.round(
        events.filter((e) => e.start?.dateTime)
          .reduce((s, e) => s + minutesBetween(e.start?.dateTime, e.end?.dateTime), 0) / 60 * 10,
      ) / 10,
    };
  }

  // ── AI Insights ───────────────────────────────────────────────────────────

  async getAiInsights() {
    const overview = await this.getOverview().catch(() => null);
    if (!overview) return { insights: [] };

    const prompt = `You are an assistant summarising a user's email and calendar stats. Be concise and actionable.

Stats:
- Inbox total: ${overview.inboxTotal} messages
- Unread: ${overview.unreadCount} messages
- Sent all-time: ${overview.sentTotal}
- Drafts: ${overview.draftCount}
- Meetings this week: ${overview.meetingsThisWeek}
- Meeting hours this week: ${overview.meetingHoursThisWeek}h

Give exactly 3 short insight bullets (one sentence each, no markdown). Each should be specific and actionable based on the numbers above. Do not use bullet characters — return a JSON array of strings.`;

    const client = new OpenAI();
    const res = await client.chat.completions.create({
      model:           'gpt-4o-mini',
      temperature:     0.4,
      max_tokens:      200,
      response_format: { type: 'json_object' },
      messages:        [{ role: 'user', content: prompt }],
    });

    try {
      const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}') as { insights?: string[] };
      return { insights: parsed.insights ?? [] };
    } catch {
      return { insights: [] };
    }
  }

  // ── Connection status ─────────────────────────────────────────────────────

  async getConnectionStatus() {
    const rows = await db
      .select({ name: corsairIntegrations.name, config: corsairAccounts.config })
      .from(corsairAccounts)
      .innerJoin(corsairIntegrations, eq(corsairAccounts.integrationId, corsairIntegrations.id))
      .where(
        and(
          eq(corsairAccounts.tenantId, this.tenantId),
          inArray(corsairIntegrations.name, ['gmail', 'googlecalendar']),
        ),
      );
    // A provisioned-but-never-authorized account has an empty config ({}).
    // Only count it as connected once OAuth tokens have been stored.
    const connected = new Set(
      rows
        .filter((r) => Object.keys(r.config as Record<string, unknown>).length > 0)
        .map((r) => r.name),
    );
    return { gmail: connected.has('gmail'), googlecalendar: connected.has('googlecalendar') };
  }
}
