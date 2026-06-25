'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import {
  ChevronLeft, ChevronRight, Plus, Plug, Video, X, Clock, MapPin,
  Users, Trash2, ExternalLink, AlignLeft, UserPlus, ChevronDown, ArrowUp, Loader2,
  Copy, Check,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';

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

type CalView = 'month' | 'week' | 'day';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function buildGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const pad   = first.getDay();
  const cells: (Date | null)[] = [
    ...Array<null>(pad).fill(null),
    ...Array.from({ length: last.getDate() }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// Use local date parts — avoids UTC-string splitting that shifts dates across midnight
function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function eventsForDay(events: CalEvent[], date: Date): CalEvent[] {
  const ds = isoDate(date);
  return events.filter((e) => {
    if (e.start?.dateTime) {
      const local = new Date(e.start.dateTime);
      return isoDate(local) === ds;
    }
    return e.start?.date === ds;
  });
}

function toLocalISO(dateStr: string, timeStr: string): string {
  const dt     = new Date(`${dateStr}T${timeStr}:00`);
  const offset = -dt.getTimezoneOffset();
  const sign   = offset >= 0 ? '+' : '-';
  const hh     = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const mm     = String(Math.abs(offset) % 60).padStart(2, '0');
  return `${dateStr}T${timeStr}:00${sign}${hh}:${mm}`;
}

function fmtTime(dt?: string) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDateTime(dt?: string) {
  if (!dt) return '';
  return new Date(dt).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

// ─── Event colors ─────────────────────────────────────────────────────────────

const EVENT_COLORS_SOLID = [
  'bg-blue-100 text-blue-900 dark:bg-blue-500 dark:text-white',
  'bg-indigo-100 text-indigo-900 dark:bg-indigo-500 dark:text-white',
  'bg-violet-100 text-violet-900 dark:bg-violet-500 dark:text-white',
  'bg-emerald-100 text-emerald-900 dark:bg-emerald-500 dark:text-white',
  'bg-rose-100 text-rose-900 dark:bg-rose-500 dark:text-white',
  'bg-amber-100 text-amber-900 dark:bg-amber-500 dark:text-white',
  'bg-cyan-100 text-cyan-900 dark:bg-cyan-500 dark:text-white',
  'bg-pink-100 text-pink-900 dark:bg-pink-500 dark:text-white',
  'bg-teal-100 text-teal-900 dark:bg-teal-500 dark:text-white',
  'bg-orange-100 text-orange-900 dark:bg-orange-500 dark:text-white',
  'bg-lime-100 text-lime-900 dark:bg-lime-500 dark:text-white',
];

function eventColor(id?: string) {
  if (!id) return EVENT_COLORS_SOLID[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return EVENT_COLORS_SOLID[Math.abs(hash) % EVENT_COLORS_SOLID.length];
}

// ─── Week view accent colors ──────────────────────────────────────────────────

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ACCENT_BORDERS = [
  'border-l-blue-500',   'border-l-violet-500', 'border-l-emerald-500',
  'border-l-rose-500',   'border-l-amber-500',  'border-l-cyan-500',
  'border-l-pink-500',   'border-l-indigo-500', 'border-l-teal-500',
  'border-l-orange-500',
];
const ACCENT_DOTS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500',
  'bg-amber-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500',
  'bg-teal-500', 'bg-orange-500',
];
const CHIP_CLASSES = [
  'bg-blue-500/15 text-blue-800 dark:bg-blue-500 dark:text-white',
  'bg-violet-500/15 text-violet-800 dark:bg-violet-500 dark:text-white',
  'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500 dark:text-white',
  'bg-rose-500/15 text-rose-800 dark:bg-rose-500 dark:text-white',
  'bg-amber-500/15 text-amber-800 dark:bg-amber-500 dark:text-white',
  'bg-cyan-500/15 text-cyan-800 dark:bg-cyan-500 dark:text-white',
  'bg-pink-500/15 text-pink-800 dark:bg-pink-500 dark:text-white',
  'bg-indigo-500/15 text-indigo-800 dark:bg-indigo-500 dark:text-white',
  'bg-teal-500/15 text-teal-800 dark:bg-teal-500 dark:text-white',
  'bg-orange-500/15 text-orange-800 dark:bg-orange-500 dark:text-white',
];

function eventAccent(id?: string) {
  if (!id) return { border: ACCENT_BORDERS[0]!, dot: ACCENT_DOTS[0]!, chip: CHIP_CLASSES[0]! };
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  const idx = Math.abs(hash) % ACCENT_DOTS.length;
  return { border: ACCENT_BORDERS[idx]!, dot: ACCENT_DOTS[idx]!, chip: CHIP_CLASSES[idx]! };
}

// ─── Week start helper ────────────────────────────────────────────────────────

function getWeekStart(year: number, month: number, day: number): Date {
  const d = new Date(year, month, day);
  const dow = d.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  return new Date(year, month, day + diff);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 64;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function minutesFromMidnight(dt: string): number {
  const d = new Date(dt);
  return d.getHours() * 60 + d.getMinutes();
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CalendarView({ userName }: { userName?: string }) {
  const trpc = useTRPC();
  const qc   = useQueryClient();

  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<CalView>(() => {
    try { return (localStorage.getItem('yugati_cal_view') as CalView) ?? 'month'; } catch { return 'month'; }
  });
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [day,   setDay]   = useState(today.getDate());

  const { preview, show: showPreview, hide: hidePreview, cancelHide } = useEventPreview();

  const [modeOpen,      setModeOpen]      = useState(false);
  const [aiOpen,        setAiOpen]        = useState(false);
  const [formOpen,      setFormOpen]      = useState(false);
  const [defaultDate,   setDefaultDate]   = useState('');
  const [defaultTime,   setDefaultTime]   = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  const weekStart = getWeekStart(year, month, day);

  // Use local midnight for range boundaries so IST events near midnight aren't cut off
  const timeMin = view === 'month'
    ? toLocalISO(isoDate(new Date(year, month, 1)), '00:00')
    : view === 'week'
      ? toLocalISO(isoDate(weekStart), '00:00')
      : toLocalISO(isoDate(new Date(year, month, day)), '00:00');

  const timeMax = view === 'month'
    ? toLocalISO(isoDate(new Date(year, month + 1, 0)), '23:59')
    : view === 'week'
      ? toLocalISO(isoDate(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)), '23:59')
      : toLocalISO(isoDate(new Date(year, month, day)), '23:59');

  const { data, isLoading, error } = useQuery(
    trpc.calendar.listEvents.queryOptions({
      calendarId: 'primary', timeMin, timeMax, maxResults: 250, singleEvents: true,
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

  // ── Navigation ────────────────────────────────────────────────────────────

  function prevPeriod() {
    if (view === 'month') {
      if (month === 0) { setMonth(11); setYear((y) => y - 1); }
      else setMonth((m) => m - 1);
    } else if (view === 'week') {
      const d = new Date(year, month, day - 7);
      setYear(d.getFullYear()); setMonth(d.getMonth()); setDay(d.getDate());
    } else {
      const d = new Date(year, month, day - 1);
      setYear(d.getFullYear()); setMonth(d.getMonth()); setDay(d.getDate());
    }
  }

  function nextPeriod() {
    if (view === 'month') {
      if (month === 11) { setMonth(0); setYear((y) => y + 1); }
      else setMonth((m) => m + 1);
    } else if (view === 'week') {
      const d = new Date(year, month, day + 7);
      setYear(d.getFullYear()); setMonth(d.getMonth()); setDay(d.getDate());
    } else {
      const d = new Date(year, month, day + 1);
      setYear(d.getFullYear()); setMonth(d.getMonth()); setDay(d.getDate());
    }
  }

  function goToday() {
    setYear(today.getFullYear()); setMonth(today.getMonth()); setDay(today.getDate());
  }

  function openCreate(date?: Date, time?: string) {
    setDefaultDate(date ? isoDate(date) : isoDate(new Date(year, month, day)));
    setDefaultTime(time ?? '');
    setModeOpen(true);
  }

  function switchToDay(d: Date) {
    setYear(d.getFullYear()); setMonth(d.getMonth()); setDay(d.getDate());
    setView('day');
  }

  // ── Auth error ────────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedDate = new Date(year, month, day);
  const isToday = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <header className="h-16 shrink-0 border-b border-zinc-800/60 px-6 flex items-center gap-4">
        {/* Month/Year + nav */}
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">
            {MONTHS[month]}, {year}
          </h2>
          <div className="flex items-center gap-0.5">
            <button onClick={prevPeriod} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button onClick={nextPeriod} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Today */}
          <button onClick={goToday} className="text-xs text-white/60 hover:text-white border border-white/15 hover:border-white/30 px-2.5 py-1.5 rounded-lg transition-colors backdrop-blur-sm">
            Today
          </button>

          {/* View toggle */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 gap-0.5 backdrop-blur-sm">
            {(['month', 'week', 'day'] as CalView[]).map((v) => (
              <button
                key={v}
                onClick={() => { setView(v); try { localStorage.setItem('yugati_cal_view', v); } catch {} }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${view === v ? 'bg-white/20 text-white shadow-sm' : 'text-white/50 hover:text-white/80'}`}
              >
                {v === 'month' ? 'Monthly' : v === 'week' ? 'Weekly' : 'Daily'}
              </button>
            ))}
          </div>

          {/* New event */}
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-100 transition-colors shrink-0"
          >
            <Plus size={13} />
            New Schedule
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-w-0">
          {view === 'month' ? (
            <MonthGrid
              grid={grid}
              events={events}
              isLoading={isLoading}
              month={month}
              today={today}
              onDayClick={(d) => openCreate(d)}
              onDayDoubleClick={switchToDay}
              onEventClick={setSelectedEvent}
              onEventHover={showPreview}
              onEventHoverEnd={hidePreview}
              onDayHover={() => {}}
              onDayHoverEnd={() => {}}
            />
          ) : view === 'week' ? (
            <WeekView
              weekStart={weekStart}
              events={events}
              isLoading={isLoading}
              today={today}
              onDayClick={switchToDay}
              onHourClick={(d, time) => openCreate(d, time)}
              onEventClick={setSelectedEvent}
              onEventHover={showPreview}
              onEventHoverEnd={hidePreview}
            />
          ) : (
            <DayView
              date={selectedDate}
              events={eventsForDay(events, selectedDate)}
              isLoading={isLoading}
              isToday={isToday(selectedDate)}
              onHourClick={(time) => openCreate(selectedDate, time)}
              onEventClick={setSelectedEvent}
              onEventHover={showPreview}
              onEventHoverEnd={hidePreview}
            />
          )}
        </div>

        {/* Right sidebar — events for current view */}
        <aside className="w-64 shrink-0 border-l border-zinc-800/60 flex flex-col overflow-hidden bg-zinc-950/50">
          <div className="px-4 pt-4 pb-2 shrink-0 border-b border-zinc-800/40">
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Events</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">
              {view === 'month' ? MONTHS[month] : view === 'week' ? 'This week' : 'Today'}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {events.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-zinc-600">No events</p>
              </div>
            ) : (
              <div className="space-y-px px-2">
                {[...events].sort((a, b) => {
                  const ta = a.start?.dateTime ?? a.start?.date ?? '';
                  const tb = b.start?.dateTime ?? b.start?.date ?? '';
                  return ta.localeCompare(tb);
                }).map((ev) => {
                  const dt      = ev.start?.dateTime ? new Date(ev.start.dateTime) : null;
                  const isAllDay = !ev.start?.dateTime && !!ev.start?.date;
                  const time     = dt ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
                  const dateStr  = dt
                    ? dt.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
                    : ev.start?.date
                      ? new Date(ev.start.date + 'T00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
                      : null;
                  const hasMeet  = !!ev.hangoutLink;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="w-full flex items-start gap-2.5 px-2.5 py-2.5 rounded-xl hover:bg-zinc-800/60 transition-colors text-left group"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-[12px] font-medium text-zinc-200 group-hover:text-white truncate leading-snug">
                          {ev.summary ?? 'Untitled'}
                        </p>
                        {dateStr && (
                          <p className="text-[10px] text-zinc-500 truncate">{dateStr}{time ? ` · ${time}` : isAllDay ? ' · All day' : ''}</p>
                        )}
                        {hasMeet && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#1a73e8]/15 text-[#4285F4] border border-[#1a73e8]/25 leading-none mt-1">
                            <Video size={8} />
                            Meet
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Hover preview cards */}
      {preview?.kind === 'event' && (
        <EventPreviewCard
          event={preview.event}
          pos={preview.pos}
          onMouseEnter={cancelHide}
          onMouseLeave={hidePreview}
        />
      )}

      {/* Modals */}
      {modeOpen && (
        <CreateModePicker
          onAI={() => { setModeOpen(false); setAiOpen(true); }}
          onManual={() => { setModeOpen(false); setFormOpen(true); }}
          onClose={() => setModeOpen(false)}
        />
      )}
      {aiOpen && (
        <CalendarAIPanel
          defaultDate={defaultDate}
          userName={userName}
          onClose={() => setAiOpen(false)}
          onRefresh={() => void qc.invalidateQueries({ queryKey: trpc.calendar.listEvents.queryKey() })}
        />
      )}
      {formOpen && (
        <CreateEventModal
          defaultDate={defaultDate}
          defaultTime={defaultTime}
          onClose={() => setFormOpen(false)}
          onCreated={() => {
            void qc.invalidateQueries({ queryKey: trpc.calendar.listEvents.queryKey() });
            setFormOpen(false);
          }}
        />
      )}
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

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({
  weekStart, events, isLoading, today,
  onDayClick, onHourClick, onEventClick, onEventHover, onEventHoverEnd,
}: {
  weekStart: Date;
  events: CalEvent[];
  isLoading: boolean;
  today: Date;
  onDayClick: (d: Date) => void;
  onHourClick: (d: Date, time: string) => void;
  onEventClick: (e: CalEvent) => void;
  onEventHover: (e: CalEvent, pos: PreviewPos) => void;
  onEventHoverEnd: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const isToday = (d: Date) => isoDate(d) === isoDate(today);
  const todayIdx = weekDays.findIndex((d) => isToday(d));
  const HOURS_SHOWN = Array.from({ length: 24 }, (_, i) => i);

  function fmtHourLabel(h: number) {
    if (h === 0) return '';
    if (h === 12) return '12 PM';
    return h > 12 ? `${h - 12} PM` : `${h} AM`;
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isoDate(weekStart)]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day column headers */}
      <div className="shrink-0 border-b border-zinc-800/60 flex">
        <div className="w-16 shrink-0" />
        {weekDays.map((d, i) => {
          const todayCol = isToday(d);
          return (
            <div
              key={i}
              onClick={() => onDayClick(d)}
              className={`flex-1 py-3 text-center cursor-pointer hover:bg-zinc-900/40 transition-colors border-l border-zinc-800/40 ${todayCol ? 'bg-zinc-900/60' : ''}`}
            >
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                {WEEK_DAYS[i]}
              </p>
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors
                ${todayCol ? 'bg-blue-500 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}>
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex" style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}>
            {/* Time labels skeleton */}
            <div className="w-16 shrink-0 relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
              {[7,9,11,13,15,17,19].map((h) => (
                <div key={h} className="absolute w-full flex justify-end pr-3" style={{ top: h * HOUR_HEIGHT - 6 }}>
                  <div className="h-2.5 w-8 rounded bg-zinc-800 animate-pulse" />
                </div>
              ))}
            </div>
            {/* Day columns skeleton */}
            <div className="flex-1 grid grid-cols-7" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
              {Array.from({ length: 7 }).map((_, col) => (
                <div key={col} className="relative border-l border-zinc-800/40">
                  {/* Hour lines */}
                  {[7,9,11,13,15,17,19].map((h) => (
                    <div key={h} className="absolute inset-x-0 border-t border-zinc-800/30" style={{ top: h * HOUR_HEIGHT }} />
                  ))}
                  {/* Fake event skeletons */}
                  {col % 3 !== 2 && (
                    <div
                      className="absolute left-1 right-1 rounded-xl bg-zinc-800/60 animate-pulse"
                      style={{ top: (8 + col * 0.7) * HOUR_HEIGHT, height: HOUR_HEIGHT * 1.5 }}
                    />
                  )}
                  {col % 2 === 0 && (
                    <div
                      className="absolute left-1 right-1 rounded-xl bg-zinc-800/40 animate-pulse"
                      style={{ top: (13 + col * 0.4) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex" style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}>
            {/* Time labels */}
            <div className="w-16 shrink-0 relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
              {HOURS_SHOWN.map((h) => (
                <div
                  key={h}
                  className="absolute w-full flex items-start justify-end pr-3"
                  style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                >
                  {h !== 0 && (
                    <span className="text-[10px] text-zinc-600 -mt-2">
                      {fmtHourLabel(h)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div className="flex-1 grid grid-cols-7 relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
              {/* Today highlight — richer tint */}
              {todayIdx !== -1 && (
                <div
                  className="absolute top-0 bottom-0 bg-blue-500/[0.06] pointer-events-none z-0"
                  style={{ left: `${(todayIdx / 7) * 100}%`, width: `${(1 / 7) * 100}%` }}
                />
              )}

              {/* Hour rows — alternate bg for visual rhythm */}
              {HOURS_SHOWN.map((h) => (
                <div
                  key={h}
                  className={`absolute inset-x-0 ${h % 2 === 0 ? 'bg-zinc-900/20' : ''}`}
                  style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                />
              ))}

              {/* Hour grid lines */}
              {HOURS_SHOWN.map((h) => (
                <div
                  key={`line-${h}`}
                  className="absolute inset-x-0 border-t border-zinc-800/50"
                  style={{ top: h * HOUR_HEIGHT }}
                />
              ))}

              {/* Vertical dividers */}
              {weekDays.map((_, i) => (
                <div key={i} className={`border-l border-zinc-800/40 ${i === 0 ? 'border-l-0' : ''}`} />
              ))}

              {/* Current time line */}
              {todayIdx !== -1 && (
                <div
                  className="absolute z-20 flex items-center pointer-events-none"
                  style={{
                    top: (nowMinutes / 60) * HOUR_HEIGHT - 1,
                    left: `${(todayIdx / 7) * 100}%`,
                    width: `${(1 / 7) * 100}%`,
                  }}
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <div className="flex-1 h-px bg-red-500" />
                </div>
              )}

              {/* Events per day */}
              {weekDays.map((dayDate, colIdx) => {
                const dayEvents = eventsForDay(events, dayDate);
                const timedEvs  = dayEvents.filter((e) => !!e.start?.dateTime);
                const allDayEvs = dayEvents.filter((e) => !e.start?.dateTime);

                return (
                  <div key={colIdx} className="relative">
                    {/* All-day chips */}
                    {allDayEvs.map((ev) => {
                      const { dot: aDot } = eventAccent(ev.id);
                      return (
                        <button
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                          className="absolute top-1 left-1 right-1 z-10 text-left rounded-md bg-zinc-800/80 text-[10px] text-zinc-300 truncate font-medium hover:bg-zinc-700/80 transition-colors overflow-hidden flex items-center"
                        >
                          <span className={`w-[3px] self-stretch shrink-0 ${aDot} rounded-l-md`} />
                          <span className="px-1.5 py-1 truncate">{ev.summary ?? '(all day)'}</span>
                        </button>
                      );
                    })}

                    {/* Timed events */}
                    {timedEvs.map((ev) => {
                      if (!ev.start?.dateTime) return null;
                      const startMin = minutesFromMidnight(ev.start.dateTime);
                      const endMin   = ev.end?.dateTime ? minutesFromMidnight(ev.end.dateTime) : startMin + 60;
                      const top      = (startMin / 60) * HOUR_HEIGHT;
                      const height   = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT - 2, 22);
                      const { dot } = eventAccent(ev.id);
                      const isShort  = height < 44;

                      return (
                        <button
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                          onMouseEnter={(e) => onEventHover(ev, { x: e.clientX, y: e.clientY })}
                          onMouseMove={(e) => onEventHover(ev, { x: e.clientX, y: e.clientY })}
                          onMouseLeave={onEventHoverEnd}
                          className="absolute left-1 right-1 z-10 text-left rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 transition-colors overflow-hidden shadow-sm flex"
                          style={{ top: top + 1, height }}
                        >
                          <span className={`w-[3px] shrink-0 self-stretch ${dot} rounded-l-xl`} />
                          <span className="flex-1 min-w-0 px-2 py-1.5">
                          <p className={`font-semibold text-zinc-100 leading-tight truncate ${isShort ? 'text-[10px]' : 'text-xs'}`}>
                            {ev.summary ?? '(no title)'}
                          </p>
                          {!isShort && ev.start?.dateTime && (
                            <p className="text-[10px] text-zinc-500 mt-0.5">
                              {fmtTime(ev.start.dateTime)} – {fmtTime(ev.end?.dateTime)}
                            </p>
                          )}
                          {!isShort && ev.location && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin size={9} className="text-zinc-600 shrink-0" />
                              <span className="text-[10px] text-zinc-500 truncate">{ev.location}</span>
                            </div>
                          )}
                          {!isShort && (ev.attendees?.length ?? 0) > 0 && (
                            <div className="flex items-center gap-0.5 mt-1.5">
                              {(ev.attendees ?? []).slice(0, 3).map((a, i) => (
                                <span
                                  key={i}
                                  className={`w-4 h-4 rounded-full ${dot} text-[8px] font-bold text-white flex items-center justify-center -ml-0.5 first:ml-0 border border-zinc-800`}
                                >
                                  {(a.displayName ?? a.email ?? '?')[0]?.toUpperCase()}
                                </span>
                              ))}
                              {(ev.attendees?.length ?? 0) > 3 && (
                                <span className="text-[9px] text-zinc-500 ml-1">+{(ev.attendees?.length ?? 0) - 3}</span>
                              )}
                            </div>
                          )}
                          </span>
                        </button>
                      );
                    })}

                    {/* Click-to-create overlays */}
                    {HOURS_SHOWN.map((h) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 cursor-pointer"
                        style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                        onClick={(e) => { e.stopPropagation(); onHourClick(dayDate, `${String(h).padStart(2, '0')}:00`); }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Month grid ───────────────────────────────────────────────────────────────

function MonthGrid({
  grid, events, isLoading, month, today,
  onDayClick, onDayDoubleClick, onEventClick, onEventHover, onEventHoverEnd, onDayHover, onDayHoverEnd,
}: {
  grid: (Date | null)[][];
  events: CalEvent[];
  isLoading: boolean;
  month: number;
  today: Date;
  onDayClick: (d: Date) => void;
  onDayDoubleClick: (d: Date) => void;
  onEventClick: (e: CalEvent) => void;
  onEventHover: (e: CalEvent, pos: PreviewPos) => void;
  onEventHoverEnd: () => void;
  onDayHover: (d: Date, evs: CalEvent[], pos: PreviewPos) => void;
  onDayHoverEnd: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-7 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-zinc-400">{d}</div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="border-r border-b border-zinc-800/60 min-h-28 p-2 space-y-1.5">
              <div className="h-4 w-5 rounded bg-zinc-800 animate-pulse" />
              {i % 7 === 2 && <div className="h-5 rounded-md bg-zinc-800/80 animate-pulse" />}
              {i % 7 === 4 && <div className="h-5 rounded-md bg-zinc-800/60 animate-pulse" />}
              {i % 5 === 0 && <div className="h-5 rounded-md bg-zinc-800/70 animate-pulse" />}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {grid.flatMap((week, wi) =>
            week.map((d, di) => {
              const isToday_  = d && isoDate(d) === isoDate(today);
              const isOtherM  = d && d.getMonth() !== month;
              const dayEvents = d ? eventsForDay(events, d) : [];
              const overflow  = dayEvents.length - 3;

              return (
                <div
                  key={`${wi}-${di}`}
                  onClick={() => d && onDayClick(d)}
                  onDoubleClick={() => d && onDayDoubleClick(d)}
                  onMouseEnter={(e) => d && onDayHover(d, eventsForDay(events, d), { x: e.clientX, y: e.clientY })}
                  onMouseMove={(e) => d && onDayHover(d, eventsForDay(events, d), { x: e.clientX, y: e.clientY })}
                  onMouseLeave={onDayHoverEnd}
                  className={`border-r border-b border-zinc-800/60 min-h-28 p-1.5 cursor-pointer hover:bg-zinc-900/40 transition-colors
                    ${di === 6 ? 'border-r-0' : ''}`}
                >
                  {d && (
                    <>
                      <div className="flex justify-end mb-1">
                        <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium
                          ${isToday_ ? 'bg-blue-500 text-white' : isOtherM ? 'text-zinc-600' : 'text-zinc-200'}`}>
                          {d.getDate()}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <button
                            key={ev.id}
                            onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                            onMouseEnter={(e) => onEventHover(ev, { x: e.clientX, y: e.clientY })}
                            onMouseMove={(e) => onEventHover(ev, { x: e.clientX, y: e.clientY })}
                            onMouseLeave={onEventHoverEnd}
                            className={`w-full text-left px-2 py-1 rounded-md text-xs truncate font-medium ${eventAccent(ev.id).chip}`}
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
  );
}

// ─── Day view ─────────────────────────────────────────────────────────────────

function DayView({
  date, events, isLoading, isToday, onHourClick, onEventClick, onEventHover, onEventHoverEnd,
}: {
  date: Date;
  events: CalEvent[];
  isLoading: boolean;
  isToday: boolean;
  onHourClick: (time: string) => void;
  onEventClick: (e: CalEvent) => void;
  onEventHover: (e: CalEvent, pos: PreviewPos) => void;
  onEventHoverEnd: () => void;
}) {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const now        = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = isToday ? Math.max(nowMinutes - 60, 0) : 8 * 60;
    el.scrollTop = (target / 60) * HOUR_HEIGHT;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date.toDateString()]);

  const allDayEvents = events.filter((e) => !e.start?.dateTime);
  const timedEvents  = events.filter((e) => !!e.start?.dateTime);

  type LayoutEvent = CalEvent & { col: number; cols: number; top: number; height: number };
  const laid = useMemo<LayoutEvent[]>(() => {
    const sorted = [...timedEvents].sort((a, b) => {
      const am = minutesFromMidnight(a.start!.dateTime!);
      const bm = minutesFromMidnight(b.start!.dateTime!);
      return am - bm;
    });

    const result: LayoutEvent[] = [];
    const cols: LayoutEvent[][] = [];

    for (const ev of sorted) {
      const start  = minutesFromMidnight(ev.start!.dateTime!);
      const endRaw = ev.end?.dateTime ? minutesFromMidnight(ev.end.dateTime) : start + 60;
      const end    = Math.max(endRaw, start + 30);
      const top    = (start / 60) * HOUR_HEIGHT;
      const height = Math.max(((end - start) / 60) * HOUR_HEIGHT, 24);

      let colIdx = cols.findIndex((col) => {
        const last = col[col.length - 1]!;
        const lastEnd = last.top + last.height;
        return top >= lastEnd;
      });
      if (colIdx === -1) { colIdx = cols.length; cols.push([]); }
      const item: LayoutEvent = { ...ev, col: colIdx, cols: 1, top, height };
      cols[colIdx]!.push(item);
      result.push(item);
    }

    for (const item of result) {
      let maxCols = item.col + 1;
      for (const other of result) {
        if (other === item) continue;
        const aEnd = item.top + item.height;
        const bEnd = other.top + other.height;
        if (item.top < bEnd && aEnd > other.top) {
          maxCols = Math.max(maxCols, other.col + 1);
        }
      }
      item.cols = maxCols;
    }

    return result;
  }, [timedEvents]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {allDayEvents.length > 0 && (
        <div className="shrink-0 border-b border-zinc-800 px-4 py-2 flex items-start gap-2">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider pt-0.5 w-12 shrink-0 text-right pr-3">all‑day</span>
          <div className="flex flex-wrap gap-1.5">
            {allDayEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${eventColor(ev.id)}`}
              >
                {ev.summary ?? '(no title)'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex" style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}>
            <div className="w-16 shrink-0 relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
              {[7,9,11,13,15,17,19].map((h) => (
                <div key={h} className="absolute w-full flex justify-end pr-3" style={{ top: h * HOUR_HEIGHT - 6 }}>
                  <div className="h-2.5 w-8 rounded bg-zinc-800 animate-pulse" />
                </div>
              ))}
            </div>
            <div className="flex-1 border-l border-zinc-800/40 relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
              {[7,9,11,13,15,17,19].map((h) => (
                <div key={h} className="absolute inset-x-0 border-t border-zinc-800/30" style={{ top: h * HOUR_HEIGHT }} />
              ))}
              <div className="absolute left-2 right-2 rounded-xl bg-zinc-800/60 animate-pulse" style={{ top: 9 * HOUR_HEIGHT, height: HOUR_HEIGHT * 1.5 }} />
              <div className="absolute left-2 right-2 rounded-xl bg-zinc-800/40 animate-pulse" style={{ top: 13 * HOUR_HEIGHT, height: HOUR_HEIGHT }} />
              <div className="absolute left-2 right-2 rounded-xl bg-zinc-800/50 animate-pulse" style={{ top: 15.5 * HOUR_HEIGHT, height: HOUR_HEIGHT * 2 }} />
            </div>
          </div>
        ) : (
          <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute inset-x-0 flex items-start group"
                style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                onClick={() => onHourClick(`${String(h).padStart(2, '0')}:00`)}
              >
                <div className="w-16 shrink-0 pr-3 pt-0 text-right">
                  {h !== 0 && (
                    <span className="text-[10px] text-zinc-600 -mt-2.5 inline-block">
                      {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                    </span>
                  )}
                </div>
                <div className="flex-1 border-t border-zinc-800/60 h-full cursor-pointer group-hover:bg-zinc-900/20 transition-colors" />
              </div>
            ))}

            {isToday && (
              <div
                className="absolute inset-x-0 z-20 flex items-center pointer-events-none"
                style={{ top: (nowMinutes / 60) * HOUR_HEIGHT - 1 }}
              >
                <div className="w-16 shrink-0 flex justify-end pr-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                </div>
                <div className="flex-1 h-px bg-red-500" />
              </div>
            )}

            <div className="absolute inset-y-0 left-16 right-2">
              {laid.map((ev) => {
                const w    = `calc(${(1 / ev.cols) * 100}% - 4px)`;
                const left = `calc(${(ev.col / ev.cols) * 100}% + 2px)`;
                return (
                  <button
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    onMouseEnter={(e) => onEventHover(ev, { x: e.clientX, y: e.clientY })}
                    onMouseMove={(e) => onEventHover(ev, { x: e.clientX, y: e.clientY })}
                    onMouseLeave={onEventHoverEnd}
                    className={`absolute rounded-lg px-2 py-1 text-left overflow-hidden ${eventColor(ev.id)} hover:brightness-110 transition-all shadow-sm`}
                    style={{ top: ev.top + 1, height: ev.height - 2, width: w, left }}
                  >
                    <p className={`font-medium text-current leading-tight truncate ${ev.height < 40 ? 'text-[10px]' : 'text-xs'}`}>
                      {ev.summary ?? '(no title)'}
                    </p>
                    {ev.height >= 40 && ev.start?.dateTime && (
                      <p className="text-[10px] opacity-70 mt-0.5">
                        {fmtTime(ev.start.dateTime)} – {fmtTime(ev.end?.dateTime)}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create Mode Picker ───────────────────────────────────────────────────────

function CreateModePicker({ onAI, onManual, onClose }: { onAI: () => void; onManual: () => void; onClose: () => void }) {
  return (
    <Overlay onClose={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-white">Create event</h3>
          <CloseBtn onClick={onClose} />
        </div>
        <p className="px-5 pb-4 text-xs text-zinc-500">How would you like to create this event?</p>
        <div className="px-4 pb-5 flex flex-col gap-2.5">
          <ModeCard
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
            title="Ask AI"
            desc="Describe what you need in plain language and let the assistant handle the details."
            onClick={onAI}
          />
          <ModeCard
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
            title="Fill in manually"
            desc="Set the title, time, guests, and other details yourself using a form."
            onClick={onManual}
          />
        </div>
      </div>
    </Overlay>
  );
}

function ModeCard({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-start gap-4 px-4 py-4 rounded-xl border border-zinc-800 hover:border-zinc-600 bg-zinc-900/50 hover:bg-zinc-900 transition-all text-left"
    >
      <div className="w-9 h-9 rounded-xl bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center shrink-0 transition-colors text-zinc-300">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </button>
  );
}

// ─── Create Event Modal ───────────────────────────────────────────────────────

const COLOR_SWATCHES = [
  { id: '1',  bg: 'bg-blue-500',    ring: 'ring-blue-400'    },
  { id: '2',  bg: 'bg-violet-500',  ring: 'ring-violet-400'  },
  { id: '3',  bg: 'bg-emerald-500', ring: 'ring-emerald-400' },
  { id: '4',  bg: 'bg-rose-500',    ring: 'ring-rose-400'    },
  { id: '5',  bg: 'bg-amber-500',   ring: 'ring-amber-400'   },
  { id: '6',  bg: 'bg-cyan-500',    ring: 'ring-cyan-400'    },
  { id: '7',  bg: 'bg-pink-500',    ring: 'ring-pink-400'    },
  { id: '8',  bg: 'bg-indigo-500',  ring: 'ring-indigo-400'  },
  { id: '9',  bg: 'bg-teal-500',    ring: 'ring-teal-400'    },
  { id: '10', bg: 'bg-orange-500',  ring: 'ring-orange-400'  },
];

function CreateEventModal({
  defaultDate, defaultTime, onClose, onCreated,
}: {
  defaultDate: string; defaultTime?: string; onClose: () => void; onCreated: () => void;
}) {
  const trpc = useTRPC();

  const [title,      setTitle]      = useState('');
  const [date,       setDate]       = useState(defaultDate);
  const [startTime,  setStartTime]  = useState(defaultTime || '09:00');
  const [endTime,    setEndTime]    = useState(() => {
    if (!defaultTime) return '10:00';
    const [h, m] = defaultTime.split(':').map(Number);
    const end = new Date(2000, 0, 1, h!, m! + 60);
    return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
  });
  const [allDay,     setAllDay]     = useState(false);
  const [desc,       setDesc]       = useState('');
  const [attendees,  setAttendees]  = useState('');
  const [addMeet,    setAddMeet]    = useState(false);
  const [colorId,    setColorId]    = useState('1');
  const [showDesc,   setShowDesc]   = useState(false);
  const [showGuests, setShowGuests] = useState(false);
  const [formError,  setFormError]  = useState('');

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const mutation = useMutation(
    trpc.calendar.createEvent.mutationOptions({
      onSuccess: onCreated,
      onError:   (e) => setFormError(e.message),
    }),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setFormError('Title is required'); return; }
    if (!date)         { setFormError('Date is required');  return; }
    setFormError('');

    const attendeeList = attendees.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).map((email) => ({ email }));
    const base = {
      summary: title.trim(), description: desc || undefined,
      attendees: attendeeList.length ? attendeeList : undefined,
      addMeet: addMeet || undefined, colorId, sendUpdates: 'all' as const,
    };

    if (allDay) {
      mutation.mutate({ ...base, start: { date }, end: { date } });
    } else {
      mutation.mutate({
        ...base,
        start: { dateTime: toLocalISO(date, startTime), timeZone: tz },
        end:   { dateTime: toLocalISO(date, endTime),   timeZone: tz },
      });
    }
  }

  const inputCls = 'w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-600';

  return (
    <Overlay onClose={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-[420px] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h3 className="text-base font-semibold text-white">New event</h3>
          <CloseBtn onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3">
          <input
            autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="w-full bg-transparent border-b border-zinc-800 focus:border-zinc-500 outline-none text-lg font-medium placeholder:text-zinc-700 pb-2.5 transition-colors text-white"
          />

          <div className="flex items-center gap-1.5 py-0.5">
            {COLOR_SWATCHES.map((c) => (
              <button key={c.id} type="button" onClick={() => setColorId(c.id)}
                className={`w-5 h-5 rounded-full ${c.bg} transition-all ${colorId === c.id ? `ring-2 ring-offset-1 ring-offset-zinc-950 ${c.ring} scale-110` : 'opacity-60 hover:opacity-90'}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} flex-1`} />
            <button type="button" onClick={() => setAllDay((v) => !v)}
              className={`shrink-0 px-3 py-2.5 rounded-xl text-xs font-medium border transition-colors
                ${allDay ? 'bg-blue-500/15 border-blue-500/40 text-blue-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
            >
              All day
            </button>
          </div>

          {!allDay && (
            <div className="flex items-center gap-2">
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={`${inputCls} flex-1`} />
              <span className="text-zinc-700 text-xs font-medium shrink-0">to</span>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={`${inputCls} flex-1`} />
            </div>
          )}

          <button type="button" onClick={() => setAddMeet((v) => !v)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-colors
              ${addMeet ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
          >
            <Video size={13} className={addMeet ? 'text-blue-400' : 'text-zinc-600'} />
            <span className="flex-1 text-left text-xs">Add Google Meet link</span>
            <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${addMeet ? 'bg-blue-500' : 'bg-zinc-700'}`}>
              <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${addMeet ? 'translate-x-4' : ''}`} />
            </div>
          </button>

          <Expandable icon={<AlignLeft size={12} />} label="description" show={showDesc} onToggle={() => setShowDesc((v) => !v)}>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's this event about?" rows={2} className={`${inputCls} mt-2 resize-none`} />
          </Expandable>

          <Expandable icon={<UserPlus size={12} />} label="guests" show={showGuests} onToggle={() => setShowGuests((v) => !v)}>
            <textarea value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="email@example.com, another@example.com" rows={2} className={`${inputCls} mt-2 resize-none`} />
          </Expandable>

          {formError && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{formError}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 transition-colors"
            >
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 transition-colors disabled:opacity-40"
            >
              {mutation.isPending ? 'Creating…' : 'Create event'}
            </button>
          </div>
        </form>
      </div>
    </Overlay>
  );
}

// ─── Event Detail ─────────────────────────────────────────────────────────────

function EventDetail({ event, onClose, onDelete, deleting }: {
  event: CalEvent; onClose: () => void; onDelete: (id: string) => void; deleting: boolean;
}) {
  return (
    <Overlay onClose={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold truncate">{event.summary ?? '(no title)'}</h3>
          <CloseBtn onClick={onClose} size={16} />
        </div>
        <div className="p-5 space-y-3">
          {(event.start?.dateTime || event.start?.date) && (
            <Row icon={<Clock size={13} />}>
              {event.start.dateTime
                ? `${fmtDateTime(event.start.dateTime)} → ${fmtTime(event.end?.dateTime)}`
                : event.start.date}
            </Row>
          )}
          {event.location && <Row icon={<MapPin size={13} />}>{event.location}</Row>}
          {event.attendees?.length ? (
            <Row icon={<Users size={13} />}>
              <span className="text-xs text-zinc-400">{event.attendees.map((a) => a.displayName ?? a.email).join(', ')}</span>
            </Row>
          ) : null}
          {event.hangoutLink && (
            <a href={event.hangoutLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600/20 border border-blue-600/30 text-blue-400 text-xs font-medium hover:bg-blue-600/30 transition-colors"
            >
              <Video size={13} /> Join Google Meet <ExternalLink size={11} className="ml-auto" />
            </a>
          )}
          {event.description && <DescriptionText text={event.description} />}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          {event.htmlLink && (
            <a href={event.htmlLink} target="_blank" rel="noopener noreferrer"
              className="flex-1 py-2 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors text-center"
            >
              Open in Google Calendar
            </a>
          )}
          {event.id && (
            <button onClick={() => event.id && onDelete(event.id)} disabled={deleting}
              className="flex items-center gap-1.5 py-2 px-3 rounded-lg border border-zinc-700 text-xs text-red-400 hover:bg-red-900/20 hover:border-red-800 transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} /> {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </Overlay>
  );
}

// ─── Calendar AI Panel ────────────────────────────────────────────────────────

type AIPanelMsg = { id: string; role: 'user' | 'assistant'; content: string; streaming?: boolean };
function uid() { return Math.random().toString(36).slice(2, 10); }

const CAL_CHIPS = [
  { label: "Today's agenda",         prompt: "What's on my calendar today?"              },
  { label: 'Schedule meeting',       prompt: 'Help me schedule a meeting'                },
  { label: 'Summarize emails',       prompt: 'Summarize my unread emails'                },
  { label: 'Find free slots',        prompt: 'When am I free this week?'                 },
  { label: 'Create task from email', prompt: 'Create a task list from my recent emails'  },
];

const FILLER_CAL = [
  'Checking your calendar…',
  'Looking up your schedule…',
  'Scanning your events…',
  'Reviewing upcoming meetings…',
  'Fetching calendar data…',
  'Checking for conflicts…',
  'Looking at your availability…',
  'Analysing your schedule…',
  'Almost there…',
];

function useFillerCal(active: boolean) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 1800);
    return () => clearInterval(id);
  }, [active]);
  return FILLER_CAL[tick % FILLER_CAL.length]!;
}

// ─── Calendar success card (same as chat-view) ────────────────────────────────

interface CalSuccess { title?: string; datetime?: string; attendees?: string; calendarLink?: string; }

function parseCalSuccess(content: string): CalSuccess | null {
  if (!/(has been scheduled|successfully scheduled|event.*scheduled|scheduled.*event)/i.test(content)) return null;
  const lines = content.split('\n');
  let title: string | undefined, datetime: string | undefined, attendees: string | undefined, calendarLink: string | undefined;
  for (const line of lines) {
    const s   = line.replace(/^[-*•]\s*/, '').trim();
    const get = (rx: RegExp) => { const m = s.match(rx); return m ? s.slice(m[0].length).trim() : null; };
    title    = get(/^(?:\*\*)?(?:event|title|summary)(?:\*\*)?:\s*/i) ?? title;
    datetime = get(/^(?:\*\*)?date\s*(?:[&+]|and)?\s*time(?:\*\*)?:\s*/i) ?? datetime;
    attendees = get(/^(?:\*\*)?attendees?(?:\*\*)?:\s*/i) ?? attendees;
    const lm = s.match(/https?:\/\/calendar\.google\.com[^\s)>\]"]*/i);
    if (lm) calendarLink = lm[0];
  }
  return { title, datetime, attendees, calendarLink };
}

function CalSuccessCard({ details }: { details: CalSuccess }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <div className="relative flex items-center justify-center w-24 h-24">
        <motion.div className="absolute rounded-full bg-green-500/15"
          initial={{ width: 48, height: 48, opacity: 0.8 }} animate={{ width: 96, height: 96, opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.4 }} />
        <motion.div className="absolute rounded-full bg-green-500/10"
          initial={{ width: 48, height: 48, opacity: 0.6 }} animate={{ width: 96, height: 96, opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.4, delay: 0.35 }} />
        <motion.div className="relative z-10 w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_24px_rgba(34,197,94,0.4)]"
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.05 }}>
          <motion.svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <motion.path d="M7 14.5l5 5 9-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }} />
          </motion.svg>
        </motion.div>
      </div>
      <motion.p className="text-sm font-semibold text-zinc-200"
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        Meeting scheduled!
      </motion.p>
      {(details.title ?? details.datetime ?? details.attendees) && (
        <motion.div className="w-full mt-2 rounded-xl border border-zinc-800/60 bg-zinc-800/30 text-xs divide-y divide-zinc-800/50"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
          {details.title    && <div className="flex gap-3 px-4 py-2.5"><span className="w-16 shrink-0 text-zinc-500 font-medium uppercase tracking-wider">Event</span><span className="text-zinc-300 font-medium">{details.title}</span></div>}
          {details.datetime && <div className="flex gap-3 px-4 py-2.5"><span className="w-16 shrink-0 text-zinc-500 font-medium uppercase tracking-wider">When</span><span className="text-zinc-300">{details.datetime}</span></div>}
          {details.attendees && <div className="flex gap-3 px-4 py-2.5"><span className="w-16 shrink-0 text-zinc-500 font-medium uppercase tracking-wider">Who</span><span className="text-zinc-300 break-all">{details.attendees}</span></div>}
          {details.calendarLink && (
            <div className="flex gap-3 px-4 py-2.5">
              <span className="w-16 shrink-0 text-zinc-500 font-medium uppercase tracking-wider">Link</span>
              <a href={details.calendarLink} target="_blank" rel="noopener noreferrer" className="text-[#4285F4] hover:underline truncate">Open in Google Calendar →</a>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Markdown renderer (same as chat-view) ────────────────────────────────────

function CalMdContent({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-base font-bold text-zinc-100 mt-4 mb-2 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold text-zinc-100 mt-3 mb-1.5 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold text-zinc-200 mt-3 mb-1 first:mt-0">{children}</h3>,
          p:  ({ children }) => <p className="text-sm text-zinc-100 leading-relaxed mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          em: ({ children }) => <em className="italic text-zinc-300">{children}</em>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1.5 mb-2 text-sm text-zinc-100">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1.5 mb-2 text-sm text-zinc-100">{children}</ol>,
          li: ({ children }) => <li className="text-zinc-100 leading-relaxed">{children}</li>,
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            return isBlock
              ? <pre className="bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-3.5 overflow-x-auto my-3"><code className="text-xs text-zinc-300 font-mono">{children}</code></pre>
              : <code className="bg-zinc-800/70 text-zinc-300 font-mono text-[11px] px-1.5 py-0.5 rounded-md border border-zinc-700/40">{children}</code>;
          },
          blockquote: ({ children }) => <blockquote className="border-l-2 border-zinc-600 pl-3.5 text-zinc-400 italic my-2 rounded-r-lg bg-white/[0.03] py-1">{children}</blockquote>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer"
              className="text-[#4f80c9] hover:text-[#6b97d8] underline underline-offset-2">{children}</a>
          ),
          hr: () => <hr className="border-zinc-800 my-4" />,
        }}
      >
        {content}
      </ReactMarkdown>
      {streaming && <span className="inline-block w-1.5 h-4 bg-zinc-500 ml-0.5 animate-pulse align-middle rounded-full" />}
    </div>
  );
}

function CalendarAIPanel({ defaultDate, userName, onClose, onRefresh }: {
  defaultDate: string; userName?: string; onClose: () => void; onRefresh: () => void;
}) {
  const firstName   = userName?.split(' ')[0];
  const h           = new Date().getHours();
  const tod         = h >= 22 || h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  const greet       = { night: 'Good evening', morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' }[tod];
  const initGreet   = firstName ? `${greet}, ${firstName}.` : `${greet}.`;
  const formattedDate = defaultDate
    ? new Date(`${defaultDate}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
    : '';

  const [messages, setMessages] = useState<AIPanelMsg[]>([
    { id: 'init', role: 'assistant', content: `${initGreet}\nHow can I help with your calendar?` },
  ]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);
  const filler    = useFillerCal(loading);

  async function copyMessage(id: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function submit(text: string) {
    if (!text.trim() || loading) return;
    setInput('');
    const context = defaultDate ? `${text.trim()}\n\n(I have ${formattedDate} open in my calendar.)` : text.trim();
    const userMsg: AIPanelMsg      = { id: uid(), role: 'user',      content: text.trim() };
    const assistantMsg: AIPanelMsg = { id: uid(), role: 'assistant', content: '', streaming: true };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setLoading(true);

    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const history = [...messages, userMsg].filter((m) => !m.streaming).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.id === 'init' ? m.content : m.role === 'user' && m.id === userMsg.id ? context : m.content,
      }));
      const res = await fetch('/api/agent/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: abort.signal, body: JSON.stringify({ messages: history, agentMode: 'auto' }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, content: err.error ?? 'Something went wrong.', streaming: false } : m));
        return;
      }
      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '', accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6)) as { type: string; text?: string };
            if (data.type === 'delta' && data.text) {
              accumulated += data.text;
              const snap = accumulated;
              setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, content: snap } : m));
            }
            if (data.type === 'done') {
              setMessages((prev) => {
                const msg = prev.find((m) => m.id === assistantMsg.id);
                if (!msg?.content?.trim()) return prev.filter((m) => m.id !== assistantMsg.id);
                return prev.map((m) => m.id === assistantMsg.id ? { ...m, streaming: false } : m);
              });
              onRefresh();
            }
          } catch { /* partial */ }
        }
      }
      setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, streaming: false } : m));
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, content: 'Request failed. Please try again.', streaming: false } : m));
      }
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col items-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors z-10">
        <X size={16} />
      </button>
      <div className="flex-1 overflow-y-auto p-8 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="inline-flex items-center gap-1.5 text-xs text-zinc-300 border border-zinc-700 rounded-full px-3 py-1.5 mb-6">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>Calendar</span>
          {formattedDate && <><span className="text-zinc-600">·</span><span>{formattedDate}</span></>}
        </div>
        <div className="flex flex-wrap gap-2.5 mb-6">
          {CAL_CHIPS.map(({ label, prompt }) => (
            <button key={label} onClick={() => void submit(prompt)} disabled={loading}
              className="px-4 py-2 rounded-xl border border-zinc-700 text-sm text-zinc-200 hover:bg-zinc-800 hover:border-zinc-500 transition-colors disabled:opacity-40"
            >{label}</button>
          ))}
        </div>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={msg.role === 'user' ? 'flex justify-end' : ''}>
              {msg.role === 'assistant' ? (
                <div className="group/msg">
                  <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-2xl px-5 py-4 max-w-2xl">
                    {msg.streaming && !msg.content ? (
                      <p className="text-sm text-zinc-500 animate-pulse">{filler}</p>
                    ) : (() => {
                      const success = !msg.streaming ? parseCalSuccess(msg.content) : null;
                      return success
                        ? <CalSuccessCard details={success} />
                        : <CalMdContent content={msg.content} streaming={msg.streaming} />;
                    })()}
                  </div>
                  {!msg.streaming && msg.content && (
                    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                      <button
                        onClick={() => void copyMessage(msg.id, msg.content)}
                        title="Copy"
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
                      >
                        {copiedId === msg.id
                          ? <Check size={13} className="text-green-400" />
                          : <Copy size={13} />}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-xs bg-zinc-700/70 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-zinc-100">{msg.content}</div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="px-8 py-5 max-w-2xl w-full shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-700 rounded-2xl px-4 py-3">
          <input
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(input); } }}
            placeholder={`Ask about your calendar${formattedDate ? ` for ${formattedDate}` : ''}…`}
            disabled={loading} autoFocus
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none disabled:opacity-50"
          />
          <button onClick={() => void submit(input)} disabled={loading || !input.trim()}
            className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center hover:bg-zinc-200 transition-colors disabled:opacity-30 shrink-0"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <ArrowUp size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Hover preview state ──────────────────────────────────────────────────────

type PreviewPos = { x: number; y: number };
type PreviewPayload =
  | { kind: 'event'; event: CalEvent; pos: PreviewPos }
  | { kind: 'day';   date: Date; events: CalEvent[]; pos: PreviewPos };

function useEventPreview() {
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((event: CalEvent, pos: PreviewPos) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setPreview({ kind: 'event', event, pos });
  }, []);

  const showDay = useCallback((date: Date, events: CalEvent[], pos: PreviewPos) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setPreview({ kind: 'day', date, events, pos });
  }, []);

  const hide = useCallback(() => {
    hideTimer.current = setTimeout(() => setPreview(null), 80);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  return { preview, show, showDay, hide, cancelHide };
}

function EventPreviewCard({
  event, pos, onMouseEnter, onMouseLeave,
}: {
  event: CalEvent;
  pos: PreviewPos;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [adjusted, setAdjusted] = useState(pos);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = pos.x + 12;
    let y = pos.y - 8;
    if (x + width > vw - 16)  x = pos.x - width - 12;
    if (y + height > vh - 16) y = vh - height - 16;
    if (y < 8) y = 8;
    setAdjusted({ x, y });
  }, [pos]);

  const startDt = event.start?.dateTime;
  const endDt   = event.end?.dateTime;
  const isAllDay = !startDt && !!event.start?.date;

  const timeStr = startDt
    ? `${fmtTime(startDt)}${endDt ? ` – ${fmtTime(endDt)}` : ''}`
    : isAllDay ? 'All day' : '';

  const { dot } = eventAccent(event.id);
  const firstAttendee = event.attendees?.[0];
  const avatarLabel = (firstAttendee?.displayName ?? firstAttendee?.email ?? '?')[0]?.toUpperCase();

  return (
    <div
      ref={cardRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-[100] w-64 bg-zinc-900/95 border border-zinc-700/60 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden pointer-events-auto flex backdrop-blur-sm"
      style={{ left: adjusted.x, top: adjusted.y }}
    >
      {/* Left accent strip */}
      <div className={`w-[5px] shrink-0 ${dot}`} />

      {/* Content */}
      <div className="flex-1 min-w-0 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug truncate">
            {event.summary ?? '(no title)'}
          </p>
          {timeStr && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Clock size={11} className="text-zinc-500 shrink-0" />
              <span className="text-[11px] text-zinc-400">{timeStr}</span>
            </div>
          )}
          {!timeStr && isAllDay && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Clock size={11} className="text-zinc-500 shrink-0" />
              <span className="text-[11px] text-zinc-400">All day</span>
            </div>
          )}
        </div>

        {/* Avatar */}
        {firstAttendee && (
          <div className={`w-8 h-8 rounded-full ${dot} shrink-0 flex items-center justify-center text-[11px] font-bold text-white shadow-sm`}>
            {avatarLabel}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function DescriptionText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const URL_RE = /https?:\/\/[^\s<>"]+/g;

  while ((match = URL_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(<span key={last}>{text.slice(last, match.index)}</span>);
    }
    const url = match[0];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-blue-400 hover:text-blue-300 underline underline-offset-2 break-all transition-colors"
      >
        {url}
      </a>
    );
    last = match.index + url.length;
  }

  if (last < text.length) parts.push(<span key={last}>{text.slice(last)}</span>);

  return (
    <p className="text-xs text-zinc-400 whitespace-pre-wrap break-words leading-relaxed">
      {parts}
    </p>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
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

function CloseBtn({ onClick, size = 14 }: { onClick: () => void; size?: number }) {
  return (
    <button onClick={onClick} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
      <X size={size} />
    </button>
  );
}

function Expandable({ icon, label, show, onToggle, children }: {
  icon: React.ReactNode; label: string; show: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div>
      <button type="button" onClick={onToggle} className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        {icon}
        {show ? `Hide ${label}` : `Add ${label}`}
        <ChevronDown size={11} className={`transition-transform ${show ? 'rotate-180' : ''}`} />
      </button>
      {show && children}
    </div>
  );
}
