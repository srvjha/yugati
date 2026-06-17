'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC }  from '@/trpc/client';
import { MessageSquare, Search, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  ok:              'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  blocked_input:   'text-red-400 bg-red-500/10 border-red-500/20',
  blocked_output:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  error:           'text-zinc-400 bg-zinc-800 border-zinc-700',
};

export default function AdminPromptsPage() {
  const trpc = useTRPC();
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState<'all'|'ok'|'blocked_input'|'blocked_output'|'error'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery(trpc.admin.listPromptLogs.queryOptions({ page, limit: 30, search: search || undefined, status }));

  return (
    <div className="h-full overflow-y-auto bg-black">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><MessageSquare size={18} className="text-amber-400" /> Prompt Logs</h1>
          <p className="text-xs text-zinc-500">{data?.total ?? 0} total</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search prompt text…"
              className="w-full pl-8 pr-4 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600" />
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value as typeof status); setPage(1); }}
            className="text-sm bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 px-3 py-2 focus:outline-none focus:border-zinc-600">
            <option value="all">All statuses</option>
            <option value="ok">OK</option>
            <option value="blocked_input">Blocked (input)</option>
            <option value="blocked_output">Blocked (output)</option>
            <option value="error">Error</option>
          </select>
        </div>

        <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 text-xs text-zinc-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Prompt</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Tokens</th>
                <th className="text-left px-4 py-3 font-medium">Cost</th>
                <th className="text-left px-4 py-3 font-medium">Duration</th>
                <th className="text-left px-4 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-zinc-900">
                      <td className="px-5 py-3"><div className="h-4 bg-zinc-800 rounded animate-pulse w-28" /></td>
                      {[1,2,3,4,5,6].map(j => <td key={j} className="px-4 py-3"><div className="h-4 bg-zinc-900 rounded animate-pulse w-20" /></td>)}
                    </tr>
                  ))
                : (data?.logs ?? []).length === 0
                ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center text-xs text-zinc-600">
                        No prompt logs yet — logs appear after users send AI messages
                      </td>
                    </tr>
                  )
                : (data?.logs ?? []).map(log => (
                    <React.Fragment key={log.id}>
                      <tr onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                        className="border-b border-zinc-900/60 hover:bg-zinc-900/40 cursor-pointer transition-colors">
                        <td className="px-5 py-3">
                          <div>
                            <p className="text-zinc-200 text-xs font-medium">{log.user?.name ?? '—'}</p>
                            <p className="text-zinc-600 text-[11px]">{log.user?.email ?? ''}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-xs text-zinc-400 truncate">{log.rawPrompt}</p>
                          {log.injectionFlag && <span className="inline-flex items-center gap-1 text-[10px] text-red-400 mt-0.5"><AlertTriangle size={9} /> injection</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[log.status] ?? STATUS_COLORS.error}`}>{log.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-400 tabular-nums">{log.totalTokens.toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-zinc-400 font-mono">${Number(log.estimatedCostUsd).toFixed(5)}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500 tabular-nums">{log.durationMs}ms</td>
                        <td className="px-4 py-3 text-xs text-zinc-600">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                      {expanded === log.id && (
                        <tr className="border-b border-zinc-900/60 bg-zinc-900/20">
                          <td colSpan={7} className="px-5 py-4 space-y-2">
                            <div>
                              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Raw Prompt</p>
                              <p className="text-xs text-zinc-300 font-mono whitespace-pre-wrap break-all bg-black/40 border border-zinc-800/60 rounded-xl px-4 py-3">{log.rawPrompt}</p>
                            </div>
                            {log.enhancedPrompt && log.enhancedPrompt !== log.rawPrompt && (
                              <div>
                                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Enhanced</p>
                                <p className="text-xs text-zinc-400 font-mono whitespace-pre-wrap break-all bg-black/40 border border-zinc-800/60 rounded-xl px-4 py-3">{log.enhancedPrompt}</p>
                              </div>
                            )}
                            {log.blockedReason && (
                              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{log.blockedReason}</p>
                            )}
                            <div className="flex items-center gap-4 text-[11px] text-zinc-600">
                              <span>Model: {log.model}</span>
                              <span>Prompt tokens: {log.promptTokens}</span>
                              <span>Completion tokens: {log.completionTokens}</span>
                              {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
