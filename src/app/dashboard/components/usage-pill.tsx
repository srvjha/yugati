'use client';

import { useQuery }  from '@tanstack/react-query';
import { useTRPC }   from '@/trpc/client';
import { useRouter } from 'next/navigation';
import { Zap }       from 'lucide-react';

export function UsagePill({ collapsed = false }: { collapsed?: boolean }) {
  const trpc   = useTRPC();
  const router = useRouter();
  const { data } = useQuery({
    ...trpc.plans.getMyPlan.queryOptions(),
    staleTime: 30_000,
  });

  if (!data) return null;

  const { used, limit } = data.usage.messages;
  const pct = limit === Infinity ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = pct >= 80;
  const isAtLimit   = used >= limit;
  const isFree      = data.planId === 'free';

  if (collapsed) {
    return (
      <button
        onClick={() => router.push('/dashboard/billing')}
        title={`${used}/${limit === Infinity ? '∞' : limit} messages · ${data.planName}`}
        className={`mx-auto flex items-center justify-center w-8 h-8 rounded-lg transition-colors
          ${isAtLimit ? 'bg-red-500/20 text-red-400' : isNearLimit ? 'bg-yellow-500/10 text-yellow-400' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
      >
        <Zap size={13} />
      </button>
    );
  }

  return (
    <button
      onClick={() => router.push('/dashboard/billing')}
      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all
        ${isAtLimit
          ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10'
          : isNearLimit
            ? 'border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10'
            : 'border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-800/60'}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[10px] font-semibold uppercase tracking-wider
          ${isAtLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-zinc-500'}`}>
          {data.planName}
        </span>
        <span className={`text-[10px] font-mono tabular-nums
          ${isAtLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-zinc-600'}`}>
          {used}/{limit === Infinity ? '∞' : limit}
        </span>
      </div>

      {limit !== Infinity && (
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500
              ${isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {(isAtLimit || isFree) && (
        <p className={`text-[10px] mt-1.5 flex items-center gap-1
          ${isAtLimit ? 'text-red-400' : 'text-zinc-500'}`}>
          <Zap size={9} className="shrink-0" />
          {isAtLimit ? 'Limit reached — Upgrade →' : 'Upgrade for more →'}
        </p>
      )}
    </button>
  );
}
