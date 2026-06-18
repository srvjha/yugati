'use client';

import { Shield, AlertTriangle, Clock, Cpu, User, Globe } from 'lucide-react';

type SnapshotLog = {
  id: string;
  rawPrompt: string;
  enhancedPrompt?: string | null;
  blockedReason?: string | null;
  status: string;
  model: string;
  totalTokens: number;
  durationMs: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date | string;
  user?: { name: string; email: string; image?: string | null } | null;
};

// Highlight patterns that look like injection attempts
function HighlightedPrompt({ text }: { text: string }) {
  const injectionPatterns = [
    /ignore (all |previous |above |prior )?instructions?/gi,
    /disregard (all |your |previous )?instructions?/gi,
    /you are now/gi,
    /act as (a |an )?(?:different|new|another|unrestricted)/gi,
    /do not follow/gi,
    /pretend (you are|to be)/gi,
    /system prompt/gi,
    /jailbreak/gi,
    /dan mode/gi,
    /\[INST\]|\[\/INST\]/g,
    /<\|im_start\|>|<\|im_end\|>/g,
  ];

  const highlighted = text;
  const matches: { start: number; end: number }[] = [];

  injectionPatterns.forEach((pattern) => {
    let m;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((m = re.exec(highlighted)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length });
    }
  });

  if (!matches.length) {
    return <span className="text-zinc-300 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">{text}</span>;
  }

  // Build segments
  matches.sort((a, b) => a.start - b.start);
  const parts: { text: string; danger: boolean }[] = [];
  let cursor = 0;
  for (const { start, end } of matches) {
    if (start > cursor) parts.push({ text: text.slice(cursor, start), danger: false });
    parts.push({ text: text.slice(start, end), danger: true });
    cursor = end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), danger: false });

  return (
    <span className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
      {parts.map((p, i) =>
        p.danger
          ? <mark key={i} className="bg-red-500/25 text-red-300 rounded px-0.5 not-italic">{p.text}</mark>
          : <span key={i} className="text-zinc-300">{p.text}</span>
      )}
    </span>
  );
}

export function PromptSnapshot({ log }: { log: SnapshotLog }) {
  const isInjection = log.status === 'blocked_input';
  const ts = new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' });

  return (
    <div className={`rounded-2xl border-2 ${isInjection ? 'border-red-500/50 bg-red-950/20' : 'border-amber-500/40 bg-amber-950/10'} overflow-hidden`}>
      {/* Header */}
      <div className={`px-5 py-3 flex items-center justify-between border-b ${isInjection ? 'border-red-500/30 bg-red-950/30' : 'border-amber-500/20 bg-amber-950/20'}`}>
        <div className="flex items-center gap-2.5">
          {isInjection
            ? <AlertTriangle size={14} className="text-red-400 shrink-0" />
            : <Shield size={14} className="text-amber-400 shrink-0" />
          }
          <span className={`text-xs font-bold uppercase tracking-wider ${isInjection ? 'text-red-400' : 'text-amber-400'}`}>
            {isInjection ? 'Injection Attempt' : 'Blocked Output'}
          </span>
          <span className="text-[10px] text-zinc-600 font-mono">{log.id}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1"><Clock size={10} />{ts}</span>
          <span className="flex items-center gap-1"><Cpu size={10} />{log.model}</span>
        </div>
      </div>

      {/* User row */}
      {log.user && (
        <div className="px-5 py-2.5 flex items-center gap-3 border-b border-zinc-800/60 bg-zinc-900/40">
          <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0">
            {log.user.name[0]?.toUpperCase()}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <User size={10} className="text-zinc-600" />
            <span className="text-zinc-200 font-medium">{log.user.name}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-500">{log.user.email}</span>
          </div>
          {log.ipAddress && (
            <div className="flex items-center gap-1 text-xs text-zinc-600 ml-auto">
              <Globe size={10} />
              <span className="font-mono">{log.ipAddress}</span>
            </div>
          )}
        </div>
      )}

      {/* Raw prompt */}
      <div className="px-5 py-4">
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Raw Prompt</p>
        <div className="bg-black/60 border border-zinc-800/60 rounded-xl p-4">
          <HighlightedPrompt text={log.rawPrompt} />
        </div>
      </div>

      {/* Enhanced prompt if different */}
      {log.enhancedPrompt && log.enhancedPrompt !== log.rawPrompt && (
        <div className="px-5 pb-4">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Enhanced (before block)</p>
          <div className="bg-zinc-900/60 border border-zinc-800/40 rounded-xl p-4">
            <span className="font-mono text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap break-all">{log.enhancedPrompt}</span>
          </div>
        </div>
      )}

      {/* Reason */}
      {log.blockedReason && (
        <div className={`mx-5 mb-4 px-4 py-3 rounded-xl border ${isInjection ? 'bg-red-950/30 border-red-500/20' : 'bg-amber-950/20 border-amber-500/20'}`}>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Guardrail Reason</p>
          <p className={`text-xs ${isInjection ? 'text-red-300' : 'text-amber-300'}`}>{log.blockedReason}</p>
        </div>
      )}

      {/* Footer stats */}
      <div className="px-5 py-3 border-t border-zinc-800/60 flex items-center gap-6 text-[11px] text-zinc-600">
        <span>{log.totalTokens.toLocaleString()} tokens</span>
        <span>{log.durationMs}ms</span>
        {log.userAgent && <span className="truncate max-w-xs">{log.userAgent}</span>}
      </div>
    </div>
  );
}
