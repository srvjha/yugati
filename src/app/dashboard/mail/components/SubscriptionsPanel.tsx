"use client";

import { useState } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { RefreshCw, MailMinus, ExternalLink } from "lucide-react";
import type { Subscription } from "@/features/manual/gmail/service";

export function SubscriptionsPanel({
  subscriptions,
  isLoading,
  onRefresh,
  onUnsubscribeEmail,
  pendingEmail,
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
      window.open(s.httpsUrl, "_blank", "noopener,noreferrer");
      setDismissed((d) => new Set([...d, s.domain]));
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-800/50 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">
            Manage subscriptions
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Mailing lists detected in your inbox — unsubscribe in one click
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <ScrollArea.Root className="flex-1 overflow-hidden">
        <ScrollArea.Viewport className="h-full w-full">
          {isLoading && (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-5 py-3.5 border-b border-zinc-800/30 animate-pulse"
                >
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
                <p className="text-xs mt-1">
                  Emails with unsubscribe links will appear here
                </p>
              </div>
            </div>
          )}

          {!isLoading &&
            visible.map((s) => {
              const isPending = pendingEmail === s.mailtoUrl;
              const initial = (
                s.senderName[0] ??
                s.domain[0] ??
                "?"
              ).toUpperCase();
              return (
                <div
                  key={s.domain}
                  className="flex items-center gap-3 px-5 py-3.5 border-b border-zinc-800/30 hover:bg-zinc-900/40 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {s.senderName}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {s.senderEmail}
                    </p>
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
                      {isPending ? "Sending…" : "Unsubscribe"}
                    </button>
                  </div>
                </div>
              );
            })}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          orientation="vertical"
          className="flex w-1.5 p-0.5"
        >
          <ScrollArea.Thumb className="flex-1 bg-zinc-700 rounded-full" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
