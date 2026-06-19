'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Star, Reply, ReplyAll, Forward, Archive, Trash2,
  Bot, Send, MoreHorizontal, CheckCheck, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '@/trpc/client';
import { useTheme } from '@/components/theme-toggle';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/trpc/types';

type GmailMessage = inferRouterOutputs<AppRouter>['gmail']['getMessage'];
type Part = NonNullable<GmailMessage['payload']>;

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ');
}
function toPlainBase64(data: string): string {
  return data.replace(/-/g, '+').replace(/_/g, '/');
}

type InlineImage = { cid: string; mimeType: string; data: string };
function extractInlineImages(part: Part): InlineImage[] {
  const images: InlineImage[] = [];
  if (part.mimeType?.startsWith('image/') && part.body?.data) {
    const rawCid = (part.headers ?? []).find((h) => h.name?.toLowerCase() === 'content-id')?.value ?? '';
    const cid = rawCid.replace(/^<|>$/g, '');
    if (cid) images.push({ cid, mimeType: part.mimeType, data: part.body.data });
  }
  if (part.parts) {
    for (const p of part.parts) images.push(...extractInlineImages(p as Part));
  }
  return images;
}
function extractBody(part: Part): { html?: string; text?: string } {
  if (part.body?.data) {
    const decoded = decodeBase64Url(part.body.data);
    if (part.mimeType === 'text/html')  return { html: decoded };
    if (part.mimeType === 'text/plain') return { text: decoded };
  }
  if (part.parts) {
    let html: string | undefined, text: string | undefined;
    for (const p of part.parts) {
      const r = extractBody(p as Part);
      if (r.html) html = r.html;
      if (r.text) text = r.text;
    }
    return { html, text };
  }
  return {};
}
function getHeader(headers: { name?: string; value?: string }[], name: string) {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}

const REPLY_CTX_KEY = 'yugati_reply_context';

export function EmailDetailPanel({
  emailId,
  onClose,
  onRequestAI,
  onDeleted,
}: {
  emailId: string;
  onClose: () => void;
  onRequestAI: (prompt: string) => void;
  onDeleted: () => void;
}) {
  const trpc = useTRPC();
  const qc   = useQueryClient();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: message, isLoading } = useQuery(
    trpc.gmail.getMessage.queryOptions({ id: emailId }),
  );

  const [starred,      setStarred]      = useState(false);
  const [composeMode,  setComposeMode]  = useState<'reply' | 'replyAll' | 'forward' | null>(null);
  const [composeTo,    setComposeTo]    = useState('');
  const [composeCc,    setComposeCc]    = useState('');
  const [composeSubj,  setComposeSubj]  = useState('');
  const [composeBody,  setComposeBody]  = useState('');
  const [moreOpen,     setMoreOpen]     = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bodyRef   = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (message) setStarred(message.labelIds?.includes('STARRED') ?? false);
  }, [message]);

  const trashMutation = useMutation(
    trpc.gmail.trashMessage.mutationOptions({
      onSuccess: () => {
        toast.success('Moved to Trash');
        void qc.invalidateQueries({ queryKey: trpc.gmail.listInbox.queryKey() });
        onDeleted();
      },
      onError: () => toast.error('Failed to move to Trash'),
    }),
  );
  const archiveMutation = useMutation(
    trpc.gmail.modifyMessage.mutationOptions({
      onSuccess: () => {
        toast.success('Archived');
        void qc.invalidateQueries({ queryKey: trpc.gmail.listInbox.queryKey() });
        onDeleted();
      },
      onError: () => toast.error('Failed to archive'),
    }),
  );
  const starMutation = useMutation(
    trpc.gmail.modifyMessage.mutationOptions({
      onError: () => setStarred((s) => !s),
    }),
  );
  const markReadMutation = useMutation(
    trpc.gmail.modifyMessage.mutationOptions({
      onSuccess: () => { toast.success('Marked as read'); setMoreOpen(false); },
      onError:   () => toast.error('Failed'),
    }),
  );
  const sendMutation = useMutation(
    trpc.gmail.sendMessage.mutationOptions({
      onSuccess: () => { toast.success('Sent!'); setComposeMode(null); },
      onError:   () => toast.error('Failed to send'),
    }),
  );

  const hdrs    = message?.payload?.headers ?? [];
  const subject = getHeader(hdrs, 'Subject') || '(no subject)';
  const from    = getHeader(hdrs, 'From');
  const to      = getHeader(hdrs, 'To');
  const cc      = getHeader(hdrs, 'Cc');
  const replyTo = getHeader(hdrs, 'Reply-To') || from;
  const date    = message?.internalDate
    ? new Date(Number(message.internalDate)).toLocaleString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short',
        year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
      })
    : getHeader(hdrs, 'Date');

  const { html, text } = message ? extractBody(message.payload ?? {}) : {};
  const inlineImages   = message ? extractInlineImages(message.payload ?? {}) : [];

  const fromMatch = from.match(/^(.*?)\s*<([^>]+)>$/) ?? [];
  const fromName  = fromMatch[1]?.trim().replace(/^"|"$/g, '') || from;
  const fromEmail = fromMatch[2] || from;

  // iframe rendering
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
        ::-webkit-scrollbar { display: none; }
        * { scrollbar-width: none; -ms-overflow-style: none; }
        ${darkStyles}
      </style>
    </head><body>${processedHtml}</body></html>`);
    doc.close();

    function fixLightText() {
      const win  = iframe.contentWindow;
      const idoc = iframe.contentDocument;
      if (!win || !idoc) return;
      if (isDark) {
        idoc.querySelectorAll<HTMLElement>('*').forEach((el) => {
          if (el.tagName === 'IMG' || el.tagName === 'svg') return;
          const bg = win.getComputedStyle(el).backgroundColor;
          const bgM = bg.match(/\d+/g);
          if (bgM && bgM.length >= 3) {
            const [r, g, b] = bgM.map(Number) as [number, number, number];
            if ((0.299*r + 0.587*g + 0.114*b)/255 > 0.85)
              el.style.setProperty('background-color', '#141414', 'important');
          }
          const color = win.getComputedStyle(el).color;
          const m = color.match(/\d+/g);
          if (!m || m.length < 3) return;
          const [r, g, b] = m.map(Number) as [number, number, number];
          if ((0.299*r + 0.587*g + 0.114*b)/255 < 0.3)
            el.style.setProperty('color', '#e2e8f0', 'important');
        });
        idoc.querySelectorAll<HTMLElement>('a').forEach((a) => {
          // Walk the ancestor tree — if any node has a colored (non-white, non-transparent)
          // background, this is a button-style link; leave its text colour alone.
          let node: HTMLElement | null = a;
          while (node && node.tagName !== 'BODY') {
            const nbg = win.getComputedStyle(node).backgroundColor;
            const nm = nbg.match(/[\d.]+/g);
            if (nm && nm.length >= 3) {
              const [nr, ng, nb, na = 1] = nm.map(Number) as [number, number, number, number];
              if (na > 0.1 && (0.299*nr + 0.587*ng + 0.114*nb)/255 < 0.92) return;
            }
            node = node.parentElement;
          }
          a.style.setProperty('color', '#60a5fa', 'important');
        });
      }
    }

    const resize = () => {
      if (iframe.contentDocument?.body) {
        iframe.style.height = iframe.contentDocument.body.scrollHeight + 'px';
      }
    };
    iframe.onload = () => { resize(); fixLightText(); };
    const t = setTimeout(() => { resize(); fixLightText(); }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, isDark]);

  // Close more on outside click
  useEffect(() => {
    if (!moreOpen) return;
    function h(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-more-panel]')) setMoreOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [moreOpen]);

  function startCompose(mode: 'reply' | 'replyAll' | 'forward') {
    setComposeMode(mode);
    if (mode === 'forward') {
      setComposeSubj(subject.startsWith('Fwd:') ? subject : `Fwd: ${subject}`);
      setComposeTo(''); setComposeCc('');
    } else {
      setComposeSubj(subject.startsWith('Re:') ? subject : `Re: ${subject}`);
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
      to: toList.length ? toList : [''],
      cc: ccList.length ? ccList : undefined,
      subject: composeSubj,
      body: composeBody,
      threadId: message?.threadId ?? undefined,
    });
  }

  function handleAskAI() {
    if (!message) return;
    const ctx = {
      from,
      to: composeTo || (composeMode === 'forward' ? '' : replyTo),
      subject: composeSubj,
      snippet: decodeHtmlEntities(message.snippet ?? ''),
      threadId: message.threadId,
      replyAll: composeMode === 'replyAll',
      forward:  composeMode === 'forward',
    };
    sessionStorage.setItem(REPLY_CTX_KEY, JSON.stringify(ctx));
    onRequestAI(
      `Draft a professional ${composeMode === 'forward' ? 'forwarding note' : composeMode === 'replyAll' ? 'reply all' : 'reply'} to ${fromName} regarding: "${composeSubj}". They wrote: ${ctx.snippet.slice(0, 300)}`
    );
  }

  function handleStar() {
    if (!message?.id) return;
    const next = !starred;
    setStarred(next);
    starMutation.mutate(
      next ? { id: message.id, addLabelIds: ['STARRED'] }
           : { id: message.id, removeLabelIds: ['STARRED'] },
    );
  }

  const isBusy = trashMutation.isPending || archiveMutation.isPending;

  if (isLoading) {
    return (
      <div className="h-full min-w-0 flex flex-col overflow-hidden border-l border-zinc-800/50">
        {/* Skeleton header matching the real header height */}
        <div className="h-14 shrink-0 border-b border-zinc-800/60 flex items-center px-4 gap-3">
          <div className="w-5 h-5 rounded bg-zinc-800 animate-pulse" />
          <div className="flex-1 h-3 rounded bg-zinc-800 animate-pulse max-w-xs" />
          <div className="flex items-center gap-1.5 ml-auto">
            {[0,1,2,3,4].map((i) => (
              <div key={i} className="w-6 h-6 rounded bg-zinc-800 animate-pulse" />
            ))}
          </div>
        </div>
        {/* Skeleton body */}
        <div className="px-6 pt-6 space-y-4">
          <div className="h-6 rounded bg-zinc-800/80 animate-pulse w-3/4" />
          <div className="h-4 rounded bg-zinc-800/60 animate-pulse w-1/2" />
          <div className="mt-6 space-y-2">
            <div className="h-3 rounded bg-zinc-800/40 animate-pulse" />
            <div className="h-3 rounded bg-zinc-800/40 animate-pulse w-5/6" />
            <div className="h-3 rounded bg-zinc-800/40 animate-pulse w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="h-full flex items-center justify-center border-l border-zinc-800/50 text-sm text-zinc-600">
        Message not found
      </div>
    );
  }

  return (
    <div className="h-full min-w-0 flex flex-col overflow-hidden border-l border-zinc-800/50">
      {/* Panel header */}
      <header className="h-14 shrink-0 border-b border-zinc-800/60 flex items-center gap-2 px-4">
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
          title="Close"
        >
          <X size={14} />
        </button>

        <span className="flex-1 min-w-0 text-sm font-medium text-zinc-200 truncate px-1">{subject}</span>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            title={starred ? 'Unstar' : 'Star'}
            onClick={handleStar}
            className={`p-2 rounded-lg transition-colors ${starred ? 'text-yellow-400 hover:text-yellow-300' : 'text-zinc-500 hover:text-yellow-400'}`}
          >
            <Star size={13} className={starred ? 'fill-yellow-400' : ''} />
          </button>
          <div className="w-px h-3.5 bg-zinc-800 mx-0.5" />
          <ActionBtn icon={<Reply size={13} />}    label="Reply"     onClick={() => startCompose('reply')} />
          <ActionBtn icon={<ReplyAll size={13} />} label="Reply All" onClick={() => startCompose('replyAll')} />
          <ActionBtn icon={<Forward size={13} />}  label="Forward"   onClick={() => startCompose('forward')} />
          <div className="w-px h-3.5 bg-zinc-800 mx-0.5" />
          <ActionBtn icon={<Archive size={13} />}  label="Archive"   onClick={() => message.id && archiveMutation.mutate({ id: message.id, removeLabelIds: ['INBOX'] })} loading={archiveMutation.isPending} disabled={isBusy} />
          <ActionBtn icon={<Trash2 size={13} />}   label="Trash"     onClick={() => message.id && trashMutation.mutate({ id: message.id })} loading={trashMutation.isPending} disabled={isBusy} danger />
          <div className="relative" data-more-panel>
            <button onClick={() => setMoreOpen((o) => !o)} className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
              <MoreHorizontal size={13} />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
                <button
                  onClick={() => message.id && markReadMutation.mutate({ id: message.id, removeLabelIds: ['UNREAD'] })}
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
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="px-6 pt-6 pb-10 max-w-2xl mx-auto w-full">
          {/* Subject */}
          <h1 className="text-xl font-bold leading-snug text-white mb-4">{subject}</h1>

          {/* Sender row */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold shrink-0 text-zinc-200">
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
            <span className="text-xs text-zinc-500 shrink-0 text-right">{date}</span>
          </div>

          {/* Email body */}
          <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-zinc-900 ring-1 ring-white/8' : ''}`}>
            {html ? (
              <iframe
                ref={iframeRef}
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="no-referrer"
                className="w-full border-0 block"
                style={{ minHeight: '200px' }}
                title="Email content"
              />
            ) : text ? (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed p-5 bg-white text-zinc-800">
                {text}
              </pre>
            ) : (
              <p className="p-5 bg-white text-zinc-500 italic text-sm">
                {message.snippet ?? 'No content'}
              </p>
            )}
          </div>

          {/* Reply compose */}
          <div className="mt-6">
            {composeMode ? (
              <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60 backdrop-blur-xl shadow-[0_8px_48px_rgba(0,0,0,0.5)]">
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/6">
                  <span className="text-xs font-semibold text-zinc-300 tracking-wide uppercase">
                    {composeMode === 'reply' ? 'Reply' : composeMode === 'replyAll' ? 'Reply All' : 'Forward'}
                  </span>
                  <button onClick={() => setComposeMode(null)} className="text-zinc-500 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                </div>
                <div className="divide-y divide-white/5">
                  <div className="flex items-center gap-3 px-5 py-2.5">
                    <span className="text-xs text-zinc-500 w-14 shrink-0">To</span>
                    <input value={composeTo} onChange={(e) => setComposeTo(e.target.value)}
                      className="flex-1 text-sm text-zinc-100 bg-transparent outline-none placeholder:text-zinc-600"
                      placeholder="Recipients" />
                  </div>
                  {(composeMode === 'replyAll' || composeCc) && (
                    <div className="flex items-center gap-3 px-5 py-2.5">
                      <span className="text-xs text-zinc-500 w-14 shrink-0">Cc</span>
                      <input value={composeCc} onChange={(e) => setComposeCc(e.target.value)}
                        className="flex-1 text-sm text-zinc-100 bg-transparent outline-none placeholder:text-zinc-600"
                        placeholder="Cc recipients" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 px-5 py-2.5">
                    <span className="text-xs text-zinc-500 w-14 shrink-0">Subject</span>
                    <input value={composeSubj} onChange={(e) => setComposeSubj(e.target.value)}
                      className="flex-1 text-sm text-zinc-100 bg-transparent outline-none" />
                  </div>
                </div>
                <textarea ref={bodyRef} value={composeBody} onChange={(e) => setComposeBody(e.target.value)}
                  rows={5}
                  className="w-full px-5 pt-4 pb-2 text-sm text-zinc-100 bg-transparent outline-none resize-none placeholder:text-zinc-600 leading-relaxed"
                  placeholder="Write your reply…" />
                {message.snippet && (
                  <div className="px-5 pb-4">
                    <div className="border-l-2 border-zinc-700 pl-3 text-xs text-zinc-600 line-clamp-2 leading-relaxed italic">
                      {decodeHtmlEntities(message.snippet)}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 px-5 py-3.5 border-t border-white/5 bg-white/2">
                  <button onClick={handleSend}
                    disabled={sendMutation.isPending || (!composeTo.trim() && composeMode !== 'forward')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white/90 text-zinc-900 hover:bg-white disabled:opacity-40 rounded-lg text-sm font-semibold transition-colors">
                    <Send size={13} />
                    {sendMutation.isPending ? 'Sending…' : 'Send'}
                  </button>
                  <button onClick={handleAskAI}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-400 hover:text-white border border-zinc-700/80 hover:border-zinc-500 rounded-lg transition-colors">
                    <Bot size={13} />
                    Ask AI
                  </button>
                  <div className="flex-1" />
                  <button onClick={() => setComposeMode(null)} className="p-2 text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {([
                  { mode: 'reply',    icon: <Reply size={13} />,    label: 'Reply'     },
                  { mode: 'replyAll', icon: <ReplyAll size={13} />, label: 'Reply All' },
                  { mode: 'forward',  icon: <Forward size={13} />,  label: 'Forward'   },
                ] as const).map(({ mode, icon, label }) => (
                  <button key={mode} onClick={() => startCompose(mode)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white hover:bg-zinc-800 rounded-xl text-sm font-medium transition-colors">
                    {icon}{label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, loading, disabled, danger }: {
  icon: React.ReactNode; label: string;
  onClick?: () => void; loading?: boolean; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button title={label} onClick={onClick} disabled={disabled || loading}
      className={`p-2 rounded-lg transition-colors disabled:opacity-40
        ${danger ? 'text-zinc-500 hover:text-red-400 hover:bg-red-950/30' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}
        ${loading ? 'animate-pulse' : ''}`}>
      {icon}
    </button>
  );
}
