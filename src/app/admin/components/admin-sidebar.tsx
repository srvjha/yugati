'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, MessageSquare, Shield, CreditCard, Monitor, Sparkles, LogOut, Activity, ArrowLeft } from 'lucide-react';
import { signOut } from '@/lib/auth-client';
import { ThemeToggle } from '@/components/theme-toggle';

const NAV = [
  { href: '/admin/overview',  label: 'Overview',    icon: LayoutDashboard, color: 'text-blue-400'   },
  { href: '/admin/users',     label: 'Users',        icon: Users,           color: 'text-emerald-400' },
  { href: '/admin/prompts',   label: 'Prompt Logs',  icon: MessageSquare,   color: 'text-amber-400'  },
  { href: '/admin/security',  label: 'Security',     icon: Shield,          color: 'text-red-400'    },
  { href: '/admin/plans',     label: 'Plans & Rev',  icon: CreditCard,      color: 'text-cyan-400'   },
  { href: '/admin/sessions',  label: 'Sessions',     icon: Monitor,         color: 'text-zinc-400'   },
  { href: '/admin/insights',  label: 'AI Insights',  icon: Sparkles,        color: 'text-green-400'  },
];

export function AdminSidebar({ user }: { user: { name: string; email: string; image: string | null } }) {
  const pathname = usePathname();
  const router   = useRouter();

  return (
    <nav className="w-52 shrink-0 flex flex-col h-full bg-black border-r border-zinc-800/70">
      <div className="px-4 h-14 flex items-center gap-2.5 border-b border-zinc-800/70">
        <div className="w-6 h-6 rounded-md bg-red-500 flex items-center justify-center shadow-sm shrink-0">
          <Activity size={12} className="text-white" />
        </div>
        <span className="font-semibold text-sm tracking-tight">Admin</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/25 tracking-wide">INTERNAL</span>
      </div>

      <div className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {/* Back to app */}
        <Link href="/dashboard/mail"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all mb-2 group"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Mail
        </Link>
        <div className="h-px bg-zinc-800/60 mx-1 mb-2" />
        {NAV.map(({ href, label, icon: Icon, color }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href}
              className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${active ? 'bg-zinc-800/80 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
            >
              <Icon size={15} className={active ? color : 'text-zinc-600 group-hover:text-zinc-400 transition-colors'} />
              {label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />}
            </Link>
          );
        })}
      </div>

      <div className="p-3 border-t border-zinc-800/70">
        <div className="flex items-center gap-2.5 mb-3">
          {user.image ? (
            <Image src={user.image} alt={user.name} width={28} height={28} className="rounded-full ring-1 ring-zinc-700 shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold shrink-0">
              {user.name[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate text-zinc-200">{user.name}</p>
            <p className="text-[11px] text-red-400 truncate font-medium">Administrator</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push('/') } })}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors px-1"
          >
            <LogOut size={12} /> Sign out
          </button>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
