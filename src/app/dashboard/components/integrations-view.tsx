'use client';

import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { CheckCircle, Plug, Unplug, RefreshCw, Loader2, AlertCircle, Blocks } from 'lucide-react';

function GmailIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.5 39h6V23.25L2 17.5V36.5A2.5 2.5 0 0 0 4.5 39Z" fill="#4285F4"/>
      <path d="M37.5 39h6a2.5 2.5 0 0 0 2.5-2.5V17.5l-8.5 5.75V39Z" fill="#34A853"/>
      <path d="M37.5 12.5v10.75L46 17.5v-2.75C46 11.95 43.42 10.5 41.2 12.07L37.5 12.5Z" fill="#FBBC04"/>
      <path d="M10.5 23.25V12.5l13.5 9 13.5-9v10.75L24 32.25 10.5 23.25Z" fill="#EA4335"/>
      <path d="M2 14.75V17.5l8.5 5.75V12.5L6.8 12.07C4.58 10.5 2 11.95 2 14.75Z" fill="#C5221F"/>
    </svg>
  );
}

function GoogleCalendarIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="36" height="36" rx="3" fill="white"/>
      <rect x="6" y="6" width="36" height="36" rx="3" stroke="#E0E0E0" strokeWidth="1"/>
      <rect x="6" y="6" width="36" height="12" rx="3" fill="#1A73E8"/>
      <rect x="6" y="12" width="36" height="6" fill="#1A73E8"/>
      <rect x="13" y="2" width="4" height="9" rx="2" fill="#1A73E8"/>
      <rect x="31" y="2" width="4" height="9" rx="2" fill="#1A73E8"/>
      <text x="24" y="36" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1A73E8" fontFamily="Arial, sans-serif">31</text>
    </svg>
  );
}

const INTEGRATIONS = [
  {
    id:          'gmail',
    plugin:      'gmail',
    name:        'Gmail',
    tagline:     'Read, compose, send and manage emails',
    IconComponent: GmailIcon,
    iconBg:      'bg-white/5 border-zinc-800',
    permissions: ['Read all messages & threads', 'Send emails on your behalf', 'Manage labels & drafts'],
  },
  {
    id:          'googlecalendar',
    plugin:      'googlecalendar',
    name:        'Google Calendar',
    tagline:     'View and create calendar events with attendees',
    IconComponent: GoogleCalendarIcon,
    iconBg:      'bg-white/5 border-zinc-800',
    permissions: ['Read calendar events', 'Create & update events', 'Manage Google Meet links'],
  },
] as const;

function IntegrationCard({
  integration,
  connected,
  loading,
}: {
  integration: typeof INTEGRATIONS[number];
  connected: boolean;
  loading: boolean;
}) {
  const IconComponent = integration.IconComponent;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Main row */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${integration.iconBg}`}>
            <IconComponent size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <p className="text-sm font-semibold text-zinc-100">{integration.name}</p>
              {loading ? (
                <Loader2 size={12} className="text-zinc-600 animate-spin" />
              ) : connected ? (
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-green-400 bg-green-500/10 px-2.5 py-0.5 rounded-full border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.7)]" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 bg-zinc-800/80 px-2.5 py-0.5 rounded-full border border-zinc-700">
                  <AlertCircle size={9} />
                  Disconnected
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{integration.tagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {connected ? (
            <>
              <a
                href={`/api/corsair/connect?plugin=${integration.plugin}`}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-2 rounded-xl transition-colors"
              >
                <RefreshCw size={12} />
                Reconnect
              </a>
              <a
                href={`/api/corsair/disconnect?plugin=${integration.plugin}`}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/60 bg-red-500/5 hover:bg-red-500/10 px-3 py-2 rounded-xl transition-colors"
              >
                <Unplug size={12} />
                Disconnect
              </a>
            </>
          ) : (
            <a
              href={`/api/corsair/connect?plugin=${integration.plugin}`}
              className="flex items-center gap-1.5 text-xs font-semibold bg-white text-black px-4 py-2 rounded-xl hover:bg-zinc-100 transition-colors"
            >
              <Plug size={12} />
              Connect
            </a>
          )}
        </div>
      </div>

      {/* Permissions strip */}
      <div className="px-6 py-3 bg-zinc-900/50 border-t border-zinc-800/60 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mr-1">Permissions</span>
        {integration.permissions.map((p) => (
          <span key={p} className="flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-zinc-800">
            <CheckCircle size={9} className="text-zinc-600 shrink-0" />
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}

export function IntegrationsView() {
  const trpc = useTRPC();
  const { data, isLoading, refetch, isFetching } = useQuery({
    ...trpc.stats.connectionStatus.queryOptions(),
    staleTime: 0,
  });

  return (
    <div className="h-full overflow-y-auto bg-black">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Blocks size={18} className="text-zinc-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Integrations</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Connect apps to give Yugati access to your data</p>
            </div>
          </div>
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 px-3 py-2 rounded-xl transition-colors disabled:opacity-40"
          >
            <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
            Refresh status
          </button>
        </div>

        {/* Integration cards */}
        <div className="space-y-3">
          {INTEGRATIONS.map((intg) => (
            <IntegrationCard
              key={intg.id}
              integration={intg}
              connected={isLoading ? false : (intg.id === 'gmail' ? (data?.gmail ?? false) : (data?.googlecalendar ?? false))}
              loading={isLoading}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
