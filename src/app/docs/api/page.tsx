import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'API Reference — Yugati',
  description: 'Complete API reference for Yugati: agent chat, voice, payments, and tRPC endpoints.',
};

const ENDPOINTS = [
  { id: 'agent-chat',      label: 'POST /api/agent/chat'                },
  { id: 'voice',           label: 'POST /api/voice/transcribe'          },
  { id: 'create-order',    label: 'POST /api/payments/create-order'     },
  { id: 'verify',          label: 'POST /api/payments/verify'           },
  { id: 'webhook',         label: 'POST /api/payments/webhook'          },
  { id: 'invoice',         label: 'GET /api/payments/invoice/[orderId]' },
  { id: 'corsair-connect', label: 'GET /api/corsair/connect'            },
  { id: 'corsair-callback',label: 'GET /api/corsair/callback'           },
  { id: 'clear-session',   label: 'POST /api/auth/clear-session'        },
  { id: 'auth',            label: 'ALL /api/auth/[...all]'              },
  { id: 'trpc',            label: 'tRPC routers'                        },
];

export default function ApiReferencePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/docs"
              className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft size={14} />
              Docs
            </Link>
            <div className="w-px h-4 bg-zinc-800" />
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-white flex items-center justify-center">
                <span className="text-black text-[9px] font-black">Y</span>
              </div>
              <span className="text-sm font-semibold tracking-tight">Yugati</span>
              <span className="text-zinc-700 mx-1">/</span>
              <span className="text-sm text-zinc-400">Docs</span>
              <span className="text-zinc-700 mx-1">/</span>
              <span className="text-sm text-zinc-400">API Reference</span>
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

        {/* Sticky sidebar */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-24">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-4 px-2">
              Endpoints
            </p>
            <nav className="space-y-0.5">
              {ENDPOINTS.map(({ id, label }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="block px-2 py-1.5 text-xs text-zinc-500 hover:text-white transition-colors rounded font-mono leading-relaxed"
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="mt-6 px-2">
              <div className="h-px bg-zinc-800 mb-4" />
              <Link
                href="/docs"
                className="block text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                ← Back to docs
              </Link>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 max-w-2xl">
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight mb-3">API Reference</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Yugati exposes HTTP endpoints for agent interaction, voice transcription, and payments.
              All endpoints require an authenticated session cookie.
            </p>
            <div className="mt-4 flex items-center gap-2 bg-white/[0.03] border border-white/[0.07] rounded-lg px-4 py-3 text-xs text-zinc-400">
              <span className="font-mono text-zinc-300">better-auth.session_token</span>
              <span>— required on all requests. Unauthenticated requests return</span>
              <span className="font-mono text-zinc-300">401</span>
            </div>
          </div>

          <div className="space-y-10">

            {/* POST /api/agent/chat */}
            <section id="agent-chat" className="scroll-mt-24">
              <ApiEndpoint method="POST" path="/api/agent/chat">
                <p className="text-zinc-400 text-sm">
                  Runs the AI agent and streams the response as Server-Sent Events (SSE).
                  Three-layer gating: character limit → rate limit → monthly quota.
                </p>

                <Block label="Request body">
                  <CodeBlock>{`{
  "messages": [
    { "role": "user", "content": "Summarise my last 5 emails" }
  ],
  "conversationId": "uuid",     // optional — omit to start a new session
  "agentMode": "guided" | "auto" // default: "guided"
}`}</CodeBlock>
                </Block>

                <Block label="SSE event stream">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left py-2 pr-4 text-zinc-500 font-medium">type</th>
                        <th className="text-left py-2 text-zinc-500 font-medium">Payload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      <tr>
                        <td className="py-2 pr-4 text-emerald-400">delta</td>
                        <td className="py-2 text-zinc-500">{'{ text: string }'}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-blue-400">done</td>
                        <td className="py-2 text-zinc-500">{'{ conversationId: string }'}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-amber-400">blocked</td>
                        <td className="py-2 text-zinc-500">{'{ reason: string, conversationId: string }'}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-red-400">error</td>
                        <td className="py-2 text-zinc-500">{'{ message: string, conversationId: string }'}</td>
                      </tr>
                    </tbody>
                  </table>
                </Block>

                <Block label="Error codes">
                  <StatusTable rows={[
                    ['400', 'Message exceeds plan character limit'],
                    ['401', 'Not authenticated'],
                    ['403', 'Account suspended'],
                    ['429', 'Rate limit or monthly quota exceeded'],
                  ]} />
                </Block>
              </ApiEndpoint>
            </section>

            {/* POST /api/voice/transcribe */}
            <section id="voice" className="scroll-mt-24">
              <ApiEndpoint method="POST" path="/api/voice/transcribe">
                <p className="text-zinc-400 text-sm">
                  Transcribes an audio clip using OpenAI Whisper. Counts against the monthly voice quota.
                </p>

                <Block label="Request">
                  <p className="text-xs text-zinc-500 mb-2">
                    <span className="font-mono text-zinc-300">multipart/form-data</span> with one field:
                  </p>
                  <CodeBlock>{`audio   File   WebM audio blob, max ~25 MB`}</CodeBlock>
                </Block>

                <Block label="Response">
                  <CodeBlock>{`{ "text": "Summarise my last 5 emails" }`}</CodeBlock>
                </Block>

                <Block label="Error codes">
                  <StatusTable rows={[
                    ['401', 'Not authenticated'],
                    ['429', 'Monthly voice quota exceeded'],
                  ]} />
                </Block>
              </ApiEndpoint>
            </section>

            {/* POST /api/payments/create-order */}
            <section id="create-order" className="scroll-mt-24">
              <ApiEndpoint method="POST" path="/api/payments/create-order">
                <p className="text-zinc-400 text-sm">
                  Creates a Razorpay payment order for a plan upgrade.
                </p>

                <Block label="Request body">
                  <CodeBlock>{`{ "plan": "standard" | "premium" }`}</CodeBlock>
                </Block>

                <Block label="Response">
                  <CodeBlock>{`{
  "orderId":  "order_xxx",
  "amount":   19900,        // paise — ₹199.00
  "currency": "INR",
  "keyId":    "rzp_live_xxx",
  "planName": "Standard"
}`}</CodeBlock>
                </Block>
              </ApiEndpoint>
            </section>

            {/* POST /api/payments/verify */}
            <section id="verify" className="scroll-mt-24">
              <ApiEndpoint method="POST" path="/api/payments/verify">
                <p className="text-zinc-400 text-sm">
                  Verifies Razorpay HMAC signature and upgrades the user plan on success.
                  Redirects to <span className="font-mono text-xs text-zinc-300">/dashboard/billing?upgraded=1</span>.
                </p>

                <Block label="Request body">
                  <CodeBlock>{`{
  "razorpayOrderId":   "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "hmac_sha256_hex"
}`}</CodeBlock>
                </Block>

                <Block label="Error codes">
                  <StatusTable rows={[
                    ['400', 'Invalid or missing HMAC signature'],
                    ['401', 'Not authenticated'],
                  ]} />
                </Block>
              </ApiEndpoint>
            </section>

            {/* GET /api/payments/invoice/[orderId] */}
            <section id="invoice" className="scroll-mt-24">
              <ApiEndpoint method="GET" path="/api/payments/invoice/[orderId]">
                <p className="text-zinc-400 text-sm">
                  Streams a PDF invoice for a paid order. Returns{' '}
                  <span className="font-mono text-xs text-zinc-300">application/pdf</span> with
                  inline disposition. Only the order owner can access it.
                </p>

                <Block label="Path parameter">
                  <CodeBlock>{`orderId   string   Order ID from the orders table`}</CodeBlock>
                </Block>

                <Block label="Error codes">
                  <StatusTable rows={[
                    ['401', 'Not authenticated'],
                    ['404', 'Order not found or not paid'],
                  ]} />
                </Block>
              </ApiEndpoint>
            </section>

            {/* POST /api/payments/webhook */}
            <section id="webhook" className="scroll-mt-24">
              <ApiEndpoint method="POST" path="/api/payments/webhook">
                <p className="text-zinc-400 text-sm">
                  Server-to-server Razorpay webhook for <span className="font-mono text-xs text-zinc-300">payment.captured</span> events.
                  Acts as a backup to the client-side verify flow. Verifies the{' '}
                  <span className="font-mono text-xs text-zinc-300">X-Razorpay-Signature</span> header.
                </p>
                <Block label="Headers">
                  <CodeBlock>{`X-Razorpay-Signature: hmac_sha256_hex`}</CodeBlock>
                </Block>
                <Block label="Error codes">
                  <StatusTable rows={[
                    ['400', 'Invalid signature or unrecognised event'],
                  ]} />
                </Block>
              </ApiEndpoint>
            </section>

            {/* GET /api/corsair/connect */}
            <section id="corsair-connect" className="scroll-mt-24">
              <ApiEndpoint method="GET" path="/api/corsair/connect">
                <p className="text-zinc-400 text-sm">
                  Initiates the Corsair OAuth flow for a given integration (Gmail or Google Calendar).
                  Designed to be opened in a popup window — the parent page polls{' '}
                  <span className="font-mono text-xs text-zinc-300">popup.closed</span> and refetches
                  connection status once the popup closes.
                </p>
                <Block label="Query parameters">
                  <CodeBlock>{`integration   string   "gmail" | "googlecalendar"`}</CodeBlock>
                </Block>
                <Block label="Response">
                  <p className="text-xs text-zinc-500">Redirects to the Google OAuth consent screen.</p>
                </Block>
              </ApiEndpoint>
            </section>

            {/* GET /api/corsair/callback */}
            <section id="corsair-callback" className="scroll-mt-24">
              <ApiEndpoint method="GET" path="/api/corsair/callback">
                <p className="text-zinc-400 text-sm">
                  Handles the OAuth callback from Google after the user approves the consent screen.
                  Stores the encrypted credentials and redirects.
                </p>
                <Block label="Response">
                  <p className="text-xs text-zinc-500">
                    On success → redirects to <span className="font-mono text-zinc-300">/dashboard/integrations?connected=1</span><br />
                    On error → redirects to <span className="font-mono text-zinc-300">/dashboard/integrations?error=connect_failed</span>
                  </p>
                </Block>
              </ApiEndpoint>
            </section>

            {/* POST /api/auth/clear-session */}
            <section id="clear-session" className="scroll-mt-24">
              <ApiEndpoint method="POST" path="/api/auth/clear-session">
                <p className="text-zinc-400 text-sm">
                  Clears the session cookie and signs the user out. Called on manual sign-out.
                </p>
                <Block label="Response">
                  <CodeBlock>{`200 OK — cookie cleared, user is signed out`}</CodeBlock>
                </Block>
              </ApiEndpoint>
            </section>

            {/* /api/auth/[...all] */}
            <section id="auth" className="scroll-mt-24">
              <div className="border border-zinc-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/60 border-b border-zinc-800">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border font-mono bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
                    ALL
                  </span>
                  <code className="text-sm font-mono text-zinc-200">/api/auth/[...all]</code>
                </div>
                <div className="px-4 py-4 space-y-4">
                  <p className="text-zinc-400 text-sm">
                    Catch-all handler for <strong className="text-zinc-300">better-auth</strong>.
                    Handles Google OAuth sign-in, session management, token refresh, and sign-out.
                    Not called directly — managed by the{' '}
                    <span className="font-mono text-xs text-zinc-300">authClient</span> SDK on the frontend.
                  </p>
                  <Block label="Key routes handled internally">
                    <CodeBlock>{`GET  /api/auth/sign-in/google
GET  /api/auth/callback/google
POST /api/auth/sign-out
GET  /api/auth/get-session`}</CodeBlock>
                  </Block>
                </div>
              </div>
            </section>

            {/* tRPC */}
            <section id="trpc" className="scroll-mt-24">
              <div className="border border-zinc-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/60 border-b border-zinc-800">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border font-mono bg-violet-500/10 text-violet-400 border-violet-500/20">
                    tRPC
                  </span>
                  <code className="text-sm font-mono text-zinc-200">POST /api/trpc/[router].[procedure]</code>
                </div>
                <div className="px-4 py-4 space-y-4">
                  <p className="text-zinc-400 text-sm">
                    All email, calendar, plan, and user data is served via tRPC. Procedures are
                    end-to-end type-safe and consumed by the frontend using the{' '}
                    <span className="font-mono text-xs text-zinc-300">useTRPC</span> hook.
                  </p>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left py-2 pr-4 text-zinc-500 font-medium text-xs">Router</th>
                        <th className="text-left py-2 text-zinc-500 font-medium text-xs">Procedures</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {[
                        ['gmail.*',    'listInbox, getMessage, sendMessage, trashMessage, createDraft, updateDraft, sendDraft, listLabels'],
                        ['calendar.*', 'listEvents, createEvent, updateEvent, deleteEvent'],
                        ['plans.*',    'getMyPlan, getOrders, cancelSubscription'],
                        ['user.*',     'getPreferences, savePreferences'],
                        ['stats.*',    'getConnectionStatus, getEmailVolume'],
                      ].map(([router, procs]) => (
                        <tr key={router}>
                          <td className="py-2.5 pr-4 font-mono text-xs text-zinc-300 align-top">{router}</td>
                          <td className="py-2.5 text-zinc-500 text-xs">{procs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

          </div>

          {/* Footer */}
          <div className="mt-20 pt-8 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-700">
            <span>All data encrypted in transit and at rest</span>
            <div className="flex items-center gap-4">
              <Link href="/docs" className="hover:text-zinc-400 transition-colors">Docs</Link>
              <Link href="/" className="hover:text-zinc-400 transition-colors">Home</Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Components ────────────────────────────────────────────────────────────────

function ApiEndpoint({ method, path, children }: { method: string; path: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    GET:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
    POST: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };
  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/60 border-b border-zinc-800">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${colors[method] ?? colors.POST}`}>
          {method}
        </span>
        <code className="text-sm font-mono text-zinc-200">{path}</code>
      </div>
      <div className="px-4 py-4 space-y-5">
        {children}
      </div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-2">{label}</p>
      {children}
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-xs text-zinc-400 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
      {children}
    </pre>
  );
}

function StatusTable({ rows }: { rows: [string, string][] }) {
  return (
    <table className="w-full text-xs border-collapse">
      <tbody className="divide-y divide-zinc-800/60">
        {rows.map(([code, desc]) => (
          <tr key={code}>
            <td className="py-2 pr-6 font-mono text-zinc-300 w-12">{code}</td>
            <td className="py-2 text-zinc-500">{desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
