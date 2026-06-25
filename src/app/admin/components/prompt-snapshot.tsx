'use client';

import { AlertTriangle, Shield, Clock, Cpu, User, Globe } from 'lucide-react';

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

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  if (m < 60) return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return remM > 0 ? `${h}h ${remM}m` : `${h}h`;
}

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

  const matches: { start: number; end: number }[] = [];
  injectionPatterns.forEach((pattern) => {
    let m;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((m = re.exec(text)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length });
    }
  });

  // Code block is always dark — hardcode text colors, not zinc tokens
  if (!matches.length) {
    return (
      <span className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-all" style={{ color: '#d1d5db' }}>
        {text}
      </span>
    );
  }

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
    <span className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-all">
      {parts.map((p, i) =>
        p.danger
          ? <mark key={i} className="rounded px-0.5 not-italic" style={{ background: 'rgba(239,68,68,0.25)', color: '#fca5a5' }}>{p.text}</mark>
          : <span key={i} style={{ color: '#d1d5db' }}>{p.text}</span>
      )}
    </span>
  );
}

export function PromptSnapshot({ log }: { log: SnapshotLog }) {
  const isInjection = log.status === 'blocked_input';
  const ts = new Date(log.createdAt).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  });

  // Left accent bar color — red/amber stays fixed in both themes
  const accentClass = isInjection ? 'border-l-red-500' : 'border-l-amber-500';
  const badgeClass  = isInjection
    ? 'bg-red-500/10 border border-red-500/20 text-red-500'
    : 'bg-amber-500/10 border border-amber-500/20 text-amber-500';
  const reasonTextClass = isInjection ? 'text-red-500' : 'text-amber-500';
  const reasonBgClass   = isInjection
    ? 'bg-red-500/8 border border-red-500/15'
    : 'bg-amber-500/8 border border-amber-500/15';

  return (
    <div className={`rounded-xl border-l-4 border border-zinc-800 bg-zinc-900 overflow-hidden ${accentClass}`}>

      {/* ── Header ── */}
      <div className="px-5 py-3 flex items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-800/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shrink-0 ${badgeClass}`}>
            {isInjection ? <AlertTriangle size={11} /> : <Shield size={11} />}
            {isInjection ? 'Injection Attempt' : 'Blocked Output'}
          </span>
          <span className="text-[10px] text-zinc-600 font-mono truncate hidden sm:block">{log.id}</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-zinc-500 shrink-0">
          <span className="flex items-center gap-1.5"><Clock size={10} />{ts} IST</span>
          <span className="flex items-center gap-1.5 hidden sm:flex"><Cpu size={10} />{log.model}</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* ── User row ── */}
        {log.user && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[11px] font-bold text-zinc-300 shrink-0">
              {log.user.name[0]?.toUpperCase()}
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <User size={11} className="text-zinc-600 shrink-0" />
              <span className="text-sm font-semibold text-zinc-200 truncate">{log.user.name}</span>
              <span className="text-zinc-700">·</span>
              <span className="text-xs text-zinc-500 truncate">{log.user.email}</span>
            </div>
            {log.ipAddress && (
              <div className="ml-auto flex items-center gap-1 text-xs text-zinc-600 font-mono shrink-0">
                <Globe size={10} />{log.ipAddress}
              </div>
            )}
          </div>
        )}

        {/* ── Raw prompt — always-dark code block ── */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Raw Prompt</p>
          <div className="rounded-lg px-4 py-3.5 border" style={{ background: '#111113', borderColor: '#27272a' }}>
            <HighlightedPrompt text={log.rawPrompt} />
          </div>
        </div>

        {/* ── Enhanced prompt ── */}
        {log.enhancedPrompt && log.enhancedPrompt !== log.rawPrompt && (
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Enhanced (before block)</p>
            <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-lg p-4">
              <span className="font-mono text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap break-all">
                {log.enhancedPrompt}
              </span>
            </div>
          </div>
        )}

        {/* ── Guardrail reason ── */}
        {log.blockedReason && (
          <div className={`px-4 py-3 rounded-lg ${reasonBgClass}`}>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Guardrail Reason</p>
            <p className={`text-xs leading-relaxed ${reasonTextClass}`}>{log.blockedReason}</p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-5 py-2.5 border-t border-zinc-800/60 flex items-center gap-5 text-[11px] text-zinc-600">
        <span>{log.totalTokens.toLocaleString()} tokens</span>
        <span>{fmtDuration(log.durationMs)}</span>
        {log.userAgent && <span className="truncate max-w-xs">{log.userAgent}</span>}
      </div>
    </div>
  );
}
