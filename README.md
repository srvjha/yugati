# Yugati

**🔗 Live:** https://www.yugati.in · **📖 Docs:** https://www.yugati.in/docs · **🎬 Demo:** https://youtu.be/0iPLn7NM6K4

---

Yugati is a production-grade AI productivity platform that connects to your Gmail and Google Calendar and lets you manage them through natural language. It ships two distinct interaction modes: an agentic chat interface powered by the OpenAI Agents SDK and a traditional manual interface for direct inbox and calendar management. Both modes are served from a single Next.js 16 application deployed on Vercel. An internal admin panel gives operators full visibility into users, AI usage, costs, security events, sessions, and revenue.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Core Features](#core-features)
6. [Agent Pipeline](#agent-pipeline)
7. [Authentication](#authentication)
8. [Database Schema](#database-schema)
9. [API Routes](#api-routes)
10. [tRPC Routers](#trpc-routers)
11. [Admin Panel](#admin-panel)
12. [Plans and Billing](#plans-and-billing)
13. [Rate Limiting and Quotas](#rate-limiting-and-quotas)
14. [Email Cache](#email-cache)
15. [Voice Input](#voice-input)
16. [Payment Integration](#payment-integration)
17. [Theming](#theming)
18. [Middleware](#middleware)
19. [Testing](#testing)
20. [CI/CD](#cicd)
21. [Environment Variables](#environment-variables)
22. [Local Development](#local-development)
23. [Database Management](#database-management)
24. [Deployment](#deployment)

---

## Overview

Yugati integrates with Gmail and Google Calendar using Corsair, an integration layer that handles OAuth flows, credential storage, API proxying, and entity caching. Users sign in with Google, grant the required OAuth scopes, and immediately get access to:

- An AI chat interface (Agentic mode) where a GPT-4.1 agent can read emails, draft and send messages, create calendar events, and answer productivity queries.
- A manual interface where the user browses, searches, reads, composes, and manages emails and events directly without AI involvement.
- A preferences system where users configure AI writing style, email focus areas, signatures, and digest settings.
- An admin panel at `/admin` with full operational telemetry: user management, per-request AI cost tracking, prompt injection detection, live sessions, revenue, and GPT-generated platform insights.

The platform enforces per-plan monthly usage quotas, per-minute rate limits, and per-message character limits. Payments are processed through Razorpay in INR. PDF invoices are generated automatically for every successful payment.

---

## Architecture

```
Browser
  |
  +-- Next.js 16 App Router (Vercel)
        |
        +-- Landing page            /
        +-- Dashboard               /dashboard/*
        +-- Admin panel             /admin/*
        +-- Pricing                 /pricing
        +-- Auth callbacks          /api/auth/*
        +-- Agent SSE stream        /api/agent/chat
        +-- Voice transcription     /api/voice/transcribe
        +-- Payments                /api/payments/*
        +-- Invoice PDF             /api/payments/invoice/[orderId]
        +-- tRPC                    /api/trpc/*
        +-- Corsair management      /api/corsair/*
        |
        +-- better-auth             Session management, Google OAuth
        +-- Corsair                 Gmail + Google Calendar integration layer
        +-- OpenAI Agents SDK       Agent runtime, tool execution, guardrails, sessions
        +-- Drizzle ORM             Type-safe queries against PostgreSQL
        +-- Supabase                Hosted PostgreSQL (pooler + direct URL)
        +-- Upstash Redis           Sliding-window rate limiter
        +-- Razorpay                Payment order creation and verification
        +-- @react-pdf/renderer     Server-side PDF invoice generation
```

Every request to `/dashboard/*` and `/admin/*` is gated by middleware (`src/proxy.ts`) that checks for a valid better-auth session cookie. Admin routes additionally require `session.user.role === 'admin'` enforced server-side in the layout and in the `adminProcedure` tRPC middleware.

---

## Tech Stack

| Category | Technology | Notes |
|---|---|---|
| Framework | Next.js 16.2.9 (Turbopack) | App Router, React Server Components, SSE |
| Language | TypeScript 5 | Strict mode throughout |
| UI | React 19, Tailwind CSS 4 | Custom components, no component library |
| Icons | Lucide React | |
| State | TanStack Query v5 | Server state, cache, invalidation |
| Data layer | tRPC v11 | End-to-end type safety |
| ORM | Drizzle ORM | Schema-first, migration via drizzle-kit |
| Database | Supabase PostgreSQL | Pooler URL for app, direct URL for migrations |
| Auth | better-auth | Google OAuth, admin plugin, session cookies |
| Integrations | Corsair | Gmail + Google Calendar OAuth, API proxy, entity DB |
| AI runtime | OpenAI Agents SDK 0.11.6 | Agent, tools, input/output guardrails, sessions |
| AI models | GPT-4.1 (agent), GPT-4.1-nano (guardrail + enhancer), Whisper-1 (voice) | |
| Rate limiting | Upstash Redis (@upstash/ratelimit) | Sliding window, serverless-safe |
| Payments | Razorpay | INR, order creation, HMAC verification, webhook |
| PDF generation | @react-pdf/renderer | Server-side invoice PDFs |
| Deployment | Vercel | Node.js runtime for all API routes |
| Charts | Recharts | Area charts, bar charts |
| Markdown | react-markdown + remark-gfm | Chat message rendering |
| Toasts | Sonner | |

---

## Project Structure

<details>
<summary>Click to expand full file tree</summary>

```
src/
  app/
    page.tsx                        Landing page
    layout.tsx                      Root layout, fonts, TRPCReactProvider, Toaster
    globals.css                     Tailwind imports, CSS variables, light/dark theme
    pricing/
      page.tsx                      Pricing page with Razorpay checkout + downgrade confirmation
    dashboard/
      page.tsx                      Redirect → /dashboard/mail
      layout.tsx                    Dashboard layout (bg-zinc-950, theme-aware)
      mail/
        page.tsx                    Main mail page (Manual + Agentic modes)
        [id]/page.tsx               Single email thread view
        components/
          MailSidebar.tsx           Collapsible sidebar (folders, nav, compose, mode toggle)
          MailTopBar.tsx            Search, view controls
          ChatView.tsx              Agentic SSE chat UI + voice input
          ComposeModal.tsx          Email compose overlay
          CommandPalette.tsx        Keyboard command palette
          SubscriptionsPanel.tsx    Subscription management
          MailInsightPanel.tsx      AI email insights + upcoming events (sorted by date)
          AuthError.tsx             OAuth error state
          SkeletonList.tsx          Loading skeleton
          TooltipWrap.tsx           Radix tooltip wrapper
          CategoryTabs.tsx          Inbox category tabs with light-mode-aware badges
          EmailRow.tsx              Email list row
      billing/
        page.tsx                    Plan card, usage meters, order history, cancel subscription, invoice links
      calendar/
        page.tsx                    Google Calendar event list
      chat/
        page.tsx                    Standalone agentic chat
      integrations/
        page.tsx                    Integration connection + OAuth popup + preferences
      overview/
        page.tsx                    Dashboard overview with stats and charts
      settings/
        page.tsx                    User settings with theme toggle
      components/
        chat-view.tsx               Agentic chat UI
        sidebar-nav.tsx             Left sidebar (nav links, UsagePill, Settings, admin link)
        integrations-view.tsx       OAuth popup flow + preferences modal
        overview-view.tsx           Overview stats and charts
        calendar-view.tsx           Full calendar component
        theme-toggle.tsx            Icon-only dark/light mode toggle
        usage-pill.tsx              Usage summary pill (collapsed + expanded)
    admin/
      layout.tsx                    Server component auth guard (role === 'admin')
      page.tsx                      Redirect → /admin/overview
      components/
        admin-sidebar.tsx           Admin sidebar (red INTERNAL badge, 7 nav items)
        admin-stat-card.tsx         KPI card with optional delta badge
        prompt-snapshot.tsx         Injection "screenshot" card with regex highlighting
      overview/page.tsx             8 KPI cards + daily prompts AreaChart + plan distribution
      users/page.tsx                User table — search, ban/unban, plan badge, integrations
      users/[id]/page.tsx           Full user profile — token stats, usage bars, recent prompts
      prompts/page.tsx              All prompt logs — expandable rows, plan badge, AI reply
      security/page.tsx             Injection attempts — PromptSnapshot cards
      plans/page.tsx                Revenue totals + payment orders table
      sessions/page.tsx             Live sessions — device parsing, browser, OS, IP
      insights/page.tsx             GPT-4.1 generated platform insights (critical/warning/info)
    api/
      agent/chat/route.ts           POST — runs agent, SSE stream, quota + rate limit
      auth/[...all]/route.ts        better-auth catch-all handler
      auth/clear-session/route.ts   DELETE — clears session cookie
      corsair/callback/route.ts     OAuth callback → redirects to /dashboard/integrations
      corsair/connect/route.ts      Initiates Corsair OAuth connect (popup-safe)
      corsair/disconnect/route.ts   Disconnects a Corsair integration
      payments/create-order/        POST — creates Razorpay order
      payments/verify/              POST — verifies HMAC, upgrades plan
      payments/webhook/             POST — Razorpay server webhook
      payments/invoice/[orderId]/   GET — generates and streams a PDF invoice
      trpc/[trpc]/route.ts          tRPC HTTP handler
      voice/transcribe/route.ts     POST — Whisper transcription
      webhooks/gmail/watch/         POST — registers Gmail push notifications (Pub/Sub)

  features/
    agent/
      agent.ts                      getAgent() cache + runChat() — main agent entry point
      enhancer.ts                   enhancePrompt() with skip heuristic for short messages
      guardrails.ts                 safetyGuardrail (input, parallel) + sensitiveDataGuardrail (output)
      logger.ts                     logPrompt() — fire-and-forget DB insert, cost estimator
      session.ts                    loadSession() + saveSession() — DB-backed history (40-item cap)
      tools.ts                      buildGmailTools() — send_email with RFC 2822 encoding
      types.ts                      ChatMessage type
      prompts/
        agent.ts                    buildAgentInstructions() — system prompt + few-shot examples
        enhancer.ts                 ENHANCER_SYSTEM prompt
        guardrails.ts               SAFETY_SYSTEM prompt + SENSITIVE_PATTERNS regexes
    manual/
      gmail/
        router.ts                   gmailRouter — all Gmail tRPC procedures
        service.ts                  GmailService — cache-first Gmail API
        schema.ts                   Zod schemas
      calendar/
        router.ts                   calendarRouter — listEvents always sorted by startTime
        service.ts                  CalendarService — singleEvents + orderBy: startTime
        schema.ts                   Zod schemas
      stats/
        router.ts                   statsRouter
        service.ts                  StatsService — getConnectionStatus via DB (no live API call)

  components/
    ui/
      switch.tsx                    Accessible toggle switch with CSS-variable colours

  lib/
    auth.ts                         better-auth config (Google provider, admin plugin)
    auth-client.ts                  better-auth browser client
    plans.ts                        PLANS — all tier limits in one place
    usage.ts                        getUserPlan() + checkAndIncrement()
    rate-limit.ts                   Upstash Redis sliding-window limiter
    constants.ts                    MAX_PROMPT_CHARS
    razorpay.ts                     getRazorpay() lazy instance, signature verification

  server/
    db/
      index.ts                      Drizzle db client (postgres.js)
      schema.ts                     All table definitions
    corsair.ts                      createCorsair() config + initCorsair()
    scripts/
      seed-admin.ts                 Seeds admin user with premium plan

  trpc/
    routers/
      _app.ts                       Root router (gmail, calendar, stats, plans, user, admin)
      plans.ts                      getMyPlan, getOrders, cancelSubscription
      user.ts                       getPreferences, savePreferences
      admin.ts                      Full admin router — 13 procedures
    trpc.ts                         createContext(), protectedProcedure, adminProcedure
    client/index.tsx                TRPCReactProvider, useTRPC hook
    server/index.ts                 Server-side tRPC caller
    handler.ts                      fetchRequestHandler wrapper
    query-client.ts                 TanStack Query client config

  proxy.ts                          Next.js middleware — session check, route protection
  env.ts                            Zod-validated environment variables

src/__tests__/
  lib/
    utils.test.ts                   cn() class merging
    plans.test.ts                   PLANS data integrity
    razorpay.test.ts                HMAC signature verification
    schemas.test.ts                 Zod schema validation
  agent/
    sensitive-patterns.test.ts      SENSITIVE_PATTERNS regex coverage
    output-guardrail.test.ts        sensitiveDataGuardrail.execute()
    enhancer.test.ts                needsEnhancement() skip heuristic

.github/workflows/
  ci.yml                            Lint → Type-check → Tests → Build
```

</details>

---

## Core Features

### Dual-mode mail interface

The `/dashboard/mail` page supports two modes, toggled by the user and persisted to `localStorage`:

- **Manual mode** — a traditional email client. The left sidebar shows folder navigation (inbox, sent, drafts, trash, starred, spam, all mail) with unread counts. The main pane renders a paginated email list with sender, subject, date, snippet, and unread indicator. Clicking an email opens a read pane. Manual mode includes compose, reply, trash, archive, mark-read/unread, batch actions, and search.

- **Agentic mode** — a conversational interface. The GPT-4.1 agent has access to Gmail and Google Calendar via Corsair tools. Responses stream token-by-token over SSE via the OpenAI Agents SDK's `toTextStream()`. A voice input button records audio transcribed by Whisper-1 and inserted into the chat field.

Mode is initialised to `false` (Manual) on both server and client for SSR consistency, then restored from `localStorage` in a `useEffect` after hydration. This avoids React hydration mismatches.

### Integrations and OAuth popup

`/dashboard/integrations` shows the connection status of Gmail and Google Calendar. Connection status is read directly from the `corsair_accounts` DB table — no live API call — so it loads instantly. Clicking "Connect" opens a centred OAuth popup window (`600×660px`) instead of navigating away. A 500ms polling loop detects when the popup closes and automatically calls `refetch()` to update connection status. The OAuth callback redirects to `/dashboard/integrations?connected=1` which triggers a success toast.

### Preferences

The preferences modal (opened from the integrations page) lets users configure:

- **Email focus areas** — suggestion chips (Job applications, Startup/freelancing, Urgent & OTPs, Finance & bills, Studies & deadlines, Inbox zero) plus a free-form tag input. A "Let AI decide" button bypasses manual selection and stores `__ai_decide__` as the signal.
- **AI writing style** — Formal / Casual / Concise selector.
- **Auto-suggest replies** — AI drafts a reply whenever an email is opened.
- **Email signature** — appended to outbound drafts.
- **Morning digest** — AI summary of overnight emails at a user-specified time.
- **Mute notification sounds** — silent mode.

### Calendar view

`/dashboard/calendar` renders upcoming events from Google Calendar, grouped by date. Events are always fetched with `singleEvents: true, orderBy: 'startTime'` and additionally sorted client-side to guarantee chronological order regardless of API caching behaviour.

### Settings

`/dashboard/settings` is linked from the main sidebar. It includes notification toggles, a theme switcher (icon-only `ThemeToggle` component), and other user preferences. Notification switches use CSS custom properties (`--switch-on`, `--switch-off`) to stay visually consistent across both light and dark themes.

### Overview and stats

`/dashboard/overview` shows email volume charts, unread counts, and a live AI analysis summary via the `statsRouter` and an overview-specific agent analysis pass.

---

## Agent Pipeline

Each agentic chat request goes through this optimised pipeline:

```
User message
  |
  +-- t0 timer starts here (captures full latency including enhancer)
  |
  v
Session hydrated from DB (chat_sessions table, capped at last 40 items)
  |
  v
Prompt enhancer (gpt-4.1-nano)
  Skip heuristic: messages ≤ 6 words, containing an email address, or short
  follow-ups in active conversations bypass the enhancer entirely (no LLM call).
  For longer messages: rewrites for clarity using last 4 turns as context.
  |
  v
Agent run (gpt-4.1, OpenAI Agents SDK)             ←─── runs in parallel with ↓
  |
  v
Input safety guardrail (gpt-4.1-nano)              ←─── races the model call (runInParallel: true)
  JSON response: { safe: boolean, reason: string }
  Tripwire triggered → request blocked, logged with injectionFlag: true
  Parse failure → defaults to safe (no false positives)
  |
  v
Tools available to the agent:
  - All Corsair tools via OpenAIAgentsProvider (list_operations, get_schema, run_script)
  - send_email (custom tool — RFC 2822 encoding, handles base64, MIME headers)
  |
  v
Output sensitive-data guardrail (regex, no LLM call)
  Patterns: credit card numbers, SSNs, PEM private keys
  |
  v
Session persisted to DB
  Prompt logged to admin_prompt_logs (tokens, cost, reply, IP, UA, duration)
  |
  v
SSE stream to client (true token streaming via SDK toTextStream + setEncoding('utf8'))
  Request timeout: 25 seconds (Promise.race)
```

### Agent instance caching

Agent instances are cached per `(tenantId, mode)` key at module level in `agent.ts`. Caching eliminates `createAgent()` overhead (Corsair tool schema construction, Zod validators) on every request after the first.

### Prompt enhancer skip heuristic

`needsEnhancement()` in `src/features/agent/enhancer.ts`:
- Messages ≤ 6 words → skip
- Message contains an email address → skip
- Short follow-up (≤ 12 words) in an active conversation → skip

### Safety guardrail parallelism

`runInParallel: true` on `safetyGuardrail` fires the guardrail concurrently with the first model call. Net latency on safe requests: ~0ms.

### Conversation sessions

`chat_sessions` items are capped at 40 (roughly 10–15 turns with tool calls) on read to prevent context blowup. Written back to DB after each run.

### System prompt

`buildAgentInstructions()` (~1,900 tokens). Key behaviours:

- **Specific email lookups** — always use `api.messages.list` with the `q` parameter (from:, subject:, is:unread, has:attachment, date ranges, OR). Never use `db.*` for specific lookups — the local cache is incomplete.
- **Purchase/receipt search** — 3-step fallback: (1) sender + product, (2) product + (purchase OR order OR receipt OR enroll), (3) just the product name. Never return "not found" after only one attempt.
- **Read-only queries** — execute immediately, never ask "shall I proceed?". Fall back from `db.*` to `api.*` automatically.
- **Write actions** — confirm once before executing.
- `entity_id` (real Gmail/Calendar ID) must be used for all Google API calls, never `id` (internal Corsair UUID).
- Never fetch more than 5 emails per tool call.
- Email list format: bold heading, Gmail deep link, no raw headers.
- Calendar: always `Asia/Kolkata` (RFC 3339 `+05:30`). Two-step event creation: `events.create` with `sendUpdates: 'all'`, then `events.update` for Google Meet link.
- `send_email` tool only — never raw `messages.send`.

---

## Authentication

better-auth handles authentication:

- **Provider:** Google OAuth 2.0
- **Scopes:** `gmail.compose`, `gmail.labels`, `gmail.modify`, `gmail.send`, `calendar`, `userinfo.email`, `userinfo.profile`
- **Admin plugin:** adds `role`, `banned`, `banReason`, `banExpires` to the `user` table
- **Default role:** `user`. Admin role set via SQL or seed script.
- **Session:** HTTP-only cookie — `better-auth.session_token` (HTTP) / `__Secure-better-auth.session_token` (HTTPS)

### Seeding admin

```bash
pnpm tsx src/server/scripts/seed-admin.ts
```

Sets role to `admin`, assigns Premium plan, sets `usageResetAt` to 2099-01-01.

---

## Database Schema

All tables are defined in `src/server/db/schema.ts`.

### better-auth tables

| Table | Purpose |
|---|---|
| `user` | User accounts. Extra fields: `role`, `banned`, `banReason`, `banExpires`. |
| `session` | Active sessions with `expiresAt`, `ipAddress`, `userAgent`. |
| `account` | OAuth account links — access token, refresh token, scopes. |
| `verification` | Email/phone verification tokens. |

### Corsair tables

| Table | Purpose |
|---|---|
| `corsair_integrations` | One row per integration (gmail, googlecalendar). |
| `corsair_accounts` | One row per (tenant, integration) pair. Encrypted OAuth credentials. |
| `corsair_entities` | Entity cache. `entity_type`, `entity_id`, `account_id`, `data` (jsonb). |
| `corsair_events` | Webhook event log. |

### Application tables

| Table | Purpose |
|---|---|
| `chat_sessions` | OpenAI Agents SDK `AgentInputItem[]` per user. Capped at 40 items on read. |
| `user_plans` | Plan, usage counters, `usageResetAt`, `subscriptionStatus`, Razorpay fields. |
| `user_preferences` | `focuses` (text[]), `onboardingDone` (bool). |
| `orders` | Razorpay payment orders. `razorpayOrderId`, `razorpayPaymentId`, `plan`, `amount` (paise), `status`. |

### Admin tables

| Table | Purpose |
|---|---|
| `admin_prompt_logs` | Every `runChat()` call. Full prompt, AI reply, status, injection flag, tokens, cost, IP, UA, duration. |
| `admin_audit_log` | Every admin action (ban, unban, plan change). |

---

## API Routes

### POST /api/agent/chat

Three-layer gating: character limit (400) → rate limit (429) → monthly quota (429). Streams SSE: `delta`, `done`, `blocked`, `error`.

### POST /api/voice/transcribe

`multipart/form-data` with `audio` field (webm). Checks/increments `voiceUsed`. Returns `{ text: string }`.

### POST /api/payments/create-order

Creates Razorpay order. Returns `{ orderId, amount, currency, keyId, planName }`.

### POST /api/payments/verify

Verifies HMAC. On success: upgrades `user_plans`, resets counters, sets `usageResetAt` to 30 days out, redirects to `/dashboard/billing?upgraded=1`.

### POST /api/payments/webhook

Server-to-server Razorpay backup for `payment.captured`. Verifies `X-Razorpay-Signature`.

### GET /api/payments/invoice/[orderId]

Generates and streams a PDF invoice using `@react-pdf/renderer`. Authenticates the request and verifies the order belongs to the session user. The PDF includes:
- Invoice number (`YUG-{year}-{orderId suffix}`)
- Bill-to (user name + email) and from (Yugati)
- Line items: subscription subtotal + GST (18%, extracted from inclusive price)
- Total paid
- Razorpay order ID and payment ID
- Download / Print button

Linked from the payment history table in `/dashboard/billing` via the `ExternalLink` icon on each paid order.

### GET /api/corsair/connect

Initiates Corsair OAuth. Designed for popup use — parent polls `popup.closed`, then refetches connection status.

### GET /api/corsair/callback

Handles OAuth callback. On success redirects to `/dashboard/integrations?connected=1`. On error redirects to `/dashboard/integrations?error=connect_failed`.

### GET /api/corsair/disconnect

Removes `corsair_accounts` row.

### POST /api/webhooks/gmail/watch

Registers Gmail push notifications for a tenant via Google Pub/Sub (`gmail.users.watch`). Requires `GMAIL_PUBSUB_TOPIC` env var. Body: `{ tenantId: string }`.

---

## tRPC Routers

### gmailRouter

| Procedure | Type | Description |
|---|---|---|
| `listInbox` | query | Cache-first inbox (Corsair entity DB → Gmail API fallback) |
| `listMessages` | query | Arbitrary query + label filter |
| `getMessage` | query | Full message with body |
| `sendMessage` | mutation | RFC 2822 encoded send |
| `trashMessage` | mutation | Trash + cache eviction |
| `modifyMessage` | mutation | Label add/remove + cache eviction |
| `batchModifyMessages` | mutation | Bulk label changes |
| `listThreads` | query | Thread list |
| `getThread` | query | Full thread |
| `trashThread` | mutation | Thread trash |
| `modifyThread` | mutation | Thread label changes |
| `createDraft` | mutation | Create draft |
| `updateDraft` | mutation | Update draft |
| `sendDraft` | mutation | Send draft |
| `getDraft` | query | Fetch draft |
| `listDrafts` | query | List drafts |
| `listLabels` | query | All Gmail labels |
| `createLabel` | mutation | Create custom label |
| `updateLabel` | mutation | Rename label |
| `deleteLabel` | mutation | Delete label |

### calendarRouter

`listEvents` (always `singleEvents: true, orderBy: 'startTime'`), `createEvent`, `updateEvent`, `deleteEvent`.

### statsRouter

Email volume aggregation for the overview dashboard. `getConnectionStatus` checks `corsair_accounts` via DB join — no live Google API call.

### plansRouter

| Procedure | Type | Description |
|---|---|---|
| `getMyPlan` | query | Current plan, usage counters, limits, reset date |
| `getOrders` | query | Payment history from `orders` table |
| `cancelSubscription` | mutation | Sets plan → `free`, `subscriptionStatus` → `cancelled` immediately |

### userRouter

| Procedure | Type | Description |
|---|---|---|
| `getPreferences` | query | Returns `{ focuses: string[], onboardingDone: boolean }` |
| `savePreferences` | mutation | Upserts `user_preferences`, sets `onboardingDone: true` |

### adminRouter

All 13 procedures require `role === 'admin'`. See [Admin Panel](#admin-panel).

---

## Admin Panel

Role-gated at `/admin`. Requires `user.role = 'admin'`.

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'your@email.com';
```

| Route | What it shows |
|---|---|
| `/admin/overview` | 8 KPI cards, 30-day prompts AreaChart, plan distribution |
| `/admin/users` | User table — search, ban/unban, plan badge, integration status |
| `/admin/users/[id]` | Full profile: token stats, usage bars, recent prompts, sessions |
| `/admin/prompts` | All `runChat()` calls — expandable rows, searchable, filterable |
| `/admin/security` | `injectionFlag = true` rows — regex-highlighted PromptSnapshot cards |
| `/admin/plans` | Revenue totals, plan distribution, all payment orders |
| `/admin/sessions` | Non-expired sessions — device, browser, OS, IP, expiry |
| `/admin/insights` | GPT-4.1 platform analysis — 5 insights with critical/warning/info severity |

---

## Plans and Billing

All limits defined in `src/lib/plans.ts`.

| Tier | Price | AI Messages | Voice | Email Compose | Char Limit | Rate (req/min) |
|---|---|---|---|---|---|---|
| Free | ₹0 | 30 / month | 1 / month | 10 / month | 1,000 | 5 |
| Standard | ₹199 / month | 150 / month | 15 / month | 50 / month | 2,000 | 20 |
| Premium | ₹499 / month | 500 / month | 30 / month | 150 / month | 5,000 | 60 |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited | 10,000 | 120 |

### Invoice generation

Every paid order gets a downloadable PDF invoice at `/api/payments/invoice/[orderId]`. The invoice is generated server-side using `@react-pdf/renderer` and includes itemised subtotal, GST (18% extracted from inclusive price), Razorpay reference IDs, and a print-to-PDF button. Accessible from the `ExternalLink` icon in the billing page payment history.

### Cancel subscription

Users can cancel their subscription from `/dashboard/billing` (Cancel subscription button) or from `/pricing` (Get started free button when on a paid plan). Both flows show a confirmation dialog before executing the `plans.cancelSubscription` mutation, which immediately sets `plan = 'free'` and `subscriptionStatus = 'cancelled'`. No pro-rated refund logic — cancellation is effective immediately.

### Usage counters

`checkAndIncrement` atomically increments the relevant counter. If `usageResetAt` has passed, all counters reset to zero first. A free-plan row is created automatically on the first chat request.

---

## Rate Limiting and Quotas

Upstash Redis sliding-window per user per plan tier. Per-request checks:

1. **Character limit** — client-side counter + server-side 400.
2. **Monthly message quota** — atomic increment, 429 on exhaustion.
3. **Monthly voice quota** — incremented on each Whisper call.

---

## Email Cache

`GmailService.listInbox` two-level strategy:
1. Read from `corsair_entities` (Corsair entity DB).
2. If most recent `updated_at` is within 3 minutes, return sorted by `internalDate` desc.
3. On cache miss, fetch from Gmail API and upsert.
4. `q` parameter always bypasses cache and hits Gmail API directly.
5. `trashMessage` and `modifyMessage` call `deleteByEntityId` to evict stale entries.

---

## Voice Input

1. Microphone button → `getUserMedia({ audio: true })`.
2. `MediaRecorder` (webm), 20-second hard limit.
3. Blob sent to `/api/voice/transcribe` as `multipart/form-data`.
4. Checks/increments `voiceUsed`, calls `whisper-1`.
5. Transcription inserted into chat input.

---

## Payment Integration

### Order flow

1. User clicks upgrade on `/pricing` or `/dashboard/billing`.
2. `POST /api/payments/create-order` → Razorpay order created.
3. Razorpay checkout modal opens in-browser.
4. On success → `POST /api/payments/verify` → HMAC verified → plan upgraded.
5. Redirect to `/dashboard/billing?upgraded=1` → success toast.
6. Invoice PDF available at `/api/payments/invoice/{orderId}`.

### Webhook

`POST /api/payments/webhook` handles `payment.captured` as server-to-server backup. Verifies `X-Razorpay-Signature`.

### Downgrade to free

- From `/pricing`: clicking "Get started free" when on a paid plan shows an amber confirmation dialog. On confirm: `plans.cancelSubscription` → redirect to `/dashboard/billing`.
- From `/dashboard/billing`: "Cancel subscription" shows a red confirmation dialog. On confirm: `plans.cancelSubscription` → success toast, plan card updates.

---

## Theming

Yugati ships a full dark/light theme system built on Tailwind CSS 4 custom properties.

### How it works

- **Dark mode (default):** `:root` defines `--background: #000000` and the full zinc/blue/green color ladder as dark values.
- **Light mode:** `:root[data-theme='light']` redefines all color tokens. The zinc scale is fully inverted (zinc-950 = `#faf6ec` cream, zinc-50 = dark ink). Blue remaps to near-black ink (`#211d16`) maintaining the paper aesthetic. Green softens to earthy sage.
- **Body:** `background-color: var(--background); color: var(--foreground)` ensures every page inherits the theme without per-page overrides.
- **Toggle:** `ThemeToggle` component (icon-only, no text label) sets `data-theme='light'` on `<html>` and persists to `localStorage`.

### Special-case overrides

Several components need explicit fixes because their colours don't remap cleanly:

| Component | Fix |
|---|---|
| Switch thumb | `style={{ backgroundColor: '#ffffff' }}` — bypasses theme remapping |
| Switch track | `--switch-on: #3b82f6` / `--switch-off: #cfc5ab` — explicit CSS vars |
| Progress bars | Inline `style` with hardcoded hex (`#3b82f6`, `#ef4444`, `#eab308`) |
| Category tab badges | `.tab-badge` class + light-mode overrides in `globals.css` |
| Primary action buttons (`bg-white`) | Global rule → warm espresso (`#5c4535`) in light mode |
| Overlay scrims (`bg-black/60`) | Remapped to warm dark `rgba(35,31,22,0.45)` |
| Calendar event pills | Soft pastels via `.cal-event.bg-*` overrides |

---

## Middleware

`src/proxy.ts` runs on every request except static assets and `api/auth` routes.

- Checks `better-auth.session_token` (HTTP) and `__Secure-better-auth.session_token` (HTTPS).
- Unauthenticated → `/dashboard/*` or `/admin/*`: redirect to `/`.
- Authenticated → `/`: redirect to `/dashboard`.

---

## Testing

[Vitest](https://vitest.dev/). No database, no network, no OpenAI calls.

```bash
pnpm test              # run once
pnpm test:watch        # watch mode
pnpm test:coverage     # coverage report (v8)
```

**51 tests across 7 files:**

| File | What's covered |
|---|---|
| `lib/utils.test.ts` | `cn()` — merges, deduplicates Tailwind classes |
| `lib/plans.test.ts` | PLANS data integrity — prices, paise, tier ordering |
| `lib/razorpay.test.ts` | `verifyPaymentSignature` + `verifyWebhookSignature` |
| `lib/schemas.test.ts` | `idSchema`, `emailSchema`, date schemas |
| `agent/sensitive-patterns.test.ts` | SENSITIVE_PATTERNS regex coverage |
| `agent/output-guardrail.test.ts` | `sensitiveDataGuardrail.execute` |
| `agent/enhancer.test.ts` | `needsEnhancement()` — skip heuristic cases |

---

## CI/CD

GitHub Actions at `.github/workflows/ci.yml`. Runs on every push and PR to `main`.

```
push / PR to main
  │
  ├─ lint          ESLint + tsc --noEmit (parallel)
  ├─ test          Vitest unit suite (parallel)
  │
  └─ build         next build  (only after lint + test pass)
```

- In-progress runs on the same ref are cancelled on new push.
- Node 22, pnpm 11.
- Build step stubs all required env vars for Zod validation.

---

## Environment Variables

All validated at startup via Zod in `src/env.ts`.

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL pooler URL (port 6543) |
| `DIRECT_URL` | Supabase PostgreSQL direct URL (port 5432) for migrations |
| `CORSAIR_KEK` | Key Encryption Key for Corsair credential encryption |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |
| `BETTER_AUTH_SECRET` | Secret for better-auth session signing (min 32 bytes) |
| `NEXT_PUBLIC_APP_URL` | Full public URL (e.g. `https://www.yugati.in`) |
| `OPENAI_API_KEY` | OpenAI API key — GPT-4.1, GPT-4.1-nano, Whisper-1 |

### Rate limiting

| Variable | Description |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

### Payments

| Variable | Description |
|---|---|
| `RAZORPAY_KEY_ID` | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signature secret |

### Webhooks (optional)

| Variable | Description |
|---|---|
| `GMAIL_PUBSUB_TOPIC` | Google Pub/Sub topic name for Gmail push notifications |

---

## Local Development

### Prerequisites

- Node.js 22+
- pnpm 11+
- Supabase project or local PostgreSQL
- Google Cloud project with OAuth 2.0 credentials
- Upstash Redis database (free tier sufficient)
- Razorpay account (optional — only for payment testing)

### Setup

```bash
pnpm install
cp .env.example .env.local
# fill in all required env vars
pnpm db:push
pnpm dev
```

App available at `http://localhost:3000`.

### Google OAuth setup

Authorised JavaScript origins:
```
http://localhost:3000
https://www.yugati.in
```

Authorised redirect URIs:
```
http://localhost:3000/api/auth/callback/google
http://localhost:3000/api/corsair/callback
https://www.yugati.in/api/auth/callback/google
https://www.yugati.in/api/corsair/callback
```

Required OAuth scopes:
```
https://www.googleapis.com/auth/gmail.compose
https://www.googleapis.com/auth/gmail.labels
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

### Setting up admin access

```bash
pnpm tsx src/server/scripts/seed-admin.ts
```

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'your@email.com';
```

Navigate to `/admin` or click the Admin link in the sidebar.

---

## Database Management

```bash
# Push schema changes directly (no migration files)
pnpm db:push

# Generate SQL migration files
pnpm db:generate

# Apply pending migrations
pnpm db:migrate

# Open Drizzle Studio at localhost:4983
pnpm db:studio
```

Use the pooler URL (port 6543) for `DATABASE_URL` at runtime. Use the direct URL (port 5432) for `DIRECT_URL` for DDL — Supabase requires a non-pooled connection for schema changes.

---

## Deployment

Deployed on Vercel. All API routes with Node.js-only modules export `export const runtime = 'nodejs'` (required for `@react-pdf/renderer` and other native modules).

### Vercel environment variables

Set all variables from [Environment Variables](#environment-variables).

- `NEXT_PUBLIC_APP_URL` must be the production domain.
- `DATABASE_URL` must be the pooler URL (port 6543).

### Razorpay webhook

```
https://www.yugati.in/api/payments/webhook
```

Enable `payment.captured`. Copy the webhook secret to `RAZORPAY_WEBHOOK_SECRET`.

### Build

```bash
pnpm build
```

Build fails if required environment variables are missing. Razorpay is lazily instantiated to avoid failures during Vercel's static collection phase.
