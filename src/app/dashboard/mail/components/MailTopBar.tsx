"use client";

import { useState, useRef, useEffect } from "react";
import {
  Mail,
  RefreshCw,
  Trash2,
  Search,
  X,
  Command,
  Users,
  Tag,
  ChevronDown,
  SlidersHorizontal,
  Sparkles,
  Menu,
} from "lucide-react";
import { LABEL_FILTERS } from "../constants";
import type { Sender } from "../types";
import { TooltipWrap } from "./TooltipWrap";
import { MovingBorder } from "@/components/ui/moving-border";

function DropdownMenu({
  trigger,
  children,
}: {
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap
          ${open
            ? "text-white bg-zinc-800 rounded-lg"
            : "text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-lg"
          }`}
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

export function MailTopBar({
  chatMode,
  onModeChange,
  searchQuery,
  onSearch,
  isFetching,
  onRefresh,
  showRefresh,
  unreadOnly,
  onToggleUnread,
  onOpenPalette,
  selectedCount,
  onDeleteSelected,
  senders,
  onOpenSidebar,
}: {
  chatMode: boolean;
  onModeChange: (v: boolean) => void;
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
  onOpenSidebar?: () => void;
}) {
  return (
    <header className="h-14 shrink-0 border-b border-zinc-800/70 px-4 flex items-center gap-3">

      {/* Mobile hamburger */}
      <button
        onClick={onOpenSidebar}
        className="md:hidden p-1.5 -ml-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
      >
        <Menu size={18} />
      </button>

      {/* Mode toggle */}
      <div data-tour="mode-toggle" className="relative overflow-hidden rounded-lg p-px shrink-0">
        <div className="absolute inset-0 rounded-lg">
          <MovingBorder duration={2500} rx="30%" ry="30%">
            <div className="yugati-mode-glow h-14 w-14 opacity-80" />
          </MovingBorder>
        </div>
        <div className="relative flex items-center gap-0.5 bg-zinc-900 rounded-[7px] p-0.5">
          <button
            onClick={() => onModeChange(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all
              ${chatMode ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <Sparkles size={11} />
            Agentic
            {chatMode && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_1px_rgba(74,222,128,0.5)]" />}
          </button>
          <button
            onClick={() => onModeChange(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all
              ${!chatMode ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <Mail size={11} />
            Manual
          </button>
        </div>
      </div>

      {/* Right side: search + action buttons */}
      <div className="ml-auto flex items-center gap-2">
        {showRefresh && (
          <TooltipWrap label="Refresh">
            <button
              onClick={onRefresh}
              disabled={isFetching}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-30"
            >
              <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
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
            <div data-tour="search-bar" className="relative w-36 sm:w-44 md:w-56">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search emails…"
                className="w-full bg-white/4 backdrop-blur-md border border-white/6 pl-8 pr-8 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 rounded-lg
                  focus:outline-none focus:bg-white/[0.07] focus:border-white/12 transition-all duration-200"
              />
              {searchQuery ? (
                <button onClick={() => onSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300">
                  <X size={12} />
                </button>
              ) : (
                <button onClick={onOpenPalette} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-zinc-400 transition-colors">
                  <Command size={11} />
                </button>
              )}
            </div>

            {/* Senders dropdown */}
            <div className="hidden lg:block">
              <DropdownMenu trigger={<span className="flex items-center gap-1.5"><Users size={11} />Senders</span>}>
                {(close) => (
                  <div className="py-1 min-w-55">
                    <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Filter by sender</p>
                    {senders.length === 0 && (
                      <p className="px-3 py-3 text-xs text-zinc-600 text-center">No emails loaded yet</p>
                    )}
                    {senders.map((s) => (
                      <button key={s.email} onClick={() => { onSearch(`from:${s.email}`); close(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800 transition-colors text-left">
                        <div className="w-6 h-6 bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0 uppercase">
                          {s.name[0] ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-300 truncate font-medium">{s.name}</p>
                          <p className="text-[10px] text-zinc-600 truncate">{s.email}</p>
                        </div>
                        <span className="text-[10px] text-zinc-700 shrink-0">{s.count}</span>
                      </button>
                    ))}
                    {searchQuery.startsWith("from:") && (
                      <div className="border-t border-zinc-800 mt-1 pt-1">
                        <button onClick={() => { onSearch(""); close(); }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                          <X size={11} /> Clear filter
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </DropdownMenu>
            </div>

            {/* Labels + Quick Filters */}
            <div className="hidden xl:flex items-center gap-2">
              <DropdownMenu trigger={<span className="flex items-center gap-1.5"><Tag size={11} />Labels<ChevronDown size={10} /></span>}>
                {(close) => (
                  <div className="py-1 min-w-47.5">
                    <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Filter by label</p>
                    {LABEL_FILTERS.map((f) => {
                      const Icon = f.icon;
                      const active = searchQuery === f.q;
                      return (
                        <button key={f.q} onClick={() => { onSearch(active ? "" : f.q); close(); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left
                            ${active ? "bg-blue-500/10 text-blue-400" : "hover:bg-zinc-800 text-zinc-300"}`}>
                          <Icon size={12} className={active ? "text-blue-400" : "text-zinc-600"} />
                          <span className="text-xs">{f.label}</span>
                          {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </DropdownMenu>

              <DropdownMenu trigger={
                <span className={`flex items-center gap-1.5 ${unreadOnly ? "text-blue-400" : ""}`}>
                  <SlidersHorizontal size={11} />Quick Filters<ChevronDown size={10} />
                </span>
              }>
                {(close) => {
                  const QUICK = [
                    { label: "Unread only",   action: () => { onToggleUnread(); close(); },                    active: unreadOnly },
                    { label: "Read only",      action: () => { onSearch("is:read"); close(); },                active: searchQuery === "is:read" },
                    { label: "Starred",        action: () => { onSearch("is:starred"); close(); },             active: searchQuery === "is:starred" },
                    { label: "Has attachment", action: () => { onSearch("has:attachment"); close(); },         active: searchQuery === "has:attachment" },
                    { label: "Last 7 days",    action: () => { onSearch("newer_than:7d"); close(); },          active: searchQuery === "newer_than:7d" },
                    { label: "Needs reply",    action: () => { onSearch("is:unread is:important"); close(); }, active: searchQuery === "is:unread is:important" },
                  ];
                  return (
                    <div className="py-1 min-w-45">
                      <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Quick filters</p>
                      {QUICK.map((q) => (
                        <button key={q.label} onClick={q.action}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left
                            ${q.active ? "bg-blue-500/10 text-blue-400" : "hover:bg-zinc-800 text-zinc-300"}`}>
                          {q.label}
                          {q.active && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                        </button>
                      ))}
                      {(unreadOnly || searchQuery) && (
                        <div className="border-t border-zinc-800 mt-1 pt-1">
                          <button onClick={() => { if (unreadOnly) onToggleUnread(); onSearch(""); close(); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
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
