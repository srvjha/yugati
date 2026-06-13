'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Mail, Calendar, LogOut, Plug } from 'lucide-react';
import { signOut } from '@/lib/auth-client';

type User = { id: string; name: string; email: string; image?: string | null };

const NAV = [
  { href: '/dashboard/mail',     label: 'Mail',     icon: Mail     },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
] as const;

export function SidebarNav({ user }: { user: User }) {
  const pathname = usePathname();
  const router   = useRouter();

  return (
    <nav className="w-56 shrink-0 border-r border-zinc-800 flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 h-14 flex items-center gap-2.5 border-b border-zinc-800">
        <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
          <span className="text-black text-xs font-bold">S</span>
        </div>
        <span className="font-semibold text-sm">SuperAI</span>
      </div>

      {/* Nav links */}
      <div className="flex-1 py-3 px-2 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                ${active
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Integrations */}
      <div className="px-3 pb-2">
        <p className="px-2 text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1">Integrations</p>
        <a
          href="/api/corsair/connect?plugin=gmail"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-800/50 transition-colors"
        >
          <Plug size={14} />
          Connect Gmail
        </a>
        <a
          href="/api/corsair/connect?plugin=googlecalendar"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-800/50 transition-colors"
        >
          <Plug size={14} />
          Connect Calendar
        </a>
      </div>

      {/* User */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 mb-3">
          {user.image ? (
            <Image src={user.image} alt={user.name} width={32} height={32} className="w-8 h-8 rounded-full shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-medium shrink-0">
              {user.name[0]}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push('/') } })}
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors w-full"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </nav>
  );
}
