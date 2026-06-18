import Link from 'next/link';
import { Shield, ArrowLeft, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Docs — Yugati',
  description: 'Complete guide to using Yugati: AI agent, email management, calendar, integrations, billing, and more.',
};

// ─── TOC ───────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'intro',          label: 'Introduction'       },
  { id: 'quick-start',    label: 'Quick Start'         },
  { id: 'agentic',        label: 'Agentic Mode'        },
  { id: 'email',          label: 'Email Management'    },
  { id: 'calendar',       label: 'Calendar'            },
  { id: 'integrations',   label: 'Integrations'        },
  { id: 'preferences',    label: 'Preferences'         },
  { id: 'billing',        label: 'Plans & Billing'     },
  { id: 'privacy',        label: 'Privacy & Security'  },
  { id: 'troubleshoot',   label: 'Troubleshooting'     },
  { id: 'shortcuts',      label: 'Keyboard Shortcuts'  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft size={14} />
              Back
            </Link>
            <div className="w-px h-4 bg-zinc-800" />
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-white flex items-center justify-center">
                <span className="text-black text-[9px] font-black">Y</span>
              </div>
              <span className="text-sm font-semibold tracking-tight">Yugati</span>
              <span className="text-zinc-700 mx-1">/</span>
              <span className="text-sm text-zinc-400">Docs</span>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            Open Dashboard
            <ExternalLink size={12} />
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 flex gap-12">

        {/* Sticky TOC */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-24">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-4 px-2">
              On this page
            </p>
            <nav className="space-y-0.5">
              {SECTIONS.map(({ id, label }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="block px-2 py-1.5 text-sm text-zinc-500 hover:text-white transition-colors rounded"
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="mt-8 px-2">
              <div className="h-px bg-zinc-800 mb-6" />
              <p className="text-xs text-zinc-700 leading-relaxed">
                Need help?{' '}
                <a
                  href="mailto:support@yugati.com"
                  className="text-zinc-500 hover:text-white transition-colors underline underline-offset-2"
                >
                  Contact support
                </a>
              </p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 max-w-2xl">
          <div className="prose-custom space-y-16">

            {/* ── Introduction ── */}
            <Section id="intro" title="Introduction">
              <p>
                Yugati is an AI-powered productivity layer for Gmail and Google Calendar. It
                combines a conversational AI agent with manual inbox and calendar management into
                one unified interface — so you spend less time context-switching and more time on
                the work that matters.
              </p>
              <p>
                This guide covers everything from connecting your accounts to getting the most out
                of the agentic chat. If you&apos;re new, start with{' '}
                <InternalLink href="#quick-start">Quick Start</InternalLink>.
              </p>
              <CalloutBox>
                Yugati is built on top of OpenAI&apos;s Agents SDK and uses GPT-4.1 as the core
                reasoning model. All processing happens server-side — your credentials never leave
                our infrastructure.
              </CalloutBox>
            </Section>

            {/* ── Quick Start ── */}
            <Section id="quick-start" title="Quick Start">
              <ol className="space-y-5 list-none pl-0">
                <Step n={1} title="Sign in with Google">
                  Click <strong>Continue with Google</strong> on the homepage. Yugati requests only
                  the scopes it needs: Gmail read + compose, and Calendar read + write. You can
                  review and revoke these at any time from{' '}
                  <ExLink href="https://myaccount.google.com/permissions">
                    Google Account Permissions
                  </ExLink>
                  .
                </Step>
                <Step n={2} title="Connect your integrations">
                  After sign-in, go to <strong>Dashboard → Integrations</strong>. Click{' '}
                  <strong>Connect</strong> next to Gmail and Google Calendar. Each integration opens
                  a Google OAuth popup — approve it and you&apos;re done. Both connections are
                  independent so you can connect either without the other.
                </Step>
                <Step n={3} title="Set your preferences">
                  Go to <strong>Dashboard → Overview → Preferences</strong> (or click your avatar).
                  Set your email focus (work / personal / both) and preferred writing style
                  (formal / professional / casual). The agent uses these to tailor every draft it
                  writes.
                </Step>
                <Step n={4} title="Start a conversation">
                  Open <strong>Agentic</strong> in the sidebar and type your first request — for
                  example: <em>"Summarise my unread emails from today"</em> or{' '}
                  <em>"Schedule a 30-min call with Alex next Tuesday afternoon."</em>
                </Step>
              </ol>
            </Section>

            {/* ── Agentic Mode ── */}
            <Section id="agentic" title="Agentic Mode">
              <p>
                The agentic chat is powered by an OpenAI Agents SDK pipeline with input and output
                guardrails, multi-turn conversation memory, and tool use for email and calendar
                actions.
              </p>

              <SubHeading>Guided vs Auto mode</SubHeading>
              <p>
                The mode selector (top-right of the chat) controls how much the agent acts
                autonomously:
              </p>
              <ul className="space-y-3">
                <li>
                  <strong className="text-zinc-200">Guided (default)</strong> — The agent describes
                  what it intends to do and waits for your confirmation before taking actions like
                  sending emails or creating events. Best when you&apos;re getting started.
                </li>
                <li>
                  <strong className="text-zinc-200">Auto</strong> — The agent completes
                  multi-step tasks end-to-end without interruptions. Great for batch operations once
                  you trust its judgment.
                </li>
              </ul>

              <SubHeading>Example prompts</SubHeading>
              <CodeBlock>{`"Summarise all unread emails from last 48 hours"
"Draft a follow-up to my last email with Sarah, keep it brief"
"Find a 1-hour slot this week where both me and team@company.com are free"
"Send the meeting notes I just typed to everyone in yesterday's standup"
"Move my 3pm call to tomorrow morning and notify the attendees"
"What did Alice say about the Q3 report?"`}</CodeBlock>

              <SubHeading>Usage limits</SubHeading>
              <p>
                Each plan has a monthly message quota. When you reach the limit, you&apos;ll see a
                clear error. Usage resets at the start of each billing period. See{' '}
                <InternalLink href="#billing">Plans & Billing</InternalLink> for exact limits.
              </p>

              <SubHeading>Context window</SubHeading>
              <p>
                Conversation history is preserved server-side per session ID. Long threads are
                automatically summarised to stay within the model context window, so older turns
                are condensed but never lost for the agent&apos;s reasoning.
              </p>

              <CalloutBox variant="warning">
                The agent can send real emails and create real calendar events. Always review
                actions in Guided mode before switching to Auto.
              </CalloutBox>
            </Section>

            {/* ── Email ── */}
            <Section id="email" title="Email Management">
              <p>
                The Mail page gives you a keyboard-driven inbox view with AI-powered compose. It
                connects directly to your Gmail via the Corsair integration layer.
              </p>

              <SubHeading>Navigation</SubHeading>
              <ul className="space-y-2">
                <li><kbd>j</kbd> / <kbd>k</kbd> — next / previous email</li>
                <li><kbd>Enter</kbd> — open selected email</li>
                <li><kbd>Esc</kbd> — close / go back</li>
                <li><kbd>c</kbd> — compose new email</li>
              </ul>

              <SubHeading>AI Compose</SubHeading>
              <p>
                Click <strong>Compose</strong> (or press <kbd>c</kbd>) to open the AI draft panel.
                Describe what you want to say and the agent drafts a full email in your preferred
                writing style. You can edit the draft before sending. Compose actions count toward
                your monthly <em>compose</em> quota, separate from agent messages.
              </p>

              <SubHeading>Voice input</SubHeading>
              <p>
                Click the microphone icon in the chat or compose box to dictate. Yugati uses
                OpenAI Whisper for transcription. Voice messages count against your monthly voice
                quota. Audio is processed server-side and not stored after transcription.
              </p>

              <SubHeading>Search</SubHeading>
              <p>
                Use the search bar at the top of the Mail page to query your inbox. Results are
                fetched live from Gmail — Yugati does not index or cache your email content.
              </p>
            </Section>

            {/* ── Calendar ── */}
            <Section id="calendar" title="Calendar">
              <p>
                The Calendar page renders your Google Calendar events in a month/week/day view
                with day-level detail on click.
              </p>

              <SubHeading>Viewing events</SubHeading>
              <p>
                The default view is month. Click any day to see a detailed event list for that
                day. Click an event to see its full description, attendees, and Google Meet link
                (if any).
              </p>

              <SubHeading>AI-powered scheduling</SubHeading>
              <p>
                From the agentic chat you can ask the agent to:
              </p>
              <ul className="space-y-2">
                <li>Find free slots across multiple attendees</li>
                <li>Create events with full details (title, time, location, description)</li>
                <li>Update or cancel existing events</li>
                <li>Send calendar invites on your behalf</li>
              </ul>
              <p>
                The Calendar page reflects changes made by the agent in real time — refresh after
                an agentic action if the event list doesn&apos;t update automatically.
              </p>

              <SubHeading>Timezone handling</SubHeading>
              <p>
                Yugati uses your browser&apos;s detected timezone for display. When asking the
                agent to schedule across time zones, be explicit: <em>"4pm EST"</em> or{' '}
                <em>"noon in London"</em>. The agent passes the correct UTC offset to Google
                Calendar.
              </p>
            </Section>

            {/* ── Integrations ── */}
            <Section id="integrations" title="Integrations">
              <p>
                Yugati uses <strong>Corsair</strong> — an OAuth integration layer — to connect
                third-party services. Each integration is scoped per user; no cross-user data
                access is possible.
              </p>

              <SubHeading>Connecting Gmail</SubHeading>
              <ol className="space-y-2 list-decimal list-inside text-zinc-400">
                <li>Go to <strong className="text-zinc-200">Dashboard → Integrations</strong></li>
                <li>Click <strong className="text-zinc-200">Connect</strong> next to Gmail</li>
                <li>Approve the Google OAuth screen</li>
                <li>The status indicator turns green — you&apos;re connected</li>
              </ol>

              <SubHeading>Connecting Google Calendar</SubHeading>
              <p>Same steps as Gmail, but select Google Calendar in the Integrations list.</p>

              <SubHeading>Re-authenticating</SubHeading>
              <p>
                OAuth tokens expire or can be revoked by Google. If Yugati shows a{' '}
                <em>Connection lost</em> error, click <strong>Reconnect</strong> on the
                Integrations page. This refreshes your token without losing any settings.
              </p>

              <SubHeading>Disconnecting</SubHeading>
              <p>
                Click <strong>Disconnect</strong> on the Integrations page. This removes your
                stored token from Yugati&apos;s servers. You can also revoke access from{' '}
                <ExLink href="https://myaccount.google.com/permissions">
                  Google Account Permissions
                </ExLink>{' '}
                directly — Yugati will detect this on the next request.
              </p>

              <CalloutBox>
                Yugati only holds OAuth <em>refresh tokens</em> encrypted server-side. Short-lived
                access tokens are never persisted.
              </CalloutBox>
            </Section>

            {/* ── Preferences ── */}
            <Section id="preferences" title="Preferences">
              <p>
                Preferences control how the agent tailors its output. Access them from{' '}
                <strong>Dashboard → Overview</strong> by clicking the preferences panel.
              </p>

              <table className="w-full text-sm border-collapse mt-2">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Setting</th>
                    <th className="text-left py-2 text-zinc-400 font-medium">Options</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  <tr>
                    <td className="py-2.5 pr-4 text-zinc-200 align-top">Email Focus</td>
                    <td className="py-2.5 text-zinc-500">Work, Personal, Both</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-zinc-200 align-top">Writing Style</td>
                    <td className="py-2.5 text-zinc-500">Formal, Professional, Casual</td>
                  </tr>
                </tbody>
              </table>

              <p className="mt-4">
                Changes take effect immediately — the next message sent to the agent will use the
                updated preferences. Existing conversation history is not affected.
              </p>
            </Section>

            {/* ── Billing ── */}
            <Section id="billing" title="Plans & Billing">
              <p>
                Yugati is billed monthly through Razorpay. Plans auto-renew. Usage resets at the
                start of each billing period.
              </p>

              <table className="w-full text-sm border-collapse mt-2">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Plan</th>
                    <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Messages</th>
                    <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Voice</th>
                    <th className="text-left py-2 text-zinc-400 font-medium">Compose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  <tr>
                    <td className="py-2.5 pr-4 text-zinc-200">Free</td>
                    <td className="py-2.5 pr-4 text-zinc-500">50 / mo</td>
                    <td className="py-2.5 pr-4 text-zinc-500">10 / mo</td>
                    <td className="py-2.5 text-zinc-500">20 / mo</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-zinc-200">Standard</td>
                    <td className="py-2.5 pr-4 text-zinc-500">500 / mo</td>
                    <td className="py-2.5 pr-4 text-zinc-500">100 / mo</td>
                    <td className="py-2.5 text-zinc-500">200 / mo</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-zinc-200">Premium</td>
                    <td className="py-2.5 pr-4 text-zinc-500">2 000 / mo</td>
                    <td className="py-2.5 pr-4 text-zinc-500">500 / mo</td>
                    <td className="py-2.5 text-zinc-500">1 000 / mo</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-zinc-200">Enterprise</td>
                    <td className="py-2.5 pr-4 text-zinc-500">Unlimited</td>
                    <td className="py-2.5 pr-4 text-zinc-500">Unlimited</td>
                    <td className="py-2.5 text-zinc-500">Unlimited</td>
                  </tr>
                </tbody>
              </table>

              <SubHeading>Upgrading</SubHeading>
              <p>
                Go to <strong>Dashboard → Billing</strong> and choose a plan. Payment is processed
                via Razorpay. The new plan is activated immediately after payment confirmation —
                your usage limits update in real time.
              </p>

              <SubHeading>Cancelling</SubHeading>
              <p>
                Click <strong>Cancel Plan</strong> on the Billing page. Your paid plan stays
                active until the end of the current billing period, then reverts to Free. No
                data is lost.
              </p>

              <SubHeading>Failed payments</SubHeading>
              <p>
                If payment fails, Yugati will notify you via email. Your account is not suspended
                immediately — you have a 3-day grace period to update payment details.
              </p>
            </Section>

            {/* ── Privacy ── */}
            <Section id="privacy" title="Privacy & Security">
              <ul className="space-y-4">
                <li>
                  <strong className="text-zinc-200">Data in transit</strong> — All communication
                  is encrypted with TLS 1.3. HTTP Strict Transport Security (HSTS) is enforced
                  with a 2-year max-age.
                </li>
                <li>
                  <strong className="text-zinc-200">Data at rest</strong> — Database at rest is
                  AES-256 encrypted. OAuth tokens are encrypted before storage and decrypted only
                  at request time.
                </li>
                <li>
                  <strong className="text-zinc-200">Email content</strong> — Yugati does not index
                  or cache your email content. It is fetched on demand, passed to the model, and
                  discarded. Nothing persists beyond the active request.
                </li>
                <li>
                  <strong className="text-zinc-200">Session security</strong> — Sessions use
                  HTTP-only, Secure, SameSite=Lax cookies. CSRF attacks are mitigated by
                  same-site policy and per-session tokens.
                </li>
                <li>
                  <strong className="text-zinc-200">Guardrails</strong> — The agent has input and
                  output guardrails to block prompt injection, PII leakage, and off-topic content.
                  Blocked requests are never forwarded to the model.
                </li>
                <li>
                  <strong className="text-zinc-200">Google OAuth scopes</strong> — Yugati requests
                  only the minimum scopes required. You can review and revoke them at any time from{' '}
                  <ExLink href="https://myaccount.google.com/permissions">
                    Google Account Permissions
                  </ExLink>
                  .
                </li>
                <li>
                  <strong className="text-zinc-200">Account deletion</strong> — Email{' '}
                  <a
                    href="mailto:privacy@yugati.com"
                    className="text-zinc-400 hover:text-white underline underline-offset-2 transition-colors"
                  >
                    privacy@yugati.com
                  </a>{' '}
                  to request full account and data deletion. Deletion is processed within 30 days.
                </li>
              </ul>
            </Section>

            {/* ── Troubleshooting ── */}
            <Section id="troubleshoot" title="Troubleshooting">
              <div className="space-y-6">
                <TroubleItem q="Gmail / Calendar shows as disconnected">
                  Go to <strong>Dashboard → Integrations</strong> and click{' '}
                  <strong>Reconnect</strong>. If the issue persists, disconnect the integration,
                  revoke it from{' '}
                  <ExLink href="https://myaccount.google.com/permissions">
                    Google Account Permissions
                  </ExLink>
                  , then reconnect fresh.
                </TroubleItem>
                <TroubleItem q="Agent response is very slow">
                  The first message in a new session may take 2–4 s while the pipeline warms up.
                  Subsequent messages stream in real time. If slowness persists, check your
                  network and whether OpenAI&apos;s status page reports any incidents.
                </TroubleItem>
                <TroubleItem q="I hit my usage limit early">
                  Usage is counted per calendar month, resetting at the start of your billing
                  period. You can upgrade instantly from the Billing page. If you believe the
                  count is wrong, contact support.
                </TroubleItem>
                <TroubleItem q="Agent sent an email I didn't intend">
                  Check your Gmail Sent folder. You can recall the email using Gmail&apos;s native
                  Undo Send feature if it&apos;s within the undo window. Switch to{' '}
                  <strong>Guided mode</strong> to require confirmation before future sends.
                </TroubleItem>
                <TroubleItem q="Sign-in popup is blocked">
                  Yugati uses a popup for Google OAuth. If your browser blocks it, allow popups
                  for the Yugati domain in your browser settings, then try again.
                </TroubleItem>
                <TroubleItem q="Payment failed / plan not activated">
                  Verify the Razorpay transaction in your bank. If payment was deducted but the
                  plan wasn&apos;t activated, email{' '}
                  <a
                    href="mailto:support@yugati.com"
                    className="text-zinc-400 hover:text-white underline underline-offset-2 transition-colors"
                  >
                    support@yugati.com
                  </a>{' '}
                  with the transaction ID.
                </TroubleItem>
              </div>
            </Section>

            {/* ── Shortcuts ── */}
            <Section id="shortcuts" title="Keyboard Shortcuts">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-2 pr-8 text-zinc-400 font-medium">Shortcut</th>
                    <th className="text-left py-2 text-zinc-400 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {[
                    ['j / ↓',      'Next email'],
                    ['k / ↑',      'Previous email'],
                    ['Enter',      'Open selected email'],
                    ['Esc',        'Close / go back'],
                    ['c',          'Compose new email'],
                    ['r',          'Reply to open email'],
                    ['/',          'Focus search'],
                    ['Ctrl+Enter', 'Send email / submit prompt'],
                  ].map(([key, action]) => (
                    <tr key={key}>
                      <td className="py-2.5 pr-8">
                        {key.split('/').map((k, i) => (
                          <span key={i}>
                            {i > 0 && <span className="text-zinc-700 mx-1">/</span>}
                            <kbd className="px-1.5 py-0.5 text-xs bg-zinc-900 border border-zinc-700 rounded font-mono text-zinc-300">
                              {k.trim()}
                            </kbd>
                          </span>
                        ))}
                      </td>
                      <td className="py-2.5 text-zinc-500">{action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

          </div>

          {/* Footer */}
          <div className="mt-20 pt-8 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-700">
            <div className="flex items-center gap-1.5">
              <Shield size={11} />
              <span>All data encrypted in transit and at rest</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/" className="hover:text-zinc-400 transition-colors">Home</Link>
              <a href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-zinc-400 transition-colors">Terms</a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-bold tracking-tight text-white mb-6">{title}</h2>
      <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-zinc-200 mt-8 mb-3">{children}</h3>;
}

function CalloutBox({ children, variant = 'info' }: { children: React.ReactNode; variant?: 'info' | 'warning' }) {
  return (
    <div className={`rounded-lg px-4 py-3.5 text-sm leading-relaxed mt-4
      ${variant === 'warning'
        ? 'bg-amber-500/[0.07] border border-amber-500/20 text-amber-300/80'
        : 'bg-white/[0.03] border border-white/[0.07] text-zinc-400'
      }`}
    >
      {children}
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3.5 text-sm text-zinc-400 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono mt-4">
      {children}
    </pre>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <div className="shrink-0 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
        {n}
      </div>
      <div>
        <p className="text-zinc-200 font-medium mb-1">{title}</p>
        <p className="text-zinc-500 text-sm leading-relaxed">{children}</p>
      </div>
    </li>
  );
}

function TroubleItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-zinc-200 font-medium mb-1.5">{q}</p>
      <p className="text-zinc-500 text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function InternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="text-zinc-300 hover:text-white underline underline-offset-2 transition-colors">
      {children}
    </a>
  );
}

function ExLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-zinc-300 hover:text-white underline underline-offset-2 transition-colors inline-flex items-center gap-0.5"
    >
      {children}
      <ExternalLink size={10} className="shrink-0" />
    </a>
  );
}
