'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTRPC } from '@/trpc/client';
import { useSession, signOut } from '@/lib/auth-client';
import Link from 'next/link';
import Image from 'next/image';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import dynamic from 'next/dynamic';
const ChatView = dynamic(
  () => import('../components/chat-view').then((m) => ({ default: m.ChatView })),
  { ssr: false, loading: () => null },
);
import { UsagePill }  from '../components/usage-pill';
import {
  Inbox, Star, Send, FileText, AlertCircle, Trash2,
  Pencil, Search, ChevronLeft, ChevronRight, Calendar, Bot, Mail,
  Clock, Plug, CheckCircle, LogOut, Settings, Blocks, CreditCard,
  PanelLeftClose, PanelLeftOpen, X, RefreshCw, Tag, Users, Bell,
  SlidersHorizontal, Zap, Command, Square, SquareCheck, ChevronDown, Paperclip,
  Minimize2, Maximize2, List, ListOrdered, Link2, Loader2 as Loader2Icon,
  Sparkles, Wand2, RefreshCcw, MailMinus, ExternalLink,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

// ─── Constants ─────────────────────────────────────────────────────────────────

const INBOX_TABS = [
  { id: 'all',        label: 'All Mail',   q: 'in:inbox'            },
  { id: 'primary',    label: 'Primary',    q: 'category:primary'    },
  { id: 'promotions', label: 'Promotions', q: 'category:promotions' },
  { id: 'social',     label: 'Social',     q: 'category:social'     },
  { id: 'updates',    label: 'Updates',    q: 'category:updates'    },
] as const;
type InboxTab = (typeof INBOX_TABS)[number]['id'];

const SIDEBAR_FOLDERS = [
  { id: 'inbox',   label: 'Inbox',   icon: Inbox,       q: 'in:inbox'   },
  { id: 'starred', label: 'Starred', icon: Star,        q: 'is:starred' },
  { id: 'sent',    label: 'Sent',    icon: Send,        q: 'in:sent'    },
  { id: 'drafts',  label: 'Drafts',  icon: FileText,    q: 'in:drafts'  },
  { id: 'spam',    label: 'Spam',    icon: AlertCircle, q: 'in:spam'    },
  { id: 'trash',   label: 'Trash',   icon: Trash2,      q: 'in:trash'   },
] as const;
type SidebarFolder = (typeof SIDEBAR_FOLDERS)[number]['id'];

const PALETTE_ACTIONS = [
  { id: 'ai',       label: 'Ask AI assistant',   icon: Bot,      hint: 'Switch to AI chat mode'  },
  { id: 'compose',  label: 'Compose new email',  icon: Pencil,   hint: 'Open compose window'     },
  { id: 'calendar', label: 'Open calendar',      icon: Calendar, hint: 'Go to calendar page'     },
  { id: 'inbox',    label: 'Go to Inbox',        icon: Inbox,    hint: 'Return to primary inbox' },
  { id: 'unread',   label: 'Toggle unread only', icon: Mail,     hint: 'Filter to unread emails' },
] as const;

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const LABEL_FILTERS = [
  { label: 'Unread',          q: 'is:unread',            icon: Mail          },
  { label: 'Starred',         q: 'is:starred',           icon: Star          },
  { label: 'Important',       q: 'is:important',         icon: Zap           },
  { label: 'Has attachment',  q: 'has:attachment',       icon: Paperclip     },
  { label: 'Primary',         q: 'category:primary',     icon: Inbox         },
  { label: 'Promotions',      q: 'category:promotions',  icon: Tag           },
  { label: 'Social',          q: 'category:social',      icon: Users         },
  { label: 'Updates',         q: 'category:updates',     icon: Bell          },
] as const;

type Sender = { name: string; email: string; count: number };

// ─── Helpers ────────────────────────────────────────────────────────────────────

type MsgHeader = { name?: string; value?: string };

type EmailMsg = {
  id?: string | null;
  labelIds?: string[] | null;
  snippet?: string | null;
  internalDate?: string | null;
  payload?: { headers?: MsgHeader[] | null } | null;
};

function getHeader(msg: EmailMsg, name: string) {
  return (msg.payload?.headers ?? []).find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function getGroupLabel(internalDate: string | null | undefined): string {
  if (!internalDate) return 'Earlier';
  const d   = new Date(Number(internalDate));
  const now = new Date();
  if (d >= new Date(now.getTime() - 7 * 86_400_000)) return 'Last 7 days';
  if (d.getFullYear() === now.getFullYear()) return MONTH_NAMES[d.getMonth()];
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTimestamp(internalDate: string | null | undefined): string {
  if (!internalDate) return '';
  const d     = new Date(Number(internalDate));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d >= today) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  // "16 Jun" — matches Gmail date format
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function MailPage() {
  const trpc         = useTRPC();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { data: authData } = useSession();
  const user = authData?.user;

  const [collapsed,    setCollapsed]    = useState(false);
  const [chatMode,     setChatMode]     = useState(() => {
    try { return localStorage.getItem('yugati_mail_mode') !== 'manual'; } catch { return false; }
  });
  const [activeFolder, setActiveFolder] = useState<SidebarFolder>('inbox');
  const [activeTab,    setActiveTab]    = useState<InboxTab>('all');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [composing,    setComposing]    = useState(false);
  const [paletteOpen,  setPaletteOpen]  = useState(false);
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
  const [unreadOnly,       setUnreadOnly]       = useState(false);
  const [summarizePrompt,  setSummarizePrompt]  = useState<string | undefined>();
  const [showSubscriptions, setShowSubscriptions] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('yugati_mail_mode', chatMode ? 'chat' : 'manual'); } catch { /* ignore */ }
  }, [chatMode]);

  const isInbox   = activeFolder === 'inbox';
  const tabQ      = INBOX_TABS.find((t) => t.id === activeTab)!.q;
  const folderQ   = SIDEBAR_FOLDERS.find((f) => f.id === activeFolder)!.q;
  const baseQ     = isInbox ? tabQ : folderQ;
  const effectiveQ = searchQuery
    ? searchQuery + (unreadOnly ? ' is:unread' : '')
    : baseQ + (unreadOnly ? ' is:unread' : '');

  const { data, isLoading, error, refetch, isFetching } = useQuery(
    trpc.gmail.listInbox.queryOptions({ maxResults: 15, q: effectiveQ }),
  );

  const trashMutation = useMutation(
    trpc.gmail.trashMessage.mutationOptions({
      onSuccess: () => void refetch(),
    }),
  );

  const { data: subsData, isLoading: subsLoading, refetch: subsRefetch } = useQuery({
    ...trpc.gmail.listSubscriptions.queryOptions(),
    enabled: showSubscriptions,
    staleTime: 5 * 60 * 1000,
  });

  const unsubMutation = useMutation(
    trpc.gmail.unsubscribeViaEmail.mutationOptions({
      onSuccess: () => { toast.success('Unsubscribe email sent!'); void subsRefetch(); },
      onError:   () => toast.error('Failed to unsubscribe'),
    }),
  );

  const isAuthError = (error as { data?: { code?: string } } | null)?.data?.code === 'UNAUTHORIZED';

  const groupedEmails = useMemo(() => {
    const msgs = (data?.messages ?? []) as EmailMsg[];
    const seenOrder: string[] = [];
    const map = new Map<string, EmailMsg[]>();
    for (const msg of msgs) {
      const g = getGroupLabel(msg.internalDate);
      if (!map.has(g)) { map.set(g, []); seenOrder.push(g); }
      map.get(g)!.push(msg);
    }
    return seenOrder.map((label) => ({ label, msgs: map.get(label)! }));
  }, [data]);

  const unreadCount = useMemo(
    () => ((data?.messages ?? []) as EmailMsg[]).filter((m) => m.labelIds?.includes('UNREAD')).length,
    [data],
  );

  const senders = useMemo<Sender[]>(() => {
    const msgs = (data?.messages ?? []) as EmailMsg[];
    const map  = new Map<string, Sender>();
    for (const msg of msgs) {
      const raw   = getHeader(msg, 'from');
      const match = raw.match(/^"?(.+?)"?\s*<([^>]+)>$/) ?? [null, raw, raw];
      const name  = ((match[1] ?? raw) as string).trim().replace(/^"|"$/g, '');
      const email = ((match[2] ?? raw) as string).trim().toLowerCase();
      if (!email) continue;
      if (!map.has(email)) map.set(email, { name: name || email, email, count: 0 });
      map.get(email)!.count++;
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  }, [data]);

  const activeLabel = isInbox
    ? 'Inbox'
    : SIDEBAR_FOLDERS.find((f) => f.id === activeFolder)?.label ?? 'Mail';

  const connectedParam = searchParams.get('connected') === '1';
  const errorParam     = searchParams.get('error') === 'connect_failed';

  // confirm dialog state: null = hidden, object = pending confirm
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; description: string; onConfirm: () => Promise<void>;
  } | null>(null);

  // Always open in Agentic mode — don't restore a previously-saved manual mode.

  useEffect(() => {
    if (connectedParam) { toast.success('Gmail connected!'); router.replace('/dashboard/mail'); }
    if (errorParam)     { toast.error('Failed to connect Gmail account.'); router.replace('/dashboard/mail'); }

    // Pick up Reply context set by the email view
    const raw = sessionStorage.getItem('yugati_reply_context');
    if (raw) {
      sessionStorage.removeItem('yugati_reply_context');
      try {
        const ctx = JSON.parse(raw) as { from: string; to: string; subject: string; snippet: string; replyAll?: boolean; forward?: boolean };
        // Extract readable sender name from "Name <email>" format
        const senderName = ctx.from.match(/^"?([^"<]+)"?\s*</)?.[1]?.trim() || ctx.from;
        let prompt: string;
        if (ctx.forward) {
          prompt = `I need to forward an email from ${senderName} with subject "${ctx.subject}". Please draft a short forwarding note explaining why I'm forwarding this and to whom. The original email said: ${ctx.snippet.slice(0, 300)}${ctx.snippet.length > 300 ? '…' : ''}`;
        } else {
          const action = ctx.replyAll ? 'reply all' : 'reply';
          prompt = `Draft a professional ${action} to ${senderName} regarding: "${ctx.subject}".

Context — they wrote: ${ctx.snippet.slice(0, 300)}${ctx.snippet.length > 300 ? '…' : ''}

Keep it concise and address them by name.`;
        }
        setSummarizePrompt(prompt);
        setChatMode(true);
      } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen((o) => !o); }
      if (e.key === 'Escape') { setPaletteOpen(false); setConfirmDialog(null); }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function handlePaletteAction(id: string) {
    setPaletteOpen(false);
    if (id === 'ai')       setChatMode(true);
    if (id === 'compose')  setComposing(true);
    if (id === 'calendar') router.push('/dashboard/calendar');
    if (id === 'inbox')    { setActiveFolder('inbox'); setChatMode(false); }
    if (id === 'unread')   setUnreadOnly((u) => !u);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function deleteOne(id: string) {
    const subject = ((data?.messages ?? []) as EmailMsg[]).find((m) => m.id === id);
    const subjectLine = subject ? (getHeader(subject, 'subject') || 'this email') : 'this email';
    setConfirmDialog({
      title: 'Move to Trash?',
      description: `"${subjectLine}" will be moved to Trash.`,
      onConfirm: async () => {
        setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
        await trashMutation.mutateAsync({ id });
        toast.success('Moved to Trash');
      },
    });
  }

  function deleteSelected() {
    const count = selectedIds.size;
    setConfirmDialog({
      title: `Move ${count} email${count !== 1 ? 's' : ''} to Trash?`,
      description: 'Selected emails will be moved to Trash. You can recover them from Trash.',
      onConfirm: async () => {
        const ids = [...selectedIds];
        setSelectedIds(new Set());
        await Promise.all(ids.map((id) => trashMutation.mutateAsync({ id })));
        toast.success(`${count} email${count !== 1 ? 's' : ''} moved to Trash`);
      },
    });
  }

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="h-screen flex overflow-hidden bg-black text-white">

        {paletteOpen && (
          <CommandPalette onClose={() => setPaletteOpen(false)} onAction={handlePaletteAction} />
        )}

        {/* Confirm dialog */}
        {confirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700 shadow-2xl rounded-2xl w-full max-w-sm mx-4 p-6">
              <h3 className="text-sm font-semibold text-zinc-100 mb-1">{confirmDialog.title}</h3>
              <p className="text-xs text-zinc-500 mb-6">{confirmDialog.description}</p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const fn = confirmDialog.onConfirm;
                    setConfirmDialog(null);
                    await fn();
                  }}
                  className="px-4 py-2 text-xs font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                >
                  Move to Trash
                </button>
              </div>
            </div>
          </div>
        )}

        <MailSidebar
          collapsed={collapsed}
          onCollapse={setCollapsed}
          chatMode={chatMode}
          onModeChange={setChatMode}
          activeFolder={activeFolder}
          onFolderChange={(id) => { setActiveFolder(id); setSearchQuery(''); setChatMode(false); setShowSubscriptions(false); }}
          user={user ?? null}
          onCompose={() => setComposing(true)}
          unreadCount={unreadCount}
          showSubscriptions={showSubscriptions}
          onSubscriptions={() => { setShowSubscriptions((s) => !s); setChatMode(false); }}
          onSummarize={() => {
            setChatMode(true);
            setSummarizePrompt(`Summarize my most recent unread emails (up to 10) — give me the key topics, senders, and anything urgent that needs my attention. Use snippets only, not full content.`);
          }}
        />

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <MailTopBar
            chatMode={chatMode}
            folderTitle={activeLabel}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            isFetching={isFetching}
            onRefresh={() => void refetch()}
            showRefresh={!!data && !chatMode}
            unreadOnly={unreadOnly}
            onToggleUnread={() => setUnreadOnly((u) => !u)}
            onOpenPalette={() => setPaletteOpen(true)}
            selectedCount={selectedIds.size}
            onDeleteSelected={() => void deleteSelected()}
            senders={senders}
          />

          <div className="flex-1 min-h-0 flex overflow-hidden">
            {chatMode ? (
              <div className="flex-1 min-h-0">
                <ChatView
                  initialPrompt={summarizePrompt}
                  onPromptFired={() => setSummarizePrompt(undefined)}
                  userName={user?.name ?? undefined}
                />
              </div>
            ) : showSubscriptions ? (
              <SubscriptionsPanel
                subscriptions={subsData?.subscriptions}
                isLoading={subsLoading}
                onRefresh={() => void subsRefetch()}
                onUnsubscribeEmail={(mailtoUrl) => unsubMutation.mutate({ mailtoUrl })}
                pendingEmail={unsubMutation.isPending ? (unsubMutation.variables as { mailtoUrl: string } | undefined)?.mailtoUrl : undefined}
              />
            ) : (
              <>
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r border-zinc-800/50">

                  {isInbox && !searchQuery && (
                    <CategoryTabs activeTab={activeTab} onTabChange={setActiveTab} />
                  )}

                  {!isInbox && (
                    <div className="px-5 py-2.5 border-b border-zinc-800/40 flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-zinc-200">{activeLabel}</span>
                    </div>
                  )}

                  {isLoading && <SkeletonList />}
                  {error && isAuthError && <AuthError />}
                  {error && !isAuthError && (
                    <div className="flex-1 flex items-center justify-center text-sm text-zinc-500">
                      Failed to load messages
                    </div>
                  )}
                  {!isLoading && !error && (data?.messages?.length === 0) && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-700">
                      <Mail size={22} />
                      <span className="text-sm">No messages</span>
                    </div>
                  )}

                  {/* Plain div instead of Radix ScrollArea — Radix wraps children in a
                      display:table div that expands to content width, making overflow-x
                      constraints impossible. A flex-child div with overflow-x:hidden is
                      width-constrained by the flex layout, so truncation works reliably. */}
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                    {groupedEmails.map(({ label, msgs }) => (
                      <div key={label}>
                        <div className="px-5 py-1.5 text-[11px] font-semibold text-zinc-500 bg-zinc-950/60 border-b border-zinc-800/30 sticky top-0 z-10">
                          {label}
                        </div>
                        {msgs.map((msg) => (
                          <EmailRow
                            key={msg.id}
                            msg={msg}
                            selected={selectedIds.has(msg.id ?? '')}
                            onSelect={() => toggleSelect(msg.id ?? '')}
                            onDelete={() => void deleteOne(msg.id ?? '')}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <CalendarMini />
              </>
            )}
          </div>
        </div>

        {composing && (
          <ComposeModal
            onClose={() => setComposing(false)}
            onSwitchToAI={() => { setComposing(false); setChatMode(true); }}
            senders={senders}
          />
        )}
      </div>
    </Tooltip.Provider>
  );
}

// ─── Subscriptions panel ──────────────────────────────────────────────────────

import type { Subscription } from '@/features/manual/gmail/service';

function SubscriptionsPanel({
  subscriptions, isLoading, onRefresh, onUnsubscribeEmail, pendingEmail,
}: {
  subscriptions?: Subscription[];
  isLoading: boolean;
  onRefresh: () => void;
  onUnsubscribeEmail: (mailtoUrl: string) => void;
  pendingEmail?: string;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = (subscriptions ?? []).filter((s) => !dismissed.has(s.domain));

  function handleUnsub(s: Subscription) {
    if (s.mailtoUrl) {
      onUnsubscribeEmail(s.mailtoUrl);
      setDismissed((d) => new Set([...d, s.domain]));
    } else if (s.httpsUrl) {
      window.open(s.httpsUrl, '_blank', 'noopener,noreferrer');
      setDismissed((d) => new Set([...d, s.domain]));
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-800/50 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Manage subscriptions</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Mailing lists detected in your inbox — unsubscribe in one click
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <ScrollArea.Root className="flex-1 overflow-hidden">
        <ScrollArea.Viewport className="h-full w-full">
          {isLoading && (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-zinc-800/30 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-zinc-800 rounded w-1/3" />
                    <div className="h-2.5 bg-zinc-800/60 rounded w-1/2" />
                  </div>
                  <div className="h-7 w-24 bg-zinc-800 rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && visible.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-600">
              <MailMinus size={28} />
              <div className="text-center">
                <p className="text-sm font-medium">No subscriptions detected</p>
                <p className="text-xs mt-1">Emails with unsubscribe links will appear here</p>
              </div>
            </div>
          )}

          {!isLoading && visible.map((s) => {
            const isPending = pendingEmail === s.mailtoUrl;
            const initial = (s.senderName[0] ?? s.domain[0] ?? '?').toUpperCase();
            return (
              <div
                key={s.domain}
                className="flex items-center gap-3 px-5 py-3.5 border-b border-zinc-800/30 hover:bg-zinc-900/40 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 shrink-0">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{s.senderName}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{s.senderEmail}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.httpsUrl && !s.mailtoUrl && (
                    <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                      <ExternalLink size={10} /> Opens browser
                    </span>
                  )}
                  {s.oneClick && (
                    <span className="text-[10px] text-blue-400 px-1.5 py-0.5 bg-blue-500/10 rounded-full">
                      1-click
                    </span>
                  )}
                  <button
                    onClick={() => handleUnsub(s)}
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-700 text-zinc-300
                      hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? 'Sending…' : 'Unsubscribe'}
                  </button>
                </div>
              </div>
            );
          })}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="flex w-1.5 p-0.5">
          <ScrollArea.Thumb className="flex-1 bg-zinc-700 rounded-full" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}

// ─── Category tabs ─────────────────────────────────────────────────────────────

function CategoryTabs({ activeTab, onTabChange }: {
  activeTab: InboxTab;
  onTabChange: (t: InboxTab) => void;
}) {
  return (
    <div className="flex items-center border-b border-zinc-800/60 px-2 shrink-0 overflow-x-auto">
      {INBOX_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`relative px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors
            ${activeTab === tab.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Command palette ───────────────────────────────────────────────────────────

function CommandPalette({ onClose, onAction }: {
  onClose: () => void;
  onAction: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = PALETTE_ACTIONS.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-900 border border-zinc-700 shadow-2xl rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Search size={14} className="text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
          />
          <kbd className="text-[10px] text-zinc-700 font-mono border border-zinc-800 px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="py-1 max-h-64 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-xs text-zinc-600 text-center">No commands found</p>
          )}
          {filtered.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => onAction(action.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-800 rounded-lg transition-colors group"
              >
                <div className="w-7 h-7 bg-zinc-800 group-hover:bg-zinc-700 border border-zinc-700 rounded-lg flex items-center justify-center shrink-0 transition-colors">
                  <Icon size={13} className="text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200">{action.label}</p>
                  <p className="text-[11px] text-zinc-600">{action.hint}</p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="px-4 py-2 border-t border-zinc-800/60 flex items-center gap-3 text-[10px] text-zinc-700">
          <span>↵ select</span>
          <span>esc close</span>
          <span className="ml-auto flex items-center gap-1"><Command size={9} />K to toggle</span>
        </div>
      </div>
    </div>
  );
}

// ─── Unified sidebar ───────────────────────────────────────────────────────────

function MailSidebar({
  collapsed, onCollapse, chatMode, onModeChange,
  activeFolder, onFolderChange, user, onCompose, unreadCount,
  showSubscriptions, onSubscriptions, onSummarize,
}: {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  chatMode: boolean;
  onModeChange: (v: boolean) => void;
  activeFolder: SidebarFolder;
  onFolderChange: (id: SidebarFolder) => void;
  user: { name: string; email: string; image?: string | null } | null;
  onCompose: () => void;
  unreadCount: number;
  showSubscriptions: boolean;
  onSubscriptions: () => void;
  onSummarize: () => void;
}) {
  return (
    <aside
      className={`shrink-0 flex flex-col h-full bg-zinc-950 border-r border-zinc-800/70 transition-[width] duration-300 ease-in-out overflow-hidden
        ${collapsed ? 'w-14' : 'w-52'}`}
    >
      {/* Logo + collapse */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-zinc-800/70 shrink-0">
        <div className={`flex items-center gap-2 overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out
          ${collapsed ? 'max-w-0 opacity-0' : 'max-w-full opacity-100'}`}>
          <div className="w-6 h-6 bg-white flex items-center justify-center shadow-sm shrink-0">
            <span className="text-black text-xs font-black">Y</span>
          </div>
          <span className="font-semibold text-sm tracking-tight whitespace-nowrap">Yugati</span>
        </div>
        <TooltipWrap label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
          <button
            onClick={() => onCollapse(!collapsed)}
            className={`p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors ${collapsed ? 'mx-auto' : ''}`}
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </TooltipWrap>
      </div>

      {/* Compose */}
      <div className="px-2 pt-3 pb-1 shrink-0">
        <TooltipWrap label="Compose" side="right" disabled={!collapsed}>
          <button
            onClick={onCompose}
            className={`flex items-center gap-2.5 bg-white text-black font-medium text-sm hover:bg-zinc-100 rounded-xl transition-colors
              ${collapsed ? 'w-10 h-10 justify-center mx-auto' : 'px-4 py-2.5 w-full'}`}
          >
            <Pencil size={14} className="shrink-0" />
            <span className={`whitespace-nowrap overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out
              ${collapsed ? 'max-w-0 opacity-0' : 'max-w-full opacity-100'}`}>
              Compose
            </span>
          </button>
        </TooltipWrap>
      </div>

      {/* Mode toggle */}
      <div className="px-2 pb-3 pt-2 shrink-0">
        <div className="flex items-center bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-1 gap-0.5 shadow-inner">
          <ModeBtn active={!chatMode} onClick={() => onModeChange(false)} icon={<Mail size={12} />}                                                                    label="Manual"   color="blue"  collapsed={collapsed} />
          <ModeBtn active={chatMode}  onClick={() => onModeChange(true)}  icon={<Image src="/openai.png" alt="OpenAI" width={16} height={16} className="rounded-sm" />} label="Agentic"  color="green" collapsed={collapsed} />
        </div>
      </div>

      <div className="mx-3 border-t border-zinc-800/60 shrink-0" />

      {/* Nav */}
      <ScrollArea.Root className="flex-1 overflow-hidden">
        <ScrollArea.Viewport className="h-full w-full py-2">

          {SIDEBAR_FOLDERS.map((f) => (
            <NavItem
              key={f.id}
              icon={f.icon}
              label={f.label}
              active={activeFolder === f.id && !chatMode && !showSubscriptions}
              collapsed={collapsed}
              badge={f.id === 'inbox' ? unreadCount : undefined}
              onClick={() => onFolderChange(f.id)}
            />
          ))}
          <NavItem
            icon={MailMinus}
            label="Manage subscriptions"
            active={showSubscriptions}
            collapsed={collapsed}
            onClick={onSubscriptions}
          />

          <div className="mx-3 my-1.5 border-t border-zinc-800/40" />

          <NavItem icon={SlidersHorizontal} label="Overview"      collapsed={collapsed} href="/dashboard/overview"      isNew />
          <NavItem icon={Calendar}          label="Calendar"      collapsed={collapsed} href="/dashboard/calendar"      />
          <NavItem icon={Blocks}            label="Integrations"  collapsed={collapsed} href="/dashboard/integrations"  />
          <NavItem icon={CreditCard}        label="Billing"       collapsed={collapsed} href="/dashboard/billing"       />
          <NavItem icon={Settings}          label="Settings"      collapsed={collapsed} href="/dashboard/settings"      />

          {/* Ambient AI status — clickable */}
          {!collapsed && unreadCount > 0 && (
            <button
              onClick={onSummarize}
              className="mx-3 mt-3 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.15] rounded-xl transition-colors text-left w-[calc(100%-24px)]"
            >
              <div className="flex items-center gap-2">
                <Zap size={11} className="text-zinc-300 shrink-0" />
                <span className="text-[11px] text-zinc-200 font-medium">
                  {unreadCount} unread email{unreadCount !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5 ml-[19px]">
                Ask AI to summarize →
              </p>
            </button>
          )}

        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="flex w-1 p-0.5">
          <ScrollArea.Thumb className="flex-1 bg-zinc-800 rounded-full" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      {/* Usage pill */}
      <div className={`shrink-0 px-2 pb-2 ${collapsed ? 'flex justify-center' : ''}`}>
        <UsagePill collapsed={collapsed} />
      </div>

      {/* User footer */}
      <div className="shrink-0 border-t border-zinc-800/70 p-2">
        {collapsed ? (
          <TooltipWrap label={user?.email ?? ''} side="right">
            <button
              onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/'; } } })}
              className="w-10 h-10 mx-auto flex items-center justify-center"
            >
              {user?.image ? (
                <Image src={user.image} alt={user.name ?? ''} width={28} height={28} className="rounded-full ring-1 ring-zinc-700" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold">
                  {user?.name?.[0]?.toUpperCase() ?? 'U'}
                </div>
              )}
            </button>
          </TooltipWrap>
        ) : (
          <div className="flex items-center gap-2.5 px-1">
            {user?.image ? (
              <Image src={user.image} alt={user.name ?? ''} width={28} height={28} className="rounded-full shrink-0 ring-1 ring-zinc-700" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-200 truncate">{user?.name}</p>
              <p className="text-[10px] text-zinc-600 truncate">{user?.email}</p>
            </div>
            <TooltipWrap label="Sign out" side="top">
              <button
                onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/'; } } })}
                className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <LogOut size={13} />
              </button>
            </TooltipWrap>
          </div>
        )}
      </div>
    </aside>
  );
}

function ModeBtn({ active, onClick, icon, label, color, collapsed }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; color: 'blue' | 'green'; collapsed: boolean;
}) {
  const dotColor  = color === 'green' ? 'bg-green-400'  : 'bg-blue-400';
  const iconColor = color === 'green' ? 'text-green-400' : 'text-blue-400';
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 overflow-visible
        ${collapsed ? 'flex-none w-9 justify-center px-0' : 'flex-1 justify-center px-1.5'}
        ${active ? 'bg-zinc-700/80 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
    >
      <span className={`shrink-0 ${active ? iconColor : 'opacity-50'}`}>{icon}</span>
      <span className={`whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out
        ${collapsed ? 'max-w-0 opacity-0 overflow-hidden' : 'max-w-full opacity-100'}`}>
        {label}
      </span>
      {active && !collapsed && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor} ${color === 'green' ? 'shadow-[0_0_4px_1px_rgba(74,222,128,0.5)]' : ''}`} />
      )}
    </button>
  );
}

function NavItem({ icon: Icon, label, active = false, collapsed, onClick, href, badge, isNew }: {
  icon: React.ElementType; label: string; active?: boolean;
  collapsed: boolean; onClick?: () => void; href?: string; badge?: number; isNew?: boolean;
}) {
  const cls = `mx-1.5 flex items-center gap-2.5 px-2 py-2.5 text-xs font-medium rounded-lg transition-colors text-left overflow-hidden
    ${active ? 'bg-zinc-800 text-white' : 'text-zinc-200 hover:text-white hover:bg-zinc-900'}
    ${collapsed ? 'justify-center' : ''}`;

  const inner = (
    <>
      <Icon size={15} className={`shrink-0 ${active ? 'text-blue-400' : 'text-zinc-400'}`} />
      <span className={`flex-1 whitespace-nowrap overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out
        ${collapsed ? 'max-w-0 opacity-0' : 'max-w-full opacity-100'}`}>
        {label}
      </span>
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="ml-auto text-[10px] font-semibold bg-zinc-700/80 text-zinc-300 px-1.5 py-0.5 min-w-[20px] text-center rounded-md">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {!collapsed && isNew && (
        <span className="ml-auto text-[9px] font-semibold tracking-wide px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 leading-none">
          NEW
        </span>
      )}
    </>
  );

  const wrapped = href ? (
    <Link href={href} className={cls}>{inner}</Link>
  ) : (
    <button onClick={onClick} className={cls}>{inner}</button>
  );

  if (collapsed) return <TooltipWrap label={label} side="right">{wrapped}</TooltipWrap>;
  return wrapped;
}

// ─── Top bar ───────────────────────────────────────────────────────────────────

function MailTopBar({
  chatMode, folderTitle, searchQuery, onSearch, isFetching, onRefresh, showRefresh,
  unreadOnly, onToggleUnread, onOpenPalette, selectedCount, onDeleteSelected, senders,
}: {
  chatMode: boolean;
  folderTitle: string;
  searchQuery: string;
  onSearch: (q: string) => void;
  isFetching: boolean;
  onRefresh: () => void;
  showRefresh: boolean;
  unreadOnly: boolean;
  onToggleUnread: () => void;
  onOpenPalette: () => void;
  selectedCount: number;
  onDeleteSelected: () => void;
  senders: Sender[];
}) {
  return (
    <header className="h-14 shrink-0 border-b border-zinc-800/70 px-4 flex items-center gap-3">

      {/* Folder title */}
      <div className="flex items-center gap-2 shrink-0">
        {!chatMode && <Mail size={14} className="text-zinc-600 shrink-0" />}
        <span className="text-sm font-semibold text-zinc-200 whitespace-nowrap">
          {chatMode ? 'Yugati' : folderTitle}
        </span>
      </div>

      {/* Right side: search + action buttons */}
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        {showRefresh && (
          <TooltipWrap label="Refresh">
            <button
              onClick={onRefresh}
              disabled={isFetching}
              className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-30"
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            </button>
          </TooltipWrap>
        )}

        {!chatMode && selectedCount > 0 && (
          <button
            onClick={onDeleteSelected}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium border border-red-800/50 text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
          >
            <Trash2 size={12} />
            Delete {selectedCount}
          </button>
        )}

        {!chatMode && (
          <>
            {/* Search */}
            <div className="relative w-36 sm:w-44 md:w-56">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search emails…"
                className="w-full bg-white/[0.04] backdrop-blur-md border border-white/[0.06] pl-8 pr-8 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 rounded-lg
                  focus:outline-none focus:bg-white/[0.07] focus:border-white/[0.12] transition-all duration-200"
              />
              {searchQuery ? (
                <button onClick={() => onSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300">
                  <X size={12} />
                </button>
              ) : (
                <button
                  onClick={onOpenPalette}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-zinc-400 transition-colors"
                >
                  <Command size={11} />
                </button>
              )}
            </div>

            {/* Senders dropdown — hidden on small screens */}
            <div className="hidden lg:block">
            <DropdownMenu
              trigger={
                <span className="flex items-center gap-1.5">
                  <Users size={11} />
                  Senders
                </span>
              }
            >
              {(close) => (
                <div className="py-1 min-w-[220px]">
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
                    Filter by sender
                  </p>
                  {senders.length === 0 && (
                    <p className="px-3 py-3 text-xs text-zinc-600 text-center">No emails loaded yet</p>
                  )}
                  {senders.map((s) => (
                    <button
                      key={s.email}
                      onClick={() => { onSearch(`from:${s.email}`); close(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800 transition-colors text-left"
                    >
                      <div className="w-6 h-6 bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0 uppercase">
                        {s.name[0] ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-300 truncate font-medium">{s.name}</p>
                        <p className="text-[10px] text-zinc-600 truncate">{s.email}</p>
                      </div>
                      <span className="text-[10px] text-zinc-700 shrink-0">{s.count}</span>
                    </button>
                  ))}
                  {searchQuery.startsWith('from:') && (
                    <div className="border-t border-zinc-800 mt-1 pt-1">
                      <button
                        onClick={() => { onSearch(''); close(); }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                      >
                        <X size={11} /> Clear filter
                      </button>
                    </div>
                  )}
                </div>
              )}
            </DropdownMenu>
            </div>

            {/* Labels + Quick Filters — hidden on small screens */}
            <div className="hidden xl:flex items-center gap-2">
            {/* Labels dropdown */}
            <DropdownMenu
              trigger={
                <span className="flex items-center gap-1.5">
                  <Tag size={11} />
                  Labels
                  <ChevronDown size={10} />
                </span>
              }
            >
              {(close) => (
                <div className="py-1 min-w-[190px]">
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
                    Filter by label
                  </p>
                  {LABEL_FILTERS.map((f) => {
                    const Icon = f.icon;
                    const active = searchQuery === f.q;
                    return (
                      <button
                        key={f.q}
                        onClick={() => { onSearch(active ? '' : f.q); close(); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left
                          ${active ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-zinc-800 text-zinc-300'}`}
                      >
                        <Icon size={12} className={active ? 'text-blue-400' : 'text-zinc-600'} />
                        <span className="text-xs">{f.label}</span>
                        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </DropdownMenu>

            {/* Quick Filters dropdown */}
            <DropdownMenu
              trigger={
                <span className={`flex items-center gap-1.5 ${unreadOnly ? 'text-blue-400' : ''}`}>
                  <SlidersHorizontal size={11} />
                  Quick Filters
                  <ChevronDown size={10} />
                </span>
              }
            >
              {(close) => {
                const QUICK = [
                  { label: 'Unread only',      action: () => { onToggleUnread(); close(); }, active: unreadOnly },
                  { label: 'Read only',        action: () => { onSearch('is:read'); close(); },          active: searchQuery === 'is:read' },
                  { label: 'Starred',          action: () => { onSearch('is:starred'); close(); },       active: searchQuery === 'is:starred' },
                  { label: 'Has attachment',   action: () => { onSearch('has:attachment'); close(); },   active: searchQuery === 'has:attachment' },
                  { label: 'Last 7 days',      action: () => { onSearch('newer_than:7d'); close(); },   active: searchQuery === 'newer_than:7d' },
                  { label: 'Needs reply',      action: () => { onSearch('is:unread is:important'); close(); }, active: searchQuery === 'is:unread is:important' },
                ];
                return (
                  <div className="py-1 min-w-[180px]">
                    <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Quick filters</p>
                    {QUICK.map((q) => (
                      <button
                        key={q.label}
                        onClick={q.action}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left
                          ${q.active ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-zinc-800 text-zinc-300'}`}
                      >
                        {q.label}
                        {q.active && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                      </button>
                    ))}
                    {(unreadOnly || searchQuery) && (
                      <div className="border-t border-zinc-800 mt-1 pt-1">
                        <button
                          onClick={() => { if (unreadOnly) onToggleUnread(); onSearch(''); close(); }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                        >
                          <X size={11} /> Clear all filters
                        </button>
                      </div>
                    )}
                  </div>
                );
              }}
            </DropdownMenu>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

// ─── Reusable dropdown ─────────────────────────────────────────────────────────

function DropdownMenu({ trigger, children }: {
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium border rounded-lg transition-colors whitespace-nowrap
          ${open
            ? 'border-zinc-600 text-zinc-200 bg-zinc-800/60'
            : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'}`}
      >
        {trigger}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

// ─── Email row ─────────────────────────────────────────────────────────────────

function EmailRow({ msg, selected, onSelect, onDelete }: {
  msg: EmailMsg;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const subject  = getHeader(msg, 'subject') || '(no subject)';
  const from     = getHeader(msg, 'from');
  const fromName = from.replace(/<[^>]+>/, '').trim() || from;
  const isUnread = msg.labelIds?.includes('UNREAD') ?? false;
  const time     = formatTimestamp(msg.internalDate);

  return (
    <div
      className={`relative flex items-center border-b border-zinc-800/40 hover:bg-zinc-900/50 transition-colors overflow-hidden
        ${selected ? 'bg-zinc-900/40' : isUnread ? 'bg-white/[0.025]' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox */}
      <div className="w-9 shrink-0 flex items-center justify-center py-3">
        <button
          onClick={onSelect}
          className={`transition-opacity text-zinc-500 hover:text-zinc-200 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`}
        >
          {selected ? <SquareCheck size={14} className="text-blue-400" /> : <Square size={14} />}
        </button>
      </div>

      {/* Link — fills all remaining space between checkbox and date column */}
      <Link href={`/dashboard/mail/${msg.id}`} className="min-w-0 flex-1 flex items-center py-3 pl-1">
        {/* Sender — responsive fixed width */}
        <p className={`w-28 sm:w-36 lg:w-44 shrink-0 truncate text-sm pr-4 ${
          isUnread ? 'font-semibold text-white' : 'font-medium text-zinc-400'
        }`}>
          {fromName}
        </p>
        {/* Subject — snippet as ONE truncating line */}
        <p className="min-w-0 flex-1 truncate text-sm">
          <span className={isUnread ? 'font-semibold text-white' : 'text-zinc-300'}>{subject}</span>
          {msg.snippet && <span className="text-zinc-500 font-normal"> — {msg.snippet}</span>}
        </p>
      </Link>

      {/* Date / Trash — fixed width OUTSIDE the link, always visible */}
      <div className="w-14 shrink-0 flex items-center justify-end pr-3 relative">
        <span className={`text-xs transition-opacity ${hovered ? 'opacity-0' : 'opacity-100'} ${
          isUnread ? 'font-medium text-zinc-200' : 'text-zinc-500'
        }`}>
          {time}
        </span>
        <button
          onClick={onDelete}
          className={`absolute right-3 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'} text-zinc-500 hover:text-red-400`}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Calendar mini panel ───────────────────────────────────────────────────────

const MINI_DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const MINI_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface CalEvent {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
}

function buildMiniGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const pad   = first.getDay();
  const cells: (Date | null)[] = [
    ...Array<null>(pad).fill(null),
    ...Array.from({ length: last.getDate() }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function CalendarMini() {
  const trpc  = useTRPC();
  const today = useMemo(() => new Date(), []);
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  function prevM() { if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); } else setCalMonth((m) => m - 1); }
  function nextM() { if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0);  } else setCalMonth((m) => m + 1); }

  const timeMin = useMemo(() => { const d = new Date(today); d.setHours(0,0,0,0); return d.toISOString(); }, [today]);

  const { data, isLoading, error } = useQuery(
    trpc.calendar.listEvents.queryOptions({ calendarId: 'primary', timeMin, maxResults: 5, singleEvents: true }),
  );

  const isAuthError = (error as { data?: { code?: string } } | null)?.data?.code === 'UNAUTHORIZED';
  const events = (data?.items ?? []) as CalEvent[];

  const eventDays = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      const d = e.start?.dateTime?.split('T')[0] ?? e.start?.date;
      if (d) set.add(d);
    });
    return set;
  }, [events]);

  const grid = useMemo(() => buildMiniGrid(calYear, calMonth), [calYear, calMonth]);
  function isoDate(d: Date) { return d.toISOString().split('T')[0]; }

  return (
    <aside className="hidden xl:flex xl:flex-col w-60 shrink-0 bg-zinc-950/80 border-l border-zinc-800/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 shrink-0">
        <span className="text-xs font-semibold text-zinc-300">Calendar</span>
      </div>

      {/* Month nav */}
      <div className="p-3 border-b border-zinc-800/50">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevM} className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"><ChevronLeft size={12} /></button>
          <span className="text-xs font-semibold text-zinc-200">{MINI_MONTHS[calMonth].toUpperCase()} {calYear}</span>
          <button onClick={nextM} className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"><ChevronRight size={12} /></button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {MINI_DAYS.map((d, i) => (
            <div key={i} className="text-center text-[9px] font-semibold text-zinc-700 py-0.5">{d}</div>
          ))}
        </div>
        {grid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day, di) => {
              if (!day) return <div key={di} />;
              const ds       = isoDate(day);
              const isToday  = ds === isoDate(today);
              const hasEvent = eventDays.has(ds);
              return (
                <div key={di} className="flex flex-col items-center py-0.5">
                  <span className={`text-[11px] w-6 h-6 flex items-center justify-center leading-none rounded-full
                    ${isToday ? 'bg-blue-500 text-white font-bold mini-today' : 'text-zinc-400 hover:bg-zinc-800 cursor-pointer'}`}>
                    {day.getDate()}
                  </span>
                  {hasEvent && <span className="w-1 h-1 rounded-full bg-blue-400 mt-0.5" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Upcoming events */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest shrink-0">Upcoming</p>
        <ScrollArea.Root className="flex-1 overflow-hidden">
          <ScrollArea.Viewport className="h-full w-full px-3 pb-3">
            {isLoading && (
              <div className="space-y-2 pt-1">
                {[70, 55, 80].map((w, i) => (
                  <div key={i} className="h-8 bg-zinc-900 animate-pulse" style={{ width: `${w}%` }} />
                ))}
              </div>
            )}
            {isAuthError && (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <p className="text-xs text-zinc-600">Connect Calendar to see events</p>
                <a href="/api/corsair/connect?plugin=googlecalendar" className="text-xs text-blue-400 hover:text-blue-300">Connect →</a>
              </div>
            )}
            {!isLoading && !error && events.length === 0 && (
              <p className="text-xs text-zinc-600 py-3">No upcoming events.</p>
            )}
            <div className="space-y-0.5">
              {events.map((ev) => {
                const dt = ev.start?.dateTime
                  ? new Date(ev.start.dateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : ev.start?.date ?? '';
                return (
                  <div key={ev.id} className="flex items-start gap-2 py-1.5 hover:bg-zinc-900/60 px-1 transition-colors">
                    <Clock size={11} className="text-zinc-600 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-300 truncate font-medium">{ev.summary ?? '(no title)'}</p>
                      <p className="text-[11px] text-zinc-600">{dt}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" className="flex w-1 p-0.5">
            <ScrollArea.Thumb className="flex-1 bg-zinc-800 rounded-full" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </div>

      <div className="p-2 border-t border-zinc-800/50 shrink-0">
        <Link
          href="/dashboard/calendar"
          className="flex items-center justify-center gap-2 w-full py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-800 transition-all"
        >
          <Calendar size={12} />
          Open Calendar
        </Link>
      </div>
    </aside>
  );
}

// ─── Compose modal ─────────────────────────────────────────────────────────────

const AI_ACTIONS = [
  {
    id: 'polish',
    label: 'Polish',
    description: 'Fix grammar and smooth the flow',
    icon: Sparkles,
    prompt: (body: string) =>
      `Polish this email draft — fix grammar, spelling, and sentence flow. Keep the same content and tone. Return ONLY the improved email body, no explanations:\n\n${body}`,
  },
  {
    id: 'improve',
    label: 'Improve',
    description: 'Make it stronger and more compelling',
    icon: Wand2,
    prompt: (body: string) =>
      `Rewrite this email to be more clear, persuasive, and professional while keeping the core message intact. Return ONLY the rewritten email body, no explanations:\n\n${body}`,
  },
  {
    id: 'generate',
    label: 'Generate',
    description: 'Write from scratch or expand your notes',
    icon: RefreshCcw,
    prompt: (body: string, subject: string, to: string) =>
      `Write a professional email body for the following context.\nTo: ${to || 'the recipient'}\nSubject: ${subject || '(no subject)'}${body ? `\nNotes: ${body}` : ''}\n\nReturn ONLY the email body text. No subject line, no greeting label, just the body starting from the greeting.`,
  },
] as const;
type AiActionId = (typeof AI_ACTIONS)[number]['id'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const TLD_TYPOS: Record<string, string> = {
  copm: 'com', cmo: 'com', ocm: 'com', con: 'com', comn: 'com', coom: 'com', conm: 'com', cpm: 'com',
  nete: 'net', nett: 'net', nte: 'net',
  ogr: 'org',  orgg: 'org',
  eud: 'edu',  eud2: 'edu',
};

function checkEmailTypos(raw: string): string | null {
  const emails = raw.split(/[,;]/).map((e) => e.trim()).filter(Boolean);
  for (const email of emails) {
    if (!EMAIL_RE.test(email)) return `"${email}" doesn't look like a valid email address`;
    const tld = email.split('.').pop()?.toLowerCase() ?? '';
    const fix = TLD_TYPOS[tld];
    if (fix) return `Possible typo — did you mean ${email.replace(/\.[^.]+$/, `.${fix}`)}?`;
  }
  return null;
}

const composeSchema = z.object({
  to: z.string()
    .min(1, 'At least one recipient is required')
    .superRefine((v, ctx) => {
      const err = checkEmailTypos(v);
      if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err });
    }),
  cc: z.string()
    .optional()
    .superRefine((v, ctx) => {
      if (!v) return;
      const err = checkEmailTypos(v);
      if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err });
    }),
  subject: z.string().optional(),
});
type ComposeFields = z.infer<typeof composeSchema>;

// ─── Recipient pill input ──────────────────────────────────────────────────────

function RecipientInput({ pills, onChange, suggestions, placeholder = 'Recipients', error }: {
  pills: string[];
  onChange: (pills: string[]) => void;
  suggestions: Sender[];
  placeholder?: string;
  error?: string;
}) {
  const [inputVal, setInputVal] = useState('');
  const [showSug,  setShowSug]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);

  const filtered = inputVal.trim()
    ? suggestions.filter((s) =>
        !pills.includes(s.email) &&
        (s.email.toLowerCase().includes(inputVal.toLowerCase()) ||
         s.name.toLowerCase().includes(inputVal.toLowerCase())),
      ).slice(0, 6)
    : [];

  function commit(raw: string) {
    const val = raw.trim().replace(/,+$/, '');
    if (!val || pills.includes(val)) { setInputVal(''); return; }
    onChange([...pills, val]);
    setInputVal('');
  }

  function removeLast() {
    if (pills.length > 0) onChange(pills.slice(0, -1));
  }

  return (
    <div ref={wrapRef} className="relative flex-1">
      <div
        className={`flex flex-wrap items-center gap-1.5 min-h-[38px] py-1.5 cursor-text`}
        onClick={() => inputRef.current?.focus()}
      >
        {pills.map((p) => (
          <span key={p} className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-full px-2.5 py-0.5 leading-none">
            {p}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(pills.filter((x) => x !== p)); }}
              className="text-zinc-500 hover:text-zinc-200 transition-colors ml-0.5"
            >×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputVal}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={pills.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
          onChange={(e) => { setInputVal(e.target.value); setShowSug(true); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
              e.preventDefault();
              commit(inputVal);
            }
            if (e.key === 'Backspace' && !inputVal) removeLast();
          }}
          onBlur={() => {
            setTimeout(() => setShowSug(false), 150);
            if (inputVal.trim()) commit(inputVal);
          }}
          onFocus={() => setShowSug(true)}
        />
      </div>
      {error && <p className="text-[10px] text-red-400 pb-1">{error}</p>}

      {/* Suggestion dropdown */}
      {showSug && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
          {filtered.map((s) => (
            <button
              key={s.email}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); commit(s.email); setShowSug(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800 transition-colors text-left"
            >
              <div className="w-6 h-6 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0 uppercase">
                {s.name[0] ?? '?'}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-zinc-200 font-medium truncate">{s.name}</p>
                <p className="text-[10px] text-zinc-500 truncate">{s.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Compose modal ─────────────────────────────────────────────────────────────

function ComposeModal({ onClose, onSwitchToAI, senders = [] }: {
  onClose: () => void;
  onSwitchToAI?: () => void;
  senders?: Sender[];
}) {
  const trpc = useTRPC();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ComposeFields>({
    resolver: zodResolver(composeSchema),
    defaultValues: { to: '', cc: '', subject: '' },
  });

  const [toPills, setToPills] = useState<string[]>([]);
  const [ccPills, setCcPills] = useState<string[]>([]);

  function syncTo(pills: string[]) {
    setToPills(pills);
    setValue('to', pills.join(', '), { shouldValidate: pills.length > 0 });
  }
  function syncCc(pills: string[]) {
    setCcPills(pills);
    setValue('cc', pills.join(', '), { shouldValidate: false });
  }

  const subjectValue = watch('subject') ?? '';

  const [showCc,    setShowCc]    = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [aiStep,     setAiStep]     = useState<'menu' | 'generate'>('menu');
  const [aiIntent,   setAiIntent]   = useState('');
  const [aiLoading,  setAiLoading]  = useState<AiActionId | null>(null);
  const editorRef  = useRef<HTMLDivElement>(null);
  const aiMenuRef  = useRef<HTMLDivElement>(null);
  const intentRef  = useRef<HTMLTextAreaElement>(null);

  // Close AI menu on click outside; reset step when closed
  useEffect(() => {
    if (!aiMenuOpen) { setAiStep('menu'); return; }
    if (aiStep === 'generate') setTimeout(() => intentRef.current?.focus(), 50);
    function handler(e: MouseEvent) {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) setAiMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [aiMenuOpen, aiStep]);

  const sendMutation = useMutation(
    trpc.gmail.sendMessage.mutationOptions({
      onSuccess: () => { toast.success('Email sent'); onClose(); },
      onError:   () => toast.error('Failed to send — please try again.'),
    }),
  );

  function execFormat(cmd: string, value?: string) {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand(cmd, false, value ?? '');
    editorRef.current?.focus();
  }

  function openAIAction(actionId: AiActionId) {
    if (actionId === 'generate') {
      // Don't run yet — show the intent step first
      setAiStep('generate');
      return;
    }
    const current = editorRef.current?.innerText?.trim() ?? '';
    if (!current) { toast.error('Write something first — then AI can improve it.'); return; }
    void runAI(actionId, current);
  }

  async function runAI(actionId: AiActionId, bodyText: string, intent?: string) {
    setAiMenuOpen(false);
    setAiStep('menu');
    setAiLoading(actionId);
    const action = AI_ACTIONS.find((a) => a.id === actionId)!;
    try {
      let prompt: string;
      if (action.id === 'generate') {
        prompt = [
          `Write a professional email body for the following context.`,
          `To: ${toPills.join(', ') || 'the recipient'}`,
          `Subject: ${subjectValue || '(no subject)'}`,
          `Intent: ${intent ?? aiIntent}`,
          bodyText ? `Additional notes: ${bodyText}` : '',
          ``,
          `Return ONLY the email body text. Start from the greeting. No explanations.`,
        ].filter(Boolean).join('\n');
      } else {
        prompt = (action.prompt as (b: string) => string)(bodyText);
      }

      const res = await fetch('/api/agent/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        toast.error(err.error ?? 'AI failed — please try again.');
        return;
      }

      // Read SSE stream and accumulate delta text
      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '', output = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6)) as { type: string; text?: string };
            if (data.type === 'delta' && data.text) output += data.text;
          } catch { /* partial */ }
        }
      }

      if (output && editorRef.current) {
        editorRef.current.innerText = output;
        toast.success(`${action.label} applied`);
      } else {
        toast.error('AI returned an empty response — try again.');
      }
    } catch {
      toast.error('AI failed to process — please try again.');
    } finally {
      setAiLoading(null);
      setAiIntent('');
    }
  }

  const onSubmit = async (fields: ComposeFields) => {
    const htmlBody = editorRef.current?.innerHTML ?? '';
    const body     = editorRef.current?.innerText ?? '';
    await sendMutation.mutateAsync({
      to:      toPills,
      cc:      showCc && ccPills.length ? ccPills : undefined,
      subject: fields.subject || '(no subject)',
      body,
      htmlBody,
    });
  };

  // Minimized pill
  if (minimized) {
    return (
      <div className="fixed bottom-0 right-6 z-50">
        <div className="w-64 bg-zinc-900 border border-zinc-700 border-b-0 rounded-t-xl shadow-2xl flex items-center justify-between px-4 py-2.5">
          <span className="text-xs font-medium text-zinc-300 truncate">{subjectValue || 'New message'}</span>
          <div className="flex items-center gap-0.5 shrink-0 ml-2">
            <button onClick={() => setMinimized(false)} className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"><Maximize2 size={12} /></button>
            <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"><X size={12} /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-0 right-6 z-50 flex flex-col bg-zinc-950 border border-zinc-800/80 border-b-0 shadow-[0_-8px_40px_rgba(0,0,0,0.6)] rounded-t-2xl overflow-visible transition-all duration-200
      ${maximized ? 'w-[680px] h-[580px]' : 'w-[540px] h-[500px]'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900/80 border-b border-zinc-800/60 shrink-0 rounded-t-2xl">
        <span className="text-xs font-semibold text-zinc-200 tracking-wide">New message</span>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => setMinimized(true)} className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors" title="Minimise"><Minimize2 size={12} /></button>
          <button type="button" onClick={() => setMaximized((m) => !m)} className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors" title="Expand"><Maximize2 size={12} /></button>
          <button type="button" onClick={onClose} className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors" title="Close"><X size={12} /></button>
        </div>
      </div>

      {/* Address fields */}
      <div className="shrink-0 border-b border-zinc-800/60">
        {/* To */}
        <div className={`flex items-start gap-3 px-4 border-b ${errors.to ? 'border-red-800/60' : 'border-zinc-800/40'}`}>
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest shrink-0 pt-3">To</span>
          <RecipientInput
            pills={toPills}
            onChange={syncTo}
            suggestions={senders}
            error={errors.to?.message}
          />
          {!showCc && (
            <button type="button" onClick={() => setShowCc(true)}
              className="text-[10px] font-semibold text-zinc-600 hover:text-zinc-300 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors shrink-0 mt-2">
              Cc
            </button>
          )}
        </div>
        {/* Cc */}
        {showCc && (
          <div className={`flex items-start gap-3 px-4 border-b ${errors.cc ? 'border-red-800/60' : 'border-zinc-800/40'}`}>
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest shrink-0 pt-3">Cc</span>
            <RecipientInput
              pills={ccPills}
              onChange={syncCc}
              suggestions={senders}
              error={errors.cc?.message}
            />
            <button type="button" onClick={() => { setShowCc(false); syncCc([]); }}
              className="p-1 text-zinc-600 hover:text-zinc-300 rounded transition-colors shrink-0 mt-2.5"><X size={11} /></button>
          </div>
        )}
        {/* Subject */}
        <div className="flex items-center gap-3 px-4">
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest shrink-0">Sub</span>
          <input
            {...register('subject')}
            placeholder="Subject"
            autoComplete="off"
            className="flex-1 bg-transparent py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto relative">
        {aiLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-950/80 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Sparkles size={14} className="text-blue-400 animate-pulse" />
            </div>
            <p className="text-xs text-zinc-400">
              {AI_ACTIONS.find((a) => a.id === aiLoading)?.label}ing your email…
            </p>
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable={!aiLoading}
          suppressContentEditableWarning
          data-placeholder="Write your message…"
          onKeyDown={(e) => {
            if (e.key === 'b' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); execFormat('bold'); }
            if (e.key === 'i' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); execFormat('italic'); }
            if (e.key === 'u' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); execFormat('underline'); }
          }}
          className={`min-h-full px-5 py-4 text-sm text-zinc-200 focus:outline-none leading-relaxed transition-opacity
            empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-600 empty:before:pointer-events-none
            ${aiLoading ? 'opacity-30' : 'opacity-100'}`}
          style={{ wordBreak: 'break-word' }}
        />
      </div>

      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2.5 border-t border-zinc-800 bg-zinc-900/90">
        <div className="flex items-center gap-0.5">
          <ComposeFormatBtn onClick={() => execFormat('bold')} title="Bold (⌘B)">
            <span className="font-bold text-xs leading-none">B</span>
          </ComposeFormatBtn>
          <ComposeFormatBtn onClick={() => execFormat('italic')} title="Italic (⌘I)">
            <span className="italic text-xs leading-none">I</span>
          </ComposeFormatBtn>
          <ComposeFormatBtn onClick={() => execFormat('underline')} title="Underline (⌘U)">
            <span className="underline text-xs leading-none">U</span>
          </ComposeFormatBtn>
          <div className="w-px h-4 bg-zinc-800 mx-1.5 shrink-0" />
          <ComposeFormatBtn onClick={() => execFormat('insertUnorderedList')} title="Bullet list">
            <List size={13} />
          </ComposeFormatBtn>
          <ComposeFormatBtn onClick={() => execFormat('insertOrderedList')} title="Numbered list">
            <ListOrdered size={13} />
          </ComposeFormatBtn>
          <div className="w-px h-4 bg-zinc-800 mx-1.5 shrink-0" />
          <ComposeFormatBtn
            onClick={() => {
              const url = prompt('Enter link URL:');
              if (url) execFormat('createLink', url);
            }}
            title="Insert link"
          >
            <Link2 size={13} />
          </ComposeFormatBtn>

          {/* AI button */}
          <div className="w-px h-4 bg-zinc-800 mx-1.5 shrink-0" />
          <div ref={aiMenuRef} className="relative">
            <button
              onClick={() => setAiMenuOpen((o) => !o)}
              disabled={!!aiLoading}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all
                ${aiMenuOpen
                  ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                  : 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'}
                disabled:opacity-40`}
            >
              {aiLoading
                ? <Loader2Icon size={12} className="animate-spin text-blue-400" />
                : <Sparkles size={12} className="text-blue-400" />}
              AI
            </button>

            {/* AI action menu — pops upward */}
            {aiMenuOpen && (
              <div className="absolute bottom-full mb-2 left-0 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden min-w-[248px]">

                {aiStep === 'menu' ? (
                  <>
                    <div className="px-3 pt-2.5 pb-1.5 border-b border-zinc-800">
                      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">AI actions</p>
                    </div>
                    {AI_ACTIONS.map(({ id, label, description, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => openAIAction(id)}
                        className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-zinc-800 transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-zinc-800 group-hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                          <Icon size={13} className="text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-200">{label}</p>
                          <p className="text-[11px] text-zinc-500 leading-tight">{description}</p>
                        </div>
                      </button>
                    ))}
                    {/* Switch-to-AI CTA */}
                    {onSwitchToAI && (
                      <div className="border-t border-zinc-800 px-3 py-2.5">
                        <button
                          onClick={() => { setAiMenuOpen(false); onSwitchToAI(); }}
                          className="flex items-center gap-2 text-[11px] text-zinc-500 hover:text-blue-400 transition-colors w-full group"
                        >
                          <Bot size={12} className="text-zinc-600 group-hover:text-blue-400 transition-colors shrink-0" />
                          <span>Switch to AI mode for a smoother experience →</span>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  /* Generate intent step */
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => setAiStep('menu')}
                        className="p-1 text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <div>
                        <p className="text-xs font-semibold text-zinc-200">Generate email</p>
                        <p className="text-[10px] text-zinc-500">Describe what you want to write</p>
                      </div>
                    </div>
                    <textarea
                      ref={intentRef}
                      value={aiIntent}
                      onChange={(e) => setAiIntent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && aiIntent.trim()) {
                          e.preventDefault();
                          void runAI('generate', editorRef.current?.innerText?.trim() ?? '', aiIntent);
                        }
                      }}
                      placeholder="e.g. Follow up on a proposal sent last week, keep it professional and ask for a call"
                      rows={3}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none leading-relaxed"
                    />
                    <button
                      onClick={() => void runAI('generate', editorRef.current?.innerText?.trim() ?? '', aiIntent)}
                      disabled={!aiIntent.trim()}
                      className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Sparkles size={12} />
                      Generate
                    </button>
                    <p className="text-center text-[10px] text-zinc-700 mt-1.5">⌘↵ to generate</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            title="Discard"
            className="p-2 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => void handleSubmit(onSubmit)()}
            disabled={toPills.length === 0 || sendMutation.isPending || !!aiLoading}
            className="btn-cal-new flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sendMutation.isPending
              ? <><Loader2Icon size={12} className="animate-spin" /> Sending…</>
              : <><Send size={12} /> Send</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ComposeFormatBtn({ onClick, title, children }: {
  onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
    >
      {children}
    </button>
  );
}

// ─── Auth error ────────────────────────────────────────────────────────────────

function AuthError() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border border-zinc-800 bg-zinc-900 flex items-center justify-center">
        <Plug size={18} className="text-zinc-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">Gmail not connected</p>
        <p className="text-xs text-zinc-500 mt-1">Connect your account to see messages</p>
      </div>
      <a
        href="/api/corsair/connect?plugin=gmail"
        className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-medium hover:bg-zinc-100 transition-colors"
      >
        <Plug size={12} />
        Connect Gmail
      </a>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonList() {
  return (
    <div className="flex-1">
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/40">
          <div className="w-10 shrink-0" />
          <div className="w-28 h-3 bg-zinc-900 animate-pulse" />
          <div className="flex-1 h-3 bg-zinc-900 animate-pulse" style={{ maxWidth: `${30 + (i * 11) % 40}%` }} />
          <div className="w-10 h-3 bg-zinc-900 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ─── Tooltip helper ────────────────────────────────────────────────────────────

function TooltipWrap({ children, label, side = 'bottom', disabled = false }: {
  children: React.ReactNode; label: string; side?: 'top' | 'right' | 'bottom' | 'left'; disabled?: boolean;
}) {
  if (disabled) return <>{children}</>;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={6}
          className="bg-zinc-800 text-zinc-200 text-xs px-2 py-1 shadow-lg border border-zinc-700 z-50"
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
