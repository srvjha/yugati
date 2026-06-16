'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, Archive, Reply, Forward, MoreHorizontal, ReplyAll, Bot } from 'lucide-react';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/trpc/types';

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

// Storage key shared with mail page
export const REPLY_CTX_KEY = 'yugati_reply_context';

export type ReplyContext = {
  from: string;
  to: string;
  subject: string;
  snippet: string;
  threadId?: string | null;
  replyAll?: boolean;
};

export function MailView({ message }: { message: GmailMessage }) {
  const router = useRouter();
  const headers = message.payload?.headers ?? [];
  const subject  = getHeader(headers, 'Subject') || '(no subject)';
  const from     = getHeader(headers, 'From');
  const to       = getHeader(headers, 'To');
  const cc       = getHeader(headers, 'Cc');
  const replyTo  = getHeader(headers, 'Reply-To') || from;
  const date     = message.internalDate
    ? new Date(Number(message.internalDate)).toLocaleString([], {
        weekday: 'short', month: 'short', day: 'numeric',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : getHeader(headers, 'Date');

  const { html, text } = extractBody(message.payload ?? {});
  const inlineImages   = extractInlineImages(message.payload ?? {});

  // Parse sender display name and email
  const fromMatch = from.match(/^(.*?)\s*<([^>]+)>$/) ?? [];
  const fromName  = fromMatch[1]?.trim().replace(/^"|"$/g, '') || from;
  const fromEmail = fromMatch[2] || from;

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current || !html) return;
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    if (!doc) return;

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const bodyColor = isLight ? '#2c2620' : '#e4e4e7';
    const linkColor = isLight ? '#1d4ed8' : '#60a5fa';

    // Replace cid: references with inline data URLs
    let processedHtml = html;
    for (const img of inlineImages) {
      const dataUrl = `data:${img.mimeType};base64,${toPlainBase64(img.data)}`;
      processedHtml = processedHtml.split(`cid:${img.cid}`).join(dataUrl);
    }

    doc.open();
    doc.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
               font-size: 14px; color: ${bodyColor}; background: transparent;
               margin: 0; padding: 0; word-break: break-word; }
        a { color: ${linkColor}; }
        img { max-width: 100%; height: auto; display: block; }
        * { box-sizing: border-box; }
      </style>
    </head><body>${processedHtml}</body></html>`);
    doc.close();

    const resize = () => {
      if (iframe.contentDocument?.body) {
        iframe.style.height = iframe.contentDocument.body.scrollHeight + 32 + 'px';
      }
    };
    iframe.onload = resize;
    const timerId = setTimeout(resize, 200);
    return () => clearTimeout(timerId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  function openReply(replyAll = false) {
    const cleanSnippet = decodeHtmlEntities(message.snippet ?? '');
    const ctx: ReplyContext = {
      from,
      to: replyAll ? [replyTo, cc].filter(Boolean).join(', ') : replyTo,
      subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
      snippet: cleanSnippet,
      threadId: message.threadId,
      replyAll,
    };
    sessionStorage.setItem(REPLY_CTX_KEY, JSON.stringify(ctx));
    router.push('/dashboard/mail');
  }

  return (
    <div className="h-full flex flex-col bg-black text-white">

      {/* Topbar */}
      <header className="border-b border-zinc-800 sticky top-0 z-10 bg-black">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link
            href="/dashboard/mail"
            className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft size={15} />
            Inbox
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <ActionBtn icon={<Reply size={14} />}         label="Reply"      onClick={() => openReply(false)} />
            <ActionBtn icon={<ReplyAll size={14} />}      label="Reply All"  onClick={() => openReply(true)} />
            <ActionBtn icon={<Forward size={14} />}       label="Forward" />
            <ActionBtn icon={<Archive size={14} />}       label="Archive" />
            <ActionBtn icon={<Trash2 size={14} />}        label="Trash" />
            <ActionBtn icon={<MoreHorizontal size={14} />} label="More" />
          </div>
        </div>
      </header>

      {/* Email content */}
      <main className="max-w-4xl mx-auto px-6 py-8 w-full flex-1 overflow-y-auto pb-32">

        {/* Subject */}
        <h1 className="text-2xl font-semibold mb-6 leading-tight">{subject}</h1>

        {/* Sender card */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-semibold shrink-0">
            {(fromName[0] ?? fromEmail[0] ?? '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="font-medium text-sm">{fromName}</span>
                {fromEmail && fromEmail !== fromName && (
                  <span className="text-zinc-500 text-sm ml-2">&lt;{fromEmail}&gt;</span>
                )}
              </div>
              <span className="text-xs text-zinc-500 shrink-0">{date}</span>
            </div>
            <div className="text-xs text-zinc-600 mt-0.5">
              {to && <span>To: {to}</span>}
              {cc && <span className="ml-3">Cc: {cc}</span>}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-800 mb-6" />

        {/* Body */}
        <div className="text-sm text-zinc-300 leading-relaxed">
          {html ? (
            <iframe
              ref={iframeRef}
              sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer"
              className="w-full border-0 bg-transparent"
              style={{ minHeight: '200px' }}
              title="Email content"
            />
          ) : text ? (
            <pre className="whitespace-pre-wrap font-sans">{text}</pre>
          ) : (
            <p className="text-zinc-600 italic">{message.snippet ?? 'No content'}</p>
          )}
        </div>
      </main>

      {/* Reply action bar — sticky at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-zinc-800/70 z-20">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => openReply(false)}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Reply size={14} />
            Reply
          </button>
          <button
            onClick={() => openReply(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:text-white rounded-xl text-sm font-medium transition-colors"
          >
            <ReplyAll size={14} />
            Reply All
          </button>
          <div className="flex-1" />
          <p className="text-[11px] text-zinc-600 flex items-center gap-1.5">
            <Bot size={11} />
            Opens AI assistant
          </p>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick }: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
    >
      {icon}
    </button>
  );
}
