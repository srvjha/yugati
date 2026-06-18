'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import {
  CheckCircle, Plug, Unplug, RefreshCw, AlertCircle,
  Blocks, SlidersHorizontal, X, Zap, Mail, Clock, BellOff,
  Plus, Sparkles, Tag,
} from 'lucide-react';
import { useState, useRef, KeyboardEvent } from 'react';

function GmailIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.5 39h6V23.25L2 17.5V36.5A2.5 2.5 0 0 0 4.5 39Z" fill="#4285F4"/>
      <path d="M37.5 39h6a2.5 2.5 0 0 0 2.5-2.5V17.5l-8.5 5.75V39Z" fill="#34A853"/>
      <path d="M37.5 12.5v10.75L46 17.5v-2.75C46 11.95 43.42 10.5 41.2 12.07L37.5 12.5Z" fill="#FBBC04"/>
      <path d="M10.5 23.25V12.5l13.5 9 13.5-9v10.75L24 32.25 10.5 23.25Z" fill="#EA4335"/>
      <path d="M2 14.75V17.5l8.5 5.75V12.5L6.8 12.07C4.58 10.5 2 11.95 2 14.75Z" fill="#C5221F"/>
    </svg>
  );
}

function GoogleCalendarIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="36" height="36" rx="3" fill="white"/>
      <rect x="6" y="6" width="36" height="36" rx="3" stroke="#E0E0E0" strokeWidth="1"/>
      <rect x="6" y="6" width="36" height="12" rx="3" fill="#1A73E8"/>
      <rect x="6" y="12" width="36" height="6" fill="#1A73E8"/>
      <rect x="13" y="2" width="4" height="9" rx="2" fill="#1A73E8"/>
      <rect x="31" y="2" width="4" height="9" rx="2" fill="#1A73E8"/>
      <text x="24" y="36" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1A73E8" fontFamily="Arial, sans-serif">31</text>
    </svg>
  );
}

const INTEGRATIONS = [
  {
    id:          'gmail',
    plugin:      'gmail',
    name:        'Gmail',
    tagline:     'Read, compose, send and manage emails',
    IconComponent: GmailIcon,
    iconBg:      'bg-white/5 border-zinc-800',
    permissions: ['Read all messages & threads', 'Send emails on your behalf', 'Manage labels & drafts'],
  },
  {
    id:          'googlecalendar',
    plugin:      'googlecalendar',
    name:        'Google Calendar',
    tagline:     'View and create calendar events with attendees',
    IconComponent: GoogleCalendarIcon,
    iconBg:      'bg-white/5 border-zinc-800',
    permissions: ['Read calendar events', 'Create & update events', 'Manage Google Meet links'],
  },
] as const;

function openOAuthPopup(url: string, onClose: () => void) {
  const w = 600, h = 660;
  const left = window.screenX + Math.round((window.outerWidth - w) / 2);
  const top  = window.screenY + Math.round((window.outerHeight - h) / 2);
  const popup = window.open(url, 'yugati_oauth', `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0`);
  if (!popup) { window.location.href = url; return; }

  const timer = setInterval(() => {
    if (popup.closed) { clearInterval(timer); onClose(); }
  }, 500);
}

function IntegrationCard({
  integration,
  connected,
  onAction,
}: {
  integration: typeof INTEGRATIONS[number];
  connected: boolean;
  onAction: (url: string) => void;
}) {
  const IconComponent = integration.IconComponent;

  return (
    <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${integration.iconBg}`}>
            <IconComponent size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <p className="text-sm font-semibold text-zinc-100">{integration.name}</p>
              {connected ? (
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-green-400 bg-green-500/10 px-2.5 py-0.5 rounded-full border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.7)]" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 bg-zinc-800/80 px-2.5 py-0.5 rounded-full border border-zinc-700">
                  <AlertCircle size={9} />
                  Disconnected
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{integration.tagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {connected ? (
            <>
              <button
                onClick={() => onAction(`/api/corsair/connect?plugin=${integration.plugin}`)}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-2 rounded-xl transition-colors"
              >
                <RefreshCw size={12} />
                Reconnect
              </button>
              <a
                href={`/api/corsair/disconnect?plugin=${integration.plugin}`}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/60 bg-red-500/5 hover:bg-red-500/10 px-3 py-2 rounded-xl transition-colors"
              >
                <Unplug size={12} />
                Disconnect
              </a>
            </>
          ) : (
            <button
              onClick={() => onAction(`/api/corsair/connect?plugin=${integration.plugin}`)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-white text-black px-4 py-2 rounded-xl hover:bg-zinc-100 transition-colors"
            >
              <Plug size={12} />
              Connect
            </button>
          )}
        </div>
      </div>

      <div className="px-6 py-3 bg-zinc-900/50 border-t border-zinc-800/60 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mr-1">Permissions</span>
        {integration.permissions.map((p) => (
          <span key={p} className="flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-zinc-800">
            <CheckCircle size={9} className="text-zinc-600 shrink-0" />
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Preferences modal ───────────────────────────────────────── */

const FOCUS_SUGGESTIONS = [
  'Job applications',
  'Startup / freelancing',
  'Urgent & OTPs',
  'Finance & bills',
  'Studies & deadlines',
  'Inbox zero',
];

type Prefs = {
  aiTone: 'formal' | 'casual' | 'concise';
  autoSuggest: boolean;
  emailSignature: string;
  digestEnabled: boolean;
  digestTime: string;
  muteSounds: boolean;
  focuses: string[];
  aiDecide: boolean;
};

const DEFAULT_PREFS: Prefs = {
  aiTone:        'concise',
  autoSuggest:   true,
  emailSignature:'',
  digestEnabled: false,
  digestTime:    '08:00',
  muteSounds:    false,
  focuses:       [],
  aiDecide:      false,
};

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${on ? 'bg-green-500' : 'bg-zinc-700'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
    </button>
  );
}

function PreferencesModal({ onClose }: { onClose: () => void }) {
  const trpc = useTRPC();
  const qc   = useQueryClient();

  // load existing focuses from DB on open
  const { data: existingPrefs } = useQuery(trpc.user.getPreferences.queryOptions());

  const [prefs, setPrefs] = useState<Prefs>(() => ({
    ...DEFAULT_PREFS,
    focuses: existingPrefs?.focuses ?? [],
  }));
  const [customInput, setCustomInput] = useState('');
  const [saved, setSaved]             = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // sync focuses from DB once loaded
  const focusesFromDb = existingPrefs?.focuses ?? [];
  const [synced, setSynced] = useState(false);
  if (!synced && existingPrefs) {
    setPrefs(p => ({ ...p, focuses: focusesFromDb }));
    setSynced(true);
  }

  const { mutate: saveToDb, isPending } = useMutation(
    trpc.user.savePreferences.mutationOptions({
      onSuccess: () => {
        void qc.invalidateQueries(trpc.user.getPreferences.queryOptions());
        localStorage.setItem('yugati_prefs', JSON.stringify(prefs));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      },
    })
  );

  function set<K extends keyof Prefs>(k: K, v: Prefs[K]) {
    setPrefs(p => ({ ...p, [k]: v }));
    setSaved(false);
  }

  function toggleFocus(label: string) {
    setPrefs(p => {
      const next = p.focuses.includes(label)
        ? p.focuses.filter(f => f !== label)
        : [...p.focuses, label];
      return { ...p, focuses: next, aiDecide: false };
    });
    setSaved(false);
  }

  function addCustom() {
    const val = customInput.trim();
    if (!val || prefs.focuses.includes(val)) { setCustomInput(''); return; }
    setPrefs(p => ({ ...p, focuses: [...p.focuses, val], aiDecide: false }));
    setCustomInput('');
    setSaved(false);
  }

  function removeTag(label: string) {
    setPrefs(p => ({ ...p, focuses: p.focuses.filter(f => f !== label) }));
    setSaved(false);
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); addCustom(); }
    if (e.key === 'Backspace' && !customInput && prefs.focuses.length) {
      removeTag(prefs.focuses[prefs.focuses.length - 1]!);
    }
  }

  function save() {
    saveToDb({ focuses: prefs.aiDecide ? ['__ai_decide__'] : prefs.focuses });
    localStorage.setItem('yugati_prefs', JSON.stringify(prefs));
  }

  const toneOptions: { value: Prefs['aiTone']; label: string; desc: string }[] = [
    { value: 'formal',  label: 'Formal',  desc: 'Professional, structured replies' },
    { value: 'casual',  label: 'Casual',  desc: 'Friendly, conversational tone'    },
    { value: 'concise', label: 'Concise', desc: 'Short, direct, no fluff'          },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal size={16} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-white">Preferences</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[75vh] p-6 space-y-6">

          {/* ── Email Focus ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag size={13} className="text-green-400" />
                <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">What should Yugati focus on?</p>
              </div>
              <button
                onClick={() => { setPrefs(p => ({ ...p, aiDecide: !p.aiDecide, focuses: p.aiDecide ? p.focuses : [] })); setSaved(false); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                  prefs.aiDecide
                    ? 'border-green-500/40 bg-green-500/10 text-green-400'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                }`}
              >
                <Sparkles size={11} />
                Let AI decide
              </button>
            </div>

            {prefs.aiDecide ? (
              <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                <p className="text-xs text-green-300 font-medium">Yugati will analyse your inbox and automatically surface what matters most — no manual setup needed.</p>
              </div>
            ) : (
              <>
                {/* Suggestion chips */}
                <div className="flex flex-wrap gap-1.5">
                  {FOCUS_SUGGESTIONS.map(s => {
                    const active = prefs.focuses.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleFocus(s)}
                        className={`px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                          active
                            ? 'border-green-500/40 bg-green-500/10 text-green-300'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        {active && <span className="mr-1">✓</span>}{s}
                      </button>
                    );
                  })}
                </div>

                {/* Tag input + existing custom tags */}
                <div
                  className="min-h-10 flex flex-wrap items-center gap-1.5 px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl cursor-text focus-within:border-zinc-600 transition-colors"
                  onClick={() => inputRef.current?.focus()}
                >
                  {prefs.focuses.filter(f => !FOCUS_SUGGESTIONS.includes(f)).map(tag => (
                    <span key={tag} className="flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded-lg text-[11px] text-zinc-300">
                      {tag}
                      <button onClick={e => { e.stopPropagation(); removeTag(tag); }} className="text-zinc-500 hover:text-zinc-200 transition-colors ml-0.5">
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={inputRef}
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={prefs.focuses.length === 0 ? 'Add custom focus area… (press Enter)' : 'Add another…'}
                    className="flex-1 min-w-28 bg-transparent text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none"
                  />
                  {customInput && (
                    <button onClick={addCustom} className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 border border-zinc-700 rounded-lg transition-colors shrink-0">
                      <Plus size={10} /> Add
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-zinc-600">Shapes smart summaries, priority sorting, and AI replies</p>
              </>
            )}
          </section>

          <div className="border-t border-zinc-800/60" />

          {/* ── AI Writing Style ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap size={13} className="text-green-400" />
              <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">AI Writing Style</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {toneOptions.map(t => (
                <button
                  key={t.value}
                  onClick={() => set('aiTone', t.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    prefs.aiTone === t.value
                      ? 'border-green-500/40 bg-green-500/8 text-white'
                      : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <p className="text-xs font-semibold">{t.label}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug">{t.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* ── Auto-suggest ── */}
          <section className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl">
            <div className="flex items-center gap-3">
              <Mail size={14} className="text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-zinc-300">Auto-suggest replies</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">AI drafts a reply whenever you open an email</p>
              </div>
            </div>
            <Toggle on={prefs.autoSuggest} onToggle={() => set('autoSuggest', !prefs.autoSuggest)} />
          </section>

          {/* ── Email signature ── */}
          <section className="space-y-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Signature</p>
            <textarea
              value={prefs.emailSignature}
              onChange={e => set('emailSignature', e.target.value)}
              placeholder="e.g. — Saurav | Yugati"
              rows={3}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-300 placeholder-zinc-700 resize-none focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </section>

          {/* ── Morning digest ── */}
          <section className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl">
            <div className="flex items-center gap-3">
              <Clock size={14} className="text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-zinc-300">Morning digest</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">AI summary of overnight emails{prefs.digestEnabled ? ' at' : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {prefs.digestEnabled && (
                <input
                  type="time"
                  value={prefs.digestTime}
                  onChange={e => set('digestTime', e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
                />
              )}
              <Toggle on={prefs.digestEnabled} onToggle={() => set('digestEnabled', !prefs.digestEnabled)} />
            </div>
          </section>

          {/* ── Mute sounds ── */}
          <section className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl">
            <div className="flex items-center gap-3">
              <BellOff size={14} className="text-zinc-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-zinc-300">Mute notification sounds</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">Silent mode — visual indicators only</p>
              </div>
            </div>
            <Toggle on={prefs.muteSounds} onToggle={() => set('muteSounds', !prefs.muteSounds)} />
          </section>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-950">
          <p className="text-[11px] text-zinc-600">Shapes your AI summaries &amp; replies</p>
          <button
            onClick={save}
            disabled={isPending}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 ${
              saved
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-white text-black hover:bg-zinc-100'
            }`}
          >
            {saved ? <><CheckCircle size={12} /> Saved</> : isPending ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main view ───────────────────────────────────────────────── */

export function IntegrationsView({
  initialGmail = false,
  initialCalendar = false,
}: {
  initialGmail?: boolean;
  initialCalendar?: boolean;
}) {
  const trpc = useTRPC();
  const { data, isFetching, refetch } = useQuery({
    ...trpc.stats.connectionStatus.queryOptions(),
    initialData: { gmail: initialGmail, googlecalendar: initialCalendar },
    initialDataUpdatedAt: () => Date.now(),
    staleTime: 30_000,
  });

  const [showPrefs, setShowPrefs] = useState(false);

  function handleOAuth(url: string) {
    openOAuthPopup(url, () => void refetch());
  }

  const anyConnected = (data?.gmail ?? false) || (data?.googlecalendar ?? false);

  return (
    <>
      <div className="h-full overflow-y-auto bg-black">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Blocks size={18} className="text-zinc-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Integrations</h1>
                <p className="text-xs text-zinc-500 mt-0.5">Connect apps to give Yugati access to your data</p>
              </div>
            </div>
            <button
              onClick={() => void refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 px-3 py-2 rounded-xl transition-colors disabled:opacity-40"
            >
              <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
              Refresh status
            </button>
          </div>

          {/* Integration cards */}
          <div className="space-y-3">
            {INTEGRATIONS.map((intg) => (
              <IntegrationCard
                key={intg.id}
                integration={intg}
                connected={intg.id === 'gmail' ? (data?.gmail ?? false) : (data?.googlecalendar ?? false)}
                onAction={handleOAuth}
              />
            ))}
          </div>

          {/* Preferences banner */}
          <button
            onClick={() => setShowPrefs(true)}
            className="w-full flex items-center justify-between px-5 py-4 bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl hover:border-zinc-700/80 hover:bg-zinc-900/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-700 transition-colors">
                <SlidersHorizontal size={15} className="text-zinc-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-zinc-200">Set preferences</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">AI tone, email signature, digest schedule &amp; more</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-zinc-600 group-hover:text-zinc-400 uppercase tracking-wider transition-colors">
              Configure →
            </span>
          </button>

          {/* Hint when nothing connected */}
          {!anyConnected && (
            <p className="text-center text-[11px] text-zinc-700 pb-2">
              Connect at least one integration to start using Yugati AI
            </p>
          )}

        </div>
      </div>

      {showPrefs && <PreferencesModal onClose={() => setShowPrefs(false)} />}
    </>
  );
}
