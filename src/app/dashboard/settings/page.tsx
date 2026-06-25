'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import Image from 'next/image';
import {
  User, Bot, Palette,
  CheckCircle, ExternalLink, Shield, Bell, Keyboard,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useTheme, applyTheme } from '@/components/theme-toggle';
import { SidebarNav } from '../components/sidebar-nav';

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'profile',    label: 'Profile',       icon: User     },
  { id: 'ai',         label: 'Agent',         icon: Bot      },
  { id: 'notifs',     label: 'Notifications', icon: Bell     },
  { id: 'shortcuts',  label: 'Shortcuts',     icon: Keyboard },
  { id: 'appearance', label: 'Appearance',    icon: Palette  },
] as const;
type Tab = (typeof TABS)[number]['id'];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: authData } = useSession();
  const user = authData?.user;
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  useEffect(() => {
    // Read URL params after mount — avoids SSR/client hydration mismatch.
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as Tab | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tab && TABS.some((t) => t.id === tab)) setActiveTab(tab);
  }, []);

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
        <header className="h-14 shrink-0 flex items-center px-6 border-b border-zinc-800/70">
          <span className="text-sm font-semibold text-zinc-200">Settings</span>
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
            {activeTab === 'profile'    && <ProfileTab user={user ?? null} />}
            {activeTab === 'ai'         && <AITab />}
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
