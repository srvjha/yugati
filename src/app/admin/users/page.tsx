'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { Search, Users, Shield, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

function GmailDot({ on }: { on: boolean }) {
  return (
    <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${on ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-zinc-600 bg-zinc-900 border-zinc-800'}`}>
      <svg width="9" height="9" viewBox="0 0 48 48" fill="none"><path d="M4.5 39h6V23.25L2 17.5V36.5A2.5 2.5 0 0 0 4.5 39Z" fill={on ? "#4285F4" : "#52525b"}/><path d="M37.5 39h6a2.5 2.5 0 0 0 2.5-2.5V17.5l-8.5 5.75V39Z" fill={on ? "#34A853" : "#52525b"}/><path d="M37.5 12.5v10.75L46 17.5v-2.75C46 11.95 43.42 10.5 41.2 12.07L37.5 12.5Z" fill={on ? "#FBBC04" : "#52525b"}/><path d="M10.5 23.25V12.5l13.5 9 13.5-9v10.75L24 32.25 10.5 23.25Z" fill={on ? "#EA4335" : "#52525b"}/><path d="M2 14.75V17.5l8.5 5.75V12.5L6.8 12.07C4.58 10.5 2 11.95 2 14.75Z" fill={on ? "#C5221F" : "#52525b"}/></svg>
      Gmail
    </span>
  );
}

function CalDot({ on }: { on: boolean }) {
  return (
    <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${on ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-zinc-600 bg-zinc-900 border-zinc-800'}`}>
      <svg width="9" height="9" viewBox="0 0 48 48" fill="none"><rect x="6" y="6" width="36" height="36" rx="3" fill={on ? "white" : "#27272a"}/><rect x="6" y="6" width="36" height="12" rx="3" fill={on ? "#1A73E8" : "#52525b"}/><rect x="6" y="12" width="36" height="6" fill={on ? "#1A73E8" : "#52525b"}/></svg>
      Calendar
    </span>
  );
}
import Link from 'next/link';
import Image from 'next/image';

const PLAN_BADGE: Record<string, string> = {
  free:       'bg-zinc-800 text-zinc-400 border-zinc-700',
  standard:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
  premium:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  enterprise: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

export default function AdminUsersPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [plan, setPlan]     = useState('');

  const { data, isLoading } = useQuery(trpc.admin.listUsers.queryOptions({ page, limit: 25, search: search || undefined, plan: plan || undefined }));

  const banMut   = useMutation(trpc.admin.banUser.mutationOptions({ onSuccess: () => void queryClient.invalidateQueries({ queryKey: trpc.admin.listUsers.queryKey() }) }));
  const unbanMut = useMutation(trpc.admin.unbanUser.mutationOptions({ onSuccess: () => void queryClient.invalidateQueries({ queryKey: trpc.admin.listUsers.queryKey() }) }));

  return (
    <div className="h-full overflow-y-auto bg-black">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Users size={18} className="text-blue-400" /> Users</h1>
          <p className="text-xs text-zinc-500">{data?.total ?? 0} total</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name or email…"
              className="w-full pl-8 pr-4 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
          <select value={plan} onChange={e => { setPlan(e.target.value); setPage(1); }}
            className="text-sm bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 px-3 py-2 focus:outline-none focus:border-zinc-600">
            <option value="">All plans</option>
            {['free','standard','premium','enterprise'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 text-xs text-zinc-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Plan</th>
                <th className="text-left px-4 py-3 font-medium">Prompts</th>
                <th className="text-left px-4 py-3 font-medium">Integrations</th>
                <th className="text-left px-4 py-3 font-medium">Joined</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-zinc-900">
                      <td className="px-5 py-3"><div className="h-4 bg-zinc-800 rounded animate-pulse w-40" /></td>
                      {[1,2,3,4,5,6].map(j => <td key={j} className="px-4 py-3"><div className="h-4 bg-zinc-900 rounded animate-pulse w-16" /></td>)}
                    </tr>
                  ))
                : (data?.users ?? []).map(u => (
                    <tr key={u.id} className="border-b border-zinc-900/60 hover:bg-zinc-900/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          {u.image
                            ? <Image src={u.image} alt={u.name} width={28} height={28} className="rounded-full shrink-0" />
                            : <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 shrink-0">{u.name[0]?.toUpperCase()}</div>
                          }
                          <div>
                            <p className="text-zinc-200 font-medium text-xs">{u.name}</p>
                            <p className="text-zinc-600 text-[11px]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${PLAN_BADGE[u.plan?.plan ?? 'free'] ?? PLAN_BADGE.free}`}>
                          {u.plan?.plan ?? 'free'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400 tabular-nums">{u.promptCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <GmailDot on={(u as unknown as { integrations: { gmail: boolean } }).integrations.gmail} />
                          <CalDot on={(u as unknown as { integrations: { googlecalendar: boolean } }).integrations.googlecalendar} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        {u.banned
                          ? <span className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">Banned</span>
                          : <span className="text-[11px] text-emerald-400">Active</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/admin/users/${u.id}`} className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors">
                            <ExternalLink size={12} />
                          </Link>
                          {u.banned
                            ? <button onClick={() => unbanMut.mutate({ userId: u.id })} className="text-[11px] text-emerald-400 hover:bg-emerald-500/10 px-2 py-1 rounded-lg transition-colors">Unban</button>
                            : <button onClick={() => banMut.mutate({ userId: u.id })} className="text-[11px] text-red-400 hover:bg-red-500/10 px-2 py-1 rounded-lg transition-colors">Ban</button>
                          }
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(data?.pages ?? 1) > 1 && (
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Page {page} of {data?.pages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 border border-zinc-800 rounded-lg disabled:opacity-30 hover:border-zinc-600 transition-colors"><ChevronLeft size={13} /></button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= (data?.pages ?? 1)} className="p-1.5 border border-zinc-800 rounded-lg disabled:opacity-30 hover:border-zinc-600 transition-colors"><ChevronRight size={13} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
