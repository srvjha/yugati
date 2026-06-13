'use client';

import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Mail, Calendar, LogOut, Plug, RefreshCw,
  Inbox, Clock, User, CheckCircle, XCircle,
  Tag, Users, Bell,
} from 'lucide-react';

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export function DashboardShell({ user, connected, connectError }: { user: User; connected?: boolean; connectError?: boolean }) {
  const router = useRouter();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    connected ? { type: 'success', message: 'Account connected successfully!' }
    : connectError ? { type: 'error', message: 'Failed to connect account. Please try again.' }
    : null,
  );

  useEffect(() => {
    if (!toast) return;
    // Clear query param from URL without re-rendering
    window.history.replaceState({}, '', '/dashboard');
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg transition-all
          ${toast.type === 'success'
            ? 'bg-zinc-900 border-green-800 text-green-400'
            : 'bg-zinc-900 border-red-800 text-red-400'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {toast.message}
        </div>
      )}

      {/* Topbar */}
      <header className="border-b border-zinc-800 bg-black sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
              <span className="text-black text-xs font-bold">S</span>
            </div>
            <span className="font-semibold text-sm">SuperAI</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {user.image ? (
                <img src={user.image} alt={user.name} className="w-7 h-7 rounded-full" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-medium">
                  {user.name[0]}
                </div>
              )}
              <span className="text-sm text-zinc-400 hidden sm:block">{user.email}</span>
            </div>
            <div className="w-px h-4 bg-zinc-800" />
            <button
              onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push('/') } })}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
            >
              <LogOut size={13} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 w-full flex-1 space-y-8">

        {/* Welcome row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Good morning, {user.name.split(' ')[0]}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Here's what's going on today</p>
          </div>
        </div>

        {/* Integration cards + data grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GmailSection />
          <CalendarSection />
        </div>

        {/* Debug card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <User size={13} className="text-zinc-600" />
            <span className="text-xs text-zinc-600 font-medium uppercase tracking-wide">Session</span>
          </div>
          <div className="space-y-1 font-mono text-xs">
            <Row label="user.id (tenant_id)" value={user.id} />
            <Row label="email" value={user.email} />
          </div>
        </div>

      </main>
    </div>
  );
}

// ─── Gmail tabs ────────────────────────────────────────────────────────────────

const INBOX_TABS = [
  { id: 'primary',    label: 'Primary',    icon: <Inbox size={12} />, q: 'category:primary'    },
  { id: 'promotions', label: 'Promotions', icon: <Tag size={12} />,   q: 'category:promotions' },
  { id: 'social',     label: 'Social',     icon: <Users size={12} />, q: 'category:social'     },
  { id: 'updates',    label: 'Updates',    icon: <Bell size={12} />,  q: 'category:updates'    },
] as const;

type TabId = (typeof INBOX_TABS)[number]['id'];

// ─── Gmail section ─────────────────────────────────────────────────────────────

function GmailSection() {
  const trpc = useTRPC();
  const [activeTab, setActiveTab] = useState<TabId>('primary');
  const tab = INBOX_TABS.find((t) => t.id === activeTab)!;

  const { data, isLoading, error, refetch, isFetching } = useQuery(
    trpc.gmail.listInbox.queryOptions({ maxResults: 20, q: tab.q }),
  );

  const isAuthError = (error as { data?: { code?: string } } | null)?.data?.code === 'UNAUTHORIZED';

  return (
    <Card
      title="Gmail"
      icon={<Mail size={14} />}
      action={data ? (
        <button onClick={() => refetch()} disabled={isFetching} className="text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-40">
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
        </button>
      ) : undefined}
      tabs={
        <div className="flex border-b border-zinc-800">
          {INBOX_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px
                ${activeTab === t.id
                  ? 'border-white text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      }
    >
      {isLoading && <SkeletonRows count={5} />}

      {error && isAuthError && <ConnectBanner plugin="gmail" label="Gmail" />}
      {error && !isAuthError && <ErrorBanner message="Failed to load messages" />}

      {data && (
        <ul className="divide-y divide-zinc-800/60">
          {data.messages?.length ? (
            data.messages.map((msg) => {
              const headers = (msg.payload?.headers ?? []) as { name?: string; value?: string }[];

              const subject = headers.find((h) => h.name?.toLowerCase() === 'subject')?.value ?? '(no subject)';
              const from    = headers.find((h) => h.name?.toLowerCase() === 'from')?.value ?? '';
              const fromName = from.replace(/<[^>]+>/, '').trim() || from;
              const isUnread = msg.labelIds?.includes('UNREAD') ?? false;
              const date = msg.internalDate
                ? new Date(Number(msg.internalDate)).toLocaleDateString([], { month: 'short', day: 'numeric' })
                : '';

              return (
                <li key={msg.id}>
                  <Link
                    href={`/dashboard/mail/${msg.id}`}
                    className="flex items-start gap-3 py-3 -mx-4 px-4 hover:bg-zinc-800/40 transition-colors group"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${isUnread ? 'bg-blue-400' : 'bg-transparent'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${isUnread ? 'font-semibold text-white' : 'text-zinc-300'}`}>
                          {fromName}
                        </span>
                        <span className="text-xs text-zinc-600 shrink-0">{date}</span>
                      </div>
                      <p className={`text-sm truncate ${isUnread ? 'text-zinc-200' : 'text-zinc-400'}`}>{subject}</p>
                      <p className="text-xs text-zinc-600 truncate mt-0.5">{msg.snippet}</p>
                    </div>
                  </Link>
                </li>
              );
            })
          ) : (
            <EmptyRow icon={<Inbox size={13} />} message="No messages found" />
          )}
        </ul>
      )}
    </Card>
  );
}

// ─── Calendar section ──────────────────────────────────────────────────────────

function CalendarSection() {
  const trpc = useTRPC();
  const { data, isLoading, error, refetch, isFetching } = useQuery(
    trpc.calendar.listEvents.queryOptions({}),
  );

  const isAuthError = (error as { data?: { code?: string } } | null)?.data?.code === 'UNAUTHORIZED';

  return (
    <Card
      title="Calendar"
      icon={<Calendar size={14} />}
      action={data ? (
        <button onClick={() => refetch()} disabled={isFetching} className="text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-40">
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
        </button>
      ) : undefined}
    >
      {isLoading && <SkeletonRows count={5} />}

      {error && isAuthError && <ConnectBanner plugin="googlecalendar" label="Google Calendar" />}
      {error && !isAuthError && <ErrorBanner message="Failed to load events" />}

      {data && (
        <ul className="divide-y divide-zinc-800/60">
          {data.items?.length ? (
            data.items.map((event) => (
              <li key={event.id} className="py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Clock size={12} className="text-zinc-600 shrink-0" />
                  <span className="text-sm text-zinc-300 truncate">{event.summary ?? '(no title)'}</span>
                </div>
                <span className="text-xs text-zinc-600 shrink-0">
                  {event.start?.dateTime
                    ? new Date(event.start.dateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : event.start?.date}
                </span>
              </li>
            ))
          ) : (
            <EmptyRow icon={<Calendar size={13} />} message="No upcoming events" />
          )}
        </ul>
      )}
    </Card>
  );
}

// ─── Shared UI primitives ───────────────────────────────────────────────────────

function Card({ title, icon, action, tabs, children }: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  tabs?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-zinc-300">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        {action}
      </div>
      {tabs}
      <div className="px-4 py-1">
        {children}
      </div>
    </div>
  );
}

function ConnectBanner({ plugin, label }: { plugin: string; label: string }) {
  return (
    <div className="py-6 flex flex-col items-center gap-4">
      <div className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center">
        <Plug size={16} className="text-zinc-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{label} not connected</p>
        <p className="text-xs text-zinc-500 mt-1">Connect your account to see data here</p>
      </div>
      <a
        href={`/api/corsair/connect?plugin=${plugin}`}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-xs font-medium hover:bg-zinc-100 transition-colors"
      >
        <Plug size={12} />
        Connect {label}
      </a>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="py-6 text-center">
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}

function EmptyRow({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <li className="py-6 flex flex-col items-center gap-2 text-zinc-600">
      {icon}
      <span className="text-xs">{message}</span>
    </li>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="py-2 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-3 rounded bg-zinc-800 animate-pulse" style={{ width: `${50 + (i * 17) % 40}%` }} />
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-600 min-w-36">{label}</span>
      <span className="text-zinc-400 truncate">{value}</span>
    </div>
  );
}
