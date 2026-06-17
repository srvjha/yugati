"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Sparkles, AlertCircle, CalendarClock, RefreshCw, ExternalLink } from "lucide-react";

interface CalEvent {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
}

interface EmailMsg {
  id?: string;
  snippet?: string;
  payload?: { headers?: { name?: string; value?: string }[] };
}

function getHeader(headers: { name?: string; value?: string }[] | undefined, name: string) {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function fmtEventDate(ev: CalEvent) {
  if (ev.start?.dateTime) {
    const d = new Date(ev.start.dateTime);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const time = d.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    if (isToday) return `Today, ${time}`;
    return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  }
  if (ev.start?.date) {
    const d = new Date(ev.start.date + "T00:00:00");
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }
  return "";
}

export function MailInsightPanel() {
  const trpc = useTRPC();
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); }, []);

  const { data: insightsData, isLoading: insightsLoading, isFetching: insightsFetching, refetch: refetchInsights } = useQuery({
    ...trpc.stats.aiInsights.queryOptions(),
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: urgentData, isLoading: urgentLoading } = useQuery(
    trpc.gmail.listInbox.queryOptions({
      maxResults: 5,
      q: "is:unread (OTP OR invoice OR payment OR deadline OR urgent OR \"security alert\" OR verification OR \"action required\" OR \"expires\")",
    }),
  );

  const { data: calData, isLoading: calLoading, error: calError } = useQuery(
    trpc.calendar.listEvents.queryOptions({
      calendarId: "primary",
      timeMin: today,
      maxResults: 4,
      singleEvents: true,
    }),
  );

  const insights = insightsData?.insights?.slice(0, 3) ?? [];
  const urgentEmails = (urgentData?.messages ?? []) as EmailMsg[];
  const events = ((calData?.items ?? []) as CalEvent[]).slice(0, 4);
  const calAuthError = (calError as { data?: { code?: string } } | null)?.data?.code === "UNAUTHORIZED";

  return (
    <aside className="hidden xl:flex xl:flex-col w-72 shrink-0 border-l border-zinc-800/50 overflow-hidden bg-zinc-950/60">

      {/* ── AI Summary ── */}
      <div className="px-4 pt-4 pb-3 border-b border-zinc-800/40">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles size={10} className="text-violet-400" />
            AI Summary
          </p>
          <button
            onClick={() => void refetchInsights()}
            className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={10} className={insightsFetching ? "animate-spin" : ""} />
          </button>
        </div>

        {insightsLoading ? (
          <div className="space-y-2">
            {[90, 75, 85].map((w, i) => (
              <div key={i} className="h-3 bg-zinc-800 rounded animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : insights.length > 0 ? (
          <ul className="space-y-2">
            {insights.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-zinc-400 leading-relaxed">
                <span className="mt-[3px] w-1 h-1 rounded-full bg-violet-500/60 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-zinc-600">No summary yet — check back shortly.</p>
        )}
      </div>

      {/* ── Urgent ── */}
      <div className="px-4 py-3 border-b border-zinc-800/40">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-2.5">
          <AlertCircle size={10} className="text-amber-400" />
          Urgent
        </p>

        {urgentLoading ? (
          <div className="space-y-2">
            {[80, 65].map((w, i) => (
              <div key={i} className="h-8 bg-zinc-800 rounded animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : urgentEmails.length === 0 ? (
          <p className="text-[11px] text-zinc-600">Nothing urgent right now.</p>
        ) : (
          <ul className="space-y-1.5">
            {urgentEmails.map((msg) => {
              const headers = msg.payload?.headers;
              const from = getHeader(headers, "From");
              const subject = getHeader(headers, "Subject");
              const senderName = from.match(/^"?([^"<]+)"?\s*</)?.[1]?.trim() ?? from.split("@")[0] ?? from;
              const msgId = msg.id ?? "";
              return (
                <li key={msgId}>
                  <a
                    href={`https://mail.google.com/mail/u/0/#all/${msgId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 group"
                  >
                    <span className="mt-[3px] w-1.5 h-1.5 rounded-full bg-amber-400/70 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-zinc-300 truncate group-hover:text-white transition-colors">
                        {subject || "(no subject)"}
                      </p>
                      <p className="text-[10px] text-zinc-600 truncate">{senderName}</p>
                    </div>
                    <ExternalLink size={9} className="text-zinc-700 group-hover:text-zinc-500 mt-0.5 shrink-0" />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Upcoming Events ── */}
      <div className="flex-1 px-4 py-3 overflow-hidden flex flex-col">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-2.5 shrink-0">
          <CalendarClock size={10} className="text-blue-400" />
          Upcoming
        </p>

        {calLoading ? (
          <div className="space-y-2">
            {[85, 70, 90].map((w, i) => (
              <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : calAuthError ? (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-zinc-600">Calendar not connected.</p>
            <a href="/api/corsair/connect?plugin=googlecalendar" className="text-[11px] text-blue-400 hover:text-blue-300">
              Connect →
            </a>
          </div>
        ) : events.length === 0 ? (
          <p className="text-[11px] text-zinc-600">No upcoming events.</p>
        ) : (
          <ul className="space-y-1.5 overflow-y-auto">
            {events.map((ev) => (
              <li key={ev.id} className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-zinc-900/60 transition-colors">
                <span className="mt-[3px] w-1.5 h-1.5 rounded-full bg-blue-400/70 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-zinc-300 truncate">{ev.summary ?? "(no title)"}</p>
                  <p className="text-[10px] text-zinc-600">{fmtEventDate(ev)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-3 shrink-0">
          <Link
            href="/dashboard/calendar"
            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Open calendar →
          </Link>
        </div>
      </div>
    </aside>
  );
}
