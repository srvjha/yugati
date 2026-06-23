'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowUp, Loader2, Mail, Calendar, Zap,
  Copy, RefreshCw, Pencil, Check, Plus, MessageSquare,
  Maximize2, Minimize2, Trash2, Mic, MicOff, Square, PanelLeftClose,
  Send, X, Bold, Italic, Underline, Link2, List, ListOrdered, AlertTriangle,
  Paperclip, Image as ImageIcon, Video, Music, FileText, Archive, File as FileIcon,
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTRPC }  from '@/trpc/client';
import { toast }    from 'sonner';
import { ConnectIntegrationModal } from './ConnectIntegrationModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type AgentMode = 'guided' | 'auto';
import { MAX_PROMPT_CHARS } from '@/lib/constants';

// ─── Voice input — OpenAI Whisper via /api/voice/transcribe ──────────────────

const VOICE_LIMIT_MS = 20_000;

type VoiceState = 'idle' | 'recording' | 'transcribing';

function useVoiceInput(onResult: (text: string) => void) {
  const [state,    setState]    = useState<VoiceState>('idle');
  const [timeLeft, setTimeLeft] = useState(VOICE_LIMIT_MS / 1000);
  const mediaRef  = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRef   = useRef<() => void>(() => {});

  const transcribe = useCallback(async (blob: Blob) => {
    setState('transcribing');
    try {
      const form = new FormData();
      form.append('audio', blob, 'voice.webm');
      const res  = await fetch('/api/voice/transcribe', { method: 'POST', body: form });
      const data = await res.json() as { text?: string };
      if (data.text?.trim()) onResult(data.text.trim());
    } catch {
      // silently fail — user can retry
    } finally {
      setState('idle');
      setTimeLeft(VOICE_LIMIT_MS / 1000);
    }
  }, [onResult]);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const mr = mediaRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
  }, []);

  useEffect(() => { stopRef.current = stop; }, [stop]);

  const start = useCallback(async () => {
    if (state !== 'idle') { stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        void transcribe(blob);
      };

      mr.start(250);
      setState('recording');
      setTimeLeft(VOICE_LIMIT_MS / 1000);

      let remaining = VOICE_LIMIT_MS / 1000;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setTimeLeft(remaining);
        if (remaining <= 0) stopRef.current();
      }, 1000);
    } catch {
      alert('Microphone access denied.');
    }
  }, [state, stop, transcribe]);

  useEffect(() => () => { stop(); }, [stop]);

  return { state, timeLeft, start, stop };
}

// ─── Filler phrases while agent is generating ─────────────────────────────────

const FILLER_EMAIL = [
  'Reading your inbox…',
  'Scanning your threads…',
  'Searching your mail…',
  'Fetching messages…',
  'Reviewing your emails…',
  'Drafting a response…',
  'Analysing threads…',
  'Looking through your inbox…',
  'Pulling email data…',
  'Almost there…',
];

const FILLER_CALENDAR = [
  'Checking your calendar…',
  'Looking up your schedule…',
  'Scanning your events…',
  'Reviewing upcoming meetings…',
  'Fetching calendar data…',
  'Checking for conflicts…',
  'Looking at your availability…',
  'Analysing your schedule…',
  'Almost there…',
];

const FILLER_GENERIC = [
  'Thinking…',
  'Generating…',
  'Processing…',
  'Working on it…',
  'Looking into that…',
  'Connecting the dots…',
  'Gathering insights…',
  'Almost there…',
];

const EMAIL_KEYWORDS    = /email|gmail|inbox|mail|thread|message|unread|sender|draft|reply|compose|attachment|subject|folder|label|sent|spam/i;
const CALENDAR_KEYWORDS = /calendar|event|meeting|schedule|appointment|slot|availability|invite|rsvp|remind|upcoming|book|reschedule|cancel/i;

function detectTopic(query: string): 'email' | 'calendar' | 'generic' {
  if (CALENDAR_KEYWORDS.test(query)) return 'calendar';
  if (EMAIL_KEYWORDS.test(query))    return 'email';
  return 'generic';
}

function useFillerText(active: boolean, lastQuery: string) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 1800);
    return () => clearInterval(id);
  }, [active, lastQuery]);

  const phrases = detectTopic(lastQuery) === 'email'    ? FILLER_EMAIL
                : detectTopic(lastQuery) === 'calendar' ? FILLER_CALENDAR
                : FILLER_GENERIC;

  return active ? phrases[tick % phrases.length]! : phrases[0]!;
}

// ─── Attachment helpers ───────────────────────────────────────────────────────

const MAX_ATTACH_BYTES = 25 * 1024 * 1024;

const BLOCKED_ATTACH_EXTS = new Set([
  'ade','adp','apk','appx','appxbundle','bat','cab','chm','cmd','com','cpl',
  'dll','dmg','ex','ex_','exe','hta','ins','isp','iso','jar','js','jse','lib',
  'lnk','mde','msc','msi','msix','msixbundle','msp','mst','nsh','pif','ps1',
  'scr','sct','shb','sys','vb','vbe','vbs','vxd','wsc','wsf','wsh','xll',
]);

function formatAttachBytes(bytes: number): string {
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

type AttachEntry = { id: string; name: string; size: number; mime: string; data: string | null };

function AttachMimeIcon({ mime, size = 11 }: { mime: string; size?: number }) {
  if (mime.startsWith('image/'))  return <ImageIcon  size={size} className="text-blue-400 shrink-0" />;
  if (mime.startsWith('video/'))  return <Video       size={size} className="text-purple-400 shrink-0" />;
  if (mime.startsWith('audio/'))  return <Music       size={size} className="text-green-400 shrink-0" />;
  if (mime === 'application/pdf') return <FileText    size={size} className="text-red-400 shrink-0" />;
  if (/zip|rar|7z|tar|gz/.test(mime)) return <Archive size={size} className="text-orange-400 shrink-0" />;
  return <FileIcon size={size} className="text-zinc-400 shrink-0" />;
}

// ─── Profanity filter ─────────────────────────────────────────────────────────

const PROFANITY_PATTERNS = [
  // English
  /\bf+u+c+k+(?:ing|er|ed|s)?\b/i,
  /\bs+h+i+t+(?:ty|ter|s)?\b/i,
  /\bass(?:hole|holes)?\b/i,
  /\bbitch(?:es)?\b/i,
  /\bcunt(?:s)?\b/i,
  /\bdick(?:s|head)?\b/i,
  /\bcock(?:s|sucker)?\b/i,
  /\btwat(?:s)?\b/i,
  /\bmotherfucker\b/i,
  /\bbastard(?:s)?\b/i,
  /\bwanker(?:s)?\b/i,
  // Hindi/Hinglish — stem-based to catch all inflections
  /\bchuti(?:y[ae]|ya|ye|yon|yo|)\b/i,   // chutiya, chutiye, chutiyaon, etc.
  /\bmadar(?:chod|chod)?\b/i,
  /\bbhen(?:chod|chod)?\b/i,
  /\bbsdk\b/i,
  /\bharami\b/i,
  /\brandi\b/i,
  /\bgandu\b/i,
  /\bdalle?\b/i,
  /\bbhag\s+bsdk\b/i,
];
function containsProfanity(text: string): boolean {
  return PROFANITY_PATTERNS.some((re) => re.test(text));
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  blocked?:  boolean;
  streaming?: boolean;
};

type Session = {
  id:             string;
  title:          string;
  messages:       Message[];
  conversationId?: string;
  createdAt:      number;
  updatedAt:      number;
};

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = 'yugati_chat_sessions';

function loadSessions(): Session[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session[]) : [];
  } catch { return []; }
}

function saveSessions(sessions: Session[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 100))); } catch { /* quota */ }
}

function uid() { return Math.random().toString(36).slice(2, 10); }

function titleFrom(text: string) {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.length > 52 ? clean.slice(0, 52) + '…' : clean;
}

function groupByDate(sessions: Session[]): { label: string; items: Session[] }[] {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yest  = today - 86_400_000;
  const week  = today - 6 * 86_400_000;
  const groups: Record<string, Session[]> = { Today: [], Yesterday: [], 'Previous 7 days': [], Older: [] };
  for (const s of sessions) {
    if (s.updatedAt >= today)       groups['Today'].push(s);
    else if (s.updatedAt >= yest)   groups['Yesterday'].push(s);
    else if (s.updatedAt >= week)   groups['Previous 7 days'].push(s);
    else                            groups['Older'].push(s);
  }
  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

type GreetEntry = { headline: (n?: string) => string; sub: string };

const GREET_SLOTS: Record<string, GreetEntry[]> = {
  night: [
    { headline: (n) => n ? `Burning the midnight oil, ${n}?`  : 'Burning the midnight oil?', sub: "I'm here whenever you need me." },
    { headline: (n) => n ? `Still at it, ${n}.`               : 'Still at it.',               sub: 'What can I help with?'        },
    { headline: (n) => n ? `Late night, ${n}.`                : 'Late-night mode.',           sub: "What's on your mind?"         },
    { headline: (n) => n ? `Up late, ${n}?`                   : 'Up late?',                   sub: 'What are we working on?'      },
  ],
  morning: [
    { headline: (n) => n ? `Good morning, ${n}.`    : 'Good morning.',    sub: "What's on your mind today?"  },
    { headline: (n) => n ? `Morning, ${n}!`          : 'Morning!',         sub: "Let's get things done."      },
    { headline: (n) => n ? `Rise and shine, ${n}.`  : 'Rise and shine.',  sub: 'How can I help you today?'   },
    { headline: (n) => n ? `A fresh start, ${n}.`   : 'A fresh start.',   sub: 'What would you like to tackle?' },
    { headline: (n) => n ? `Hey ${n}, good morning.`: 'Good morning!',    sub: "What's the plan today?"      },
  ],
  afternoon: [
    { headline: (n) => n ? `Good afternoon, ${n}.`            : 'Good afternoon.',  sub: 'What can I help with?'       },
    { headline: (n) => n ? `Afternoon, ${n}!`                 : 'Afternoon!',       sub: "What's next on your list?"   },
    { headline: (n) => n ? `How's the day going, ${n}?`       : 'How\'s the day going?', sub: "I'm here to help."     },
    { headline: (n) => n ? `Hey ${n}, halfway through the day.`: 'Halfway through the day.', sub: 'What can I do for you?' },
  ],
  evening: [
    { headline: (n) => n ? `Good evening, ${n}.`   : 'Good evening.',    sub: 'How was your day?'            },
    { headline: (n) => n ? `Evening, ${n}!`         : 'Evening!',         sub: "What's on your mind?"         },
    { headline: (n) => n ? `Winding down, ${n}?`   : 'Winding down?',   sub: "I'm here if you need anything."},
    { headline: (n) => n ? `Hey ${n}, how was your day?` : 'How was your day?', sub: 'What can I help with tonight?' },
  ],
};

function getGreeting(name?: string): { headline: string; sub: string } {
  const h     = new Date().getHours();
  const slot  = h >= 22 || h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  const list  = GREET_SLOTS[slot]!;
  const entry = list[new Date().getMinutes() % list.length]!;
  return { headline: entry.headline(name?.split(' ')[0]), sub: entry.sub };
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  {
    icon:     Mail,
    label:    'Unread emails',
    detail:   "See what's waiting in your inbox",
    prompt:   'Show me my unread emails',
    gradient: 'from-blue-500/10 to-indigo-500/5',
    iconBg:   'bg-blue-500/15 text-blue-400',
  },
  {
    icon:     Zap,
    label:    'Quick summary',
    detail:   'Catch up on your last 5 emails',
    prompt:   'Summarise my last 5 emails',
    gradient: 'from-amber-500/10 to-orange-500/5',
    iconBg:   'bg-amber-500/15 text-amber-400',
  },
  {
    icon:     Calendar,
    label:    'Schedule a meeting',
    detail:   'Create a calendar event with invites',
    prompt:   'Schedule a 30-minute meeting for tomorrow at 2pm and send an invite',
    gradient: 'from-rose-500/10 to-pink-500/5',
    iconBg:   'bg-rose-500/15 text-rose-400',
  },
  {
    icon:     Calendar,
    label:    "Today's agenda",
    detail:   'See all events on your calendar today',
    prompt:   "What's on my calendar today? Give me a full rundown of today's events.",
    gradient: 'from-cyan-500/10 to-sky-500/5',
    iconBg:   'bg-cyan-500/15 text-cyan-400',
  },
];

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  title, message, confirmLabel = 'Delete', onConfirm, onCancel,
}: {
  title:         string;
  message:       string;
  confirmLabel?: string;
  onConfirm:     () => void;
  onCancel:      () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm mx-4 bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.8)]">
        <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-500 leading-relaxed mb-6">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 hover:border-red-500/60 rounded-xl transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tone question detector ───────────────────────────────────────────────────

function parseToneQuestion(content: string): { question: string; options: string[] } | null {
  if (!/tone/i.test(content)) return null;
  const lines = content.split('\n');
  const options = lines
    .map((l) => l.trim())
    .filter((l) => /^[-*•·]\s+\S/.test(l))
    .map((l) => l.replace(/^[-*•·]\s+/, '').trim())
    .filter(Boolean);
  if (options.length < 2) return null;
  const question = lines
    .filter((l) => l.trim() && !/^[-*•·]\s+\S/.test(l.trim()))
    .join(' ')
    .trim();
  return { question, options };
}

function ToneSelector({ question, options, onSelect }: {
  question: string;
  options: string[];
  onSelect: (tone: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-100 leading-relaxed">{question}</p>
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all select-none
              ${selected === opt
                ? 'border-white/30 bg-white/[0.08]'
                : 'border-zinc-700/60 bg-white/[0.02] hover:border-zinc-600 hover:bg-white/[0.04]'}`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
              ${selected === opt ? 'border-white' : 'border-zinc-600'}`}>
              {selected === opt && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <input
              type="radio"
              name="tone"
              value={opt}
              checked={selected === opt}
              onChange={() => setSelected(opt)}
              className="sr-only"
            />
            <span className="text-sm text-zinc-200">{opt}</span>
          </label>
        ))}
      </div>
      <button
        disabled={!selected}
        onClick={() => selected && onSelect(selected)}
        className="mt-1 px-4 py-2 text-xs font-semibold bg-white text-black rounded-xl hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Use this tone
      </button>
    </div>
  );
}

// ─── Email draft card ─────────────────────────────────────────────────────────

interface EmailDraft {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
}

function parseEmailDraft(content: string): EmailDraft | null {
  if (!/^to:\s*\S/im.test(content) || !/^subject:\s*\S/im.test(content) || !/^body:\s*$/im.test(content)) return null;
  const lines = content.split('\n');
  let to = '', cc = '', bcc = '', subject = '';
  const bodyLines: string[] = [];
  let inBody = false;

  for (const line of lines) {
    const t = line.trim();
    if (!inBody) {
      if (/^to:\s*/i.test(t))      { to      = t.replace(/^to:\s*/i, '').trim();      continue; }
      if (/^cc:\s*/i.test(t))      { cc      = t.replace(/^cc:\s*/i, '').trim();      continue; }
      if (/^bcc:\s*/i.test(t))     { bcc     = t.replace(/^bcc:\s*/i, '').trim();     continue; }
      if (/^subject:\s*/i.test(t)) { subject = t.replace(/^subject:\s*/i, '').trim(); continue; }
      if (/^body:\s*$/i.test(t))   { inBody  = true;                                  continue; }
    } else {
      bodyLines.push(line);
    }
  }

  const rawBody = bodyLines.join('\n').trim();
  const outroIdx = rawBody.search(/\n\n?(send this|would you|do you|shall i|should i|let me know|is this|does this|ready to send|want me to send)/i);
  const body = outroIdx !== -1 ? rawBody.slice(0, outroIdx).trim() : rawBody;

  if (!to || !subject || !body) return null;
  return { to, cc: cc || undefined, bcc: bcc || undefined, subject, body };
}

function plainToHtml(text: string): string {
  return text
    .split('\n')
    .map((line) => `<div>${line === '' ? '<br>' : line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`)
    .join('');
}

function linkifyHtml(html: string): string {
  return html.replace(
    /(https?:\/\/[^\s<>"']+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#60a5fa;text-decoration:underline">$1</a>',
  );
}

function DraftFormatBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 rounded-lg transition-colors"
    >
      {children}
    </button>
  );
}

function DraftLinkPopover({ onInsert }: { onInsert: (url: string) => void }) {
  const [open, setOpen]  = useState(false);
  const [url,  setUrl]   = useState('');
  const inputRef  = useRef<HTMLInputElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setUrl('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function openPopover() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
    setOpen((o) => !o);
  }

  function insert() {
    const val = url.trim();
    if (!val) return;
    const href = val.startsWith('http') ? val : `https://${val}`;
    if (savedRange.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
    }
    onInsert(href);
    setUrl(''); setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); openPopover(); }}
        title="Insert link"
        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors
          ${open ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60'}`}
      >
        <Link2 size={12} />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-50 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl p-3 w-60">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Insert link</p>
          <input
            ref={inputRef}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')  { e.preventDefault(); insert(); }
              if (e.key === 'Escape') { setOpen(false); setUrl(''); }
            }}
            placeholder="https://..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insert(); }}
              disabled={!url.trim()}
              className="flex-1 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Insert
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setOpen(false); setUrl(''); }}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmailDraftCard({ draft }: { draft: EmailDraft }) {
  const trpc   = useTRPC();
  const [editing,          setEditing]         = useState(false);
  const [fields,           setFields]          = useState({ to: draft.to, cc: draft.cc ?? '', bcc: draft.bcc ?? '', subject: draft.subject });
  const [sent,             setSent]            = useState(false);
  const [reviewing,        setReviewing]       = useState(false);
  const [reviewBodyText,   setReviewBodyText]  = useState('');
  const [profanityWarning, setProfanityWarning] = useState(false);
  const [sentDetails,      setSentDetails]     = useState<{ to: string; subject: string; body: string } | null>(null);
  const [attachments,      setAttachments]     = useState<AttachEntry[]>([]);
  const editorRef   = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMutation = useMutation(
    trpc.gmail.sendMessage.mutationOptions({
      onSuccess: () => {
        setSentDetails({ to: fields.to, subject: fields.subject, body: reviewBodyText });
        setSent(true);
        setReviewing(false);
        toast.success('Email sent');
      },
      onError:   () => toast.error('Failed to send email'),
    }),
  );

  const draftMutation = useMutation(
    trpc.gmail.createDraft.mutationOptions({
      onSuccess: () => toast.success('Saved to Drafts'),
      onError:   () => toast.error('Failed to save draft'),
    }),
  );

  function execFmt(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  }


  async function addFiles(files: File[]) {
    const existingSize = attachments.reduce((s, a) => s + a.size, 0);
    let running = existingSize;
    const toAdd: Array<{ entry: AttachEntry; file: File }> = [];
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (BLOCKED_ATTACH_EXTS.has(ext)) { toast.error(`"${file.name}" is blocked by Gmail`); continue; }
      if (running + file.size > MAX_ATTACH_BYTES) { toast.error(`"${file.name}" would exceed the 25 MB limit`); continue; }
      running += file.size;
      toAdd.push({ entry: { id: uid(), name: file.name, size: file.size, mime: file.type || 'application/octet-stream', data: null }, file });
    }
    if (!toAdd.length) return;
    setAttachments(prev => [...prev, ...toAdd.map(({ entry }) => entry)]);
    await Promise.all(toAdd.map(async ({ entry, file }) => {
      try {
        const data = await readFileAsBase64(file);
        setAttachments(prev => prev.map(a => a.id === entry.id ? { ...a, data } : a));
      } catch {
        toast.error(`Failed to read "${entry.name}"`);
        setAttachments(prev => prev.filter(a => a.id !== entry.id));
      }
    }));
  }

  function removeAttachment(id: string) {
    setAttachments(prev => prev.filter(a => a.id !== id));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function currentPayload() {
    const htmlBody = editorRef.current?.innerHTML ?? plainToHtml(draft.body);
    return {
      to:          fields.to.split(/[,;]\s*/).map((s) => s.trim()).filter(Boolean),
      cc:          fields.cc  ? fields.cc.split(/[,;]\s*/).map((s) => s.trim()).filter(Boolean)  : undefined,
      bcc:         fields.bcc ? fields.bcc.split(/[,;]\s*/).map((s) => s.trim()).filter(Boolean) : undefined,
      subject:     fields.subject,
      htmlBody,
      attachments: attachments.length
        ? attachments.filter(a => a.data !== null).map(a => ({ filename: a.name, mimeType: a.mime, data: a.data!, size: a.size }))
        : undefined,
    };
  }

  function handleSend() {
    setReviewBodyText(editorRef.current?.innerText ?? draft.body);
    setReviewing(true);
  }
  function handleConfirmSend() {
    if (containsProfanity(`${fields.subject} ${reviewBodyText}`)) {
      setProfanityWarning(true);
      return;
    }
    setProfanityWarning(false);
    sendMutation.mutate(currentPayload());
  }
  function handleSaveDraft()   { draftMutation.mutate({ to: [fields.to], subject: fields.subject, body: editorRef.current?.innerText ?? draft.body }); }

  useEffect(() => {
    if (editing && editorRef.current && editorRef.current.innerHTML === '') {
      editorRef.current.innerHTML = plainToHtml(draft.body);
    }
  }, [editing, draft.body]);

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        {/* Ripple + checkmark animation */}
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Outer ripple 1 */}
          <motion.div
            className="absolute rounded-full bg-green-500/15"
            initial={{ width: 48, height: 48, opacity: 0.8 }}
            animate={{ width: 96, height: 96, opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.4 }}
          />
          {/* Outer ripple 2 — delayed */}
          <motion.div
            className="absolute rounded-full bg-green-500/10"
            initial={{ width: 48, height: 48, opacity: 0.6 }}
            animate={{ width: 96, height: 96, opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.4, delay: 0.35 }}
          />
          {/* Green circle */}
          <motion.div
            className="relative z-10 w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_24px_rgba(34,197,94,0.4)]"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.05 }}
          >
            {/* Checkmark path */}
            <motion.svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <motion.path
                d="M7 14.5l5 5 9-9"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
              />
            </motion.svg>
          </motion.div>
        </div>
        <motion.p
          className="text-sm font-semibold text-zinc-200"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Email sent successfully
        </motion.p>
        {sentDetails && (
          <motion.div
            className="w-full mt-2 rounded-xl border border-zinc-800/60 bg-zinc-800/30 text-xs divide-y divide-zinc-800/50"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <div className="flex gap-3 px-4 py-2.5">
              <span className="w-14 shrink-0 text-zinc-500 font-medium uppercase tracking-wider">To</span>
              <span className="text-zinc-300 break-all">{sentDetails.to}</span>
            </div>
            <div className="flex gap-3 px-4 py-2.5">
              <span className="w-14 shrink-0 text-zinc-500 font-medium uppercase tracking-wider">Subject</span>
              <span className="text-zinc-300 font-medium">{sentDetails.subject}</span>
            </div>
            <div className="flex gap-3 px-4 py-2.5">
              <span className="w-14 shrink-0 text-zinc-500 font-medium uppercase tracking-wider">Body</span>
              <span className="text-zinc-400 whitespace-pre-wrap line-clamp-4">{sentDetails.body}</span>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  const rowCls   = 'flex items-center border-b border-zinc-800/50';
  const labelCls = 'text-[10px] font-semibold text-zinc-500 uppercase tracking-wider w-20 shrink-0 pl-4 pr-2 py-2.5';
  const inputCls = 'flex-1 min-w-0 bg-transparent text-sm text-zinc-100 outline-none py-2.5 pr-4 placeholder-zinc-600';

  return (
    <div className="rounded-2xl overflow-hidden border border-zinc-700/50 bg-zinc-900/70 text-sm">

      {/* Card header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800/50 border-b border-zinc-700/40">
        <GmailIcon size={18} />
        <span className="text-xs font-semibold text-zinc-300 flex-1">Draft</span>
        <button
          onClick={() => setEditing((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          {editing ? <X size={11} /> : <Pencil size={11} />}
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Address / subject fields */}
      <div className="border-b border-zinc-800/50">
        <div className={rowCls}>
          <span className={labelCls}>From</span>
          <span className="flex-1 py-2.5 pr-4 text-zinc-500 text-sm">Me</span>
        </div>
        <div className={rowCls}>
          <span className={labelCls}>To</span>
          {editing
            ? <input value={fields.to} onChange={(e) => setFields((f) => ({ ...f, to: e.target.value }))} className={inputCls} />
            : <span className="flex-1 py-2.5 pr-4 text-zinc-100 break-all">{fields.to}</span>
          }
        </div>
        {(fields.cc || editing) && (
          <div className={rowCls}>
            <span className={labelCls}>CC</span>
            {editing
              ? <input value={fields.cc} onChange={(e) => setFields((f) => ({ ...f, cc: e.target.value }))} className={inputCls} placeholder="Add CC…" />
              : <span className="flex-1 py-2.5 pr-4 text-zinc-100 break-all">{fields.cc}</span>
            }
          </div>
        )}
        {(fields.bcc || editing) && (
          <div className={rowCls}>
            <span className={labelCls}>BCC</span>
            {editing
              ? <input value={fields.bcc} onChange={(e) => setFields((f) => ({ ...f, bcc: e.target.value }))} className={inputCls} placeholder="Add BCC…" />
              : <span className="flex-1 py-2.5 pr-4 text-zinc-100 break-all">{fields.bcc}</span>
            }
          </div>
        )}
        <div className={rowCls}>
          <span className={labelCls}>Subject</span>
          {editing
            ? <input value={fields.subject} onChange={(e) => setFields((f) => ({ ...f, subject: e.target.value }))} className={`${inputCls} font-medium`} />
            : <span className="flex-1 py-2.5 pr-4 text-zinc-100 font-medium">{fields.subject}</span>
          }
        </div>
      </div>

      {/* Body */}
      {editing ? (
        <>
          {/* Rich-text toolbar */}
          <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-zinc-800/50 bg-zinc-800/30">
            <DraftFormatBtn onClick={() => execFmt('bold')}          title="Bold (⌘B)">      <Bold      size={12} /></DraftFormatBtn>
            <DraftFormatBtn onClick={() => execFmt('italic')}        title="Italic (⌘I)">    <Italic    size={12} /></DraftFormatBtn>
            <DraftFormatBtn onClick={() => execFmt('underline')}     title="Underline (⌘U)"> <Underline size={12} /></DraftFormatBtn>
            <div className="w-px h-4 bg-zinc-700 mx-1 shrink-0" />
            <DraftFormatBtn onClick={() => execFmt('insertUnorderedList')} title="Bullet list">   <List        size={12} /></DraftFormatBtn>
            <DraftFormatBtn onClick={() => execFmt('insertOrderedList')}   title="Numbered list"> <ListOrdered size={12} /></DraftFormatBtn>
            <div className="w-px h-4 bg-zinc-700 mx-1 shrink-0" />
            <DraftLinkPopover onInsert={(url) => execFmt('createLink', url)} />
            <div className="w-px h-4 bg-zinc-700 mx-1 shrink-0" />
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
              title="Attach files"
              className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 rounded-lg transition-colors"
            >
              <Paperclip size={12} />
            </button>
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); execFmt('bold'); }
              if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); execFmt('italic'); }
              if ((e.metaKey || e.ctrlKey) && e.key === 'u') { e.preventDefault(); execFmt('underline'); }
            }}
            className="px-4 py-3.5 text-sm text-zinc-200 leading-relaxed outline-none min-h-[120px] max-h-80 overflow-y-auto"
            style={{ wordBreak: 'break-word' }}
          />
        </>
      ) : (
        <div
          className="px-4 py-3.5 text-sm text-zinc-200 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: linkifyHtml(plainToHtml(draft.body)) }}
        />
      )}

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="border-t border-zinc-800/50 bg-zinc-900/50 px-3 py-2">
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {attachments.map((att) => (
              <div key={att.id} className="flex items-center gap-1.5 bg-zinc-800/80 border border-zinc-700/60 rounded-lg px-2 py-1 text-xs max-w-[180px]">
                {att.data === null
                  ? <Loader2 size={11} className="animate-spin text-zinc-400 shrink-0" />
                  : <AttachMimeIcon mime={att.mime} />
                }
                <span className="text-zinc-200 truncate">{att.name}</span>
                <span className="text-zinc-600 shrink-0">{formatAttachBytes(att.size)}</span>
                <button type="button" onClick={() => removeAttachment(att.id)} className="text-zinc-600 hover:text-red-400 transition-colors shrink-0">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
          {(() => {
            const total = attachments.reduce((s, a) => s + a.size, 0);
            const pct   = Math.min(100, (total / MAX_ATTACH_BYTES) * 100);
            return (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-orange-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-zinc-600 shrink-0 tabular-nums">{formatAttachBytes(total)} / 25 MB</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) void addFiles(Array.from(e.target.files)); }}
      />

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-zinc-800/50 bg-zinc-800/20">
        <button
          onClick={handleSaveDraft}
          disabled={draftMutation.isPending || sendMutation.isPending || !fields.subject}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 hover:border-zinc-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {draftMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : null}
          Save Draft
        </button>
        <button
          onClick={handleSend}
          disabled={draftMutation.isPending || !fields.to || !fields.subject || attachments.some(a => a.data === null)}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-white text-black rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={11} /> Review &amp; Send
        </button>
      </div>

      {/* Pre-send review modal */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4 rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <AlertTriangle size={13} className="text-amber-400" />
                </div>
                <span className="text-sm font-semibold text-zinc-100">Review before sending</span>
              </div>
              <button onClick={() => setReviewing(false)} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Email summary */}
            <div className="px-5 py-4 space-y-3 text-xs">
              <div className="flex gap-3">
                <span className="w-14 shrink-0 text-zinc-500 font-medium uppercase tracking-wider pt-0.5">To</span>
                <span className="text-zinc-100 break-all">{fields.to}</span>
              </div>
              {fields.cc && (
                <div className="flex gap-3">
                  <span className="w-14 shrink-0 text-zinc-500 font-medium uppercase tracking-wider pt-0.5">CC</span>
                  <span className="text-zinc-100 break-all">{fields.cc}</span>
                </div>
              )}
              <div className="flex gap-3">
                <span className="w-14 shrink-0 text-zinc-500 font-medium uppercase tracking-wider pt-0.5">Subject</span>
                <span className="text-zinc-100 font-medium">{fields.subject}</span>
              </div>
              <div className="flex gap-3">
                <span className="w-14 shrink-0 text-zinc-500 font-medium uppercase tracking-wider pt-0.5">Body</span>
                <div className="flex-1 text-zinc-200 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto bg-zinc-800/40 rounded-lg px-3 py-2.5 border border-zinc-700/40">
                  {reviewBodyText}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-zinc-800/30 border-t border-zinc-800 text-[11px] text-zinc-500">
              Make sure the content above looks correct before sending.
            </div>

            {/* Profanity warning */}
            {profanityWarning && (
              <div className="mx-5 mb-1 mt-3 flex items-start gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-300">Inappropriate content detected</p>
                  <p className="text-[11px] text-red-400/80 mt-0.5">This email contains offensive language. Please edit the content before sending.</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-800">
              <button
                onClick={() => { setReviewing(false); setProfanityWarning(false); }}
                className="px-4 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 border border-zinc-700/60 hover:border-zinc-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                disabled={sendMutation.isPending || profanityWarning}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                Confirm &amp; Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function MdContent({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-base font-bold text-zinc-100 mt-4 mb-2 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold text-zinc-100 mt-3 mb-1.5 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold text-zinc-200 mt-3 mb-1 first:mt-0">{children}</h3>,
          p:  ({ children }) => <p className="text-sm text-zinc-100 leading-relaxed mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          em: ({ children }) => <em className="italic text-zinc-300">{children}</em>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1.5 mb-2 text-sm text-zinc-100">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1.5 mb-2 text-sm text-zinc-100">{children}</ol>,
          li: ({ children }) => <li className="text-zinc-100 leading-relaxed">{children}</li>,
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            return isBlock ? (
              <pre className="bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-3.5 overflow-x-auto my-3">
                <code className="text-xs text-zinc-300 font-mono">{children}</code>
              </pre>
            ) : (
              <code className="bg-zinc-800/70 text-zinc-300 font-mono text-[11px] px-1.5 py-0.5 rounded-md border border-zinc-700/40">{children}</code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-zinc-600 pl-3.5 text-zinc-400 italic my-2 rounded-r-lg bg-white/[0.03] py-1">{children}</blockquote>
          ),
          a: ({ href, children }) => {
            const isGmail = typeof href === 'string' && href.includes('mail.google.com');
            if (isGmail) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-fit mt-1.5 items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#4f80c9]/35 text-[#4f80c9] text-[11px] font-medium whitespace-nowrap no-underline hover:underline hover:border-[#4f80c9]/60 transition-colors"
                >
                  {children}
                </a>
              );
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#4f80c9] hover:text-[#6b97d8] underline underline-offset-2">{children}</a>
            );
          },
          hr: () => <hr className="border-zinc-800 my-4" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-xl border border-zinc-700/50">
              <table className="text-xs w-full border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border-b border-zinc-700/50 px-3 py-2 text-left font-semibold text-zinc-200 bg-zinc-800/60">{children}</th>,
          td: ({ children }) => <td className="border-b border-zinc-800 px-3 py-2 text-zinc-300 last:border-0">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
      {streaming && (
        <span className="inline-block w-1.5 h-4 bg-zinc-500 ml-0.5 animate-pulse align-middle rounded-full" />
      )}
    </div>
  );
}

// ─── Google Calendar event card ──────────────────────────────────────────────

function GoogleCalendarIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="5" width="18" height="16" rx="2" fill="white" />
      <rect x="3" y="5" width="18" height="5.5" rx="2" fill="#4285F4" />
      <rect x="3" y="8" width="18" height="2.5" fill="#4285F4" />
      <rect x="7" y="2.5" width="2" height="5" rx="1" fill="#4285F4" />
      <rect x="15" y="2.5" width="2" height="5" rx="1" fill="#4285F4" />
      <text x="12" y="19" textAnchor="middle" fill="#4285F4" fontSize="7" fontWeight="700" fontFamily="Arial,sans-serif">21</text>
    </svg>
  );
}

function GmailIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 6.5C2 5.67 2.67 5 3.5 5h17C21.33 5 22 5.67 22 6.5v11c0 .83-.67 1.5-1.5 1.5h-17C2.67 19 2 18.33 2 17.5V6.5Z" fill="white"/>
      <path d="M2 7l10 6.5L22 7" stroke="#EA4335" strokeWidth="1.5" fill="none"/>
      <path d="M2 7v10.5C2 18.33 2.67 19 3.5 19H8V11l4 2.5 4-2.5v8h4.5c.83 0 1.5-.67 1.5-1.5V7L12 13.5 2 7Z" fill="white"/>
      <path d="M2 7l10 6.5L22 7V6.5C22 5.67 21.33 5 20.5 5H3.5C2.67 5 2 5.67 2 6.5V7Z" fill="#EA4335"/>
      <path d="M8 19V11l4 2.5 4-2.5v8" fill="none"/>
      <path d="M2 17.5V7l10 6.5L22 7v10.5c0 .83-.67 1.5-1.5 1.5H16V11l-4 2.5L8 11v8H3.5C2.67 19 2 18.33 2 17.5Z" fill="white"/>
      <path d="M2 7l10 6.5L22 7V6.5C22 5.67 21.33 5 20.5 5H3.5C2.67 5 2 5.67 2 6.5V7Z" fill="#EA4335"/>
      <path d="M8 11v8H3.5C2.67 19 2 18.33 2 17.5V7l6 4Z" fill="#34A853"/>
      <path d="M16 11v8h4.5c.83 0 1.5-.67 1.5-1.5V7l-6 4Z" fill="#FBBC04"/>
    </svg>
  );
}

interface CalendarEventDetails {
  title?: string;
  attendees: string[];
  date?: string;
  time?: string;
  duration?: string;
  hasMeet: boolean;
  intro: string;
  outro: string;
}

function parseCalendarConfirm(content: string): CalendarEventDetails | null {
  if (!(/date:/i.test(content) && /time:/i.test(content))) return null;
  if (!/(confirm|schedul|event details)/i.test(content)) return null;

  const lines = content.split('\n');
  let title: string | undefined, date: string | undefined, time: string | undefined, duration: string | undefined;
  const attendees: string[] = [];
  let hasMeet = false;
  const introLines: string[] = [];
  const outroLines: string[] = [];
  let phase: 'intro' | 'fields' | 'outro' = 'intro';

  for (const line of lines) {
    const stripped = line.replace(/^[-*•]\s*/, '').trim();
    if (!stripped) { if (phase === 'fields') phase = 'outro'; continue; }

    const get = (rx: RegExp) => { const m = stripped.match(rx); return m ? stripped.slice(m[0].length).trim() : null; };
    const t    = get(/^(?:meeting topic|event|title|summary):\s*/i);
    const att  = get(/^attendees?:\s*/i);
    const d    = get(/^date:\s*/i);
    const ti   = get(/^time:\s*/i);
    const dur  = get(/^duration:\s*/i);
    const isField = t ?? att ?? d ?? ti ?? dur;

    if (isField !== null) phase = 'fields';

    if (t)   title = t;
    if (att) attendees.push(...att.split(/[,;]/).map((s) => s.trim()).filter(Boolean));
    if (d)   date = d;
    if (ti)  time = ti;
    if (dur) duration = dur;
    if (/meet/i.test(stripped) && /includ/i.test(stripped)) hasMeet = true;

    if (phase === 'intro' && !isField)  introLines.push(stripped);
    if (phase === 'outro' && !isField)  outroLines.push(stripped);
  }

  if (!date || !time) return null;
  return { title, attendees, date, time, duration, hasMeet, intro: introLines.join(' '), outro: outroLines.join(' ') };
}

function CalendarEventCard({ event, onConfirm }: { event: CalendarEventDetails; onConfirm: (msg: string) => void }) {
  const [confirming, setConfirming] = useState(false);

  function confirm() {
    setConfirming(true);
    onConfirm('Yes, schedule it.');
  }

  const rowCls = 'flex items-start gap-3 py-2';
  const dotCls = 'w-1.5 h-1.5 rounded-full bg-[#4285F4] shrink-0 mt-1.5';

  return (
    <div className="rounded-2xl overflow-hidden border border-zinc-700/50 bg-zinc-900/70 text-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-zinc-800/50 border-b border-zinc-700/40">
        <GoogleCalendarIcon size={18} />
        <span className="text-xs font-semibold text-zinc-200">Google Calendar</span>
        <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#4285F4]/15 text-[#4285F4]">New Event</span>
      </div>

      {/* Event title */}
      {event.title && (
        <div className="px-4 pt-3.5 pb-1">
          <p className="text-base font-semibold text-zinc-100">{event.title}</p>
        </div>
      )}

      {/* Details */}
      <div className="px-4 py-2.5 space-y-0.5">
        <div className={rowCls}>
          <div className={dotCls} />
          <span className="text-zinc-300">
            <span className="font-medium text-zinc-100">{event.date}</span>
            <span className="text-zinc-500 mx-1">·</span>
            {event.time}
            {event.duration && <><span className="text-zinc-500 mx-1">·</span>{event.duration}</>}
          </span>
        </div>
        {event.attendees.length > 0 && (
          <div className={rowCls}>
            <div className={dotCls} />
            <span className="text-zinc-300 break-all">{event.attendees.join(', ')}</span>
          </div>
        )}
        {event.hasMeet && (
          <div className={rowCls}>
            <div className={dotCls} />
            <span className="text-zinc-300 flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4Z" fill="#00897B"/>
              </svg>
              Google Meet link included
            </span>
          </div>
        )}
      </div>

      {/* Outro / Footer */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-zinc-800/50 bg-zinc-800/20 mt-1">
        <p className="text-xs text-zinc-500 leading-snug max-w-[55%]">{event.outro || 'Is this correct?'}</p>
        <button
          onClick={confirm}
          disabled={confirming}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#4285F4] hover:bg-[#3574e0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0" style={{ color: '#ffffff' }}
        >
          {confirming ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          Schedule Event
        </button>
      </div>
    </div>
  );
}

// ─── Calendar success card ────────────────────────────────────────────────────

interface CalendarSuccess {
  title?: string;
  datetime?: string;
  attendees?: string;
  calendarLink?: string;
}

function parseCalendarSuccess(content: string): CalendarSuccess | null {
  if (!/(has been scheduled|successfully scheduled|event.*scheduled|scheduled.*event)/i.test(content)) return null;

  const lines = content.split('\n');
  let title: string | undefined, datetime: string | undefined, attendees: string | undefined, calendarLink: string | undefined;

  for (const line of lines) {
    const s = line.replace(/^[-*•]\s*/, '').trim();
    const get = (rx: RegExp) => { const m = s.match(rx); return m ? s.slice(m[0].length).trim() : null; };
    title      = get(/^title:\s*/i)                    ?? title;
    datetime   = get(/^date\s*(?:&|and)?\s*time:\s*/i) ?? datetime;
    attendees  = get(/^attendees?:\s*/i)               ?? attendees;
    const linkM = s.match(/https?:\/\/calendar\.google\.com[^\s)>\]"]*/i);
    if (linkM) calendarLink = linkM[0];
  }

  return { title, datetime, attendees, calendarLink };
}

function CalendarSuccessCard({ details }: { details: CalendarSuccess }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      {/* Ripple + checkmark animation */}
      <div className="relative flex items-center justify-center w-24 h-24">
        <motion.div
          className="absolute rounded-full bg-[#4285F4]/15"
          initial={{ width: 48, height: 48, opacity: 0.8 }}
          animate={{ width: 96, height: 96, opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.4 }}
        />
        <motion.div
          className="absolute rounded-full bg-[#4285F4]/10"
          initial={{ width: 48, height: 48, opacity: 0.6 }}
          animate={{ width: 96, height: 96, opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.4, delay: 0.35 }}
        />
        <motion.div
          className="relative z-10 w-14 h-14 rounded-full bg-[#4285F4] flex items-center justify-center shadow-[0_0_24px_rgba(66,133,244,0.4)]"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.05 }}
        >
          <motion.svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <motion.path
              d="M7 14.5l5 5 9-9"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
            />
          </motion.svg>
        </motion.div>
      </div>

      <motion.p
        className="text-sm font-semibold text-zinc-200"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        Meeting scheduled!
      </motion.p>

      {(details.title ?? details.datetime ?? details.attendees) && (
        <motion.div
          className="w-full mt-2 rounded-xl border border-zinc-800/60 bg-zinc-800/30 text-xs divide-y divide-zinc-800/50"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          {details.title && (
            <div className="flex gap-3 px-4 py-2.5">
              <span className="w-16 shrink-0 text-zinc-500 font-medium uppercase tracking-wider">Event</span>
              <span className="text-zinc-300 font-medium">{details.title}</span>
            </div>
          )}
          {details.datetime && (
            <div className="flex gap-3 px-4 py-2.5">
              <span className="w-16 shrink-0 text-zinc-500 font-medium uppercase tracking-wider">When</span>
              <span className="text-zinc-300">{details.datetime}</span>
            </div>
          )}
          {details.attendees && (
            <div className="flex gap-3 px-4 py-2.5">
              <span className="w-16 shrink-0 text-zinc-500 font-medium uppercase tracking-wider">Who</span>
              <span className="text-zinc-300 break-all">{details.attendees}</span>
            </div>
          )}
          {details.calendarLink && (
            <div className="flex gap-3 px-4 py-2.5">
              <span className="w-16 shrink-0 text-zinc-500 font-medium uppercase tracking-wider">Link</span>
              <a href={details.calendarLink} target="_blank" rel="noopener noreferrer"
                className="text-[#4285F4] hover:underline truncate">
                Open in Google Calendar →
              </a>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ChatView({
  initialPrompt,
  onPromptFired,
  onAgentDone,
  showSidebar = false,
  userName,
}: {
  initialPrompt?: string;
  onPromptFired?: () => void;
  onAgentDone?: () => void;
  showSidebar?: boolean;
  userName?: string;
} = {}) {

  const [initState]  = useState(() => {
    const stored = loadSessions();
    if (stored.length > 0) return { sessions: stored, activeId: stored[0].id };
    const s = makeSession();
    return { sessions: [s], activeId: s.id };
  });
  const [sessions,         setSessions]         = useState<Session[]>(initState.sessions);
  const [activeId,         setActiveId]         = useState<string>(initState.activeId);
  const [fullscreen,       setFullscreen]       = useState(false);
  const [sidebarOpen,      setSidebarOpen]      = useState(showSidebar);
  const [input,            setInput]            = useState('');
  const [isLoading,        setLoading]          = useState(false);
  const [editingMsgId,     setEditingMsgId]     = useState<string | null>(null);
  const [editMsgText,      setEditMsgText]      = useState('');
  const [showClearDialog,  setShowClearDialog]  = useState(false);
  const [agentMode,        setAgentMode]        = useState<AgentMode>(() => {
    try { return (localStorage.getItem('yugati_agent_mode') as AgentMode) ?? 'guided'; } catch { return 'guided'; }
  });

  const trpc      = useTRPC();
  const { data: planData } = useQuery(trpc.plans.getMyPlan.queryOptions());
  const charLimit = planData?.charLimit ?? MAX_PROMPT_CHARS;

  const { data: connData } = useQuery({ ...trpc.stats.connectionStatus.queryOptions(), staleTime: 0 });
  const gmailConnected    = connData?.gmail ?? true;
  const calendarConnected = connData?.googlecalendar ?? true;
  const [connectModal, setConnectModal] = useState<'gmail' | 'calendar' | null>(null);

  const voice = useVoiceInput((transcript) => { void submit(transcript); });
  const [copiedId,         setCopiedId]         = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionTitle, setEditSessionTitle] = useState('');

  const bottomRef      = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const editMsgRef     = useRef<HTMLTextAreaElement>(null);
  const editSessionRef = useRef<HTMLInputElement>(null);
  const abortRef       = useRef<AbortController | null>(null);


  const activeSession  = sessions.find((s) => s.id === activeId);
  const messages       = useMemo(() => activeSession?.messages ?? [], [activeSession]);
  const sidebarVisible = sidebarOpen;
  const lastQuery      = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const fillerText     = useFillerText(isLoading, lastQuery);

  useEffect(() => { if (sessions.length > 0) saveSessions(sessions); }, [sessions]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  useEffect(() => {
    const el = editMsgRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [editMsgText]);

  useEffect(() => {
    if (!initialPrompt) return;
    // Defer parent setState so it doesn't cascade from inside this effect body.
    const id = setTimeout(() => onPromptFired?.(), 0);
    void submit(initialPrompt);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  // ── Session helpers ───────────────────────────────────────────────────────

  function makeSession(): Session {
    return { id: uid(), title: 'New chat', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
  }

  function startNewChat() {
    const s = makeSession();
    setSessions((p) => [s, ...p]);
    setActiveId(s.id);
    setInput('');
    setEditingMsgId(null);
  }

  function switchSession(id: string) {
    setActiveId(id);
    setEditingMsgId(null);
  }

  function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (id === activeId) {
        if (next.length > 0) setActiveId(next[0].id);
        else { const s = makeSession(); next.unshift(s); setActiveId(s.id); }
      }
      return next;
    });
  }

  function clearCurrentChat() {
    setSessions((prev) => {
      const fresh = makeSession();
      const next  = prev.filter((s) => s.id !== activeId);
      next.unshift(fresh);
      setActiveId(fresh.id);
      return next;
    });
    setShowClearDialog(false);
  }

  function updateSession(id: string, upd: Partial<Session> | ((s: Session) => Session)) {
    setSessions((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      const next = typeof upd === 'function' ? upd(s) : { ...s, ...upd };
      return { ...next, updatedAt: Date.now() };
    }));
  }

  function startEditSession(s: Session, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingSessionId(s.id);
    setEditSessionTitle(s.title);
    setTimeout(() => { editSessionRef.current?.focus(); editSessionRef.current?.select(); }, 30);
  }

  function commitSessionTitle() {
    if (editingSessionId && editSessionTitle.trim()) {
      updateSession(editingSessionId, { title: editSessionTitle.trim() });
    }
    setEditingSessionId(null);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const submit = useCallback(async (text: string, fromIndex?: number) => {
    if (!text.trim() || isLoading) return;

    const currentId = activeId;
    const base: Message[] = fromIndex !== undefined
      ? (sessions.find((s) => s.id === currentId)?.messages.slice(0, fromIndex) ?? [])
      : (sessions.find((s) => s.id === currentId)?.messages ?? []);

    const isFirstMessage = base.length === 0;
    const userMsg:      Message = { id: uid(), role: 'user',      content: text };
    const assistantMsg: Message = { id: uid(), role: 'assistant', content: '', streaming: true };
    const nextMessages = [...base, userMsg, assistantMsg];
    const conversationId = sessions.find((s) => s.id === currentId)?.conversationId;

    updateSession(currentId, (s) => ({
      ...s,
      messages: nextMessages,
      title: isFirstMessage ? titleFrom(text) : s.title,
    }));

    setInput('');
    setEditingMsgId(null);
    setLoading(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch('/api/agent/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  abort.signal,
        body: JSON.stringify({
          messages: nextMessages
            .filter((m) => !m.streaming)
            .map((m) => ({ role: m.role, content: m.content })),
          conversationId,
          agentMode,
        }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        const msg = err.error ?? (res.status === 429 ? 'Too many requests — slow down a bit.' : 'Request failed.');
        updateSession(currentId, (s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: msg, streaming: false, blocked: true } : m,
          ),
        }));
        return;
      }

      if (!res.body) throw new Error('No response body');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6)) as {
              type: string; text?: string; reason?: string; message?: string; conversationId?: string;
            };

            if (data.type === 'delta' && data.text) {
              accumulated += data.text;
              const acc = accumulated;
              updateSession(currentId, (s) => ({
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantMsg.id ? { ...m, content: acc, streaming: true } : m,
                ),
              }));
            }

            if (data.type === 'done') {
              updateSession(currentId, (s) => ({
                ...s,
                conversationId: data.conversationId ?? s.conversationId,
                messages: s.messages.map((m) =>
                  m.id === assistantMsg.id ? { ...m, streaming: false } : m,
                ),
              }));
              onAgentDone?.();
            }

            if (data.type === 'blocked' || data.type === 'error') {
              const reason = data.reason ?? data.message ?? 'Something went wrong.';
              updateSession(currentId, (s) => ({
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantMsg.id ? { ...m, content: reason, streaming: false, blocked: true } : m,
                ),
              }));
            }
          } catch { /* malformed chunk */ }
        }
      }
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') {
        // User stopped — remove the incomplete assistant message
        updateSession(currentId, (s) => ({
          ...s,
          messages: s.messages.filter((m) => m.id !== assistantMsg.id),
        }));
      } else {
        updateSession(currentId, (s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: 'Network error — please try again.', streaming: false }
              : m,
          ),
        }));
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, isLoading, sessions]);

  function stopGeneration() {
    abortRef.current?.abort();
  }

  function handleSubmit(text: string) {
    if (!text.trim()) return;
    const topic = detectTopic(text);
    if (topic === 'email' && !gmailConnected) { setConnectModal('gmail'); return; }
    if (topic === 'calendar' && !calendarConnected) { setConnectModal('calendar'); return; }
    void submit(text);
  }

  async function copyMessage(id: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('Copied');
    setTimeout(() => setCopiedId(null), 2000);
  }

  function regenerate() {
    const msgs = activeSession?.messages ?? [];
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    void submit(lastUser.content, msgs.indexOf(lastUser));
  }

  function startEditMsg(msg: Message) {
    setEditingMsgId(msg.id);
    setEditMsgText(msg.content);
    setTimeout(() => editMsgRef.current?.focus(), 50);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const grouped  = groupByDate([...sessions].sort((a, b) => b.updatedAt - a.updatedAt));
  const greeting = getGreeting(userName);

  const wrapClass = fullscreen
    ? 'fixed inset-0 z-50 flex bg-black text-white'
    : 'h-full flex overflow-hidden bg-black text-white';

  return (
    <div className={wrapClass}>

      {connectModal && (
        <ConnectIntegrationModal
          integration={connectModal}
          onClose={() => setConnectModal(null)}
        />
      )}

      {showClearDialog && (
        <ConfirmDialog
          title="Clear this chat?"
          message="This will permanently delete the current conversation. This action cannot be undone."
          confirmLabel="Clear chat"
          onConfirm={clearCurrentChat}
          onCancel={() => setShowClearDialog(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      {sidebarVisible && (
        <aside className="w-60 shrink-0 flex flex-col bg-zinc-950 border-r border-zinc-800/70 overflow-hidden">
          <div className="h-14 flex items-center justify-between px-3 border-b border-zinc-800/70 shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-zinc-500" />
              <span className="text-sm font-semibold text-zinc-200">Chats</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={14} />
            </button>
          </div>

          <div className="px-2 pt-2.5 pb-1.5 shrink-0 flex gap-1.5">
            <button
              onClick={startNewChat}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-white text-black hover:bg-zinc-100 transition-colors"
            >
              <Plus size={13} className="shrink-0" />
              New chat
            </button>
            <button
              onClick={() => setShowClearDialog(true)}
              disabled={!activeSession?.messages.length}
              title="Clear current chat"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-300 hover:text-red-400 hover:bg-red-500/10 border border-zinc-700 hover:border-red-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 size={13} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {grouped.map(({ label, items }) => (
              <div key={label} className="mb-2">
                <p className="px-2 py-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">{label}</p>
                {items.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => switchSession(s.id)}
                    className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors
                      ${s.id === activeId ? 'bg-zinc-800' : 'hover:bg-zinc-900'}`}
                  >
                    {editingSessionId === s.id ? (
                      <input
                        ref={editSessionRef}
                        value={editSessionTitle}
                        onChange={(e) => setEditSessionTitle(e.target.value)}
                        onBlur={commitSessionTitle}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitSessionTitle();
                          if (e.key === 'Escape') setEditingSessionId(null);
                          e.stopPropagation();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0 bg-zinc-700 text-zinc-100 text-xs px-1.5 py-0.5 rounded outline-none border border-zinc-500"
                      />
                    ) : (
                      <>
                        <span className={`flex-1 min-w-0 truncate text-xs ${s.id === activeId ? 'text-zinc-100' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                          {s.title}
                        </span>
                        <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => startEditSession(s, e)}
                            className="p-1 text-zinc-400 hover:text-white rounded"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={(e) => deleteSession(s.id, e)}
                            className="p-1 text-zinc-400 hover:text-red-400 rounded"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="shrink-0 border-b border-zinc-800/80 px-4 h-14 flex items-center gap-2">
          <button
            onClick={() => { setFullscreen((f) => { setSidebarOpen(!f); return !f; }); }}
            className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors mr-1"
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <span className="font-semibold text-sm text-zinc-200">
            {messages.length === 0 ? 'Chat' : (activeSession?.title ?? 'Chat')}
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 uppercase tracking-wider">AI</span>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={startNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-black hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <Plus size={13} />
              New chat
            </button>
            <button
              onClick={() => setShowClearDialog(true)}
              disabled={!activeSession?.messages.length}
              title="Clear current chat"
              className="flex items-center justify-center w-7 h-7 rounded-lg text-zinc-300 hover:text-red-400 hover:bg-red-500/10 border border-zinc-700 hover:border-red-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Messages / Empty state */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (

            <div className="flex flex-col items-center justify-center h-full gap-10 px-6 pb-20">
              <div className="text-center space-y-2">
                <h2 className="text-4xl font-bold text-white tracking-tight leading-tight">{greeting.headline}</h2>
                <p className="text-zinc-500 text-sm pt-0.5">{greeting.sub}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {SUGGESTIONS.map(({ icon: Icon, label, detail, prompt, gradient, iconBg }) => (
                  <button
                    key={prompt}
                    onClick={() => void submit(prompt)}
                    className={`group flex items-start gap-3 px-4 py-3.5 rounded-xl border border-zinc-800 bg-gradient-to-br ${gradient} hover:border-zinc-700 transition-all text-left`}
                  >
                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors leading-snug">{label}</p>
                      <p className="text-xs text-zinc-600 group-hover:text-zinc-500 transition-colors mt-0.5 leading-snug">{detail}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          ) : (

            <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
              {messages.map((msg, i) => (
                <div
                  key={msg.id}
                  className="group"
                >
                  {msg.role === 'user' ? (

                    <div className="flex justify-end">
                      {editingMsgId === msg.id ? (
                        <div className="max-w-[80%] w-full">
                          <textarea
                            ref={editMsgRef}
                            value={editMsgText}
                            onChange={(e) => setEditMsgText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                void submit(editMsgText, messages.indexOf(msg));
                              }
                              if (e.key === 'Escape') setEditingMsgId(null);
                            }}
                            className="w-full bg-zinc-800 border border-zinc-600 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-400 resize-none leading-relaxed"
                            rows={2}
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => setEditingMsgId(null)} className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors">Cancel</button>
                            <button
                              onClick={() => void submit(editMsgText, messages.indexOf(msg))}
                              disabled={!editMsgText.trim()}
                              className="text-xs font-semibold bg-white text-black px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-40"
                            >
                              Save & Send
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-1 max-w-[80%]">
                          <div className="relative overflow-hidden bg-white/[0.07] backdrop-blur-xl border border-white/[0.1] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-white shadow-[0_2px_20px_rgba(0,0,0,0.2)]">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.2] to-transparent pointer-events-none" />
                            {msg.content}
                          </div>
                          <div className="flex items-center gap-0.5">
                            <MsgBtn onClick={() => void copyMessage(msg.id, msg.content)} title="Copy">
                              {copiedId === msg.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                            </MsgBtn>
                            <MsgBtn onClick={() => startEditMsg(msg)} title="Edit">
                              <Pencil size={14} />
                            </MsgBtn>
                          </div>
                        </div>
                      )}
                    </div>

                  ) : (

                    <div className="flex gap-3 items-start">
                      {/* Avatar */}
                      <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 shadow-sm
                        ${msg.blocked ? 'bg-red-500' : 'bg-white'}`}>
                        <span className={`text-xs font-bold ${msg.blocked ? 'text-white' : 'text-black'}`}>Y</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {msg.content ? (
                          <div className={`relative overflow-hidden rounded-2xl rounded-tl-sm
                            bg-white/[0.04] backdrop-blur-xl border
                            shadow-[0_4px_40px_rgba(0,0,0,0.25)]
                            px-4 py-3.5
                            ${msg.blocked
                              ? 'border-red-500/25'
                              : 'border-white/[0.08]'}`}>
                            {/* Top-edge shimmer */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.18] to-transparent pointer-events-none" />
                            {/* Soft violet glow */}
                            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-violet-400/[0.06] blur-2xl pointer-events-none" />
                            {(() => {
                              const isLastMsg = i === messages.length - 1;
                              if (!msg.streaming && !msg.blocked) {
                                const emailDraft = parseEmailDraft(msg.content);
                                if (emailDraft) return <EmailDraftCard draft={emailDraft} />;

                                const calSuccess = parseCalendarSuccess(msg.content);
                                if (calSuccess) return <CalendarSuccessCard details={calSuccess} />;

                                if (isLastMsg) {
                                  const calEvent = parseCalendarConfirm(msg.content);
                                  if (calEvent) return <CalendarEventCard event={calEvent} onConfirm={(m) => void submit(m)} />;

                                  const toneQ = parseToneQuestion(msg.content);
                                  if (toneQ) return <ToneSelector question={toneQ.question} options={toneQ.options} onSelect={(t) => void submit(t)} />;
                                }
                              }
                              return <MdContent content={msg.content} streaming={msg.streaming} />;
                            })()}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5 h-10 px-1">
                            <span
                              key={fillerText}
                              className="text-sm text-zinc-500 animate-fade-in-up"
                              style={{ animationDuration: '0.3s' }}
                            >
                              {fillerText}
                            </span>
                            <span className="flex gap-1 items-center">
                              {[0, 1, 2].map((j) => (
                                <span key={j} className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: `${j * 0.18}s` }} />
                              ))}
                            </span>
                          </div>
                        )}
                        {!msg.streaming && msg.content && (
                          <div className="flex items-center gap-0.5 mt-1.5">
                            <MsgBtn onClick={() => void copyMessage(msg.id, msg.content)} title="Copy">
                              {copiedId === msg.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                            </MsgBtn>
                            {i === messages.length - 1 && (
                              <MsgBtn onClick={regenerate} title="Regenerate" disabled={isLoading}>
                                <RefreshCw size={14} />
                              </MsgBtn>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                  )}
                </div>
              ))}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 pb-4 pt-2">
          <div className="max-w-2xl mx-auto">
            <div className={`flex flex-col bg-zinc-900 border rounded-2xl transition-colors
              ${input.length > charLimit
                ? 'border-red-500/60'
                : voice.state === 'recording'    ? 'border-red-500/60'
                : voice.state === 'transcribing' ? 'border-blue-500/40'
                : 'border-zinc-700 focus-within:border-zinc-500'}`}>
              {/* Textarea row */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(input); }
                }}
                placeholder={
                  voice.state === 'recording'     ? `Listening… ${voice.timeLeft}s remaining` :
                  voice.state === 'transcribing'  ? 'Transcribing with Whisper…' :
                  'Ask anything about your email or calendar…'
                }
                rows={1}
                disabled={voice.state === 'transcribing'}
                className="bg-transparent text-sm resize-none outline-none placeholder-zinc-600 min-h-5 max-h-40 leading-5 px-4 pt-3 pb-2"
              />
              {/* Bottom toolbar */}
              <div className="flex items-center gap-2 px-3 pb-2.5">
                {/* Mode toggle */}
                <TooltipProvider>
                <div className="flex items-center bg-zinc-800/60 rounded-lg p-0.5 gap-0.5">
                  <Tooltip>
                    <TooltipTrigger
                      onClick={() => { setAgentMode('guided'); try { localStorage.setItem('yugati_agent_mode', 'guided'); } catch {} }}
                      className={`flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium transition-all
                        ${agentMode === 'guided' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                      Guided
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Asks before sending emails or making changes
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      onClick={() => { setAgentMode('auto'); try { localStorage.setItem('yugati_agent_mode', 'auto'); } catch {} }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all
                        ${agentMode === 'auto' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                      <Zap size={9} className={agentMode === 'auto' ? 'text-amber-400' : ''} />
                      Auto
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Acts immediately without asking
                    </TooltipContent>
                  </Tooltip>
                </div>
                </TooltipProvider>
                <div className="flex-1" />
                {/* Char counter */}
                <span className={`text-[10px] font-mono tabular-nums transition-colors
                  ${input.length > charLimit
                    ? 'text-red-400 font-semibold'
                    : input.length > charLimit * 0.8
                      ? 'text-zinc-400'
                      : 'text-zinc-700'}`}>
                  {input.length}/{charLimit}
                </span>
                {/* Mic button */}
                <button
                  onClick={() => void voice.start()}
                  disabled={isLoading || voice.state === 'transcribing'}
                  title={voice.state === 'recording' ? `Stop (${voice.timeLeft}s left)` : 'Voice input'}
                  className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed
                    ${voice.state === 'recording'
                      ? 'bg-red-500 text-white animate-pulse'
                      : voice.state === 'transcribing'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                >
                  {voice.state === 'transcribing' ? <Loader2 size={13} className="animate-spin" /> :
                   voice.state === 'recording'    ? <MicOff size={13} /> :
                   <Mic size={13} />}
                </button>
                {/* Stop / Send button */}
                {isLoading ? (
                  <button
                    onClick={stopGeneration}
                    title="Stop generating"
                    className="shrink-0 w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center hover:bg-zinc-100 transition-colors"
                  >
                    <Square size={11} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubmit(input)}
                    disabled={!input.trim() || voice.state !== 'idle' || input.length > charLimit}
                    className="shrink-0 w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowUp size={13} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-center text-[10px] text-zinc-700 mt-2">
              Yugati can make mistakes. Verify important actions before confirming.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Message action button ────────────────────────────────────────────────────

function MsgBtn({ onClick, title, children, disabled }: {
  onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-md transition-colors disabled:opacity-40"
    >
      {children}
    </button>
  );
}
