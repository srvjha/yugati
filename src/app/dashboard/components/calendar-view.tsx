'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import {
  ChevronLeft, ChevronRight, Plus, Plug, Video, X, Clock, MapPin,
  Users, Trash2, ExternalLink, AlignLeft, UserPlus, ChevronDown, ArrowUp, Loader2,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

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

type CalView = 'month' | 'day';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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

function isoDate(d: Date) { return d.toISOString().split('T')[0]!; }

function eventsForDay(events: CalEvent[], date: Date): CalEvent[] {
  const ds = isoDate(date);
  return events.filter((e) => {
    const start = e.start?.dateTime ? e.start.dateTime.split('T')[0] : e.start?.date;
    return start === ds;
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
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDateTime(dt?: string) {
  if (!dt) return '';
  return new Date(dt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Event colors ─────────────────────────────────────────────────────────────

const EVENT_COLORS = [
  'bg-blue-600',   'bg-indigo-600', 'bg-violet-600', 'bg-emerald-600',
  'bg-rose-600',   'bg-amber-600',  'bg-cyan-600',   'bg-pink-600',
  'bg-teal-600',   'bg-orange-600', 'bg-lime-600',
];

const EVENT_COLORS_SOLID = [
  'bg-blue-500',   'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-rose-500',   'bg-amber-500',  'bg-cyan-500',   'bg-pink-500',
  'bg-teal-500',   'bg-orange-500', 'bg-lime-500',
];

function eventColor(id?: string, solid = false) {
  const palette = solid ? EVENT_COLORS_SOLID : EVENT_COLORS;
  if (!id) return palette[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CalendarView({ userName }: { userName?: string }) {
  const trpc = useTRPC();
  const qc   = useQueryClient();

  const today = useMemo(() => new Date(), []);
  const [view,  setView]  = useState<CalView>('month');
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [day,   setDay]   = useState(today.getDate());

  const { preview, show: showPreview, showDay: showDayPreview, hide: hidePreview, cancelHide } = useEventPreview();

  const [modeOpen,      setModeOpen]      = useState(false);
  const [aiOpen,        setAiOpen]        = useState(false);
  const [formOpen,      setFormOpen]      = useState(false);
  const [defaultDate,   setDefaultDate]   = useState('');
  const [defaultTime,   setDefaultTime]   = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  // Fetch full month (for month view) or just the selected day (for day view)
  const timeMin = view === 'month'
    ? new Date(year, month, 1).toISOString()
    : new Date(year, month, day, 0, 0, 0).toISOString();
  const timeMax = view === 'month'
    ? new Date(year, month + 1, 0, 23, 59, 59).toISOString()
    : new Date(year, month, day, 23, 59, 59).toISOString();

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
    } else {
      const d = new Date(year, month, day - 1);
      setYear(d.getFullYear()); setMonth(d.getMonth()); setDay(d.getDate());
    }
  }

  function nextPeriod() {
    if (view === 'month') {
      if (month === 11) { setMonth(0); setYear((y) => y + 1); }
      else setMonth((m) => m + 1);
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
      <header className="h-14 shrink-0 border-b border-zinc-800 px-6 flex items-center gap-3">
        <button
          onClick={() => openCreate()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-medium hover:bg-zinc-200 transition-colors shrink-0"
        >
          <Plus size={13} />
          New event
        </button>

        <div className="flex items-center gap-1">
          <button onClick={prevPeriod} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
            <ChevronLeft size={15} />
          </button>
          <button onClick={nextPeriod} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>

        <h2 className="text-sm font-semibold">
          {view === 'month'
            ? `${MONTHS[month]} ${year}`
            : `${DAYS[selectedDate.getDay()]}, ${MONTHS_SHORT[month]} ${day}, ${year}`}
        </h2>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={goToday}
            className="text-xs text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-500 px-2.5 py-1 rounded-lg transition-colors"
          >
            Today
          </button>

          {/* View switcher */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            {(['month', 'day'] as CalView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize
                  ${view === v ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {v}
              </button>
            ))}
          </div>

          <ThemeToggle />
        </div>
      </header>

      {/* Body */}
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
          onDayHover={(d, evs, pos) => showDayPreview(d, evs, pos)}
          onDayHoverEnd={hidePreview}
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

      {/* Hover preview cards */}
      {preview?.kind === 'event' && (
        <EventPreviewCard
          event={preview.event}
          pos={preview.pos}
          onMouseEnter={cancelHide}
          onMouseLeave={hidePreview}
        />
      )}
      {preview?.kind === 'day' && (
        <DayPreviewCard
          date={preview.date}
          events={preview.events}
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
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-zinc-800 sticky top-0 bg-black z-10">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-zinc-500">{d}</div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="border-r border-b border-zinc-800/60 min-h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {grid.flatMap((week, wi) =>
            week.map((day, di) => {
              const isToday   = day && isoDate(day) === isoDate(today);
              const isOtherM  = day && day.getMonth() !== month;
              const dayEvents = day ? eventsForDay(events, day) : [];
              const overflow  = dayEvents.length - 3;

              return (
                <div
                  key={`${wi}-${di}`}
                  onClick={() => day && onDayClick(day)}
                  onDoubleClick={() => day && onDayDoubleClick(day)}
                  onMouseEnter={(e) => day && onDayHover(day, eventsForDay(events, day), { x: e.clientX, y: e.clientY })}
                  onMouseMove={(e) => day && onDayHover(day, eventsForDay(events, day), { x: e.clientX, y: e.clientY })}
                  onMouseLeave={onDayHoverEnd}
                  className={`border-r border-b border-zinc-800/60 min-h-28 p-1.5 cursor-pointer hover:bg-zinc-900/40 transition-colors
                    ${di === 6 ? 'border-r-0' : ''}`}
                >
                  {day && (
                    <>
                      <div className="flex justify-end mb-1">
                        <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium
                          ${isToday ? 'bg-blue-500 text-white' : isOtherM ? 'text-zinc-700' : 'text-zinc-300'}`}>
                          {day.getDate()}
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
  );
}

// ─── Day view ─────────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 64; // px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function minutesFromMidnight(dt: string): number {
  const d = new Date(dt);
  return d.getHours() * 60 + d.getMinutes();
}

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

  // Scroll to current time (or 8am) on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = isToday ? Math.max(nowMinutes - 60, 0) : 8 * 60;
    el.scrollTop = (target / 60) * HOUR_HEIGHT;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date.toDateString()]);

  // Separate all-day events from timed events
  const allDayEvents = events.filter((e) => !e.start?.dateTime);
  const timedEvents  = events.filter((e) => !!e.start?.dateTime);

  // Lay out timed events with overlap detection
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

      // Find first column where this event doesn't overlap
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

    // Set cols count for each event
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
      {/* All-day row */}
      {allDayEvents.length > 0 && (
        <div className="shrink-0 border-b border-zinc-800 px-4 py-2 flex items-start gap-2">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider pt-0.5 w-12 shrink-0 text-right pr-3">all‑day</span>
          <div className="flex flex-wrap gap-1.5">
            {allDayEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className={`px-2.5 py-0.5 rounded-full text-xs text-white font-medium ${eventColor(ev.id, true)}`}
              >
                {ev.summary ?? '(no title)'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-zinc-600 text-sm">Loading events…</div>
        ) : (
          <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
            {/* Hour rows */}
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute inset-x-0 flex items-start group"
                style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                onClick={() => onHourClick(`${String(h).padStart(2, '0')}:00`)}
              >
                {/* Hour label */}
                <div className="w-16 shrink-0 pr-3 pt-0 text-right">
                  {h !== 0 && (
                    <span className="text-[10px] text-zinc-600 -mt-2.5 inline-block">
                      {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                    </span>
                  )}
                </div>
                {/* Hour line + click area */}
                <div className="flex-1 border-t border-zinc-800/60 h-full cursor-pointer group-hover:bg-zinc-900/20 transition-colors" />
              </div>
            ))}

            {/* Current time indicator */}
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

            {/* Events */}
            <div className="absolute inset-y-0 left-16 right-2">
              {laid.map((ev) => {
                const w   = `calc(${(1 / ev.cols) * 100}% - 4px)`;
                const left = `calc(${(ev.col / ev.cols) * 100}% + 2px)`;
                return (
                  <button
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    onMouseEnter={(e) => onEventHover(ev, { x: e.clientX, y: e.clientY })}
                    onMouseMove={(e) => onEventHover(ev, { x: e.clientX, y: e.clientY })}
                    onMouseLeave={onEventHoverEnd}
                    className={`absolute rounded-lg px-2 py-1 text-left overflow-hidden ${eventColor(ev.id, true)} hover:brightness-110 transition-all shadow-sm`}
                    style={{ top: ev.top + 1, height: ev.height - 2, width: w, left }}
                  >
                    <p className={`font-medium text-white leading-tight truncate ${ev.height < 40 ? 'text-[10px]' : 'text-xs'}`}>
                      {ev.summary ?? '(no title)'}
                    </p>
                    {ev.height >= 40 && ev.start?.dateTime && (
                      <p className="text-[10px] text-white/70 mt-0.5">
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
  { label: "Today's agenda",       prompt: "What's on my calendar today?"         },
  { label: 'Schedule meeting',     prompt: 'Help me schedule a meeting'            },
  { label: 'Summarize emails',     prompt: 'Summarize my unread emails'            },
  { label: 'Find free slots',      prompt: 'When am I free this week?'             },
  { label: 'Create task from email', prompt: 'Create a task list from my recent emails' },
];

function CalendarAIPanel({ defaultDate, userName, onClose, onRefresh }: {
  defaultDate: string; userName?: string; onClose: () => void; onRefresh: () => void;
}) {
  const firstName   = userName?.split(' ')[0];
  const h           = new Date().getHours();
  const tod         = h >= 22 || h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  const greet       = { night: 'Good evening', morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' }[tod];
  const initGreet   = firstName ? `${greet}, ${firstName}.` : `${greet}.`;
  const formattedDate = defaultDate
    ? new Date(`${defaultDate}T12:00:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    : '';

  const [messages, setMessages] = useState<AIPanelMsg[]>([
    { id: 'init', role: 'assistant', content: `${initGreet}\nHow can I help with your calendar?` },
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function submit(text: string) {
    if (!text.trim() || loading) return;
    setInput('');
    const context = defaultDate ? `[Context: selected calendar date is ${formattedDate}]\n\n${text.trim()}` : text.trim();
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
      const reader = res.body!.getReader();
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
          } catch { /* partial */ }
        }
      }
      setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, streaming: false } : m));
      onRefresh();
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
                <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-2xl px-5 py-4 max-w-2xl">
                  <p className="text-[10px] font-semibold tracking-widest text-zinc-500 mb-2 uppercase">Assistant</p>
                  <div className="text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed">
                    {msg.content || (msg.streaming && <span className="text-zinc-500">Thinking…</span>)}
                    {msg.streaming && msg.content && <span className="inline-block w-1.5 h-4 bg-zinc-400 ml-0.5 animate-pulse align-middle" />}
                  </div>
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

  const dateStr = startDt
    ? new Date(startDt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    : event.start?.date
      ? new Date(`${event.start.date}T12:00:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      : '';

  const color = eventColor(event.id, true);
  const colorDot = color.replace('bg-', 'bg-');

  return (
    <div
      ref={cardRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-[100] w-72 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden pointer-events-auto"
      style={{ left: adjusted.x, top: adjusted.y }}
    >
      {/* Color accent bar */}
      <div className={`h-1 w-full ${color}`} />

      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="flex items-start gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${colorDot} shrink-0 mt-1`} />
          <h4 className="text-sm font-semibold text-white leading-snug">
            {event.summary ?? '(no title)'}
          </h4>
        </div>

        {/* Date & Time */}
        {(dateStr || timeStr) && (
          <div className="flex items-start gap-2.5 text-xs text-zinc-400">
            <Clock size={12} className="text-zinc-600 shrink-0 mt-0.5" />
            <div>
              {dateStr && <p>{dateStr}</p>}
              {timeStr && <p className="text-zinc-300 font-medium">{timeStr}</p>}
            </div>
          </div>
        )}

        {/* Location */}
        {event.location && (
          <div className="flex items-start gap-2.5 text-xs text-zinc-400">
            <MapPin size={12} className="text-zinc-600 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{event.location}</span>
          </div>
        )}

        {/* Attendees */}
        {event.attendees?.length ? (
          <div className="flex items-start gap-2.5 text-xs text-zinc-400">
            <Users size={12} className="text-zinc-600 shrink-0 mt-0.5" />
            <div className="flex flex-wrap gap-1">
              {event.attendees.slice(0, 4).map((a, i) => (
                <span key={i} className="bg-zinc-800 border border-zinc-700 rounded-full px-2 py-0.5 text-[10px] text-zinc-300">
                  {a.displayName ?? a.email}
                </span>
              ))}
              {event.attendees.length > 4 && (
                <span className="text-[10px] text-zinc-600">+{event.attendees.length - 4} more</span>
              )}
            </div>
          </div>
        ) : null}

        {/* Description */}
        {event.description && (
          <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed border-t border-zinc-800 pt-2.5">
            {event.description}
          </p>
        )}

        {/* Google Meet */}
        {event.hangoutLink && (
          <a
            href={event.hangoutLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600/15 border border-blue-600/25 text-blue-400 text-xs font-medium hover:bg-blue-600/25 transition-colors"
          >
            <Video size={11} />
            Join Google Meet
            <ExternalLink size={10} className="ml-auto" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Day hover preview card (month view) ─────────────────────────────────────

function DayPreviewCard({
  date, events, pos, onMouseEnter, onMouseLeave,
}: {
  date: Date;
  events: CalEvent[];
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
    let x = pos.x + 14;
    let y = pos.y - 8;
    if (x + width > vw - 16)  x = pos.x - width - 14;
    if (y + height > vh - 16) y = vh - height - 16;
    if (y < 8) y = 8;
    setAdjusted({ x, y });
  }, [pos]);

  const dateLabel = date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const timedEvents  = events.filter((e) => !!e.start?.dateTime).sort((a, b) => {
    const at = new Date(a.start!.dateTime!).getTime();
    const bt = new Date(b.start!.dateTime!).getTime();
    return at - bt;
  });
  const allDayEvents = events.filter((e) => !e.start?.dateTime);

  return (
    <div
      ref={cardRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-[100] w-64 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden pointer-events-auto"
      style={{ left: adjusted.x, top: adjusted.y }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-xs font-semibold text-zinc-200">{dateLabel}</p>
        <p className="text-[10px] text-zinc-600 mt-0.5">
          {events.length === 0 ? 'No events' : `${events.length} event${events.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {events.length === 0 ? (
        <div className="px-4 py-4 text-xs text-zinc-600 text-center">Click to create an event</div>
      ) : (
        <div className="px-3 py-2.5 space-y-1.5 max-h-52 overflow-y-auto">
          {allDayEvents.map((ev) => (
            <div key={ev.id} className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${eventColor(ev.id, true)} shrink-0`} />
              <span className="text-xs text-zinc-300 truncate">{ev.summary ?? '(no title)'}</span>
              <span className="text-[10px] text-zinc-600 shrink-0">All day</span>
            </div>
          ))}
          {timedEvents.map((ev) => (
            <div key={ev.id} className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${eventColor(ev.id, true)} shrink-0`} />
              <span className="text-xs text-zinc-300 truncate flex-1">{ev.summary ?? '(no title)'}</span>
              <span className="text-[10px] text-zinc-500 shrink-0">{fmtTime(ev.start?.dateTime)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

// Renders description text with URLs converted to clickable links
const URL_RE = /https?:\/\/[^\s<>"]+/g;

function DescriptionText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  URL_RE.lastIndex = 0;

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
