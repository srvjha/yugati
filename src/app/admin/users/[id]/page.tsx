'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, CreditCard, Monitor, Cpu, DollarSign } from 'lucide-react';
import Image from 'next/image';

const PLAN_COLORS: Record<string, string> = {
  free: 'text-zinc-400', standard: 'text-blue-400', premium: 'text-emerald-400', enterprise: 'text-amber-400',
};

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(trpc.admin.getUser.queryOptions({ id }));

  const banMut   = useMutation(trpc.admin.banUser.mutationOptions({ onSuccess: () => void queryClient.invalidateQueries({ queryKey: trpc.admin.getUser.queryKey({ id }) }) }));
  const unbanMut = useMutation(trpc.admin.unbanUser.mutationOptions({ onSuccess: () => void queryClient.invalidateQueries({ queryKey: trpc.admin.getUser.queryKey({ id }) }) }));
  const planMut  = useMutation(trpc.admin.changeUserPlan.mutationOptions({ onSuccess: () => void queryClient.invalidateQueries({ queryKey: trpc.admin.getUser.queryKey({ id }) }) }));

  const u = data?.user;

  if (isLoading) return (
    <div className="h-full bg-black flex items-center justify-center">
      <div className="text-zinc-600 text-sm">Loading…</div>
    </div>
  );

  if (!u) return null;

  return (
    <div className="h-full overflow-y-auto bg-black">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {/* Back + header */}
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={13} /> Back to Users
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {u.image
              ? <Image src={u.image} alt={u.name} width={56} height={56} className="rounded-2xl ring-1 ring-zinc-700" />
              : <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl font-bold text-zinc-300">{u.name[0]?.toUpperCase()}</div>
            }
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                {u.name}
                {u.banned && <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">Banned</span>}
                {u.role === 'admin' && <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">Admin</span>}
              </h1>
              <p className="text-sm text-zinc-500">{u.email}</p>
              <p className="text-xs text-zinc-600 mt-0.5">Joined {new Date(u.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={data?.plan?.plan ?? 'free'}
              onChange={e => planMut.mutate({ userId: id, plan: e.target.value as 'free' | 'standard' | 'premium' | 'enterprise' })}
              className="text-sm bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 px-3 py-2 focus:outline-none focus:border-zinc-600"
            >
              {['free','standard','premium','enterprise'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
            </select>
            {u.banned
              ? <button onClick={() => unbanMut.mutate({ userId: id })} className="text-sm font-medium text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2 rounded-xl transition-colors">Unban User</button>
              : <button onClick={() => banMut.mutate({ userId: id })} className="text-sm font-medium text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-xl transition-colors">Ban User</button>
            }
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2"><MessageSquare size={13} className="text-emerald-400" /><p className="text-xs text-zinc-500 uppercase tracking-wider">Total Prompts</p></div>
            <p className="text-2xl font-bold text-white">{data?.tokenStats.promptCount.toLocaleString()}</p>
          </div>
          <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2"><Cpu size={13} className="text-cyan-400" /><p className="text-xs text-zinc-500 uppercase tracking-wider">Total Tokens</p></div>
            <p className="text-2xl font-bold text-white">{((data?.tokenStats.totalTokens ?? 0) / 1000).toFixed(1)}K</p>
          </div>
          <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2"><DollarSign size={13} className="text-green-400" /><p className="text-xs text-zinc-500 uppercase tracking-wider">AI Cost (USD)</p></div>
            <p className="text-2xl font-bold text-white">${(data?.tokenStats.totalCostUsd ?? 0).toFixed(4)}</p>
          </div>
          <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2"><CreditCard size={13} className={PLAN_COLORS[data?.plan?.plan ?? 'free']} /><p className="text-xs text-zinc-500 uppercase tracking-wider">Current Plan</p></div>
            <p className={`text-2xl font-bold capitalize ${PLAN_COLORS[data?.plan?.plan ?? 'free']}`}>{data?.plan?.plan ?? 'free'}</p>
          </div>
        </div>

        {/* Plan usage bars */}
        {data?.plan && (
          <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl p-5">
            <p className="text-sm font-semibold text-zinc-200 mb-4">Monthly Usage</p>
            <div className="space-y-3">
              {[
                { label: 'Messages', used: data.plan.messagesUsed, limit: { free: 30, standard: 150, premium: 500, enterprise: 9999 }[data.plan.plan ?? 'free'] ?? 30, color: 'bg-blue-500' },
                { label: 'Voice',    used: data.plan.voiceUsed,    limit: { free: 1,  standard: 15,  premium: 30,  enterprise: 9999 }[data.plan.plan ?? 'free'] ?? 1,  color: 'bg-emerald-500' },
                { label: 'Compose',  used: data.plan.composeUsed,  limit: { free: 10, standard: 50,  premium: 150, enterprise: 9999 }[data.plan.plan ?? 'free'] ?? 10, color: 'bg-amber-500' },
              ].map(({ label, used, limit, color }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="text-zinc-400">{label}</span>
                    <span className="text-zinc-200 tabular-nums">{used} / {limit}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, used / limit * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-zinc-600 mt-3">Resets {new Date(data.plan.usageResetAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
          </div>
        )}

        {/* Recent prompts */}
        <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/60">
            <p className="text-sm font-semibold text-zinc-200 flex items-center gap-2"><MessageSquare size={13} className="text-emerald-400" /> Recent Prompts</p>
          </div>
          <div className="divide-y divide-zinc-900">
            {(data?.recentPrompts ?? []).map(p => (
              <div key={p.id} className="px-5 py-3 hover:bg-zinc-900/40 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 truncate">{p.rawPrompt}</p>
                    {p.blockedReason && <p className="text-[11px] text-red-400 mt-0.5">{p.blockedReason}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-[11px]">
                    <span className={`px-1.5 py-0.5 rounded-full border ${p.status === 'ok' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : 'text-red-400 border-red-500/20 bg-red-500/10'}`}>{p.status}</span>
                    <span className="text-zinc-600">{p.totalTokens}t</span>
                    <span className="text-zinc-700">{new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active sessions */}
        <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/60">
            <p className="text-sm font-semibold text-zinc-200 flex items-center gap-2"><Monitor size={13} className="text-zinc-400" /> Sessions</p>
          </div>
          <div className="divide-y divide-zinc-900">
            {(data?.sessions ?? []).map(s => (
              <div key={s.id} className="px-5 py-3">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="text-zinc-400 truncate max-w-sm">{s.userAgent ?? 'Unknown device'}</p>
                    {s.ipAddress && <p className="text-zinc-600 font-mono mt-0.5">{s.ipAddress}</p>}
                  </div>
                  <div className="text-right text-zinc-600">
                    <p>Created {new Date(s.createdAt).toLocaleDateString()}</p>
                    <p>Expires {new Date(s.expiresAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
