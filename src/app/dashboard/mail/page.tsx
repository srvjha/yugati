'use client';

import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Inbox, Tag, Users, Bell, RefreshCw, Plug, CheckCircle, XCircle } from 'lucide-react';

const TABS = [
  { id: 'primary',    label: 'Primary',    Icon: Inbox, q: 'category:primary'    },
  { id: 'promotions', label: 'Promotions', Icon: Tag,   q: 'category:promotions' },
  { id: 'social',     label: 'Social',     Icon: Users, q: 'category:social'     },
  { id: 'updates',    label: 'Updates',    Icon: Bell,  q: 'category:updates'    },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function MailPage() {
  const trpc         = useTRPC();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>('primary');

  const connectedParam = searchParams.get('connected') === '1';
  const errorParam     = searchParams.get('error') === 'connect_failed';

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(
    connectedParam ? { type: 'success', msg: 'Account connected!' }
    : errorParam   ? { type: 'error',   msg: 'Failed to connect account.' }
    : null,
  );

  const tab = TABS.find((t) => t.id === activeTab)!;

  const { data, isLoading, error, refetch, isFetching } = useQuery(
    trpc.gmail.listInbox.queryOptions({ maxResults: 30, q: tab.q }),
  );

  const isAuthError = (error as { data?: { code?: string } } | null)?.data?.code === 'UNAUTHORIZED';

  // Clean URL params once on mount — no setState here
  useEffect(() => {
    if (connectedParam || errorParam) router.replace('/dashboard/mail');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="h-full flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg
          ${toast.type === 'success' ? 'bg-zinc-900 border-green-800 text-green-400' : 'bg-zinc-900 border-red-800 text-red-400'}`}
        >
          {toast.type === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="h-14 shrink-0 border-b border-zinc-800 px-6 flex items-center justify-between">
        <span className="text-sm font-medium">Inbox</span>
        {data && (
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="shrink-0 flex border-b border-zinc-800 px-6">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 -mb-px transition-colors
              ${activeTab === id ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <SkeletonList />}

        {error && isAuthError && (
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="w-12 h-12 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center">
              <Plug size={18} className="text-zinc-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Gmail not connected</p>
              <p className="text-xs text-zinc-500 mt-1">Connect your account to see messages here</p>
            </div>
            <a
              href="/api/corsair/connect?plugin=gmail"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-xs font-medium hover:bg-zinc-100 transition-colors"
            >
              <Plug size={12} />
              Connect Gmail
            </a>
          </div>
        )}

        {error && !isAuthError && (
          <div className="py-20 text-center text-sm text-zinc-500">Failed to load messages</div>
        )}

        {data?.messages?.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-20 text-zinc-600">
            <Inbox size={20} />
            <span className="text-sm">No messages in {tab.label}</span>
          </div>
        )}

        {data?.messages?.map((msg) => {
          const h       = (msg.payload?.headers ?? []) as { name?: string; value?: string }[];
          const subject = h.find((x) => x.name?.toLowerCase() === 'subject')?.value ?? '(no subject)';
          const from    = h.find((x) => x.name?.toLowerCase() === 'from')?.value ?? '';
          const fromName = from.replace(/<[^>]+>/, '').trim() || from;
          const isUnread = msg.labelIds?.includes('UNREAD') ?? false;
          const date     = msg.internalDate
            ? new Date(Number(msg.internalDate)).toLocaleDateString([], { month: 'short', day: 'numeric' })
            : '';

          return (
            <Link
              key={msg.id}
              href={`/dashboard/mail/${msg.id}`}
              className="flex items-center gap-4 px-6 py-3.5 border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isUnread ? 'bg-blue-400' : 'bg-transparent'}`} />
              <div className="w-44 shrink-0 truncate">
                <span className={`text-sm ${isUnread ? 'font-semibold text-white' : 'text-zinc-300'}`}>
                  {fromName}
                </span>
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2 truncate">
                <span className={`text-sm shrink-0 ${isUnread ? 'font-medium text-white' : 'text-zinc-300'}`}>
                  {subject}
                </span>
                <span className="text-sm text-zinc-600 truncate">&mdash; {msg.snippet}</span>
              </div>
              <span className="text-xs text-zinc-600 shrink-0">{date}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="divide-y divide-zinc-800/50">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-3.5">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
          <div className="w-40 h-3 bg-zinc-800 rounded animate-pulse" />
          <div className="flex-1 h-3 bg-zinc-800 rounded animate-pulse" style={{ maxWidth: `${35 + (i * 11) % 45}%` }} />
          <div className="w-10 h-3 bg-zinc-800 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
