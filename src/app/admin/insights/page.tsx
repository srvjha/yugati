'use client';

import { useQuery } from '@tanstack/react-query';
import { useTRPC }  from '@/trpc/client';
import { Sparkles, RefreshCw, AlertTriangle, Info, Zap } from 'lucide-react';

const SEVERITY_STYLES: Record<string, { border: string; bg: string; icon: React.ElementType; iconColor: string }> = {
  critical: { border: 'border-red-500/40',    bg: 'bg-red-950/20',    icon: AlertTriangle, iconColor: 'text-red-400' },
  warning:  { border: 'border-amber-500/40',  bg: 'bg-amber-950/10',  icon: Zap,           iconColor: 'text-amber-400' },
  info:     { border: 'border-zinc-700/60',   bg: 'bg-zinc-900/40',   icon: Info,          iconColor: 'text-blue-400' },
};

export default function AdminInsightsPage() {
  const trpc = useTRPC();
  const { data, isLoading, isFetching, refetch } = useQuery({
    ...trpc.admin.getAiInsights.queryOptions(),
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
  });

  return (
    <div className="h-full overflow-y-auto bg-black">
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2"><Sparkles size={18} className="text-green-400" /> AI Platform Insights</h1>
            <p className="text-xs text-zinc-500 mt-1">GPT-4o-mini analysis of platform health, security, and growth</p>
          </div>
          <button onClick={() => void refetch()} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-colors">
            <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} /> Regenerate
          </button>
        </div>

        {/* Quick stats */}
        {data?.stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{data.stats.totalUsers}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Total Users</p>
            </div>
            <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{data.stats.totalPrompts}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Total Prompts</p>
            </div>
            <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">${data.stats.totalCostUsd.toFixed(3)}</p>
              <p className="text-xs text-zinc-500 mt-0.5">AI Cost (USD)</p>
            </div>
          </div>
        )}

        {/* Insights */}
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-28 bg-zinc-900 rounded-2xl animate-pulse" />)}
          </div>
        ) : (data?.insights ?? []).length === 0 ? (
          <div className="text-center py-16">
            <Sparkles size={32} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No insights generated yet</p>
            <p className="text-zinc-700 text-xs mt-1">Need more data — try again after more users have signed up</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(data?.insights ?? []).map((insight, i) => {
              const style = SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.info;
              const SeverityIcon = style.icon;
              return (
                <div key={i} className={`rounded-2xl border-2 ${style.border} ${style.bg} p-5`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-black/30 flex items-center justify-center shrink-0 mt-0.5">
                      <SeverityIcon size={14} className={style.iconColor} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-sm font-semibold text-zinc-100">{insight.title}</p>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                          insight.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                          insight.severity === 'warning'  ? 'bg-amber-500/20 text-amber-400' :
                                                            'bg-blue-500/20 text-blue-400'
                        }`}>{insight.severity}</span>
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed">{insight.body}</p>
                    </div>
                    <span className="text-xs font-bold text-zinc-700 shrink-0">{i + 1}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-zinc-700">Insights generated by GPT-4o-mini · not financial advice</p>
      </div>
    </div>
  );
}
