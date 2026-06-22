'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Inbox, Star, Send, FileText, AlertCircle, Trash2, MailMinus,
  Calendar, LogOut, LayoutDashboard, Plug, CreditCard,
  Activity, BookOpen, Settings, Bot,
} from 'lucide-react';
import { signOut } from '@/lib/auth-client';
import { UsagePill } from './usage-pill';
import { ThemeToggle } from '@/components/theme-toggle';

type User = { id: string; name: string; email: string; image?: string | null };

const FOLDERS = [
  { href: '/dashboard/mail?folder=inbox',         label: 'Inbox',                 icon: Inbox      },
  { href: '/dashboard/mail?folder=starred',       label: 'Starred',               icon: Star       },
  { href: '/dashboard/mail?folder=sent',          label: 'Sent',                  icon: Send       },
  { href: '/dashboard/mail?folder=drafts',        label: 'Drafts',                icon: FileText   },
  { href: '/dashboard/mail?folder=spam',          label: 'Spam',                  icon: AlertCircle },
  { href: '/dashboard/mail?folder=trash',         label: 'Trash',                 icon: Trash2     },
  { href: '/dashboard/mail?folder=subscriptions', label: 'Manage subscriptions',  icon: MailMinus  },
] as const;

const NAV_ITEMS: { href: string; label: string; icon: React.ElementType; isNew?: boolean }[] = [
  { href: '/dashboard/overview',     label: 'Overview',     icon: LayoutDashboard, isNew: true },
  { href: '/dashboard/calendar',     label: 'Calendar',     icon: Calendar                     },
  { href: '/dashboard/integrations', label: 'Integrations', icon: Plug                         },
  { href: '/dashboard/chat',         label: 'Agentic',      icon: Bot,             isNew: true },
  { href: '/dashboard/billing',      label: 'Billing',      icon: CreditCard                   },
  { href: '/docs',                   label: 'Docs',         icon: BookOpen                     },
  { href: '/dashboard/settings',     label: 'Settings',     icon: Settings                     },
];

export function SidebarNav({ user, isAdmin }: { user: User; isAdmin?: boolean }) {
  const pathname = usePathname();
  const router   = useRouter();

  function isActive(href: string) {
    const base = href.split('?')[0]!;
    return pathname === base || pathname.startsWith(base + '/');
  }

  const navItemCls = (active: boolean) =>
    `group w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors text-left
    ${active ? 'bg-zinc-800 text-white' : 'text-zinc-200 hover:text-white hover:bg-zinc-900'}`;

  return (
    <nav className="w-56 shrink-0 flex flex-col h-full bg-zinc-950 border-r border-zinc-800/70">

      {/* Logo */}
      <div className="h-14 flex items-center px-3 border-b border-zinc-800/70 shrink-0">
        <Image
          src="https://res.cloudinary.com/sauravjha/image/upload/e_trim/v1782117736/yugati-dark-mode_xsais0.png"
          alt="Yugati" width={480} height={160}
          className="h-7 w-auto object-contain block [html[data-theme='light']_&]:hidden"
        />
        <Image
          src="https://res.cloudinary.com/sauravjha/image/upload/e_trim/v1782117817/yugati-light-mode_sblh0y.png"
          alt="Yugati" width={480} height={160}
          className="h-7 w-auto object-contain hidden [html[data-theme='light']_&]:block"
        />
      </div>

      {/* Scrollable nav */}
      <div className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">

        {/* Mail folders */}
        {FOLDERS.map(({ href, label, icon: Icon }) => {
          const active = pathname === '/dashboard/mail' && isActive(href);
          return (
            <Link key={href} href={href} className={navItemCls(active)}>
              <Icon size={16} className={`shrink-0 ${active ? 'text-blue-400' : 'text-zinc-400'}`} />
              <span className="flex-1 truncate">{label}</span>
            </Link>
          );
        })}

        <div className="mx-2 my-1.5 border-t border-zinc-800/40" />

        {/* Global nav */}
        {NAV_ITEMS.map(({ href, label, icon: Icon, isNew }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} className={navItemCls(active)}>
              <Icon size={16} className={`shrink-0 ${active ? 'text-blue-400' : 'text-zinc-400'}`} />
              <span className="flex-1">{label}</span>
              {isNew && (
                <span className="text-[9px] font-semibold tracking-wide px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 leading-none">
                  NEW
                </span>
              )}
              {active && <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-blue-400" />}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin"
            className={`group flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors
              ${isActive('/admin') ? 'bg-red-500/10 text-red-400' : 'text-red-400/70 hover:text-red-400 hover:bg-red-500/8'}`}
          >
            <Activity size={16} className="text-red-400/80 group-hover:text-red-400 shrink-0 transition-colors" />
            Admin
          </Link>
        )}
      </div>

      {/* Usage pill */}
      <div className="px-2 pb-2">
        <UsagePill />
      </div>

      {/* User footer */}
      <div className="shrink-0 border-t border-zinc-800/70 p-2">
        <div className="flex items-center gap-2.5 px-1">
          {user.image ? (
            <Image src={user.image} alt={user.name} width={28} height={28}
              className="rounded-full shrink-0 ring-1 ring-zinc-700" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold shrink-0">
              {user.name[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-200 truncate">{user.name}</p>
            <p className="text-[10px] text-zinc-600 truncate">{user.email}</p>
          </div>
          <ThemeToggle />
          <button
            onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push('/') } })}
            className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </nav>
  );
}
