'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2, Archive, Reply, Forward, MoreHorizontal } from 'lucide-react';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/trpc/types';

type GmailMessage = inferRouterOutputs<AppRouter>['gmail']['getMessage'];

type Part = NonNullable<GmailMessage['payload']>;

// base64url uses - and _ instead of + and /; standard Buffer only supports 'base64'.
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

// Recursively finds text/html or text/plain body data in a MIME payload tree.
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

export function MailView({ message }: { message: GmailMessage }) {
  const headers = message.payload?.headers ?? [];
  const subject = getHeader(headers, 'Subject') || '(no subject)';
  const from    = getHeader(headers, 'From');
  const to      = getHeader(headers, 'To');
  const cc      = getHeader(headers, 'Cc');
  const date    = message.internalDate
    ? new Date(Number(message.internalDate)).toLocaleString([], {
        weekday: 'short', month: 'short', day: 'numeric',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : getHeader(headers, 'Date');

  const { html, text } = extractBody(message.payload ?? {});

  // Parse sender display name and email
  const fromMatch = from.match(/^(.*?)\s*<([^>]+)>$/) ?? [];
  const fromName  = fromMatch[1]?.trim() || from;
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
    doc.open();
    doc.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
               font-size: 14px; color: ${bodyColor}; background: transparent;
               margin: 0; padding: 0; word-break: break-word; }
        a { color: ${linkColor}; }
        img { max-width: 100%; height: auto; }
        * { box-sizing: border-box; }
      </style>
    </head><body>${html}</body></html>`);
    doc.close();
    // Auto-resize iframe to content
    const resize = () => {
      if (iframe.contentDocument?.body) {
        iframe.style.height = iframe.contentDocument.body.scrollHeight + 32 + 'px';
      }
    };
    iframe.onload = resize;
    setTimeout(resize, 100);
  }, [html]);

  return (
    <div className="h-full flex flex-col bg-black text-white">

      {/* Topbar */}
      <header className="border-b border-zinc-800 sticky top-0 z-10 bg-black">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft size={15} />
            Inbox
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <ActionBtn icon={<Reply size={14} />}   label="Reply" />
            <ActionBtn icon={<Forward size={14} />} label="Forward" />
            <ActionBtn icon={<Archive size={14} />} label="Archive" />
            <ActionBtn icon={<Trash2 size={14} />}  label="Trash" />
            <ActionBtn icon={<MoreHorizontal size={14} />} label="More" />
          </div>
        </div>
      </header>

      {/* Email content */}
      <main className="max-w-4xl mx-auto px-6 py-8 w-full flex-1 overflow-y-auto">

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
              sandbox="allow-same-origin allow-popups"
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
    </div>
  );
}

function ActionBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      title={label}
      className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
    >
      {icon}
    </button>
  );
}
