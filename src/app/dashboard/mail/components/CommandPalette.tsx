"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Command } from "lucide-react";
import { PALETTE_ACTIONS } from "../constants";

export function CommandPalette({
  onClose,
  onAction,
}: {
  onClose: () => void;
  onAction: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
          <kbd className="text-[10px] text-zinc-700 font-mono border border-zinc-800 px-1.5 py-0.5">
            ESC
          </kbd>
        </div>
        <div className="py-1 max-h-64 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-xs text-zinc-600 text-center">
              No commands found
            </p>
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
          <span className="ml-auto flex items-center gap-1">
            <Command size={9} />K to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
