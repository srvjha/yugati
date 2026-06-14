'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { ChevronLeft, ChevronRight, Plus, Plug, Video, X, Clock, MapPin, Users, Trash2, ExternalLink } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalEvent {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?:   { dateTime?: string; date?: string };
  attendees?: { email?: string; displayName?: string; responseStatus?: string }[];
  hangoutLink?: string;
  htmlLink?: string;
  colorId?: string;
}

// ─── Month grid helpers ───────────────────────────────────────────────────────

const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function buildGrid(year: number, month: number): (Date | null)[][] {
  const first    = new Date(year, month, 1);
  const last     = new Date(year, month + 1, 0);
  const pad      = first.getDay();
  const cells: (Date | null)[] = [
    ...Array<null>(pad).fill(null),
    ...Array.from({ length: last.getDate() }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function eventsForDay(events: CalEvent[], date: Date): CalEvent[] {
  const ds = isoDate(date);
  return events.filter((e) => {
    const start = e.start?.dateTime ? e.start.dateTime.split('T')[0] : e.start?.date;
    return start === ds;
  });
}

// Builds a valid RFC 3339 datetime string with local UTC offset, e.g. "2026-06-14T09:00:00+05:30".
// The bare "YYYY-MM-DDTHH:mm:ss" format (no offset) fails the Zod isoDateTimeSchema regex.
function toLocalISO(dateStr: string, timeStr: string): string {
  const dt     = new Date(`${dateStr}T${timeStr}:00`);
  const offset = -dt.getTimezoneOffset();           // minutes ahead of UTC
  const sign   = offset >= 0 ? '+' : '-';
  const hh     = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const mm     = String(Math.abs(offset) % 60).padStart(2, '0');
  return `${dateStr}T${timeStr}:00${sign}${hh}:${mm}`;
}

function fmtTime(dt?: string) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDateTime(dt?: string) {
  if (!dt) return '';
  return new Date(dt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Event color palette ──────────────────────────────────────────────────────

const EVENT_COLORS = [
  'bg-blue-600',
  'bg-indigo-600',
  'bg-violet-600',
  'bg-emerald-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-cyan-600',
  'bg-pink-600',
  'bg-teal-600',
  'bg-orange-600',
  'bg-lime-600',
];
function eventColor(id?: string) {
  if (!id) return EVENT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length];
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CalendarView() {
  const trpc = useTRPC();
  const qc   = useQueryClient();

  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [createOpen,   setCreateOpen]   = useState(false);
  const [defaultDate,  setDefaultDate]  = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  const timeMin = new Date(year, month, 1).toISOString();
  const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const { data, isLoading, error } = useQuery(
    trpc.calendar.listEvents.queryOptions({
      calendarId:   'primary',
      timeMin,
      timeMax,
      maxResults:   250,
      singleEvents: true,
    }),
  );

  const isAuthError = (error as { data?: { code?: string } } | null)?.data?.code === 'UNAUTHORIZED';
  const events      = (data?.items ?? []) as CalEvent[];

  const deleteMutation = useMutation(
    trpc.calendar.deleteEvent.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: trpc.calendar.listEvents.queryKey() });
        setSelectedEvent(null);
      },
    }),
  );

  const grid = useMemo(() => buildGrid(year, month), [year, month]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth()); }

  function openCreate(date?: Date) {
    setDefaultDate(date ? isoDate(date) : isoDate(today));
    setCreateOpen(true);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isAuthError) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center">
          <Plug size={18} className="text-zinc-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Google Calendar not connected</p>
          <p className="text-xs text-zinc-500 mt-1">Connect your account to view and create events</p>
        </div>
        <a
          href="/api/corsair/connect?plugin=googlecalendar"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-xs font-medium hover:bg-zinc-100 transition-colors"
        >
          <Plug size={12} />
          Connect Google Calendar
        </a>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="h-14 shrink-0 border-b border-zinc-800 px-6 flex items-center gap-4">
        <button
          onClick={() => openCreate()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-medium hover:bg-zinc-200 transition-colors"
        >
          <Plus size={13} />
          New event
        </button>

        <div className="flex items-center gap-1 ml-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
            <ChevronLeft size={15} />
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>

        <h2 className="text-sm font-semibold">
          {MONTHS[month]} {year}
        </h2>

        <button
          onClick={goToday}
          className="ml-auto text-xs text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2.5 py-1 rounded-lg transition-colors"
        >
          Today
        </button>
      </header>

      {/* Calendar grid */}
      <div className="flex-1 overflow-y-auto">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-zinc-800 sticky top-0 bg-black z-10">
          {DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-zinc-500">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {isLoading ? (
          <div className="grid grid-cols-7 h-full">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="border-r border-b border-zinc-800/60 min-h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {grid.flatMap((week, wi) =>
              week.map((day, di) => {
                const isToday =
                  day &&
                  day.getDate()     === today.getDate() &&
                  day.getMonth()    === today.getMonth() &&
                  day.getFullYear() === today.getFullYear();
                const isOtherMonth = day && day.getMonth() !== month;
                const dayEvents    = day ? eventsForDay(events, day) : [];
                const overflow     = dayEvents.length - 3;

                return (
                  <div
                    key={`${wi}-${di}`}
                    onClick={() => day && openCreate(day)}
                    className={`border-r border-b border-zinc-800/60 min-h-28 p-1.5 cursor-pointer hover:bg-zinc-900/40 transition-colors
                      ${di === 6 ? 'border-r-0' : ''}`}
                  >
                    {day && (
                      <>
                        <div className="flex justify-end mb-1">
                          <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium
                            ${isToday
                              ? 'bg-blue-500 text-white'
                              : isOtherMonth
                                ? 'text-zinc-700'
                                : 'text-zinc-300'
                            }`}
                          >
                            {day.getDate()}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <button
                              key={ev.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                              className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] text-white truncate font-medium ${eventColor(ev.id)}`}
                            >
                              {ev.start?.dateTime
                                ? `${fmtTime(ev.start.dateTime)} ${ev.summary ?? '(no title)'}`
                                : (ev.summary ?? '(no title)')}
                            </button>
                          ))}
                          {overflow > 0 && (
                            <p className="text-[10px] text-zinc-500 px-1">+{overflow} more</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Create event modal */}
      {createOpen && (
        <CreateEventModal
          defaultDate={defaultDate}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            void qc.invalidateQueries({ queryKey: trpc.calendar.listEvents.queryKey() });
            setCreateOpen(false);
          }}
        />
      )}

      {/* Event detail drawer */}
      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={(id) => deleteMutation.mutate({ id, calendarId: 'primary' })}
          deleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

// ─── Create Event Modal ───────────────────────────────────────────────────────

function CreateEventModal({
  defaultDate,
  onClose,
  onCreated,
}: {
  defaultDate: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const trpc = useTRPC();

  const [title,      setTitle]      = useState('');
  const [date,       setDate]       = useState(defaultDate);
  const [startTime,  setStartTime]  = useState('09:00');
  const [endTime,    setEndTime]    = useState('10:00');
  const [allDay,     setAllDay]     = useState(false);
  const [desc,       setDesc]       = useState('');
  const [attendees,  setAttendees]  = useState('');
  const [addMeet,    setAddMeet]    = useState(false);
  const [error,      setError]      = useState('');

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const mutation = useMutation(
    trpc.calendar.createEvent.mutationOptions({
      onSuccess: onCreated,
      onError:   (e) => setError(e.message),
    }),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim())  { setError('Title is required'); return; }
    if (!date)          { setError('Date is required');  return; }
    setError('');

    const attendeeList = attendees
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((email) => ({ email }));

    if (allDay) {
      mutation.mutate({
        summary:     title.trim(),
        description: desc || undefined,
        attendees:   attendeeList.length ? attendeeList : undefined,
        addMeet:     addMeet || undefined,
        start:       { date },
        end:         { date },
        sendUpdates: 'all',
      });
    } else {
      mutation.mutate({
        summary:     title.trim(),
        description: desc || undefined,
        attendees:   attendeeList.length ? attendeeList : undefined,
        addMeet:     addMeet || undefined,
        start:       { dateTime: toLocalISO(date, startTime), timeZone: tz },
        end:         { dateTime: toLocalISO(date, endTime),   timeZone: tz },
        sendUpdates: 'all',
      });
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold">New Event</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="w-full bg-transparent border-b border-zinc-700 focus:border-white outline-none text-base font-medium placeholder:text-zinc-600 pb-2 transition-colors"
          />

          {/* Date + all-day */}
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-500 transition-colors"
            />
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="rounded"
              />
              All day
            </label>
          </div>

          {/* Time range */}
          {!allDay && (
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-500 transition-colors"
              />
              <span className="text-zinc-600 text-sm">→</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
          )}

          {/* Description */}
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-500 resize-none placeholder:text-zinc-600 transition-colors"
          />

          {/* Attendees */}
          <textarea
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="Attendees — one email per line or comma-separated"
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-500 resize-none placeholder:text-zinc-600 transition-colors"
          />

          {/* Google Meet toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setAddMeet((v) => !v)}
              className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5
                ${addMeet ? 'bg-blue-500' : 'bg-zinc-700'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${addMeet ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <div className="flex items-center gap-1.5 text-sm text-zinc-300">
              <Video size={13} className="text-blue-400" />
              Add Google Meet
            </div>
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </Overlay>
  );
}

// ─── Event Detail Drawer ──────────────────────────────────────────────────────

function EventDetail({
  event,
  onClose,
  onDelete,
  deleting,
}: {
  event: CalEvent;
  onClose: () => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  return (
    <Overlay onClose={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold truncate">{event.summary ?? '(no title)'}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors shrink-0 ml-2">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {(event.start?.dateTime || event.start?.date) && (
            <Row icon={<Clock size={13} />}>
              {event.start.dateTime
                ? `${fmtDateTime(event.start.dateTime)} → ${fmtTime(event.end?.dateTime)}`
                : event.start.date}
            </Row>
          )}

          {event.location && (
            <Row icon={<MapPin size={13} />}>{event.location}</Row>
          )}

          {event.attendees?.length ? (
            <Row icon={<Users size={13} />}>
              <span className="text-xs text-zinc-400">
                {event.attendees.map((a) => a.displayName ?? a.email).join(', ')}
              </span>
            </Row>
          ) : null}

          {event.hangoutLink && (
            <a
              href={event.hangoutLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600/20 border border-blue-600/30 text-blue-400 text-xs font-medium hover:bg-blue-600/30 transition-colors"
            >
              <Video size={13} />
              Join Google Meet
              <ExternalLink size={11} className="ml-auto" />
            </a>
          )}

          {event.description && (
            <p className="text-xs text-zinc-400 whitespace-pre-wrap">{event.description}</p>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          {event.htmlLink && (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors text-center"
            >
              Open in Google Calendar
            </a>
          )}
          {event.id && (
            <button
              onClick={() => event.id && onDelete(event.id)}
              disabled={deleting}
              className="flex items-center gap-1.5 py-2 px-3 rounded-lg border border-zinc-700 text-xs text-red-400 hover:bg-red-900/20 hover:border-red-800 transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} />
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </Overlay>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {children}
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm text-zinc-300">
      <span className="text-zinc-500 shrink-0 mt-0.5">{icon}</span>
      {children}
    </div>
  );
}
