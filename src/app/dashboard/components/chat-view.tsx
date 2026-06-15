'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowUp, Loader2, Mail, Calendar, Zap,
  Copy, RefreshCw, Pencil, Check, Plus, MessageSquare,
  Maximize2, Minimize2, Trash2, X, Mic, MicOff,
} from 'lucide-react';
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

function getGreeting(name?: string) {
  const h = new Date().getHours();
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  const first = name?.split(' ')[0];
  return first ? `Good ${time}, ${first}` : `Good ${time}`;
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
    icon:     Calendar,
    label:    "This week's calendar",
    detail:   'Review your upcoming meetings',
    prompt:   'What meetings do I have this week?',
    gradient: 'from-violet-500/10 to-purple-500/5',
    iconBg:   'bg-violet-500/15 text-violet-400',
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
    icon:     Mail,
    label:    'Draft a reply',
    detail:   'Reply to your most recent email',
    prompt:   'Draft a reply to my most recent email',
    gradient: 'from-emerald-500/10 to-teal-500/5',
    iconBg:   'bg-emerald-500/15 text-emerald-400',
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
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-sm text-zinc-100">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-sm text-zinc-100">{children}</ol>,
          li: ({ children }) => <li className="text-zinc-100">{children}</li>,
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            return isBlock ? (
              <pre className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 overflow-x-auto my-2">
                <code className="text-xs text-zinc-300 font-mono">{children}</code>
              </pre>
            ) : (
              <code className="bg-zinc-800 text-zinc-300 font-mono text-xs px-1.5 py-0.5 rounded">{children}</code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-zinc-600 pl-3 text-zinc-400 italic my-2">{children}</blockquote>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">{children}</a>
          ),
          hr: () => <hr className="border-zinc-800 my-3" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="text-xs w-full border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-zinc-700 px-3 py-1.5 text-left font-semibold text-zinc-200 bg-zinc-800">{children}</th>,
          td: ({ children }) => <td className="border border-zinc-700 px-3 py-1.5 text-zinc-300">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
      {streaming && (
        <span className="inline-block w-2 h-4 bg-zinc-400 ml-0.5 animate-pulse align-middle rounded-sm" />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ChatView({
  initialPrompt,
  onPromptFired,
  showSidebar = false,
  userName,
}: {
  initialPrompt?: string;
  onPromptFired?: () => void;
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
  const [fullscreen,       setFullscreen]       = useState(showSidebar);
  const [input,            setInput]            = useState('');
  const [isLoading,        setLoading]          = useState(false);
  const [editingMsgId,     setEditingMsgId]     = useState<string | null>(null);
  const [editMsgText,      setEditMsgText]      = useState('');
  const [showClearDialog,  setShowClearDialog]  = useState(false);

  const voice = useVoiceInput((transcript) => { void submit(transcript); });
  const [copiedId,         setCopiedId]         = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionTitle, setEditSessionTitle] = useState('');

  const bottomRef      = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const editMsgRef     = useRef<HTMLTextAreaElement>(null);
  const editSessionRef = useRef<HTMLInputElement>(null);


  const activeSession  = sessions.find((s) => s.id === activeId);
  const messages       = activeSession?.messages ?? [];
  const sidebarVisible = fullscreen;
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
    onPromptFired?.();
    void submit(initialPrompt);
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

    try {
      const res = await fetch('/api/agent/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages
            .filter((m) => !m.streaming)
            .map((m) => ({ role: m.role, content: m.content })),
          conversationId,
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
    } catch {
      updateSession(currentId, (s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: 'Network error — please try again.', streaming: false }
            : m,
        ),
      }));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, isLoading, sessions]);

  async function copyMessage(id: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
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

  const grouped = groupByDate([...sessions].sort((a, b) => b.updatedAt - a.updatedAt));

  const wrapClass = fullscreen
    ? 'fixed inset-0 z-50 flex bg-black text-white'
    : 'h-full flex overflow-hidden bg-black text-white';

  return (
    <div className={wrapClass}>

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
            {!showSidebar && (
              <button
                onClick={() => setFullscreen(false)}
                className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="px-2 pt-2.5 pb-1.5 shrink-0 flex gap-1.5">
            <button
              onClick={startNewChat}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            >
              <Plus size={13} className="shrink-0" />
              New chat
            </button>
            <button
              onClick={() => setShowClearDialog(true)}
              disabled={!activeSession?.messages.length}
              title="Clear current chat"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                            className="p-0.5 text-zinc-600 hover:text-zinc-300 rounded"
                          >
                            <Pencil size={10} />
                          </button>
                          <button
                            onClick={(e) => deleteSession(s.id, e)}
                            className="p-0.5 text-zinc-600 hover:text-red-400 rounded"
                          >
                            <Trash2 size={10} />
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
        <div className="shrink-0 border-b border-zinc-800 px-4 h-14 flex items-center gap-2">
          {!showSidebar && (
            <button
              onClick={() => setFullscreen((f) => !f)}
              className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors mr-1"
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          )}
          <span className="font-semibold text-sm text-zinc-200">
            {messages.length === 0 ? 'Chat' : (activeSession?.title ?? 'Chat')}
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 uppercase tracking-wider">AI</span>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={startNewChat}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Plus size={13} />
              New chat
            </button>
            <button
              onClick={() => setShowClearDialog(true)}
              disabled={!activeSession?.messages.length}
              title="Clear current chat"
              className="flex items-center justify-center w-7 h-7 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Messages / Empty state */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (

            <div className="flex flex-col items-center justify-center h-full gap-10 px-6 pb-20">
              <div className="text-center space-y-1">
                <p className="text-xs font-medium text-zinc-600 uppercase tracking-widest mb-3">Yugati AI</p>
                <h2 className="text-3xl font-semibold text-white tracking-tight">{getGreeting(userName)}</h2>
                <p className="text-zinc-500 text-sm pt-1">How can I help you today?</p>
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
                <div key={msg.id} className="group">
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
                          <div className="bg-zinc-800 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-zinc-100">
                            {msg.content}
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MsgBtn onClick={() => void copyMessage(msg.id, msg.content)} title="Copy">
                              {copiedId === msg.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                            </MsgBtn>
                            <MsgBtn onClick={() => startEditMsg(msg)} title="Edit">
                              <Pencil size={12} />
                            </MsgBtn>
                          </div>
                        </div>
                      )}
                    </div>

                  ) : (

                    <div className="flex gap-3 items-start">
                      <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${msg.blocked ? 'bg-red-500' : 'bg-white'}`}>
                        <span className="text-black text-xs font-bold">Y</span>
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        {msg.content ? (
                          <MdContent content={msg.content} streaming={msg.streaming} />
                        ) : (
                          <div className="flex items-center gap-2 h-7">
                            <span
                              key={fillerText}
                              className="text-sm text-zinc-500 animate-fade-in-up"
                              style={{ animationDuration: '0.3s' }}
                            >
                              {fillerText}
                            </span>
                            <span className="flex gap-0.5 items-center">
                              {[0, 1, 2].map((j) => (
                                <span key={j} className="w-1 h-1 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: `${j * 0.15}s` }} />
                              ))}
                            </span>
                          </div>
                        )}
                        {!msg.streaming && msg.content && (
                          <div className="flex items-center gap-0.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MsgBtn onClick={() => void copyMessage(msg.id, msg.content)} title="Copy">
                              {copiedId === msg.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                            </MsgBtn>
                            {i === messages.length - 1 && (
                              <MsgBtn onClick={regenerate} title="Regenerate" disabled={isLoading}>
                                <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
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
            <div className={`flex items-end gap-2 bg-zinc-900 border rounded-2xl px-4 py-3 transition-colors
              ${input.length > MAX_PROMPT_CHARS
                ? 'border-red-500/60'
                : voice.state === 'recording'    ? 'border-red-500/60'
                : voice.state === 'transcribing' ? 'border-blue-500/40'
                : 'border-zinc-700 focus-within:border-zinc-500'}`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(input); }
                }}
                placeholder={
                  voice.state === 'recording'     ? `Listening… ${voice.timeLeft}s remaining` :
                  voice.state === 'transcribing'  ? 'Transcribing with Whisper…' :
                  'Ask anything about your email or calendar…'
                }
                rows={1}
                disabled={isLoading || voice.state === 'transcribing'}
                className="flex-1 bg-transparent text-sm resize-none outline-none placeholder-zinc-600 min-h-5 max-h-40 leading-5 disabled:opacity-50"
              />
              {/* Char counter — always visible, escalates as limit approaches */}
              <span className={`shrink-0 self-end text-[10px] font-mono tabular-nums mb-0.5 transition-colors
                ${input.length > MAX_PROMPT_CHARS
                  ? 'text-red-400 font-semibold'
                  : input.length > MAX_PROMPT_CHARS * 0.8
                    ? 'text-zinc-400'
                    : 'text-zinc-700'}`}>
                {input.length}/{MAX_PROMPT_CHARS}
              </span>
              {/* Mic button */}
              <button
                onClick={() => void voice.start()}
                disabled={isLoading || voice.state === 'transcribing'}
                title={voice.state === 'recording' ? `Stop (${voice.timeLeft}s left)` : 'Voice input — powered by OpenAI Whisper'}
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
              {/* Send button */}
              <button
                onClick={() => void submit(input)}
                disabled={!input.trim() || isLoading || voice.state !== 'idle' || input.length > MAX_PROMPT_CHARS}
                className="shrink-0 w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 size={13} className="animate-spin" /> : <ArrowUp size={13} />}
              </button>
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
      className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-40"
    >
      {children}
    </button>
  );
}
