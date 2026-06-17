'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC }  from '@/trpc/client';
import { CreditCard, ChevronLeft, ChevronRight, IndianRupee } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  paid:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  created: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  failed:  'text-red-400 bg-red-500/10 border-red-500/20',
};

export default function AdminPlansPage() {
  const trpc = useTRPC();
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState<'all'|'paid'|'created'|'failed'>('all');

  const { data: statsData } = useQuery(trpc.admin.getStats.queryOptions());
  const { data, isLoading } = useQuery(trpc.admin.listOrders.queryOptions({ page, limit: 30, status }));

  const revenueInr = (statsData?.revenuePaise ?? 0) / 100;

  return (
    <div className="h-full overflow-y-auto bg-black">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        <h1 className="text-xl font-bold text-white flex items-center gap-2"><CreditCard size={18} className="text-cyan-400" /> Plans & Revenue</h1>

        {/* Revenue summary */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1"><IndianRupee size={10} /> Total Revenue</p>
            <p className="text-3xl font-bold text-white">₹{revenueInr.toLocaleString('en-IN')}</p>
            <p className="text-xs text-zinc-600 mt-1">from paid orders</p>
          </div>
          {(Object.entries(statsData?.planBreakdown ?? {}) as [string, number][]).slice(0, 3).map(([plan, cnt]) => (
            <div key={plan} className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 capitalize">{plan}</p>
              <p className="text-3xl font-bold text-white">{cnt}</p>
              <p className="text-xs text-zinc-600 mt-1">active users</p>
            </div>
          ))}
        </div>

        {/* Orders table */}
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-zinc-300 flex-1">Payment Orders</h2>
          <select value={status} onChange={e => { setStatus(e.target.value as typeof status); setPage(1); }}
            className="text-sm bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 px-3 py-2 focus:outline-none focus:border-zinc-600">
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="created">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 text-xs text-zinc-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Plan</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Razorpay ID</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-zinc-900">
                      {[1,2,3,4,5,6].map(j => <td key={j} className="px-5 py-3"><div className="h-4 bg-zinc-900 rounded animate-pulse w-24" /></td>)}
                    </tr>
                  ))
                : (data?.orders ?? []).map(o => (
                    <tr key={o.id} className="border-b border-zinc-900/60 hover:bg-zinc-900/40 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-xs text-zinc-200 font-medium">{o.user?.name ?? '—'}</p>
                        <p className="text-[11px] text-zinc-600">{o.user?.email ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400 capitalize">{o.plan}</td>
                      <td className="px-4 py-3 text-xs text-zinc-200 font-mono">₹{(o.amount / 100).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[o.status] ?? ''}`}>{o.status}</span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-zinc-600 font-mono truncate max-w-[120px]">{o.razorpayOrderId}</td>
                      <td className="px-4 py-3 text-xs text-zinc-600">
                        {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

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
