import {
  Inbox,
  Star,
  Send,
  FileText,
  AlertCircle,
  Trash2,
  Bot,
  Pencil,
  Calendar,
  Mail,
  Zap,
  Paperclip,
  Tag,
  Users,
  Bell,
} from "lucide-react";

export const INBOX_TABS = [
  { id: "all", label: "All Mail", q: "in:inbox" },
  { id: "primary", label: "Primary", q: "category:primary" },
  { id: "promotions", label: "Promotions", q: "category:promotions" },
  { id: "social", label: "Social", q: "category:social" },
  { id: "updates", label: "Updates", q: "category:updates" },
] as const;
export type InboxTab = (typeof INBOX_TABS)[number]["id"];

export const SIDEBAR_FOLDERS = [
  { id: "inbox", label: "Inbox", icon: Inbox, q: "in:inbox" },
  { id: "starred", label: "Starred", icon: Star, q: "is:starred" },
  { id: "sent", label: "Sent", icon: Send, q: "in:sent" },
  { id: "drafts", label: "Drafts", icon: FileText, q: "in:drafts" },
  { id: "spam", label: "Spam", icon: AlertCircle, q: "in:spam" },
  { id: "trash", label: "Trash", icon: Trash2, q: "in:trash" },
] as const;
export type SidebarFolder = (typeof SIDEBAR_FOLDERS)[number]["id"];

export const PALETTE_ACTIONS = [
  {
    id: "ai",
    label: "Ask AI assistant",
    icon: Bot,
    hint: "Switch to AI chat mode",
  },
  {
    id: "compose",
    label: "Compose new email",
    icon: Pencil,
    hint: "Open compose window",
  },
  {
    id: "calendar",
    label: "Open calendar",
    icon: Calendar,
    hint: "Go to calendar page",
  },
  {
    id: "inbox",
    label: "Go to Inbox",
    icon: Inbox,
    hint: "Return to primary inbox",
  },
  {
    id: "unread",
    label: "Toggle unread only",
    icon: Mail,
    hint: "Filter to unread emails",
  },
] as const;

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const LABEL_FILTERS = [
  { label: "Unread", q: "is:unread", icon: Mail },
  { label: "Starred", q: "is:starred", icon: Star },
  { label: "Important", q: "is:important", icon: Zap },
  { label: "Has attachment", q: "has:attachment", icon: Paperclip },
  { label: "Primary", q: "category:primary", icon: Inbox },
  { label: "Promotions", q: "category:promotions", icon: Tag },
  { label: "Social", q: "category:social", icon: Users },
  { label: "Updates", q: "category:updates", icon: Bell },
] as const;
