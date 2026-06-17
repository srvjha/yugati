'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, Archive, Reply, Forward, MoreHorizontal, ReplyAll, Bot, Star, CheckCheck, Send, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/trpc/types';
import { useTRPC } from '@/trpc/client';
import { ThemeToggle, useTheme } from '@/components/theme-toggle';

type GmailMessage = inferRouterOutputs<AppRouter>['gmail']['getMessage'];
type Part = NonNullable<GmailMessage['payload']>;

// base64url → utf-8 string
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

// Decode HTML entities from Gmail snippets (e.g. &#39; → ')
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// base64url → plain base64 (for data: URLs)
function toPlainBase64(data: string): string {
  return data.replace(/-/g, '+').replace(/_/g, '/');
}

type InlineImage = { cid: string; mimeType: string; data: string };

// Collect inline image parts (Content-ID references)
function extractInlineImages(part: Part): InlineImage[] {
  const images: InlineImage[] = [];
  if (part.mimeType?.startsWith('image/') && part.body?.data) {
    const rawCid = (part.headers ?? []).find(
      (h) => h.name?.toLowerCase() === 'content-id'
    )?.value ?? '';
    const cid = rawCid.replace(/^<|>$/g, '');
    if (cid) images.push({ cid, mimeType: part.mimeType, data: part.body.data });
  }
  if (part.parts) {
    for (const p of part.parts) images.push(...extractInlineImages(p as Part));
  }
  return images;
}

// Recursively extract text/html or text/plain body
function extractBody(part: Part): { html?: string; text?: string } {
  if (part.body?.data) {
    const decoded = decodeBase64Url(part.body.data);
    if (part.mimeType === 'text/html')  return { html: decoded };
    if (part.mimeType === 'text/plain') return { text: decoded };
  }
  if (part.parts) {
    let html: string | undefined;
    let text: string | undefined;
    for (const p of part.parts) {
      const r = extractBody(p as Part);
      if (r.html) html = r.html;
      if (r.text) text = r.text;
    }
    return { html, text };
  }
  return {};
}

type Header = { name?: string; value?: string };
function getHeader(headers: Header[], name: string) {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}

const REPLY_CTX_KEY = 'yugati_reply_context';

type ReplyContext = {
  from: string;
  to: string;
  subject: string;
  snippet: string;
  threadId?: string | null;
  replyAll?: boolean;
  forward?: boolean;
};

export function MailView({ message }: { message: GmailMessage }) {
  const router = useRouter();
  const trpc   = useTRPC();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const headers = message.payload?.headers ?? [];

  // Optimistic star — instant visual feedback, API runs in background
  const [starred, setStarred] = useState(message.labelIds?.includes('STARRED') ?? false);
  const subject  = getHeader(headers, 'Subject') || '(no subject)';
  const from     = getHeader(headers, 'From');
  const to       = getHeader(headers, 'To');
  const cc       = getHeader(headers, 'Cc');
  const replyTo  = getHeader(headers, 'Reply-To') || from;
  const date     = message.internalDate
    ? new Date(Number(message.internalDate)).toLocaleString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short',
        year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
      })
    : getHeader(headers, 'Date');

  const { html, text } = extractBody(message.payload ?? {});
  const inlineImages   = extractInlineImages(message.payload ?? {});

  // Parse sender display name and email
  const fromMatch = from.match(/^(.*?)\s*<([^>]+)>$/) ?? [];
  const fromName  = fromMatch[1]?.trim().replace(/^"|"$/g, '') || from;
  const fromEmail = fromMatch[2] || from;

  const iframeRef  = useRef<HTMLIFrameElement>(null);
  const bodyRef    = useRef<HTMLTextAreaElement>(null);
  const [moreOpen,       setMoreOpen]       = useState(false);
  const [composeMode,    setComposeMode]    = useState<'reply' | 'replyAll' | 'forward' | null>(null);
  const [composeTo,      setComposeTo]      = useState('');
  const [composeCc,      setComposeCc]      = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody,    setComposeBody]    = useState('');

  const trashMutation = useMutation(
    trpc.gmail.trashMessage.mutationOptions({
      onSuccess: () => {
        toast.success('Moved to Trash');
        router.push('/dashboard/mail');
      },
      onError: () => toast.error('Failed to move to Trash'),
    }),
  );

  const archiveMutation = useMutation(
    trpc.gmail.modifyMessage.mutationOptions({
      onSuccess: () => {
        toast.success('Archived');
        router.push('/dashboard/mail');
      },
      onError: () => toast.error('Failed to archive'),
    }),
  );

  const markReadMutation = useMutation(
    trpc.gmail.modifyMessage.mutationOptions({
      onSuccess: () => toast.success('Marked as read'),
      onError:   () => toast.error('Failed to mark as read'),
    }),
  );

  const starMutation = useMutation(
    trpc.gmail.modifyMessage.mutationOptions({
      onError: () => setStarred((s) => !s), // revert on failure
    }),
  );

  const sendMutation = useMutation(
    trpc.gmail.sendMessage.mutationOptions({
      onSuccess: () => { toast.success('Sent!'); setComposeMode(null); },
      onError:   () => toast.error('Failed to send'),
    }),
  );

  useEffect(() => {
    if (!iframeRef.current || !html) return;
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    if (!doc) return;

    let processedHtml = html;
    for (const img of inlineImages) {
      const dataUrl = `data:${img.mimeType};base64,${toPlainBase64(img.data)}`;
      processedHtml = processedHtml.split(`cid:${img.cid}`).join(dataUrl);
    }

    const darkStyles = isDark ? `
        html, body { background: #141414 !important; color: #e2e8f0 !important; }
        img { filter: invert(1) hue-rotate(180deg) !important; }
        a { color: #60a5fa !important; }
        * { border-color: rgba(255,255,255,0.08) !important; }
    ` : '';

    doc.open();
    doc.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <style>
        html, body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14px; color: ${isDark ? '#e2e8f0' : '#1f2937'};
          margin: 0; padding: 20px 24px;
          word-break: break-word; background: ${isDark ? '#141414' : '#ffffff'};
        }
        * { box-sizing: border-box; }
        a { color: ${isDark ? '#60a5fa' : '#2563eb'}; }
        img, video { max-width: 100%; height: auto; }
        ${darkStyles}
      </style>
    </head><body>${processedHtml}</body></html>`);
    doc.close();

    function fixLightText() {
      const win = iframe.contentWindow;
      const idoc = iframe.contentDocument;
      if (!win || !idoc) return;

      if (isDark) {
        idoc.querySelectorAll<HTMLElement>('*').forEach((el) => {
          if (el.tagName === 'IMG' || el.tagName === 'svg') return;
          const bg = win.getComputedStyle(el).backgroundColor;
          const bgMatch = bg.match(/\d+/g);
          if (bgMatch && bgMatch.length >= 3) {
            const [r, g, b] = bgMatch.map(Number) as [number, number, number];
            if ((0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.85)
              el.style.setProperty('background-color', '#141414', 'important');
          }
          const color = win.getComputedStyle(el).color;
          const m = color.match(/\d+/g);
          if (!m || m.length < 3) return;
          const [r, g, b] = m.map(Number) as [number, number, number];
          if ((0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.3)
            el.style.setProperty('color', '#e2e8f0', 'important');
        });
        idoc.querySelectorAll<HTMLElement>('a').forEach((a) => {
          a.style.setProperty('color', '#60a5fa', 'important');
        });
      } else {
        const w = win; // capture for use inside nested functions (TS flow narrowing)
        // Walk up the DOM tree to find the nearest non-transparent background color
        function getAncestorBgLum(el: HTMLElement): number | null {
          let node: HTMLElement | null = el;
          while (node) {
            const bg = w.getComputedStyle(node).backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
              const m = bg.match(/\d+/g);
              if (m && m.length >= 3) {
                const [r, g, b] = m.map(Number) as [number, number, number];
                return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
              }
            }
            node = node.parentElement;
          }
          return null;
        }

        idoc.querySelectorAll<HTMLElement>('*').forEach((el) => {
          if (el.tagName === 'IMG' || el.tagName === 'svg') return;
          const color = w.getComputedStyle(el).color;
          const m = color.match(/\d+/g);
          if (!m || m.length < 3) return;
          const [r, g, b] = m.map(Number) as [number, number, number];
          if ((0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55) {
            // Walk up to find the real background — if it's dark/colored, keep the light text
            const bgLum = getAncestorBgLum(el);
            if (bgLum !== null && bgLum < 0.5) return;
            el.style.setProperty('color', '#374151', 'important');
          }
        });
        idoc.querySelectorAll<HTMLElement>('a').forEach((a) => {
          // Only restore link blue on light backgrounds — skip anchors inside colored/dark buttons
          const bgLum = getAncestorBgLum(a);
          if (bgLum !== null && bgLum < 0.5) return;
          a.style.setProperty('color', '#2563eb', 'important');
        });
      }
    }

    const resize = () => {
      if (iframe.contentDocument?.body) {
        iframe.style.height = iframe.contentDocument.body.scrollHeight + 'px';
      }
    };
    iframe.onload = () => { resize(); fixLightText(); };
    const timerId = setTimeout(() => { resize(); fixLightText(); }, 400);
    return () => clearTimeout(timerId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, isDark]);

  // Close more dropdown on outside click
  useEffect(() => {
    if (!moreOpen) return;
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-more-menu]')) setMoreOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  function startCompose(mode: 'reply' | 'replyAll' | 'forward') {
    setComposeMode(mode);
    if (mode === 'forward') {
      setComposeSubject(subject.startsWith('Fwd:') ? subject : `Fwd: ${subject}`);
      setComposeTo('');
      setComposeCc('');
    } else {
      setComposeSubject(subject.startsWith('Re:') ? subject : `Re: ${subject}`);
      setComposeTo(replyTo);
      setComposeCc(mode === 'replyAll' ? cc : '');
    }
    setComposeBody('');
    setTimeout(() => bodyRef.current?.focus(), 60);
  }

  function handleSend() {
    const toList = composeTo.split(',').map((s) => s.trim()).filter(Boolean);
    const ccList = composeCc.split(',').map((s) => s.trim()).filter(Boolean);
    if (!toList.length && composeMode !== 'forward') return;
    sendMutation.mutate({
      to:       toList.length ? toList : [''],
      cc:       ccList.length ? ccList : undefined,
      subject:  composeSubject,
      body:     composeBody,
      threadId: message.threadId ?? undefined,
    });
  }

  function handleAskAI() {
    const ctx: ReplyContext = {
      from,
      to: composeTo || (composeMode === 'forward' ? '' : replyTo),
      subject: composeSubject,
      snippet: decodeHtmlEntities(message.snippet ?? ''),
      threadId: message.threadId,
      replyAll: composeMode === 'replyAll',
      forward:  composeMode === 'forward',
    };
    sessionStorage.setItem(REPLY_CTX_KEY, JSON.stringify(ctx));
    router.push('/dashboard/mail');
  }

  function handleTrash() {
    if (!message.id) return;
    trashMutation.mutate({ id: message.id });
  }

  function handleArchive() {
    if (!message.id) return;
    archiveMutation.mutate({ id: message.id, removeLabelIds: ['INBOX'] });
  }

  function handleStar() {
    if (!message.id) return;
    const next = !starred;
    setStarred(next); // instant visual update
    starMutation.mutate(
      next
        ? { id: message.id, addLabelIds:    ['STARRED'] }
        : { id: message.id, removeLabelIds: ['STARRED'] },
    );
  }

  function handleMarkRead() {
    if (!message.id) return;
    markReadMutation.mutate({ id: message.id, removeLabelIds: ['UNREAD'] });
    setMoreOpen(false);
  }

  const isBusy = trashMutation.isPending || archiveMutation.isPending;

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white">

      {/* Topbar */}
      <header className="shrink-0 border-b border-zinc-800/60 sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-5 h-13 flex items-center gap-3">
          <Link
            href="/dashboard/mail"
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft size={14} />
            Inbox
          </Link>
          <div className="flex-1" />
          <ThemeToggle />
          <div className="flex items-center gap-0.5">
            {/* Star — optimistic, instant fill */}
            <button
              title={starred ? 'Unstar' : 'Star'}
              onClick={handleStar}
              className={`p-2 rounded-lg transition-colors ${
                starred ? 'text-yellow-400 hover:text-yellow-300' : 'text-zinc-500 hover:text-yellow-400'
              }`}
            >
              <Star size={14} className={starred ? 'fill-yellow-400' : ''} />
            </button>
            <div className="w-px h-4 bg-zinc-800 mx-1" />
            <ActionBtn icon={<Reply size={14} />}    label="Reply"     onClick={() => startCompose('reply')} />
            <ActionBtn icon={<ReplyAll size={14} />} label="Reply All" onClick={() => startCompose('replyAll')} />
            <ActionBtn icon={<Forward size={14} />}  label="Forward"   onClick={() => startCompose('forward')} />
            <div className="w-px h-4 bg-zinc-800 mx-1" />
            <ActionBtn
              icon={<Archive size={14} />}
              label="Archive"
              onClick={handleArchive}
              loading={archiveMutation.isPending}
              disabled={isBusy}
            />
            <ActionBtn
              icon={<Trash2 size={14} />}
              label="Trash"
              onClick={handleTrash}
              loading={trashMutation.isPending}
              disabled={isBusy}
              danger
            />
            {/* More dropdown */}
            <div className="relative" data-more-menu>
              <button
                title="More"
                onClick={() => setMoreOpen((o) => !o)}
                className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <MoreHorizontal size={14} />
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
                  <button
                    onClick={handleMarkRead}
                    disabled={markReadMutation.isPending}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    <CheckCheck size={13} className="text-zinc-500" />
                    Mark as read
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Scrollable body */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 pt-8 pb-16">

          {/* Subject */}
          <h1 className="text-[22px] font-bold leading-snug text-white mb-5">{subject}</h1>

          {/* Sender row */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-bold shrink-0 text-zinc-200">
              {(fromName[0] ?? fromEmail[0] ?? '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-sm font-semibold text-zinc-100">{fromName}</span>
                {fromEmail && fromEmail !== fromName && (
                  <span className="text-xs text-zinc-500">&lt;{fromEmail}&gt;</span>
                )}
              </div>
              <div className="text-[11px] text-zinc-600 mt-0.5">
                {to && <span>To: {to}</span>}
                {cc && <span className="ml-2">· Cc: {cc}</span>}
              </div>
            </div>
            <span className="text-xs text-zinc-500 shrink-0">{date}</span>
          </div>

          {/* Email document card */}
          <div className={`rounded-2xl overflow-hidden ${
            isDark
              ? 'bg-zinc-900 ring-1 ring-white/8 shadow-[0_2px_32px_rgba(0,0,0,0.6)]'
              : ''
          }`}>
            <div className="overflow-hidden">
              {html ? (
                <iframe
                  ref={iframeRef}
                  sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                  referrerPolicy="no-referrer"
                  className="w-full border-0 block "
                  style={{ minHeight: '300px' }}
                  title="Email content"
                />
              ) : text ? (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed p-6 bg-white text-zinc-800">
                  {text}
                </pre>
              ) : (
                <p className="p-6 bg-white text-zinc-500 italic text-sm">
                  {message.snippet ?? 'No content'}
                </p>
              )}
            </div>
          </div>

          {/* Reply section — inline, at the end of email content */}
          <div className="mt-8">
            {composeMode ? (

              /* Glass compose panel */
              <div className="relative overflow-hidden rounded-2xl
                border border-white/8
                bg-zinc-900/60 backdrop-blur-xl
                shadow-[0_8px_48px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)]">

                {/* Shimmer top edge */}
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/6">
                  <span className="text-xs font-semibold text-zinc-300 tracking-wide uppercase">
                    {composeMode === 'reply' ? 'Reply' : composeMode === 'replyAll' ? 'Reply All' : 'Forward'}
                  </span>
                  <button
                    onClick={() => setComposeMode(null)}
                    className="text-zinc-500 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Fields */}
                <div className="divide-y divide-white/5">
                  <div className="flex items-center gap-3 px-5 py-2.5">
                    <span className="text-xs text-zinc-500 w-14 shrink-0">To</span>
                    <input
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                      className="flex-1 text-sm text-zinc-100 bg-transparent outline-none placeholder:text-zinc-600"
                      placeholder="Recipients"
                    />
                  </div>
                  {(composeMode === 'replyAll' || composeCc) && (
                    <div className="flex items-center gap-3 px-5 py-2.5">
                      <span className="text-xs text-zinc-500 w-14 shrink-0">Cc</span>
                      <input
                        value={composeCc}
                        onChange={(e) => setComposeCc(e.target.value)}
                        className="flex-1 text-sm text-zinc-100 bg-transparent outline-none placeholder:text-zinc-600"
                        placeholder="Cc recipients"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-3 px-5 py-2.5">
                    <span className="text-xs text-zinc-500 w-14 shrink-0">Subject</span>
                    <input
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      className="flex-1 text-sm text-zinc-100 bg-transparent outline-none"
                    />
                  </div>
                </div>

                {/* Body */}
                <textarea
                  ref={bodyRef}
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={6}
                  className="w-full px-5 pt-4 pb-2 text-sm text-zinc-100
                    bg-transparent outline-none resize-none
                    placeholder:text-zinc-600 leading-relaxed"
                  placeholder="Write your reply…"
                />

                {/* Quoted snippet */}
                {message.snippet && (
                  <div className="px-5 pb-4">
                    <div className="border-l-2 border-zinc-700 pl-3
                      text-xs text-zinc-600 line-clamp-2 leading-relaxed italic">
                      {decodeHtmlEntities(message.snippet)}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center gap-2 px-5 py-3.5 border-t border-white/5 bg-white/2">
                  <button
                    onClick={handleSend}
                    disabled={sendMutation.isPending || (!composeTo.trim() && composeMode !== 'forward')}
                    className="flex items-center gap-1.5 px-4 py-2
                      bg-white/90 text-zinc-900 hover:bg-white
                      disabled:opacity-40 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Send size={13} />
                    {sendMutation.isPending ? 'Sending…' : 'Send'}
                  </button>
                  <button
                    onClick={handleAskAI}
                    className="flex items-center gap-1.5 px-3 py-2
                      text-sm text-zinc-400 hover:text-white
                      border border-zinc-700/80 hover:border-zinc-500
                      rounded-lg transition-colors"
                  >
                    <Bot size={13} />
                    Ask AI
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => setComposeMode(null)}
                    className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                    title="Discard"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

            ) : (

              /* Reply / Reply All / Forward buttons */
              <div className="flex items-center gap-2 flex-wrap">
                {([
                  { mode: 'reply',    icon: <Reply size={13} />,    label: 'Reply'     },
                  { mode: 'replyAll', icon: <ReplyAll size={13} />, label: 'Reply All' },
                  { mode: 'forward',  icon: <Forward size={13} />,  label: 'Forward'   },
                ] as const).map(({ mode, icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => startCompose(mode)}
                    className="flex items-center gap-2 px-4 py-2.5
                      bg-zinc-900 border border-zinc-800
                      text-zinc-300 hover:border-zinc-600 hover:text-white hover:bg-zinc-800
                      rounded-xl text-sm font-medium transition-colors"
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>

            )}
          </div>

        </div>
      </main>

    </div>
  );
}

function ActionBtn({ icon, label, onClick, loading, disabled, danger }: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled || loading}
      className={`p-2 rounded-lg transition-colors disabled:opacity-40
        ${danger
          ? 'text-zinc-500 hover:text-red-400 hover:bg-red-950/30'
          : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
        } ${loading ? 'animate-pulse' : ''}`}
    >
      {icon}
    </button>
  );
}
