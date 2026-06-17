"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { useTRPC } from "@/trpc/client";

const MINI_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MINI_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface CalEvent {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
}

function buildMiniGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const pad = first.getDay();
  const cells: (Date | null)[] = [
    ...Array<null>(pad).fill(null),
    ...Array.from(
      { length: last.getDate() },
      (_, i) => new Date(year, month, i + 1),
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function CalendarMini() {
  const trpc = useTRPC();
  const today = useMemo(() => new Date(), []);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  function prevM() {
    if (calMonth === 0) {
      setCalYear((y) => y - 1);
      setCalMonth(11);
    } else setCalMonth((m) => m - 1);
  }
  function nextM() {
    if (calMonth === 11) {
      setCalYear((y) => y + 1);
      setCalMonth(0);
    } else setCalMonth((m) => m + 1);
  }

  const timeMin = useMemo(() => {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [today]);

  const { data, isLoading, error } = useQuery(
    trpc.calendar.listEvents.queryOptions({
      calendarId: "primary",
      timeMin,
      maxResults: 5,
      singleEvents: true,
    }),
  );

  const isAuthError =
    (error as { data?: { code?: string } } | null)?.data?.code ===
    "UNAUTHORIZED";
  const events = useMemo(() => (data?.items ?? []) as CalEvent[], [data]);

  const eventDays = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      const d = e.start?.dateTime?.split("T")[0] ?? e.start?.date;
      if (d) set.add(d);
    });
    return set;
  }, [events]);

  const grid = useMemo(
    () => buildMiniGrid(calYear, calMonth),
    [calYear, calMonth],
  );
  function isoDate(d: Date) {
    return d.toISOString().split("T")[0];
  }

  return (
    <aside className="hidden xl:flex xl:flex-col w-60 shrink-0 bg-zinc-950/80 border-l border-zinc-800/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 shrink-0">
        <span className="text-xs font-semibold text-zinc-300">Calendar</span>
      </div>

      {/* Month nav */}
      <div className="p-3 border-b border-zinc-800/50">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevM}
            className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <ChevronLeft size={12} />
          </button>
          <span className="text-xs font-semibold text-zinc-200">
            {MINI_MONTHS[calMonth].toUpperCase()} {calYear}
          </span>
          <button
            onClick={nextM}
            className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <ChevronRight size={12} />
          </button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {MINI_DAYS.map((d, i) => (
            <div
              key={i}
              className="text-center text-[9px] font-semibold text-zinc-700 py-0.5"
            >
              {d}
            </div>
          ))}
        </div>
        {grid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day, di) => {
              if (!day) return <div key={di} />;
              const ds = isoDate(day);
              const isToday = ds === isoDate(today);
              const hasEvent = eventDays.has(ds);
              return (
                <div key={di} className="flex flex-col items-center py-0.5">
                  <span
                    className={`text-[11px] w-6 h-6 flex items-center justify-center leading-none rounded-full
                    ${isToday ? "bg-blue-500 text-white font-bold mini-today" : "text-zinc-400 hover:bg-zinc-800 cursor-pointer"}`}
                  >
                    {day.getDate()}
                  </span>
                  {hasEvent && (
                    <span className="w-1 h-1 rounded-full bg-blue-400 mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Upcoming events */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest shrink-0">
          Upcoming
        </p>
        <ScrollArea.Root className="flex-1 overflow-hidden">
          <ScrollArea.Viewport className="h-full w-full px-3 pb-3">
            {isLoading && (
              <div className="space-y-2 pt-1">
                {[70, 55, 80].map((w, i) => (
                  <div
                    key={i}
                    className="h-8 bg-zinc-900 animate-pulse"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
            )}
            {isAuthError && (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <p className="text-xs text-zinc-600">
                  Connect Calendar to see events
                </p>
                <a
                  href="/api/corsair/connect?plugin=googlecalendar"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Connect →
                </a>
              </div>
            )}
            {!isLoading && !error && events.length === 0 && (
              <p className="text-xs text-zinc-600 py-3">No upcoming events.</p>
            )}
            <div className="space-y-0.5">
              {events.map((ev) => {
                const dt = ev.start?.dateTime
                  ? new Date(ev.start.dateTime).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : (ev.start?.date ?? "");
                return (
                  <div
                    key={ev.id}
                    className="flex items-start gap-2 py-1.5 hover:bg-zinc-900/60 px-1 transition-colors"
                  >
                    <Clock
                      size={11}
                      className="text-zinc-600 mt-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-300 truncate font-medium">
                        {ev.summary ?? "(no title)"}
                      </p>
                      <p className="text-[11px] text-zinc-600">{dt}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar
            orientation="vertical"
            className="flex w-1 p-0.5"
          >
            <ScrollArea.Thumb className="flex-1 bg-zinc-800 rounded-full" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </div>

      <div className="p-2 border-t border-zinc-800/50 shrink-0">
        <Link
          href="/dashboard/calendar"
          className="flex items-center justify-center gap-2 w-full py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-800 transition-all"
        >
          <Calendar size={12} />
          Open Calendar
        </Link>
      </div>
    </aside>
  );
}
