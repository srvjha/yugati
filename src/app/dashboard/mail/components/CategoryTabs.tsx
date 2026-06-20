"use client";

import { INBOX_TABS, type InboxTab } from "../constants";

const TAB_BADGE: Record<string, string> = {
  all:        "bg-zinc-600",
  primary:    "bg-blue-500",
  promotions: "bg-emerald-500",
  social:     "bg-violet-500",
  updates:    "bg-orange-500",
};

export function CategoryTabs({
  activeTab,
  onTabChange,
  counts,
}: {
  activeTab: InboxTab;
  onTabChange: (t: InboxTab) => void;
  counts?: Record<string, number>;
}) {
  return (
    <div className="flex items-center border-b border-zinc-800/60 px-2 shrink-0 overflow-x-auto">
      {INBOX_TABS.map((tab) => {
        const count = counts?.[tab.id] ?? 0;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors
              ${activeTab === tab.id ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            {tab.label}
            {count > 0 && (
              <span className={`tab-badge text-[11px] font-semibold px-1.5 py-1 rounded-full leading-none ${TAB_BADGE[tab.id] ?? "bg-zinc-500"}`} style={{ color: '#ffffff' }}>
                {count > 99 ? "99+" : count} new
              </span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}
