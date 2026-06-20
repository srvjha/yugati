'use client';

import { useQuery } from '@tanstack/react-query';
import { useTRPC }  from '@/trpc/client';
import { AdminStatCard } from '../components/admin-stat-card';
import {
  Users, MessageSquare, Shield, DollarSign, Cpu, Activity,
  TrendingUp, AlertTriangle, Clock, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const GRID = '#27272a';
const AXIS = '#52525b';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-zinc-900 rounded-xl animate-pulse ${className}`} />;
}

export default function AdminOverviewPage() {
  const trpc = useTRPC();
  const { data, isLoading, isFetching, refetch } = useQuery({
    ...trpc.admin.getStats.queryOptions(),
    refetchInterval: 30_000,
  });

  const s = data;

  // Build a full 30-day array regardless of whether any logs exist
  const dailyPrompts = (() => {
    const map = Object.fromEntries((s?.dailyPrompts ?? []).map(d => [d.day, d]));
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().split('T')[0]!;
      return map[key] ?? { day: key, count: 0, blocked: 0 };
    });
  })();

  return (
    <div className="h-full overflow-y-auto bg-black">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity size={18} className="text-red-400" />
              Platform Overview
            </h1>
            <p className="text-xs text-zinc-500 mt-1">Real-time metrics · auto-refreshes every 30s</p>
          </div>
          <button onClick={() => void refetch()} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-colors">
            <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* KPI row 1 */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {isLoading ? [1,2,3,4].map(i => <Skeleton key={i} className="h-32" />) : <>
            <AdminStatCard label="Total Users" value={s?.totalUsers ?? 0} sub="all time" icon={Users} accent="bg-blue-500/15 text-blue-400" delta={{ value: s?.newUsersToday ?? 0, label: 'today' }} />
            <AdminStatCard label="Prompts Today" value={s?.promptsToday ?? 0} sub={`${s?.totalPrompts ?? 0} total`} icon={MessageSquare} accent="bg-emerald-500/15 text-emerald-400" />
            <AdminStatCard label="Blocked Today" value={s?.blockedToday ?? 0} sub="guardrail trips" icon={Shield} accent="bg-red-500/15 text-red-400" />
            <AdminStatCard label="Total Injections" value={s?.totalInjections ?? 0} sub="all time" icon={AlertTriangle} accent="bg-amber-500/15 text-amber-400" />
          </>}
        </div>

        {/* KPI row 2 */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {isLoading ? [1,2,3,4].map(i => <Skeleton key={i} className="h-32" />) : <>
            <AdminStatCard label="Total Tokens" value={s ? (s.totalTokens / 1000).toFixed(1) + 'K' : '—'} sub="all AI calls" icon={Cpu} accent="bg-cyan-500/15 text-cyan-400" />
            <AdminStatCard label="AI Cost (USD)" value={s ? `$${s.totalCostUsd.toFixed(4)}` : '—'} sub="estimated total" icon={DollarSign} accent="bg-green-500/15 text-green-400" />
            <AdminStatCard label="Active Sessions" value={s?.activeSessionsToday ?? 0} sub="started today" icon={Clock} accent="bg-zinc-500/15 text-zinc-400" />
            <AdminStatCard label="New Users (7d)" value={s?.newUsersWeek ?? 0} sub="this week" icon={TrendingUp} accent="bg-blue-500/15 text-blue-400" />
          </>}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Daily prompts chart */}
          <div className="xl:col-span-2 bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl p-5">
            <p className="text-sm font-semibold text-zinc-200 mb-4">Daily Prompts (Last 30 Days)</p>
            {isLoading ? <Skeleton className="h-48" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailyPrompts} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="pgOk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pgBlock" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tickFormatter={v => { const d = new Date(v + 'T00:00:00'); return d.getDate() % 5 === 0 ? `${d.getMonth()+1}/${d.getDate()}` : ''; }} tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12, color: '#e4e4e7' }} />
                  <Area type="monotone" dataKey="count"   name="Total"   stroke="#3b82f6" strokeWidth={2} fill="url(#pgOk)"    dot={false} />
                  <Area type="monotone" dataKey="blocked" name="Blocked" stroke="#ef4444" strokeWidth={1.5} fill="url(#pgBlock)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Plan distribution */}
          <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl p-5">
            <p className="text-sm font-semibold text-zinc-200 mb-4">Plan Distribution</p>
            {isLoading ? <Skeleton className="h-48" /> : (
              <div className="space-y-3">
                {(Object.entries(s?.planBreakdown ?? {}) as [string, number][]).map(([plan, cnt]) => {
                  const total = s?.totalUsers || 1;
                  const pct   = Math.round(cnt / total * 100);
                  const colors: Record<string, string> = { free: 'bg-zinc-500', standard: 'bg-blue-500', premium: 'bg-emerald-500', enterprise: 'bg-amber-500' };
                  return (
                    <div key={plan}>
                      <div className="flex items-center justify-between mb-1 text-xs">
                        <span className="text-zinc-400 capitalize">{plan}</span>
                        <span className="text-zinc-200 font-medium">{cnt} <span className="text-zinc-600">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colors[plan] ?? 'bg-zinc-600'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
