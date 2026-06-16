'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Mail, Calendar, LogOut, LayoutDashboard, Plug, CreditCard } from 'lucide-react';
import { signOut } from '@/lib/auth-client';
import { UsagePill } from './usage-pill';

type User = { id: string; name: string; email: string; image?: string | null };

type NavItem = {
  href:         string;
  label:        string;
  icon:         React.ElementType | null;
  imgSrc?:      string;
  lightImgSrc?: string;
  dot?:         string;
  isNew?:       boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard/overview',      label: 'Overview',     icon: LayoutDashboard, dot: 'bg-blue-400',  isNew: true  },
  { href: '/dashboard/mail',          label: 'Mail',         icon: Mail,            dot: 'bg-blue-400'               },
  { href: '/dashboard/calendar',      label: 'Calendar',     icon: Calendar,        dot: 'bg-blue-400'               },
  { href: '/dashboard/integrations',  label: 'Integrations', icon: Plug,            dot: 'bg-blue-400'               },
  { href: '/dashboard/chat',          label: 'Agentic',      icon: null, imgSrc: '/openai.png', lightImgSrc: '/openai-dark.png', dot: 'bg-green-400', isNew: true },
  { href: '/dashboard/billing',       label: 'Billing',      icon: CreditCard,      dot: 'bg-blue-400'               },
];

export function SidebarNav({ user }: { user: User }) {
  const pathname = usePathname();
  const router   = useRouter();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <nav className="w-52 shrink-0 flex flex-col h-full bg-black border-r border-zinc-800/70">

      {/* Logo */}
      <div className="px-4 h-14 flex items-center gap-2.5 border-b border-zinc-800/70">
        <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center shadow-sm">
          <span className="text-black text-xs font-black tracking-tight">Y</span>
        </div>
        <span className="font-semibold text-sm tracking-tight">Yugati</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon, imgSrc, lightImgSrc, dot, isNew }) => {
          const imgOpacity = (active: boolean) => active ? 'opacity-100' : 'opacity-40 group-hover:opacity-70';
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${active
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
            >
              {imgSrc ? (
                <span className="relative shrink-0 w-[15px] h-[15px]">
                  <Image src={imgSrc} alt={label} width={15} height={15}
                    className={`nav-img-dark absolute inset-0 w-full h-full object-contain ${imgOpacity(active)}`} />
                  {lightImgSrc && (
                    <Image src={lightImgSrc} alt={label} width={15} height={15}
                      className={`nav-img-light absolute inset-0 w-full h-full object-contain ${imgOpacity(active)}`} />
                  )}
                </span>
              ) : Icon ? (
                <Icon
                  size={15}
                  className={active ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400 transition-colors'}
                />
              ) : null}
              {label}
              {isNew && (
                <span className="ml-auto text-[9px] font-semibold tracking-wide px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 leading-none">
                  NEW
                </span>
              )}
              {active && (
                <span className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${dot ?? 'bg-blue-400'} ${dot === 'bg-green-400' ? 'shadow-[0_0_4px_1px_rgba(74,222,128,0.5)]' : ''}`} />
              )}
            </Link>
          );
        })}
      </div>

      {/* Usage pill */}
      <div className="px-3 pb-3">
        <UsagePill />
      </div>

      {/* User */}
      <div className="p-3 border-t border-zinc-800/70">
        <div className="flex items-center gap-2.5 mb-3">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name}
              width={30}
              height={30}
              className="w-7.5 h-7.5 rounded-full shrink-0 ring-1 ring-zinc-700"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold shrink-0">
              {user.name[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate text-zinc-200">{user.name}</p>
            <p className="text-[11px] text-zinc-600 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push('/') } })}
          className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-300 transition-colors w-full px-1"
        >
          <LogOut size={12} />
          Sign out
        </button>
      </div>
    </nav>
  );
}
