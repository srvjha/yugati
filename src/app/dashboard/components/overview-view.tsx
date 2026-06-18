'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  Mail, Inbox, Send, FileText, Calendar, Clock,
  RefreshCw, Sparkles, MessageSquare, Mic, Edit3, Check, X,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

// ─── Refresh interval: 60 seconds ────────────────────────────────────────────
const REFETCH = 60_000;

// ─── Shared chart theme ───────────────────────────────────────────────────────
const GRID_COLOR    = '#27272a';
const AXIS_COLOR    = '#52525b';
const TOOLTIP_STYLE = {
  backgroundColor: '#18181b',
  border:          '1px solid #3f3f46',
  borderRadius:    8,
  padding:         '8px 12px',
  fontSize:        12,
  color:           '#e4e4e7',
};

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <p className="text-zinc-400 mb-0.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold">{p.name ? `${p.name}: ` : ''}{p.value}</p>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-zinc-900 rounded-xl animate-pulse ${className}`} />;
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, accent, loading,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string; loading?: boolean;
}) {
  return (
    <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon size={14} />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <p className="text-3xl font-bold text-white tabular-nums">{value.toLocaleString()}</p>
      )}
      {sub && !loading && <p className="text-xs text-zinc-600">{sub}</p>}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, sub, children, loading, skeletonH = 'h-64' }: {
  title: string; sub?: string; children: React.ReactNode; loading?: boolean; skeletonH?: string;
}) {
  return (
    <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl p-5 flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-zinc-200">{title}</p>
        {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
      </div>
      {loading ? <Skeleton className={skeletonH} /> : children}
    </div>
  );
}

// ─── Donut label ──────────────────────────────────────────────────────────────
function DonutLegend({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.name} className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-zinc-400">{d.name}</span>
          </div>
          <div className="flex items-center gap-2 text-right">
            <span className="text-zinc-200 font-medium tabular-nums">{d.value}</span>
            <span className="text-zinc-600 w-10 text-right">{total ? `${Math.round(d.value / total * 100)}%` : '—'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Format hour label ────────────────────────────────────────────────────────
function fmtHour(h: number) {
  if (h === 0)  return '12a';
  if (h < 12)   return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

function fmtDay(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Main component ───────────────────────────────────────────────────────────

// ─── Prompt quality analysis (client-side from localStorage) ─────────────────
type PromptAnalysis = { total: number; avgLength: number; actionRate: number; questionRate: number; specificityRate: number } | null;

function usePromptAnalysis(): PromptAnalysis {
  const [analysis, setAnalysis] = React.useState<PromptAnalysis>(null);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('yugati_chat_sessions');
      if (!raw) return;
      const sessions = JSON.parse(raw) as { messages?: { role: string; content: string }[] }[];
      const userMsgs = sessions.flatMap((s) => (s.messages ?? []).filter((m) => m.role === 'user').map((m) => m.content));
      if (!userMsgs.length) return;
      const actionWords   = /\b(send|schedule|delete|archive|find|search|summarize|summarise|reply|draft|create|show|list|check|move|mark|forward|cancel|reschedule)\b/i;
      const specificWords = /@|\d{1,2}[\/\-]\d{1,2}|\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|yesterday|last week|next week)\b/i;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnalysis({
        total:           userMsgs.length,
        avgLength:       Math.round(userMsgs.reduce((s, m) => s + m.length, 0) / userMsgs.length),
        actionRate:      Math.round(userMsgs.filter((m) => actionWords.test(m)).length  / userMsgs.length * 100),
        questionRate:    Math.round(userMsgs.filter((m) => m.includes('?')).length       / userMsgs.length * 100),
        specificityRate: Math.round(userMsgs.filter((m) => specificWords.test(m)).length / userMsgs.length * 100),
      });
    } catch { /* ignore */ }
  }, []);
  return analysis;
}

const FOCUS_META: Record<string, { label: string; bullets: string[] }> = {
  job:     { label: 'Job hunting',          bullets: ['Recruiter & interview emails', 'Application status updates', 'Follow-up reminders'] },
  startup: { label: 'Startup / freelancing', bullets: ['Client & partner emails', 'Invoice and payment alerts', 'Deal & proposal threads'] },
  finance: { label: 'Finance & bills',       bullets: ['Payment confirmations', 'Subscription renewals', 'Bank & wallet statements'] },
  studies: { label: 'Studies',               bullets: ['Assignment deadlines', 'Admission & result emails', 'Academic announcements'] },
  urgent:  { label: 'Urgent alerts',         bullets: ['OTPs with copy button', 'Security & login alerts', 'Time-sensitive deadlines'] },
  inbox:   { label: 'Inbox zero',            bullets: ['Triage & prioritise everything', 'Surface unread by importance', 'Daily digest summary'] },
};

export function OverviewView({ userName }: { userName?: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editingFocuses, setEditingFocuses] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(new Set());

  const { data: prefs } = useQuery({
    ...trpc.user.getPreferences.queryOptions(),
    staleTime: 5 * 60 * 1000,
  });

  const { mutate: saveFocuses, isPending: savingFocuses } = useMutation(
    trpc.user.savePreferences.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: trpc.user.getPreferences.queryKey() });
        setEditingFocuses(false);
      },
    })
  );

  const { data: overview, isLoading: overviewLoading, isFetching: overviewFetching } = useQuery({
    ...trpc.stats.overview.queryOptions(),
    refetchInterval: REFETCH,
  });

  const { data: email, isLoading: emailLoading, isFetching: emailFetching } = useQuery({
    ...trpc.stats.emailActivity.queryOptions(),
    refetchInterval: REFETCH,
  });

  const { data: cal, isLoading: calLoading } = useQuery({
    ...trpc.stats.calendarActivity.queryOptions(),
    refetchInterval: REFETCH,
  });

  const { data: insightsData, isLoading: insightsLoading, isFetching: insightsFetching, refetch: refetchInsights } = useQuery({
    ...trpc.stats.aiInsights.queryOptions(),
    staleTime:       5 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: planData, isLoading: planLoading } = useQuery({
    ...trpc.plans.getMyPlan.queryOptions(),
    staleTime: 60_000,
  });

  const promptAnalysis = usePromptAnalysis();

  const [lastUpdated, setLastUpdated] = useState('');
  useEffect(() => {
    const fmt = () => setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    fmt();
  }, [overviewFetching, emailFetching]);

  const greeting = React.useMemo(() => {
    const h = new Date().getHours();
    const t = h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';
    const first = userName?.split(' ')[0];
    return first ? `Good ${t}, ${first}` : `Good ${t}`;
  }, [userName]);

  // Filter hourly to only show every 3 hours for cleanliness
  const hourlyData = (email?.byHour ?? []).filter((_, i) => i % 3 === 0 || i === 23);

  return (
    <div className="h-full overflow-y-auto bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{greeting}</h1>
            <p className="text-sm text-zinc-500 mt-1">Here&apos;s your communication overview</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <RefreshCw size={11} className={overviewFetching || emailFetching ? 'animate-spin' : ''} />
              <span>Updated {lastUpdated}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.6)]" />
              <span className="text-green-500">Live</span>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* ── Smart focus summary ── */}
        <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
              <Sparkles size={13} className="text-green-400" />
              Your Focus Areas
            </p>
            {editingFocuses ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setEditingFocuses(false)} className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 px-2.5 py-1.5 rounded-lg transition-colors">
                  <X size={11} /> Cancel
                </button>
                <button onClick={() => saveFocuses({ focuses: Array.from(draft) })} disabled={savingFocuses} className="flex items-center gap-1 text-[11px] font-semibold bg-white text-black px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-50">
                  <Check size={11} /> {savingFocuses ? 'Saving…' : 'Save'}
                </button>
              </div>
            ) : (
              <button onClick={() => { setDraft(new Set(prefs?.focuses ?? [])); setEditingFocuses(true); }} className="text-[11px] text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1.5 rounded-lg transition-colors">
                {(prefs?.focuses?.length ?? 0) === 0 ? 'Set up' : 'Edit'}
              </button>
            )}
          </div>

          {editingFocuses ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(FOCUS_META).map(([id, meta]) => {
                const active = draft.has(id);
                return (
                  <button key={id} onClick={() => setDraft((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; })}
                    className={`text-left px-4 py-3 rounded-xl border transition-all ${active ? 'bg-white/8 border-white/20 ring-1 ring-white/10' : 'bg-zinc-900/60 border-zinc-800/60 hover:border-zinc-700'}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-zinc-200">{meta.label}</p>
                      {active && <Check size={11} className="text-green-400 shrink-0" />}
                    </div>
                    <ul className="space-y-0.5">
                      {meta.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-1.5 text-[11px] text-zinc-500 leading-tight">
                          <span className="mt-[3px] w-1 h-1 rounded-full bg-zinc-600 shrink-0" />{b}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          ) : (prefs?.focuses?.length ?? 0) === 0 ? (
            <p className="text-xs text-zinc-600">No focus areas set. Click <span className="text-zinc-400">Set up</span> to tell Yugati what to prioritise.</p>
          ) : (
            <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
              {(prefs?.focuses ?? []).map((id) => {
                const meta = FOCUS_META[id];
                if (!meta) return null;
                return (
                  <div key={id} className="flex items-start gap-2 min-w-[160px]">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-zinc-300">{meta.label}</p>
                      <p className="text-[11px] text-zinc-600 mt-0.5">{meta.bullets[0]}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard label="Inbox"    value={overview?.inboxTotal ?? 0}          sub="total messages"     icon={Inbox}    accent="bg-blue-500/15 text-blue-400"    loading={overviewLoading} />
          <StatCard label="Unread"   value={overview?.unreadCount ?? 0}         sub="need attention"     icon={Mail}     accent="bg-green-500/15 text-green-400" loading={overviewLoading} />
          <StatCard label="Sent"     value={overview?.sentTotal ?? 0}           sub="all time"           icon={Send}     accent="bg-emerald-500/15 text-emerald-400" loading={overviewLoading} />
          <StatCard label="Drafts"   value={overview?.draftCount ?? 0}          sub="unsent"             icon={FileText} accent="bg-amber-500/15 text-amber-400"  loading={overviewLoading} />
          <StatCard label="Meetings" value={overview?.meetingsThisWeek ?? 0}    sub="this week"          icon={Calendar} accent="bg-rose-500/15 text-rose-400"    loading={overviewLoading} />
          <StatCard label="Meet hrs" value={`${overview?.meetingHoursThisWeek ?? 0}h`} sub="this week"  icon={Clock}    accent="bg-cyan-500/15 text-cyan-400"     loading={overviewLoading} />
        </div>

        {/* ── AI Insights + Usage + Prompt Quality ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* AI Insights */}
          <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-green-400" />
                  AI Insights
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">Generated from your inbox &amp; calendar</p>
              </div>
              <button
                onClick={() => void refetchInsights()}
                className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                title="Refresh insights"
              >
                <RefreshCw size={12} className={insightsFetching ? 'animate-spin' : ''} />
              </button>
            </div>
            {insightsLoading ? (
              <div className="space-y-2">
                {[1,2,3].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            ) : (insightsData?.insights ?? []).length > 0 ? (
              <ul className="space-y-2.5">
                {(insightsData?.insights ?? []).map((insight, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-400 leading-relaxed">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-[9px] font-bold mt-0.5">{i + 1}</span>
                    {insight}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-600">No insights available yet.</p>
            )}
          </div>

          {/* AI Usage */}
          <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl p-5 flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                <MessageSquare size={13} className="text-blue-400" />
                AI Usage
              </p>
              <p className="text-xs text-zinc-600 mt-0.5">
                {planData ? `${planData.planName} plan · resets ${new Date(planData.resetAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Loading…'}
              </p>
            </div>
            {planLoading ? (
              <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : planData ? (
              <div className="space-y-3.5">
                {[
                  { label: 'AI Messages', icon: MessageSquare, used: planData.usage.messages.used, limit: planData.usage.messages.limit, color: 'bg-blue-500' },
                  { label: 'Voice',       icon: Mic,           used: planData.usage.voice.used,    limit: planData.usage.voice.limit,    color: 'bg-emerald-500' },
                  { label: 'Composes',    icon: Edit3,         used: planData.usage.compose.used,  limit: planData.usage.compose.limit,  color: 'bg-amber-500' },
                ].map(({ label, icon: Icon, used, limit, color }) => {
                  const pct = Math.min(100, Math.round(used / limit * 100));
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-zinc-400 flex items-center gap-1.5"><Icon size={11} />{label}</span>
                        <span className="text-xs font-medium text-zinc-300 tabular-nums">{used} <span className="text-zinc-600">/ {limit}</span></span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Prompt Quality */}
          <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl p-5 flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                <Edit3 size={13} className="text-amber-400" />
                Prompt Quality
              </p>
              <p className="text-xs text-zinc-600 mt-0.5">Analysed from your chat history</p>
            </div>
            {!promptAnalysis ? (
              <p className="text-xs text-zinc-600">Start chatting to see prompt analysis.</p>
            ) : (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Total prompts</span>
                  <span className="text-sm font-bold text-white">{promptAnalysis.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Avg length</span>
                  <span className="text-sm font-bold text-white">{promptAnalysis.avgLength} chars</span>
                </div>
                {[
                  { label: 'Action-oriented', value: promptAnalysis.actionRate,      color: 'bg-blue-500',    tip: 'Prompts with action words (send, schedule, find…)' },
                  { label: 'With context',    value: promptAnalysis.specificityRate,  color: 'bg-emerald-500', tip: 'Prompts with dates, emails, or specifics' },
                  { label: 'Questions',       value: promptAnalysis.questionRate,     color: 'bg-green-500',  tip: 'Prompts ending with ?' },
                ].map(({ label, value, color, tip }) => (
                  <div key={label} title={tip}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-zinc-400">{label}</span>
                      <span className="text-xs font-medium text-zinc-300 tabular-nums">{value}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Row 2: Email volume + Category donut ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          <div className="xl:col-span-2">
            <Section title="Email Volume" sub="Received emails — last 30 days" loading={emailLoading} skeletonH="h-56">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={email?.byDay ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="emailGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => {
                      const d = new Date(v + 'T00:00:00');
                      return d.getDate() % 5 === 0 ? fmtDay(v) : '';
                    }}
                    tick={{ fontSize: 11, fill: AXIS_COLOR }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: AXIS_COLOR }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#emailGrad)" dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
                </AreaChart>
              </ResponsiveContainer>
            </Section>
          </div>

          <Section title="Email Categories" sub="From last 100 emails" loading={emailLoading} skeletonH="h-56">
            {email?.byCategory && email.byCategory.length > 0 ? (
              <div className="flex flex-col gap-4">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={email.byCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {email.byCategory.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <DonutLegend data={email.byCategory} />
              </div>
            ) : (
              <p className="text-xs text-zinc-600 text-center py-8">No category data yet</p>
            )}
          </Section>
        </div>

        {/* ── Row 3: Top senders + Hourly pattern ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          <Section title="Top Senders" sub="Most frequent senders in last 100 emails" loading={emailLoading} skeletonH="h-64">
            {email?.topSenders && email.topSenders.length > 0 ? (
              <div className="space-y-2">
                {email.topSenders.slice(0, 8).map((s, i) => {
                  const max = email.topSenders[0]?.count ?? 1;
                  return (
                    <div key={s.email} className="flex items-center gap-3">
                      <span className="text-[10px] text-zinc-700 w-3 text-right shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-zinc-300 truncate">{s.name}</span>
                          <span className="text-xs font-semibold text-zinc-200 tabular-nums ml-2 shrink-0">{s.count}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all"
                            style={{ width: `${(s.count / max) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-700">{s.domain}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 text-center py-8">No sender data yet</p>
            )}
          </Section>

          <Section title="Emails by Time of Day" sub="When do you receive most emails" loading={emailLoading} skeletonH="h-64">
            <div className="flex-1 min-h-0" style={{ minHeight: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" tickFormatter={fmtHour} tick={{ fontSize: 10, fill: AXIS_COLOR }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: AXIS_COLOR }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="count" fill="#4ade80" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>

        {/* ── Row 4: Country breakdown + Calendar meetings ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          <Section title="Sender Countries" sub="Based on email domain TLDs" loading={emailLoading} skeletonH="h-64">
            {email?.byCountry && email.byCountry.length > 0 ? (
              <div className="space-y-2">
                {email.byCountry.map((c, i) => {
                  const max = email.byCountry[0]?.count ?? 1;
                  return (
                    <div key={c.country} className="flex items-center gap-3">
                      <span className="text-[10px] text-zinc-700 w-3 text-right shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-zinc-300 truncate">{c.country}</span>
                          <span className="text-xs font-semibold text-zinc-200 tabular-nums ml-2 shrink-0">{c.count}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${(c.count / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 text-center py-8">No country data yet</p>
            )}
          </Section>

          <Section title="Meetings This Month" sub="Timed calendar events — last 30 days" loading={calLoading} skeletonH="h-64">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={cal?.byDay ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => {
                    const d = new Date(v + 'T00:00:00');
                    return d.getDate() % 5 === 0 ? fmtDay(v) : '';
                  }}
                  tick={{ fontSize: 10, fill: AXIS_COLOR }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: AXIS_COLOR }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Area type="monotone" dataKey="meetings" stroke="#10b981" strokeWidth={2} fill="url(#calGrad)" dot={false} activeDot={{ r: 4, fill: '#10b981' }} />
              </AreaChart>
            </ResponsiveContainer>
          </Section>
        </div>

        {/* ── Row 5: Day-of-week + Meeting types + Duration + Top attendees ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          <Section title="Meetings by Day" sub="Which days are busiest" loading={calLoading} skeletonH="h-48">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={cal?.byDow ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: AXIS_COLOR }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: AXIS_COLOR }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </Section>

          <Section title="Meeting Types" sub="Last 30 days" loading={calLoading} skeletonH="h-48">
            {cal?.meetingTypes && cal.meetingTypes.length > 0 ? (
              <div className="flex flex-col gap-4">
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart>
                    <Pie data={cal.meetingTypes} cx="50%" cy="50%" innerRadius={32} outerRadius={48} paddingAngle={3} dataKey="value">
                      {cal.meetingTypes.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <DonutLegend data={cal.meetingTypes} />
              </div>
            ) : (
              <p className="text-xs text-zinc-600 text-center py-8">No meeting data yet</p>
            )}
          </Section>

          <Section title="Meeting Duration" sub="Distribution of meeting lengths" loading={calLoading} skeletonH="h-48">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={cal?.durationDist ?? []} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
                <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: AXIS_COLOR }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: AXIS_COLOR }} axisLine={false} tickLine={false} width={56} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="value" fill="#ec4899" radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        </div>

        {/* ── Row 6: Top meeting attendees ── */}
        {(cal?.topAttendees?.length ?? 0) > 0 && (
          <Section title="Top Meeting Partners" sub="Most frequent attendees in your events" loading={calLoading} skeletonH="h-32">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(cal?.topAttendees ?? []).slice(0, 8).map((a) => (
                <div key={a.email} className="flex items-center gap-2.5 bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 shrink-0">
                    {a.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-200 truncate">{a.name}</p>
                    <p className="text-[10px] text-zinc-600">{a.count} meetings</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between text-[10px] text-zinc-700 pb-2">
          <span>Data sourced from Gmail & Google Calendar via Corsair</span>
          <span>Refreshes every 60 seconds</span>
        </div>
      </div>
    </div>
  );
}
