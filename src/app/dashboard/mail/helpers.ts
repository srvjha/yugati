import { MONTH_NAMES } from "./constants";
import type { EmailMsg } from "./types";

export function getHeader(msg: EmailMsg, name: string) {
  return (
    (msg.payload?.headers ?? []).find(
      (h) => h.name?.toLowerCase() === name.toLowerCase(),
    )?.value ?? ""
  );
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getGroupLabel(internalDate: string | null | undefined): string {
  if (!internalDate) return "Earlier";
  const d = new Date(Number(internalDate));
  const now = new Date();
  if (isSameDay(d, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, yesterday)) return "Yesterday";
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTimestamp(internalDate: string | null | undefined): string {
  if (!internalDate) return "";
  const d = new Date(Number(internalDate));
  if (isSameDay(d, new Date())) {
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function decodeEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, c: string) => String.fromCharCode(Number(c)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}
