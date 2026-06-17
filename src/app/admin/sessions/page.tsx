'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC }  from '@/trpc/client';
import { Monitor, Globe, ChevronLeft, ChevronRight, Smartphone, Laptop, Compass } from 'lucide-react';
import Image from 'next/image';

function parseUA(ua: string): { browser: string; os: string; device: 'mobile' | 'tablet' | 'desktop' } {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'desktop' };

  const browser =
    /Edg/i.test(ua)                              ? 'Edge'    :
    /Chrome/i.test(ua) && !/Chromium/i.test(ua)  ? 'Chrome'  :
    /Safari/i.test(ua) && !/Chrome/i.test(ua)    ? 'Safari'  :
    /Firefox/i.test(ua)                           ? 'Firefox' :
    /Opera|OPR/i.test(ua)                         ? 'Opera'   : 'Other';

  const os =
    /Windows NT 10/i.test(ua) ? 'Windows 11/10' :
    /Windows NT 6/i.test(ua)  ? 'Windows'       :
    /Mac OS X/i.test(ua)      ? 'macOS'          :
    /Android/i.test(ua)       ? 'Android'        :
    /iPhone|iPad/i.test(ua)   ? 'iOS'            :
    /Linux/i.test(ua)         ? 'Linux'          : 'Unknown';

  const device: 'mobile' | 'tablet' | 'desktop' =
    /iPhone/i.test(ua)  ? 'mobile'  :
    /iPad/i.test(ua)    ? 'tablet'  :
    /Android/i.test(ua) ? 'mobile'  : 'desktop';

  return { browser, os, device };
}

function fmtDate(d: Date | string) {
  const dt = new Date(d);
  const day   = dt.getDate().toString().padStart(2, '0');
  const month = (dt.getMonth() + 1).toString().padStart(2, '0');
  const year  = dt.getFullYear().toString().slice(2);
  const time  = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day}/${month}/${year}, ${time}`;
}

const DeviceIcon = ({ type }: { type: 'mobile' | 'tablet' | 'desktop' }) => {
  if (type === 'mobile' || type === 'tablet') return <Smartphone size={11} className="text-zinc-500" />;
  return <Laptop size={11} className="text-zinc-500" />;
};

export default function AdminSessionsPage() {
  const trpc = useTRPC();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery(trpc.admin.listSessions.queryOptions({ page, limit: 30 }));

  return (
    <div className="h-full overflow-y-auto bg-black">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Monitor size={18} className="text-zinc-400" /> Active Sessions</h1>
          <p className="text-xs text-zinc-500">{data?.total ?? 0} live</p>
        </div>

        <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 text-xs text-zinc-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Device</th>
                <th className="text-left px-4 py-3 font-medium">Browser · OS</th>
                <th className="text-left px-4 py-3 font-medium">IP Address</th>
                <th className="text-left px-4 py-3 font-medium">Started</th>
                <th className="text-left px-4 py-3 font-medium">Expires</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-zinc-900">
                      {[1,2,3,4,5,6].map(j => <td key={j} className="px-5 py-3"><div className="h-4 bg-zinc-900 rounded animate-pulse w-24" /></td>)}
                    </tr>
                  ))
                : (data?.sessions ?? []).map(s => {
                    const ua = parseUA(s.userAgent ?? '');
                    return (
                      <tr key={s.id} className="border-b border-zinc-900/60 hover:bg-zinc-900/40 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {s.user?.image
                              ? <Image src={s.user.image} alt={s.user.name ?? ''} width={24} height={24} className="rounded-full shrink-0" />
                              : <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-semibold text-zinc-400 shrink-0">{s.user?.name?.[0]?.toUpperCase() ?? '?'}</div>
                            }
                            <div>
                              <p className="text-xs text-zinc-200 whitespace-nowrap">{s.user?.name ?? '—'}</p>
                              <p className="text-[11px] text-zinc-600 whitespace-nowrap">{s.user?.email ?? ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <DeviceIcon type={ua.device} />
                            <span className="text-xs text-zinc-400 capitalize whitespace-nowrap">{ua.device}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Compass size={11} className="text-zinc-600 shrink-0" />
                            <span className="text-xs text-zinc-400 whitespace-nowrap">{ua.browser} · {ua.os}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {s.ipAddress
                            ? <span className="flex items-center gap-1 text-xs font-mono text-zinc-400 whitespace-nowrap"><Globe size={10} className="text-zinc-600" />{s.ipAddress}</span>
                            : <span className="text-zinc-700 text-xs">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{fmtDate(s.createdAt)}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{fmtDate(s.expiresAt)}</td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>

        {(data?.pages ?? 1) > 1 && (
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Page {page} of {data?.pages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 border border-zinc-800 rounded-lg disabled:opacity-30 hover:border-zinc-600 transition-colors"><ChevronLeft size={13} /></button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= (data?.pages ?? 1)} className="p-1.5 border border-zinc-800 rounded-lg disabled:opacity-30 hover:border-zinc-600 transition-colors"><ChevronRight size={13} /></button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
