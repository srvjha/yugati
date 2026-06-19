'use client';

import { useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import Image from 'next/image';
import {
  User, Plug, Bot, Palette, Mail, Calendar,
  CheckCircle, ExternalLink, Shield, Bell, Keyboard,
  Loader2, AlertCircle, Unplug, RefreshCw, Zap, SlidersHorizontal,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ThemeToggle, useTheme, applyTheme } from '@/components/theme-toggle';
import { SidebarNav } from '../components/sidebar-nav';
import { PreferencesModal } from '../components/integrations-view';

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'profile',      label: 'Profile',        icon: User     },
  { id: 'integrations', label: 'Integrations',   icon: Plug     },
  { id: 'ai',           label: 'AI',             icon: Bot      },
  { id: 'notifs',       label: 'Notifications',  icon: Bell     },
  { id: 'shortcuts',    label: 'Shortcuts',      icon: Keyboard },
  { id: 'appearance',   label: 'Appearance',     icon: Palette  },
] as const;
type Tab = (typeof TABS)[number]['id'];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: authData } = useSession();
  const user = authData?.user;
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  return (
    <div className="h-screen flex bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* Global app sidebar */}
      {user && (
        <SidebarNav
          user={{ id: user.id, name: user.name, email: user.email, image: user.image }}
          isAdmin={(user as { role?: string }).role === 'admin'}
        />
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-zinc-800/70">
          <span className="text-sm font-semibold text-zinc-200">Settings</span>
          <ThemeToggle />
        </header>

        {/* Horizontal tab strip */}
        <div className="shrink-0 border-b border-zinc-800/60 px-6 overflow-x-auto">
          <div className="flex items-end gap-0 max-w-2xl mx-auto">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                    ${active
                      ? 'border-blue-400 text-white'
                      : 'border-transparent text-zinc-500 hover:text-zinc-200 hover:border-zinc-700'}`}
                >
                  <Icon size={14} className={active ? 'text-blue-400' : 'text-zinc-600'} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable centered content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-10">
            {activeTab === 'profile'      && <ProfileTab user={user ?? null} />}
            {activeTab === 'integrations' && <IntegrationsTab />}
            {activeTab === 'ai'           && <AITab />}
            {activeTab === 'notifs'       && <NotifsTab />}
            {activeTab === 'shortcuts'    && <ShortcutsTab />}
            {activeTab === 'appearance'   && <AppearanceTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function Section({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({ label, description, children, last }: {
  label: string; description?: string; children?: React.ReactNode; last?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-5 py-4 gap-4 ${!last ? 'border-b border-zinc-800/60' : ''}`}>
      <div className="min-w-0">
        <p className="text-sm text-zinc-200">{label}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

// ─── Profile tab ──────────────────────────────────────────────────────────────

function ProfileTab({ user }: { user: { name: string; email: string; image?: string | null } | null }) {
  return (
    <>
      <div className="flex items-center gap-4 mb-8 p-5 bg-zinc-950 border border-zinc-800 rounded-xl">
        {user?.image ? (
          <Image src={user.image} alt={user.name ?? ''} width={56} height={56}
            className="rounded-full ring-2 ring-zinc-700 shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-base font-semibold text-zinc-100">{user?.name ?? '—'}</p>
          <p className="text-sm text-zinc-500">{user?.email ?? '—'}</p>
          <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
            <CheckCircle size={9} /> Verified
          </span>
        </div>
      </div>

      <Section title="Account information" description="Your profile details from Google Sign-In.">
        <Row label="Full name"     description={user?.name ?? '—'} />
        <Row label="Email address" description={user?.email ?? '—'} />
        <Row label="Account type"  description="Google OAuth" last />
      </Section>

      <Section title="Privacy & Security">
        <Row label="Sign-in method" description="Google OAuth 2.0 — managed by Google">
          <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
            Manage <ExternalLink size={11} />
          </a>
        </Row>
        <Row label="Data & Privacy" description="Manage your data and privacy settings" last>
          <a href="https://myaccount.google.com/data-and-privacy" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
            Manage <ExternalLink size={11} />
          </a>
        </Row>
      </Section>
    </>
  );
}

// ─── Integrations tab ────────────────────────────────────────────────────────

const INTEGRATIONS = [
  {
    id: 'gmail', plugin: 'gmail', name: 'Gmail',
    tagline: 'Read, compose, send and manage emails',
    icon: Mail, iconBg: 'bg-red-500/10 text-red-400',
    permissions: ['Read all messages & threads', 'Send emails on your behalf', 'Manage labels & drafts'],
    docsHref: 'https://developers.google.com/gmail/api',
  },
  {
    id: 'googlecalendar', plugin: 'googlecalendar', name: 'Google Calendar',
    tagline: 'View and create calendar events with attendees',
    icon: Calendar, iconBg: 'bg-blue-500/10 text-blue-400',
    permissions: ['Read calendar events', 'Create & update events', 'Manage Google Meet links'],
    docsHref: 'https://developers.google.com/calendar',
  },
] as const;

function IntegrationCard({
  integration, connected, loading,
}: {
  integration: typeof INTEGRATIONS[number];
  connected: boolean;
  loading: boolean;
}) {
  const Icon = integration.icon;
  return (
    <div className="border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-zinc-950">
        <div className="flex items-center gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${integration.iconBg} border border-white/5`}>
            <Icon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-zinc-100">{integration.name}</p>
              {loading ? (
                <Loader2 size={11} className="text-zinc-600 animate-spin" />
              ) : connected ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.6)]" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                  <AlertCircle size={9} /> Not connected
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{integration.tagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <a href={`/api/corsair/connect?plugin=${integration.plugin}`}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors">
                <RefreshCw size={11} /> Reconnect
              </a>
              <a href={`/api/corsair/disconnect?plugin=${integration.plugin}`}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 bg-red-500/5 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors">
                <Unplug size={11} /> Disconnect
              </a>
            </>
          ) : (
            <a href={`/api/corsair/connect?plugin=${integration.plugin}`}
              className="flex items-center gap-1.5 text-xs font-semibold bg-white text-black px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
              <Plug size={11} /> Connect
            </a>
          )}
        </div>
      </div>
      <div className="px-5 py-3 bg-zinc-900/40 border-t border-zinc-800/60">
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Permissions</p>
        <div className="flex flex-wrap gap-2">
          {integration.permissions.map((p) => (
            <span key={p} className="flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-zinc-800">
              <CheckCircle size={9} className="text-zinc-600 shrink-0" /> {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const trpc = useTRPC();
  const { data, isLoading, refetch, isFetching } = useQuery({
    ...trpc.stats.connectionStatus.queryOptions(),
    staleTime: 0,
  });
  const [showPrefs, setShowPrefs] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Integrations</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Manage connected apps and their permissions</p>
        </div>
        <button onClick={() => void refetch()} disabled={isFetching}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40">
          <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} /> Check status
        </button>
      </div>

      <div className="space-y-3">
        {INTEGRATIONS.map((intg) => (
          <IntegrationCard
            key={intg.id}
            integration={intg}
            connected={data ? (intg.id === 'gmail' ? data.gmail : data.googlecalendar) : false}
            loading={isLoading}
          />
        ))}
      </div>

      {/* Preferences */}
      <button
        onClick={() => setShowPrefs(true)}
        className="mt-4 w-full flex items-center justify-between px-5 py-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:bg-zinc-900/40 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-700 transition-colors">
            <SlidersHorizontal size={15} className="text-zinc-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-zinc-200">Preferences</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">AI tone, email signature, focus areas &amp; more</p>
          </div>
        </div>
        <span className="text-[10px] font-semibold text-zinc-600 group-hover:text-zinc-400 uppercase tracking-wider transition-colors">
          Configure →
        </span>
      </button>

      <div className="mt-4 flex items-start gap-2.5 px-4 py-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
        <Zap size={13} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-500">
          Disconnecting an integration will prevent Yugati from accessing that data.
          Your data is never stored — it&apos;s fetched live from Google on each request.
        </p>
      </div>

      {showPrefs && <PreferencesModal onClose={() => setShowPrefs(false)} />}
    </>
  );
}

// ─── AI tab ───────────────────────────────────────────────────────────────────

function AITab() {
  const [confirmActions, setConfirmActions] = useState(true);
  const [enhancePrompts, setEnhancePrompts] = useState(true);

  return (
    <>
      <Section title="AI Behaviour" description="Control how Yugati's AI assistant behaves.">
        <Row label="Confirm before actions"
          description="Ask for approval before sending emails or creating events">
          <Switch checked={confirmActions} onCheckedChange={setConfirmActions} />
        </Row>
        <Row label="Enhance prompts"
          description="Automatically improve your queries for better results" last>
          <Switch checked={enhancePrompts} onCheckedChange={setEnhancePrompts} />
        </Row>
      </Section>

      <Section title="Model" description="The AI model powering your assistant.">
        <Row label="Current model" description="GPT-4.1 via OpenAI" />
        <Row label="Safety filters" description="Input and output guardrails are always active" last>
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <Shield size={11} /> Always on
          </span>
        </Row>
      </Section>
    </>
  );
}

// ─── Notifications tab ────────────────────────────────────────────────────────

function NotifsTab() {
  const [newEmail, setNewEmail]   = useState(false);
  const [aiActions, setAiActions] = useState(true);

  return (
    <Section title="Notifications" description="Coming soon — browser notifications for new emails and AI actions.">
      <Row label="New email notifications" description="Notify when new emails arrive">
        <Switch checked={newEmail} onCheckedChange={setNewEmail} />
      </Row>
      <Row label="AI action notifications" description="Notify when the AI completes a task" last>
        <Switch checked={aiActions} onCheckedChange={setAiActions} />
      </Row>
    </Section>
  );
}

// ─── Shortcuts tab ────────────────────────────────────────────────────────────

const SHORTCUTS = [
  { key: '⌘K',  label: 'Open command palette' },
  { key: '⌘B',  label: 'Bold (compose)'        },
  { key: '⌘I',  label: 'Italic (compose)'      },
  { key: '⌘U',  label: 'Underline (compose)'   },
  { key: 'Esc', label: 'Close modal / palette' },
] as const;

function ShortcutsTab() {
  return (
    <Section title="Keyboard shortcuts">
      {SHORTCUTS.map(({ key, label }, i) => (
        <Row key={key} label={label} last={i === SHORTCUTS.length - 1}>
          <kbd className="px-2 py-1 text-[11px] font-mono bg-zinc-800 border border-zinc-700 rounded-md text-zinc-300">
            {key}
          </kbd>
        </Row>
      ))}
    </Section>
  );
}

// ─── Appearance tab ───────────────────────────────────────────────────────────

function AppearanceTab() {
  const { theme } = useTheme();

  return (
    <Section title="Appearance" description="Choose your preferred theme.">
      <Row label="Theme" description="Switch between dark and light mode.">
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
          <button onClick={() => applyTheme('dark')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${theme === 'dark' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>
            Dark
          </button>
          <button onClick={() => applyTheme('light')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${theme === 'light' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>
            Light
          </button>
        </div>
      </Row>
      <Row label="Density" description="Compact email list layout" last>
        <span className="text-xs text-zinc-500 bg-zinc-800 px-3 py-1.5 rounded-lg">Default</span>
      </Row>
    </Section>
  );
}
