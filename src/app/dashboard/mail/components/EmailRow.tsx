"use client";

import { useState } from "react";
import { Trash2, Square, SquareCheck } from "lucide-react";
import type { EmailMsg } from "../types";
import { getHeader, formatTimestamp, decodeEntities } from "../helpers";

export function EmailRow({
  msg,
  selected,
  active,
  onSelect,
  onOpen,
  onDelete,
}: {
  msg: EmailMsg;
  selected: boolean;
  active: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const subject  = getHeader(msg, "subject") || "(no subject)";
  const from     = getHeader(msg, "from");
  const fromName = from.replace(/<[^>]+>/, "").trim() || from;
  const isUnread = msg.labelIds?.includes("UNREAD") ?? false;
  const time     = formatTimestamp(msg.internalDate);

  return (
    <div
      className={`relative flex items-center border-b border-zinc-800/40 transition-colors overflow-hidden cursor-pointer
        ${active
          ? "bg-zinc-800/70 border-l-2 border-l-blue-500"
          : selected
            ? "bg-zinc-900/40 hover:bg-zinc-900/60"
            : isUnread
              ? "bg-white/2.5 hover:bg-zinc-900/50"
              : "hover:bg-zinc-900/50"
        }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
    >
      {/* Checkbox — stops propagation so it doesn't open the email */}
      <div className="w-9 shrink-0 flex items-center justify-center py-3">
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={`transition-opacity text-zinc-500 hover:text-zinc-200 ${hovered || selected ? "opacity-100" : "opacity-0"}`}
        >
          {selected ? (
            <SquareCheck size={14} className="text-blue-400" />
          ) : (
            <Square size={14} />
          )}
        </button>
      </div>

      {/* Row content */}
      <div className="min-w-0 flex-1 flex items-center py-3 pl-1">
        <p className={`w-28 sm:w-32 shrink-0 truncate text-sm pr-3 ${
          isUnread ? "font-semibold text-white" : "font-medium text-zinc-400"
        }`}>
          {fromName}
        </p>
        <p className="min-w-0 flex-1 truncate break-all text-sm text-zinc-500">
          <span className={isUnread ? "font-semibold text-white" : "text-zinc-300"}>
            {subject}
          </span>
          {msg.snippet && (
            <span>
              {" — "}
              {decodeEntities(msg.snippet).replace(/\s*\.{3}\s*$|\s*…\s*$/, "")}
            </span>
          )}
        </p>
      </div>

      {/* Date / Trash */}
      <div className="w-13 shrink-0 flex items-center justify-end pr-2 relative">
        <span className={`text-xs transition-opacity ${hovered ? "opacity-0" : "opacity-100"} ${
          isUnread ? "font-medium text-zinc-200" : "text-zinc-500"
        }`}>
          {time}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className={`absolute left-0.5 transition-opacity ${hovered ? "opacity-100" : "opacity-0"} text-zinc-500 hover:text-red-400`}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
