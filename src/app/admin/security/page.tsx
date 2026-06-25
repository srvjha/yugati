'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC }  from '@/trpc/client';
import { Shield, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { PromptSnapshot } from '../components/prompt-snapshot';

export default function AdminSecurityPage() {
  const trpc = useTRPC();
  const [page, setPage] = useState(1);

  const queryOpts = trpc.admin.listInjections.queryOptions({ page, limit: 10 });
  const { data, isLoading } = useQuery(queryOpts);

  return (
    <div className="h-full overflow-y-auto bg-black">
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield size={18} className="text-red-400" /> Security: Injection Attempts
            </h1>
            <p className="text-xs text-zinc-500 mt-1">Every prompt that triggered the input safety guardrail</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertTriangle size={13} className="text-red-400" />
            <span className="text-xs text-red-400 font-semibold">{data?.total ?? 0} flagged</span>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-48 bg-zinc-900 rounded-2xl animate-pulse" />)}
          </div>
        ) : (data?.logs ?? []).length === 0 ? (
          <div className="text-center py-20">
            <Shield size={32} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No injection attempts detected</p>
            <p className="text-zinc-700 text-xs mt-1">The safety guardrail hasn&apos;t been tripped yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(data?.logs ?? []).map(log => (
              <PromptSnapshot key={log.id} log={{
                ...log,
                enhancedPrompt:  log.enhancedPrompt ?? undefined,
                blockedReason:   log.blockedReason ?? undefined,
                ipAddress:       log.ipAddress ?? undefined,
                userAgent:       log.userAgent ?? undefined,
                user:            log.user ? { ...log.user, image: log.user.image ?? undefined } : undefined,
              }} />
            ))}
          </div>
        )}

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
