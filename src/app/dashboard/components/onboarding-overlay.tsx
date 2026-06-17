'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { CheckCircle2, Sparkles, Check } from 'lucide-react';

const FOCUSES = [
  {
    id:    'job',
    label: 'Job hunting',
    bullets: ['Recruiter & interview emails', 'Application status updates', 'Follow-up reminders'],
  },
  {
    id:    'startup',
    label: 'Startup / freelancing',
    bullets: ['Client & partner emails', 'Invoice and payment alerts', 'Deal & proposal threads'],
  },
  {
    id:    'finance',
    label: 'Finance & bills',
    bullets: ['Payment confirmations', 'Subscription renewals', 'Bank & wallet statements'],
  },
  {
    id:    'studies',
    label: 'Studies',
    bullets: ['Assignment deadlines', 'Admission & result emails', 'Academic announcements'],
  },
  {
    id:    'urgent',
    label: 'Urgent alerts',
    bullets: ['OTPs with copy button', 'Security & login alerts', 'Time-sensitive deadlines'],
  },
  {
    id:    'inbox',
    label: 'Inbox zero',
    bullets: ['Triage & prioritise everything', 'Surface unread by importance', 'Daily digest summary'],
  },
] as const;

export function OnboardingOverlay({ onDone }: { onDone: () => void }) {
  const trpc = useTRPC();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { mutate: save, isPending } = useMutation(
    trpc.user.savePreferences.mutationOptions({ onSuccess: onDone })
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-7 pt-7 pb-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Gmail connected!</p>
              <p className="text-xs text-zinc-500">Your inbox is loading in the background</p>
            </div>
          </div>

          {/* Syncing indicator */}
          <div className="flex items-center gap-2.5 mb-6 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
            <span className="text-xs text-zinc-400">Fetching your emails…</span>
          </div>

          {/* Question */}
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={13} className="text-zinc-400" />
            <p className="text-sm font-semibold text-white">What should Yugati focus on?</p>
          </div>
          <p className="text-xs text-zinc-500 mb-4">Select all that apply — shapes your smart summaries on the Overview page</p>

          {/* Focus options */}
          <div className="grid grid-cols-2 gap-2">
            {FOCUSES.map((f) => {
              const active = selected.has(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => toggle(f.id)}
                  className={`text-left px-4 py-3 rounded-xl border transition-all ${
                    active
                      ? 'bg-white/8 border-white/20 ring-1 ring-white/10'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-zinc-100">{f.label}</span>
                    {active && <Check size={11} className="text-green-400 shrink-0" />}
                  </div>
                  <ul className="space-y-0.5">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-1.5 text-[11px] text-zinc-500 leading-tight">
                        <span className="mt-[3px] w-1 h-1 rounded-full bg-zinc-600 shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={onDone}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={() => save({ focuses: Array.from(selected) })}
            disabled={isPending}
            className="text-sm font-semibold bg-white text-black px-5 py-2 rounded-xl hover:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saving…' : selected.size === 0 ? 'Continue →' : `Done (${selected.size} selected)`}
          </button>
        </div>
      </div>
    </div>
  );
}
