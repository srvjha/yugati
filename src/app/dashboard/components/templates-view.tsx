'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sun, Calendar, Reply, ClipboardList,
  Plus, X, Sparkles, LayoutTemplate,
  ChevronRight,
} from 'lucide-react';

interface Template {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon?: string;
  isCustom?: boolean;
}

const BUILTIN: Template[] = [
  {
    id: 'morning-brief',
    title: 'Morning Brief',
    description: 'Catch up on what matters before you start your day.',
    prompt: 'Summarize my unread emails from the last 24 hours. Highlight anything urgent or time-sensitive, and tell me what needs a reply today.',
    icon: 'sun',
  },
  {
    id: 'schedule-meeting',
    title: 'Schedule a Meeting',
    description: 'Book a slot with anyone — AI finds the time and sends the invite.',
    prompt: 'Schedule a 30-minute meeting with [Name] about [Topic]. Find a free slot this week, create a Google Meet link, and send them a calendar invite.',
    icon: 'calendar',
  },
  {
    id: 'follow-up',
    title: 'Draft Follow-up',
    description: 'Nudge someone politely when they haven\'t replied.',
    prompt: 'Draft a polite follow-up email to [Name] about [Topic]. I sent my last email a few days ago and haven\'t heard back. Keep it short and friendly.',
    icon: 'reply',
  },
  {
    id: 'commitment-scan',
    title: 'Commitment Scan',
    description: 'Find every promise you\'ve made in email that\'s still open.',
    prompt: 'Scan my sent emails from the last 2 weeks. Find any commitments I made — things I said I\'d send, check, or do. List them with the person I made them to and whether I\'ve followed through.',
    icon: 'clipboard',
  },
];

const STORAGE_KEY = 'yugati_custom_templates';

const ICON_MAP: Record<string, React.ElementType> = {
  sun: Sun,
  calendar: Calendar,
  reply: Reply,
  clipboard: ClipboardList,
};

const BG_MAP: Record<string, string> = {
  sun:       'bg-amber-500/15 text-amber-400',
  calendar:  'bg-blue-500/15 text-blue-400',
  reply:     'bg-violet-500/15 text-violet-400',
  clipboard: 'bg-emerald-500/15 text-emerald-400',
};

function TemplateCard({ t, onUse }: { t: Template; onUse: (t: Template) => void }) {
  const Icon   = t.icon ? (ICON_MAP[t.icon] ?? Sparkles) : Sparkles;
  const iconCls = t.icon ? (BG_MAP[t.icon] ?? 'bg-zinc-700 text-zinc-300') : 'bg-zinc-700 text-zinc-300';

  return (
    <div className="group flex flex-col gap-3 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
          <Icon size={16} />
        </div>
        {t.isCustom && <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">Custom</span>}
      </div>

      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold text-zinc-100 leading-snug">{t.title}</p>
        <p className="text-xs text-zinc-500 leading-relaxed">{t.description}</p>
      </div>

      <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl px-3 py-2.5">
        <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-3 font-mono">{t.prompt}</p>
      </div>

      <button
        onClick={() => onUse(t)}
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
      >
        Use template
        <ChevronRight size={12} />
      </button>
    </div>
  );
}

function AddTemplateCard({ onSave }: { onSave: (t: Template) => void }) {
  const [open,  setOpen]  = useState(false);
  const [title, setTitle] = useState('');
  const [desc,  setDesc]  = useState('');
  const [prompt, setPrompt] = useState('');

  function save() {
    if (!title.trim() || !prompt.trim()) return;
    onSave({
      id:       `custom-${Date.now()}`,
      title:    title.trim(),
      description: desc.trim() || 'Custom template',
      prompt:   prompt.trim(),
      isCustom: true,
    });
    setTitle(''); setDesc(''); setPrompt(''); setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border border-dashed border-zinc-700 bg-transparent hover:border-zinc-500 hover:bg-zinc-900/40 transition-all min-h-[220px]"
      >
        <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
          <Plus size={16} className="text-zinc-400" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-zinc-300">Add your own</p>
          <p className="text-xs text-zinc-600">Save a prompt you use often</p>
        </div>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-5 rounded-2xl border border-violet-500/40 bg-zinc-900/80">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-200">New template</p>
        <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <X size={14} />
        </button>
      </div>

      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Template name"
        className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors"
      />
      <input
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="Short description (optional)"
        className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors"
      />
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Paste your prompt here…"
        rows={4}
        className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors resize-none font-mono"
      />

      <button
        onClick={save}
        disabled={!title.trim() || !prompt.trim()}
        className="py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Save template
      </button>
    </div>
  );
}

export function TemplatesView() {
  const router = useRouter();
  const [custom, setCustom] = useState<Template[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Template[]) : [];
    } catch {
      return [];
    }
  });

  function saveCustom(t: Template) {
    const next = [...custom, t];
    setCustom(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  function deleteCustom(id: string) {
    const next = custom.filter(t => t.id !== id);
    setCustom(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  function useTemplate(t: Template) {
    router.push(`/dashboard/chat?prompt=${encodeURIComponent(t.prompt)}`);
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <LayoutTemplate size={16} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100 leading-tight">Templates</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Pick a starting point — the AI fills in the rest.</p>
          </div>
        </div>

        {/* Built-in */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={12} className="text-zinc-500" />
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Built-in</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BUILTIN.map(t => (
              <TemplateCard key={t.id} t={t} onUse={useTemplate} />
            ))}
          </div>
        </section>

        {/* Custom */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Plus size={12} className="text-zinc-500" />
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">My templates</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {custom.map(t => (
              <div key={t.id} className="relative group/card">
                <TemplateCard t={t} onUse={useTemplate} />
                <button
                  onClick={() => deleteCustom(t.id)}
                  className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-red-500/40 transition-all"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            <AddTemplateCard onSave={saveCustom} />
          </div>
        </section>

      </div>
    </div>
  );
}
