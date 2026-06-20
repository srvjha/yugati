import Link from 'next/link';
import { Shield, ArrowLeft, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import { ThemeToggle } from '@/components/theme-toggle';

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
  { id: 'email-arch',     label: 'Email Architecture'  },
  { id: 'agent-arch',     label: 'Agent Architecture'  },
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
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              Open Dashboard
              <ExternalLink size={12} />
            </Link>
          </div>
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
              <div className="h-px bg-zinc-800 my-2" />
              <Link
                href="/docs/api"
                className="block px-2 py-1.5 text-sm text-zinc-500 hover:text-white transition-colors rounded"
              >
                API Reference →
              </Link>
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
                  example: <em>&ldquo;Summarise my unread emails from today&rdquo;</em> or{' '}
                  <em>&ldquo;Schedule a 30-min call with Alex next Tuesday afternoon.&rdquo;</em>
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
                agent to schedule across time zones, be explicit: <em>&ldquo;4pm EST&rdquo;</em> or{' '}
                <em>&ldquo;noon in London&rdquo;</em>. The agent passes the correct UTC offset to Google
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
                  <strong className="text-zinc-200">Guardrails</strong> — Every message passes
                  through a two-layer safety system before the main AI model runs. The first layer
                  (input guardrail) classifies the message — if it is off-topic or a prompt
                  injection attempt, the request is blocked immediately and the main model is never
                  called. Because no tokens are consumed by the main model on blocked requests, the
                  token count and cost for those requests is always $0.00. The second layer (output
                  guardrail) scans every response for sensitive data such as OAuth tokens or
                  credentials before it reaches you.
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

            {/* ── Email Architecture ── */}
            <Section id="email-arch" title="Email Architecture">
              <p>
                For the curious: here&apos;s exactly how Yugati loads your inbox so fast, and why
                refreshing the page doesn&apos;t trigger a slow fetch every time.
              </p>

              <SubHeading>Query routing — what gets cached vs. fetched live</SubHeading>
              <p>
                Before touching any cache, Yugati decides whether the request is cacheable at all.
                Only your default inbox view (<code className="font-mono text-xs bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-300">in:inbox</code>) is served from cache.
                Category tabs (Primary, Social, Promotions), search results, and label filters always
                go straight to Gmail so you always see real-time data where it counts.
              </p>

              <SubHeading>Tier 1 — Direct database query (~50 ms)</SubHeading>
              <p>
                Yugati stores a local copy of your inbox metadata in its database every time you
                load or send email. On subsequent loads, a single indexed SQL query returns your
                inbox in about 50 ms — no Gmail API call needed. If that copy is older than
                3 minutes, a background refresh fires silently; you get the cached result instantly
                and the next load will already have fresh data.
              </p>

              <SubHeading>Tier 2 — Integration layer (~200 ms)</SubHeading>
              <p>
                If the direct query comes back empty (e.g., right after clearing the DB or a schema
                migration), Yugati falls back to the Corsair integration layer — a higher-level
                abstraction over the same data. Slower than the direct query, but always correct
                regardless of internal schema changes. The same stale-and-refresh logic applies.
              </p>

              <SubHeading>Tier 3 — Live Gmail API (~10–15 s)</SubHeading>
              <p>
                Only reached on a brand-new account or if both cache layers are completely empty.
                Yugati fetches your 15 most recent inbox messages from Gmail, enriches each one
                with pre-parsed subject/from/date fields, and writes them to the local cache so
                every subsequent load hits Tier 1.
              </p>

              <SubHeading>Client-side memory cache</SubHeading>
              <p>
                On the browser side, React Query holds the inbox result in memory for 3 minutes.
                Navigating away and back within that window returns the in-memory result instantly —
                no network round-trip at all. After 3 minutes it silently revalidates in the
                background.
              </p>

              <SubHeading>Full flow at a glance</SubHeading>
              <CodeBlock>{`You open the inbox
  │
  ▼
Browser memory (React Query)?  ──yes──▶  instant (< 1 ms)
  │ no
  ▼
Server receives tRPC request
  │
  ├──▶  Tier 1: local DB query              ~50 ms   ◀── normal path
  │       └── stale? background refresh fires
  │
  ├──▶  Tier 2: integration abstraction     ~200 ms  ◀── fallback
  │       └── stale? background refresh fires
  │
  └──▶  Tier 3: live Gmail API             ~10–15 s  ◀── first-ever load only
              └── writes enriched data to local cache`}</CodeBlock>

              <CalloutBox>
                Search and category tabs (Primary, Social, etc.) always bypass the cache and query
                Gmail directly — you&apos;re always seeing real results there, not a snapshot.
              </CalloutBox>
            </Section>

            {/* ── Agent Architecture ── */}
            <Section id="agent-arch" title="Agent Architecture">
              <p>
                Every message you send to the agentic chat passes through a three-stage security
                pipeline before any AI model touches it. Here&apos;s why each stage exists and what
                it catches.
              </p>

              <SubHeading>Stage 1 — Regex injection detection (zero latency, zero cost)</SubHeading>
              <p>
                The very first check is pure pattern matching — no AI model, no network call. It
                scans your message for known prompt injection signatures: HTML comment overrides
                (<code className="font-mono text-xs bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-300">{`<!-- ... -->`}</code>),
                phrases like &ldquo;ignore all previous instructions&rdquo; or &ldquo;IMPORTANT SYSTEM
                MESSAGE&rdquo;, markdown heading overrides, and similar patterns. If any match,
                the message is blocked immediately — the main model is never called and no tokens
                are spent.
              </p>

              <SubHeading>Stage 2 — Topic safety check (~200 ms)</SubHeading>
              <p>
                A lightweight AI classifier (GPT-4o-mini) checks whether the message is actually
                about Gmail or Google Calendar. Requests for code help, math, general knowledge, or
                anything outside Yugati&apos;s scope are refused here — before the main model runs.
                This stage also catches sophisticated injections that the regex in Stage 1 might
                miss.
              </p>

              <SubHeading>Stage 3 — Prompt enhancer (~300 ms)</SubHeading>
              <p>
                Only messages that pass both safety gates reach the enhancer. It uses a small
                fast model (GPT-4.1-nano) to clarify vague phrasing — turning &ldquo;follow up
                with them&rdquo; into a precise instruction the main model can execute reliably.
                Short or already-clear messages skip this step entirely.
              </p>

              <SubHeading>Agent run — GPT-4.1 with dual guardrails</SubHeading>
              <p>
                The enhanced message is handed to GPT-4.1 with two additional guardrails running
                in parallel:
              </p>
              <ul className="space-y-2">
                <li>
                  <strong className="text-zinc-200">Input guardrail</strong> — A second safety
                  check on the enhanced prompt (defense-in-depth: catches anything the enhancer
                  might have altered).
                </li>
                <li>
                  <strong className="text-zinc-200">Output guardrail</strong> — Scans every chunk
                  of the response before it reaches you. Blocks OAuth tokens, private keys, PEM
                  headers, or any other credentials from appearing in the output, even if the model
                  would otherwise include them.
                </li>
              </ul>

              <SubHeading>Why this order matters</SubHeading>
              <p>
                The enhancer is itself an LLM. If an injected prompt were passed to it, the
                enhancer would process and execute the injection before any guardrail ran — turning
                attacker-controlled text into real model output. Stages 1 and 2 run{' '}
                <em>before</em> the enhancer so that injected prompts never touch any AI model,
                not even the small one.
              </p>

              <SubHeading>Full pipeline</SubHeading>
              <CodeBlock>{`Your message
  │
  ▼
Stage 1: Regex injection scan         zero latency, zero cost
  │ blocked → "I'm focused on Gmail and Calendar…"
  │ passes
  ▼
Stage 2: Topic safety classifier      ~200 ms  (GPT-4o-mini)
  │ blocked → polite refusal, injectionFlag logged
  │ passes
  ▼
Stage 3: Prompt enhancer              ~300 ms  (GPT-4.1-nano)
  │ (skipped for short / clear messages)
  ▼
Agent run                             streaming  (GPT-4.1)
  ├── input guardrail (defense-in-depth)
  └── output guardrail (no credentials in response)`}</CodeBlock>

              <SubHeading>Logging</SubHeading>
              <p>
                Every message — allowed or blocked — is logged with its outcome. Blocked messages
                are flagged so patterns can be detected over time. Injection attempts are tagged
                separately from off-topic blocks so they can be reviewed independently.
              </p>
              <table className="w-full text-sm border-collapse mt-2">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Status</th>
                    <th className="text-left py-2 text-zinc-400 font-medium">Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  <tr>
                    <td className="py-2.5 pr-4 font-mono text-xs text-zinc-300 align-top">ok</td>
                    <td className="py-2.5 text-zinc-500">Message processed normally</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-mono text-xs text-zinc-300 align-top">blocked_input</td>
                    <td className="py-2.5 text-zinc-500">Stage 1 (injection pattern) or Stage 2 (off-topic)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-mono text-xs text-zinc-300 align-top">blocked_output</td>
                    <td className="py-2.5 text-zinc-500">Output guardrail caught credentials in response</td>
                  </tr>
                </tbody>
              </table>

              <CalloutBox>
                Blocked requests consume no GPT-4.1 tokens. The cost of a rejected injection
                attempt is effectively $0.00 — only the lightweight classifier in Stage 2 is called.
              </CalloutBox>
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
