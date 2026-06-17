"use client";

import Image from "next/image";
import Link from "next/link";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { signOut } from "@/lib/auth-client";
import { UsagePill } from "../../components/usage-pill";
import {
  Pencil,
  Mail,
  MailMinus,
  Calendar,
  Blocks,
  CreditCard,
  Settings,
  SlidersHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
  LogOut,
} from "lucide-react";
import { SIDEBAR_FOLDERS, type SidebarFolder } from "../constants";
import { TooltipWrap } from "./TooltipWrap";

function ModeBtn({
  active,
  onClick,
  icon,
  label,
  color,
  collapsed,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: "blue" | "green";
  collapsed: boolean;
}) {
  const dotColor = color === "green" ? "bg-green-400" : "bg-blue-400";
  const iconColor = color === "green" ? "text-green-400" : "text-blue-400";
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 overflow-visible
        ${collapsed ? "flex-none w-9 justify-center px-0" : "flex-1 justify-center px-1.5"}
        ${active ? "bg-zinc-700/80 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"}`}
    >
      <span className={`shrink-0 ${active ? iconColor : "opacity-50"}`}>
        {icon}
      </span>
      <span
        className={`whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out
        ${collapsed ? "max-w-0 opacity-0 overflow-hidden" : "max-w-full opacity-100"}`}
      >
        {label}
      </span>
      {active && !collapsed && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor} ${color === "green" ? "shadow-[0_0_4px_1px_rgba(74,222,128,0.5)]" : ""}`}
        />
      )}
    </button>
  );
}

function NavItem({
  icon: Icon,
  label,
  active = false,
  collapsed,
  onClick,
  href,
  badge,
  isNew,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  collapsed: boolean;
  onClick?: () => void;
  href?: string;
  badge?: number;
  isNew?: boolean;
}) {
  const cls = `mx-1.5 flex items-center gap-2.5 px-2 py-2.5 text-xs font-medium rounded-lg transition-colors text-left overflow-hidden
    ${active ? "bg-zinc-800 text-white" : "text-zinc-200 hover:text-white hover:bg-zinc-900"}
    ${collapsed ? "justify-center" : ""}`;

  const inner = (
    <>
      <Icon
        size={15}
        className={`shrink-0 ${active ? "text-blue-400" : "text-zinc-400"}`}
      />
      <span
        className={`flex-1 whitespace-nowrap overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out
        ${collapsed ? "max-w-0 opacity-0" : "max-w-full opacity-100"}`}
      >
        {label}
      </span>
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="ml-auto text-[10px] font-semibold bg-zinc-700/80 text-zinc-300 px-1.5 py-0.5 min-w-5 text-center rounded-md">
          {badge > 99 ? "99+" : badge}
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
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );

  if (collapsed)
    return (
      <TooltipWrap label={label} side="right">
        {wrapped}
      </TooltipWrap>
    );
  return wrapped;
}

export function MailSidebar({
  collapsed,
  onCollapse,
  chatMode,
  onModeChange,
  activeFolder,
  onFolderChange,
  user,
  onCompose,
  unreadCount,
  showSubscriptions,
  onSubscriptions,
  onSummarize,
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
        ${collapsed ? "w-14" : "w-52"}`}
    >
      {/* Logo + collapse */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-zinc-800/70 shrink-0">
        <div
          className={`flex items-center gap-2 overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out
          ${collapsed ? "max-w-0 opacity-0" : "max-w-full opacity-100"}`}
        >
          <div className="w-6 h-6 bg-white flex items-center justify-center shadow-sm shrink-0">
            <span className="text-black text-xs font-black">Y</span>
          </div>
          <span className="font-semibold text-sm tracking-tight whitespace-nowrap">
            Yugati
          </span>
        </div>
        <TooltipWrap
          label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          side="right"
        >
          <button
            onClick={() => onCollapse(!collapsed)}
            className={`p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors ${collapsed ? "mx-auto" : ""}`}
          >
            {collapsed ? (
              <PanelLeftOpen size={15} />
            ) : (
              <PanelLeftClose size={15} />
            )}
          </button>
        </TooltipWrap>
      </div>

      {/* Compose */}
      <div className="px-2 pt-3 pb-1 shrink-0">
        <TooltipWrap label="Compose" side="right" disabled={!collapsed}>
          <button
            onClick={onCompose}
            className={`flex items-center gap-2.5 bg-white text-black font-medium text-sm hover:bg-zinc-100 rounded-xl transition-colors
              ${collapsed ? "w-10 h-10 justify-center mx-auto" : "px-4 py-2.5 w-full"}`}
          >
            <Pencil size={14} className="shrink-0" />
            <span
              className={`whitespace-nowrap overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out
              ${collapsed ? "max-w-0 opacity-0" : "max-w-full opacity-100"}`}
            >
              Compose
            </span>
          </button>
        </TooltipWrap>
      </div>

      {/* Mode toggle */}
      <div className="px-2 pb-3 pt-2 shrink-0">
        <div className="flex items-center gap-0.5">
          <ModeBtn
            active={!chatMode}
            onClick={() => onModeChange(false)}
            icon={<Mail size={12} />}
            label="Manual"
            color="blue"
            collapsed={collapsed}
          />
          <ModeBtn
            active={chatMode}
            onClick={() => onModeChange(true)}
            icon={
              <Image
                src="/openai.png"
                alt="OpenAI"
                width={16}
                height={16}
                className="rounded-sm"
              />
            }
            label="Agentic"
            color="green"
            collapsed={collapsed}
          />
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
              badge={f.id === "inbox" ? unreadCount : undefined}
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

          <NavItem
            icon={SlidersHorizontal}
            label="Overview"
            collapsed={collapsed}
            href="/dashboard/overview"
            isNew
          />
          <NavItem
            icon={Calendar}
            label="Calendar"
            collapsed={collapsed}
            href="/dashboard/calendar"
          />
          <NavItem
            icon={Blocks}
            label="Integrations"
            collapsed={collapsed}
            href="/dashboard/integrations"
          />
          <NavItem
            icon={CreditCard}
            label="Billing"
            collapsed={collapsed}
            href="/dashboard/billing"
          />
          <NavItem
            icon={Settings}
            label="Settings"
            collapsed={collapsed}
            href="/dashboard/settings"
          />

          {/* Ambient AI status — clickable */}
          {!collapsed && unreadCount > 0 && (
            <button
              onClick={onSummarize}
              className="mx-3 mt-3 px-3 py-2.5 bg-white/4 border border-white/8 hover:bg-white/[0.07] hover:border-white/15 rounded-xl transition-colors text-left w-[calc(100%-24px)]"
            >
              <div className="flex items-center gap-2">
                <Zap size={11} className="text-zinc-300 shrink-0" />
                <span className="text-[11px] text-zinc-200 font-medium">
                  {unreadCount} unread email{unreadCount !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5 ml-4.75">
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
      <div
        className={`shrink-0 px-2 pb-2 ${collapsed ? "flex justify-center" : ""}`}
      >
        <UsagePill collapsed={collapsed} />
      </div>

      {/* User footer */}
      <div className="shrink-0 border-t border-zinc-800/70 p-2">
        {collapsed ? (
          <TooltipWrap label={user?.email ?? ""} side="right">
            <button
              onClick={() =>
                signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      window.location.href = "/";
                    },
                  },
                })
              }
              className="w-10 h-10 mx-auto flex items-center justify-center"
            >
              {user?.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? ""}
                  width={28}
                  height={28}
                  className="rounded-full ring-1 ring-zinc-700"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold">
                  {user?.name?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}
            </button>
          </TooltipWrap>
        ) : (
          <div className="flex items-center gap-2.5 px-1">
            {user?.image ? (
              <Image
                src={user.image}
                alt={user.name ?? ""}
                width={28}
                height={28}
                className="rounded-full shrink-0 ring-1 ring-zinc-700"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-200 truncate">
                {user?.name}
              </p>
              <p className="text-[10px] text-zinc-600 truncate">
                {user?.email}
              </p>
            </div>
            <TooltipWrap label="Sign out" side="top">
              <button
                onClick={() =>
                  signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        window.location.href = "/";
                      },
                    },
                  })
                }
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
