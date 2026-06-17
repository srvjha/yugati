"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, Square, SquareCheck } from "lucide-react";
import type { EmailMsg } from "../types";
import { getHeader, formatTimestamp, decodeEntities } from "../helpers";

export function EmailRow({
  msg,
  selected,
  onSelect,
  onDelete,
}: {
  msg: EmailMsg;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const subject = getHeader(msg, "subject") || "(no subject)";
  const from = getHeader(msg, "from");
  const fromName = from.replace(/<[^>]+>/, "").trim() || from;
  const isUnread = msg.labelIds?.includes("UNREAD") ?? false;
  const time = formatTimestamp(msg.internalDate);

  return (
    <div
      className={`relative flex items-center border-b border-zinc-800/40 hover:bg-zinc-900/50 transition-colors overflow-hidden
        ${selected ? "bg-zinc-900/40" : isUnread ? "bg-white/2.5" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox */}
      <div className="w-9 shrink-0 flex items-center justify-center py-3">
        <button
          onClick={onSelect}
          className={`transition-opacity text-zinc-500 hover:text-zinc-200 ${hovered || selected ? "opacity-100" : "opacity-0"}`}
        >
          {selected ? (
            <SquareCheck size={14} className="text-blue-400" />
          ) : (
            <Square size={14} />
          )}
        </button>
      </div>

      {/* Link — fills all remaining space between checkbox and date column */}
      <Link
        href={`/dashboard/mail/${msg.id}`}
        className="min-w-0 flex-1 flex items-center py-3 pl-1"
      >
        {/* Sender — responsive fixed width */}
        <p
          className={`w-28 sm:w-36 lg:w-44 shrink-0 truncate text-sm pr-4 ${
            isUnread ? "font-semibold text-white" : "font-medium text-zinc-400"
          }`}
        >
          {fromName}
        </p>
        {/* Strip trailing Gmail ellipsis (… or ...) so the gap before the date disappears.
            CSS text-overflow only fires when the cleaned text itself overflows. */}
        <p className="min-w-0 flex-1 truncate break-all text-sm text-zinc-500">
          <span
            className={isUnread ? "font-semibold text-white" : "text-zinc-300"}
          >
            {subject}
          </span>
          {msg.snippet && (
            <span>
              {" — "}
              {decodeEntities(msg.snippet).replace(/\s*\.{3}\s*$|\s*…\s*$/, "")}
            </span>
          )}
        </p>
      </Link>

      {/* Date / Trash — fixed width OUTSIDE the link, always visible */}
      <div className="w-13 shrink-0 flex items-center justify-end pr-2 relative">
        <span
          className={`text-xs transition-opacity ${hovered ? "opacity-0" : "opacity-100"} ${
            isUnread ? "font-medium text-zinc-200" : "text-zinc-500"
          }`}
        >
          {time}
        </span>
        <button
          onClick={onDelete}
          className={`absolute left-0.5 transition-opacity ${hovered ? "opacity-100" : "opacity-0"} text-zinc-500 hover:text-red-400`}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
