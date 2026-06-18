"use client";

import { useState, useMemo, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useSession } from "@/lib/auth-client";
import * as Tooltip from "@radix-ui/react-tooltip";
import dynamic from "next/dynamic";
import { Mail, ChevronDown, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { INBOX_TABS, SIDEBAR_FOLDERS, type InboxTab, type SidebarFolder } from "./constants";
import { getGroupLabel, getHeader } from "./helpers";
import type { EmailMsg, Sender } from "./types";

import { MailSidebar } from "./components/MailSidebar";
import { MailTopBar } from "./components/MailTopBar";
import { CategoryTabs } from "./components/CategoryTabs";
import { EmailRow } from "./components/EmailRow";
import { MailInsightPanel } from "./components/MailInsightPanel";
import { CommandPalette } from "./components/CommandPalette";
import { SubscriptionsPanel } from "./components/SubscriptionsPanel";
import { ComposeModal } from "./components/ComposeModal";
import { AuthError } from "./components/AuthError";
import { SkeletonList } from "./components/SkeletonList";


function popReplyContext(): string | null {
  try {
    const raw = sessionStorage.getItem("yugati_reply_context");
    if (!raw) return null;
    sessionStorage.removeItem("yugati_reply_context");
    const ctx = JSON.parse(raw) as {
      from: string;
      subject: string;
      snippet: string;
      replyAll?: boolean;
      forward?: boolean;
    };
    const senderName =
      ctx.from.match(/^"?([^"<]+)"?\s*</)?.[1]?.trim() ?? ctx.from;
    if (ctx.forward) {
      return `I need to forward an email from ${senderName} with subject "${ctx.subject}". Please draft a short forwarding note explaining why I'm forwarding this and to whom. The original email said: ${ctx.snippet.slice(0, 300)}${ctx.snippet.length > 300 ? "…" : ""}`;
    }
    const action = ctx.replyAll ? "reply all" : "reply";
    return `Draft a professional ${action} to ${senderName} regarding: "${ctx.subject}".

Context — they wrote: ${ctx.snippet.slice(0, 300)}${ctx.snippet.length > 300 ? "…" : ""}

Keep it concise and address them by name.`;
  } catch {
    return null;
  }
}

const ChatView = dynamic(
  () =>
    import("../components/chat-view").then((m) => ({ default: m.ChatView })),
  { ssr: false, loading: () => null },
);

type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string;
};

export default function MailPage() {
  const trpc = useTRPC();
  const router = useRouter();
  const { data: authData } = useSession();
  const user = authData?.user as SessionUser | undefined;

  const [collapsed, setCollapsed] = useState(false);

  const [chatMode, setChatMode] = useState(false);
  const [activeFolder, setActiveFolder] = useState<SidebarFolder>("inbox");
  const [activeTab, setActiveTab] = useState<InboxTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [summarizePrompt, setSummarizePrompt] = useState<string | undefined>(undefined);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [fetchedCount, setFetchedCount] = useState(20);

  // Restore mode + reply context from localStorage after hydration (avoids SSR mismatch).
  // startTransition defers the state updates so they don't cascade synchronously in the effect.
  useEffect(() => {
    const replyPrompt = popReplyContext();
    if (replyPrompt) {
      startTransition(() => {
        setChatMode(true);
        setSummarizePrompt(replyPrompt);
      });
      return;
    }
    try {
      if (localStorage.getItem("yugati_mail_mode") === "chat") {
        startTransition(() => setChatMode(true));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("yugati_mail_mode", chatMode ? "chat" : "manual");
    } catch {}
  }, [chatMode]);

  const isInbox = activeFolder === "inbox";
  const tabQ = INBOX_TABS.find((t) => t.id === activeTab)!.q;
  const folderQ = SIDEBAR_FOLDERS.find((f) => f.id === activeFolder)!.q;
  const baseQ = isInbox ? tabQ : folderQ;
  const effectiveQ = searchQuery
    ? searchQuery + (unreadOnly ? " is:unread" : "")
    : baseQ + (unreadOnly ? " is:unread" : "");

  // Resetting pagination state when the query changes is a standard React
  // pattern. The React Compiler flags setState-in-effect as a cascade risk,
  // but here it's intentional: effectiveQ is stable between renders.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setFetchedCount(20); }, [effectiveQ]);

  const { data, isLoading, error, refetch, isFetching } = useQuery(
    trpc.gmail.listInbox.queryOptions({ maxResults: fetchedCount, q: effectiveQ }),
  );

  const queryClient = useQueryClient();
  const inboxQueryKey = trpc.gmail.listInbox.queryOptions({ maxResults: fetchedCount, q: effectiveQ }).queryKey;

  const trashMutation = useMutation(
    trpc.gmail.trashMessage.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({ queryKey: inboxQueryKey });
        const previous = queryClient.getQueryData(inboxQueryKey);
        queryClient.setQueryData(inboxQueryKey, (old: { messages?: { id?: string }[] } | undefined) => {
          if (!old) return old;
          return { ...old, messages: (old.messages ?? []).filter((m) => m.id !== id) };
        });
        return { previous };
      },
      onError: (_err, _vars, ctx) => {
        if (ctx?.previous !== undefined) queryClient.setQueryData(inboxQueryKey, ctx.previous);
      },
      onSettled: () => void refetch(),
    }),
  );

  const {
    data: subsData,
    isLoading: subsLoading,
    refetch: subsRefetch,
  } = useQuery({
    ...trpc.gmail.listSubscriptions.queryOptions(),
    enabled: showSubscriptions,
    staleTime: 5 * 60 * 1000,
  });

  const unsubMutation = useMutation(
    trpc.gmail.unsubscribeViaEmail.mutationOptions({
      onSuccess: () => {
        toast.success("Unsubscribe email sent!");
        void subsRefetch();
      },
      onError: () => toast.error("Failed to unsubscribe"),
    }),
  );

  const isAuthError =
    (error as { data?: { code?: string } } | null)?.data?.code ===
    "UNAUTHORIZED";

  const groupedEmails = useMemo(() => {
    const msgs = (data?.messages ?? []) as EmailMsg[];
    const seenOrder: string[] = [];
    const map = new Map<string, EmailMsg[]>();
    for (const msg of msgs) {
      const g = getGroupLabel(msg.internalDate);
      if (!map.has(g)) {
        map.set(g, []);
        seenOrder.push(g);
      }
      map.get(g)!.push(msg);
    }
    return seenOrder.map((label) => ({ label, msgs: map.get(label)! }));
  }, [data]);

  const unreadCount = useMemo(
    () =>
      ((data?.messages ?? []) as EmailMsg[]).filter((m) =>
        m.labelIds?.includes("UNREAD"),
      ).length,
    [data],
  );

  const tabCounts = useMemo(() => {
    const msgs = (data?.messages ?? []) as EmailMsg[];
    const unread = msgs.filter((m) => m.labelIds?.includes("UNREAD"));
    const cat = (label: string) => unread.filter((m) => m.labelIds?.includes(label)).length;
    return {
      all: unread.length,
      primary: unread.filter(
        (m) =>
          m.labelIds?.includes("CATEGORY_PERSONAL") ||
          (!m.labelIds?.some((l) => l.startsWith("CATEGORY_")) && m.labelIds?.includes("INBOX")),
      ).length,
      promotions: cat("CATEGORY_PROMOTIONS"),
      social: cat("CATEGORY_SOCIAL"),
      updates: cat("CATEGORY_UPDATES"),
    };
  }, [data]);

  const senders = useMemo<Sender[]>(() => {
    const msgs = (data?.messages ?? []) as EmailMsg[];
    const map = new Map<string, Sender>();
    for (const msg of msgs) {
      const raw = getHeader(msg, "from");
      const match = raw.match(/^"?(.+?)"?\s*<([^>]+)>$/) ?? [null, raw, raw];
      const name = ((match[1] ?? raw) as string).trim().replace(/^"|"$/g, "");
      const email = ((match[2] ?? raw) as string).trim().toLowerCase();
      if (!email) continue;
      if (!map.has(email))
        map.set(email, { name: name || email, email, count: 0 });
      map.get(email)!.count++;
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  }, [data]);

  const activeLabel = isInbox
    ? "Inbox"
    : (SIDEBAR_FOLDERS.find((f) => f.id === activeFolder)?.label ?? "Mail");

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setConfirmDialog(null);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function handlePaletteAction(id: string) {
    setPaletteOpen(false);
    if (id === "ai") setChatMode(true);
    if (id === "compose") setComposing(true);
    if (id === "calendar") router.push("/dashboard/calendar");
    if (id === "inbox") {
      setActiveFolder("inbox");
      setChatMode(false);
    }
    if (id === "unread") setUnreadOnly((u) => !u);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function deleteOne(id: string) {
    const subject = ((data?.messages ?? []) as EmailMsg[]).find(
      (m) => m.id === id,
    );
    const subjectLine = subject
      ? getHeader(subject, "subject") || "this email"
      : "this email";
    setConfirmDialog({
      title: "Move to Trash?",
      description: `"${subjectLine}" will be moved to Trash.`,
      onConfirm: async () => {
        setSelectedIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
        await trashMutation.mutateAsync({ id });
        toast.success("Moved to Trash");
      },
    });
  }

  function deleteSelected() {
    const count = selectedIds.size;
    setConfirmDialog({
      title: `Move ${count} email${count !== 1 ? "s" : ""} to Trash?`,
      description:
        "Selected emails will be moved to Trash. You can recover them from Trash.",
      onConfirm: async () => {
        const ids = [...selectedIds];
        setSelectedIds(new Set());
        await Promise.all(ids.map((id) => trashMutation.mutateAsync({ id })));
        toast.success(`${count} email${count !== 1 ? "s" : ""} moved to Trash`);
      },
    });
  }

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="h-screen flex overflow-hidden bg-zinc-950 text-zinc-50">
        {paletteOpen && (
          <CommandPalette
            onClose={() => setPaletteOpen(false)}
            onAction={handlePaletteAction}
          />
        )}

        {/* Confirm dialog */}
        <Dialog
          open={!!confirmDialog}
          onOpenChange={(open) => { if (!open) setConfirmDialog(null); }}
        >
          <DialogContent showCloseButton={false} className="max-w-xs">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 size={15} className="text-red-400 shrink-0" />
                {confirmDialog?.title}
              </DialogTitle>
              <DialogDescription>{confirmDialog?.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-row justify-end gap-2 border-t-0 bg-transparent p-3 mt-1">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-5 py-2.5 text-xs font-medium text-zinc-300 bg-white/6 hover:bg-white/10 border border-white/8 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const fn = confirmDialog!.onConfirm;
                  setConfirmDialog(null);
                  await fn();
                }}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-red-800 hover:bg-red-500 rounded-lg transition-colors"
              >
                Move to Trash
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <MailSidebar
          collapsed={collapsed}
          onCollapse={setCollapsed}
          chatMode={chatMode}
          onModeChange={setChatMode}
          activeFolder={activeFolder}
          onFolderChange={(id) => {
            setActiveFolder(id);
            setSearchQuery("");
            setChatMode(false);
            setShowSubscriptions(false);
          }}
          user={user ?? null}
          isAdmin={user?.role === 'admin'}
          onCompose={() => setComposing(true)}
          unreadCount={unreadCount}
          showSubscriptions={showSubscriptions}
          onSubscriptions={() => {
            setShowSubscriptions((s) => !s);
            setChatMode(false);
          }}
          onSummarize={() => {
            setChatMode(true);
            setSummarizePrompt(
              `Summarize my most recent unread emails (up to 10) — give me the key topics, senders, and anything urgent that needs my attention. Use snippets only, not full content.`,
            );
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
                  onAgentDone={() => void queryClient.invalidateQueries({ queryKey: trpc.gmail.listInbox.queryKey() })}
                  userName={user?.name ?? undefined}
                />
              </div>
            ) : showSubscriptions ? (
              <SubscriptionsPanel
                subscriptions={subsData?.subscriptions}
                isLoading={subsLoading}
                onRefresh={() => void subsRefetch()}
                onUnsubscribeEmail={(mailtoUrl) =>
                  unsubMutation.mutate({ mailtoUrl })
                }
                pendingEmail={
                  unsubMutation.isPending
                    ? (
                        unsubMutation.variables as
                          | { mailtoUrl: string }
                          | undefined
                      )?.mailtoUrl
                    : undefined
                }
              />
            ) : (
              <>
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r border-zinc-800/50">
                  {isInbox && !searchQuery && (
                    <CategoryTabs
                      activeTab={activeTab}
                      onTabChange={setActiveTab}
                      counts={tabCounts}
                    />
                  )}

                  {!isInbox && (
                    <div className="px-5 py-2.5 border-b border-zinc-800/40 flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-zinc-200">
                        {activeLabel}
                      </span>
                    </div>
                  )}

                  {isLoading && <SkeletonList />}
                  {error && isAuthError && <AuthError />}
                  {error && !isAuthError && (
                    <div className="flex-1 flex items-center justify-center text-sm text-zinc-500">
                      Failed to load messages
                    </div>
                  )}
                  {!isLoading && !error && data?.messages?.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-700">
                      <Mail size={22} />
                      <span className="text-sm">No messages</span>
                    </div>
                  )}
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
                            selected={selectedIds.has(msg.id ?? "")}
                            onSelect={() => toggleSelect(msg.id ?? "")}
                            onDelete={() => void deleteOne(msg.id ?? "")}
                          />
                        ))}
                      </div>
                    ))}

                    {/* Load more */}
                    {!isLoading && !error && (data?.messages?.length ?? 0) >= fetchedCount && (
                      <div className="flex justify-center py-6">
                        <button
                          onClick={() => setFetchedCount((n) => n + 10)}
                          disabled={isFetching}
                          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-zinc-100 border border-zinc-600 rounded-full bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-400 hover:text-white transition-colors disabled:opacity-40"
                        >
                          {isFetching
                            ? <Loader2 size={14} className="animate-spin" />
                            : <ChevronDown size={14} />}
                          Load more
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <MailInsightPanel />
              </>
            )}
          </div>
        </div>

        {composing && (
          <ComposeModal
            onClose={() => setComposing(false)}
            onSwitchToAI={() => {
              setComposing(false);
              setChatMode(true);
            }}
            senders={senders}
          />
        )}
      </div>
    </Tooltip.Provider>
  );
}
