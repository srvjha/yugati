# Yugati

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
17. [Middleware](#middleware)
18. [Testing](#testing)
19. [CI/CD](#cicd)
20. [Environment Variables](#environment-variables)
21. [Local Development](#local-development)
22. [Database Management](#database-management)
23. [Deployment](#deployment)

---

## Overview

Yugati integrates with Gmail and Google Calendar using Corsair, an integration layer that handles OAuth flows, credential storage, API proxying, and entity caching. Users sign in with Google, grant the required OAuth scopes, and immediately get access to:

- An AI chat interface (Agentic mode) where a GPT-4.1 agent can read emails, draft and send messages, create calendar events, and answer productivity queries.
- A manual interface where the user browses, searches, reads, composes, and manages emails and events directly without AI involvement.
- A preferences system where users configure AI writing style, email focus areas, signatures, and digest settings.
- An admin panel at `/admin` with full operational telemetry: user management, per-request AI cost tracking, prompt injection detection, live sessions, revenue, and GPT-generated platform insights.

The platform enforces per-plan monthly usage quotas, per-minute rate limits, and per-message character limits. Payments are processed through Razorpay in INR.

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
    globals.css                     Tailwind imports, CSS variables
    pricing/
      page.tsx                      Pricing page with Razorpay checkout
    dashboard/
      page.tsx                      Redirect → /dashboard/mail
      mail/
        page.tsx                    Main mail page (Manual + Agentic modes)
        [id]/page.tsx               Single email thread view
        components/
          MailSidebar.tsx           Collapsible sidebar (folders, nav, compose, admin link)
          MailTopBar.tsx            Search, view controls
          ChatView.tsx              Agentic SSE chat UI + voice input
          ComposeModal.tsx          Email compose overlay
          CommandPalette.tsx        Keyboard command palette
          SubscriptionsPanel.tsx    Subscription management
          MailInsightPanel.tsx      AI email insights panel
          AuthError.tsx             OAuth error state
          SkeletonList.tsx          Loading skeleton
          TooltipWrap.tsx           Radix tooltip wrapper
          CategoryTabs.tsx          Inbox category tabs
          EmailRow.tsx              Email list row
      billing/
        page.tsx                    Plan card, usage meters, order history, upgrade
      calendar/
        page.tsx                    Google Calendar event list
      chat/
        page.tsx                    Standalone agentic chat
      integrations/
        page.tsx                    Integration connection + OAuth popup + preferences
      overview/
        page.tsx                    Dashboard overview with stats and charts
      settings/
        page.tsx                    User settings
      components/
        chat-view.tsx               Agentic chat UI
        sidebar-nav.tsx             Left sidebar (nav links, UsagePill, admin link)
        integrations-view.tsx       OAuth popup flow + preferences modal
        overview-view.tsx           Overview stats and charts
        theme-toggle.tsx            Dark/light mode toggle
        usage-pill.tsx              Usage summary pill (collapsed + expanded)
    admin/
      layout.tsx                    Server component auth guard (role === 'admin')
      page.tsx                      Redirect → /admin/overview
      components/
        admin-sidebar.tsx           Admin sidebar (red INTERNAL badge, 7 nav items)
        admin-stat-card.tsx         KPI card with optional delta badge
        prompt-snapshot.tsx         Injection "screenshot" card with regex highlighting
      overview/
        page.tsx                    8 KPI cards + daily prompts AreaChart + plan distribution
      users/
        page.tsx                    User table — search, ban/unban, plan badge, integrations
        [id]/page.tsx               Full user profile — token stats, usage bars, recent prompts
      prompts/
        page.tsx                    All prompt logs — expandable rows, plan badge, AI reply
      security/
        page.tsx                    Injection attempts — PromptSnapshot cards
      plans/
        page.tsx                    Revenue totals + payment orders table
      sessions/
        page.tsx                    Live sessions — device parsing, browser, OS, IP
      insights/
        page.tsx                    GPT-4.1 generated platform insights (critical/warning/info)
    api/
      agent/chat/route.ts           POST — runs agent, SSE stream, quota + rate limit
      auth/[...all]/route.ts        better-auth catch-all handler
      auth/clear-session/route.ts   DELETE — clears session cookie
      corsair/callback/route.ts     OAuth callback for Corsair integrations
      corsair/connect/route.ts      Initiates Corsair OAuth connect (popup-safe)
      corsair/disconnect/route.ts   Disconnects a Corsair integration
      payments/create-order/        POST — creates Razorpay order
      payments/verify/              POST — verifies HMAC, upgrades plan
      payments/webhook/             POST — Razorpay server webhook
      trpc/[trpc]/route.ts          tRPC HTTP handler
      voice/transcribe/route.ts     POST — Whisper transcription

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
        router.ts                   calendarRouter
        service.ts                  CalendarService
        schema.ts                   Zod schemas
      stats/
        router.ts                   statsRouter
        service.ts                  StatsService

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
      plans.ts                      getMyPlan, getOrders
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

Mode is initialised from `localStorage` after hydration to avoid SSR/client mismatch.

### Integrations and OAuth popup

`/dashboard/integrations` shows the connection status of Gmail and Google Calendar. Clicking "Connect" opens a centred OAuth popup window (`600×660px`) instead of navigating away. A 500ms polling loop detects when the popup closes and automatically calls `refetch()` to update connection status — the user never leaves the page.

### Preferences

The preferences modal (opened from the integrations page) lets users configure:

- **Email focus areas** — suggestion chips (Job applications, Startup/freelancing, Urgent & OTPs, Finance & bills, Studies & deadlines, Inbox zero) plus a free-form tag input. A "Let AI decide" button bypasses manual selection and stores `__ai_decide__` as the signal. Saved to the DB via `trpc.user.savePreferences`, which shapes smart summaries and AI replies.
- **AI writing style** — Formal / Casual / Concise selector.
- **Auto-suggest replies** — AI drafts a reply whenever an email is opened.
- **Email signature** — appended to outbound drafts.
- **Morning digest** — AI summary of overnight emails at a user-specified time.
- **Mute notification sounds** — silent mode.

### Calendar view

`/dashboard/calendar` renders upcoming events from Google Calendar, grouped by date, via `calendarRouter.listEvents`.

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

Agent instances are cached per `(tenantId, mode)` key at module level in `agent.ts`. `createAgent()` involves non-trivial work: instantiating `OpenAIAgentsProvider`, building Corsair tool schemas, and constructing Zod validators. Caching eliminates this cost on every request after the first.

### Prompt enhancer skip heuristic

`src/features/agent/enhancer.ts` implements `needsEnhancement()`:
- Messages ≤ 6 words → skip (e.g. "show me my unread emails")
- Message contains an email address → already specific, skip
- Short follow-up (≤ 12 words) in an active conversation → skip

When skipped, the raw message is passed directly to the agent — saving the entire `gpt-4.1-nano` round-trip (~300–500ms).

### Safety guardrail parallelism

The `runInParallel` option on `safetyGuardrail` defaults to `true`, meaning the SDK fires the guardrail **concurrently with the first model call**. If the guardrail trips, the model response is discarded. If it passes, the model response is already in flight. Net latency added by the guardrail: ~0ms on safe requests.

Previously `runInParallel: false` was set, causing a full blocking sequential LLM call (~600ms) before every request. Removing it was the single largest latency improvement.

### Conversation sessions

`src/features/agent/session.ts` uses the SDK `MemorySession`, hydrated from `chat_sessions` on each request. Session items are capped at the most recent 40 (roughly 10–15 turns with tool calls) to prevent context blowup on long conversations. After the run, items are written back to the DB.

### Prompt logging

Every `runChat()` call — successful, blocked, or errored — is logged to `admin_prompt_logs` via `logPrompt()` (fire-and-forget, never throws). Token counts are read from `result.state.usage.inputTokens` / `outputTokens` (the SDK's `Usage` class uses camelCase). Cost is calculated per-model from the pricing table in `logger.ts`. The full agent reply is stored in the `agentReply` column.

### System prompt

`buildAgentInstructions()` produces the agent's system prompt (~1,900 tokens after cleanup). Key behaviours enforced:

- **Read-only queries** (list/show/summarise emails, events): execute immediately in one response, never ask "shall I proceed?". If `db.*` returns partial data, automatically fall back to `api.*`.
- **Write actions** (send, delete, create): confirm once before executing.
- `db.*` (Corsair entity cache) → try first for broad list queries. `api.*` (live Google) → fall back or use directly for specific lookups.
- `entity_id` field (real Gmail/Calendar ID) must always be used for Google API calls, never `id` (internal Corsair UUID).
- Never fetch more than 5 emails per tool call.
- Email list format: bold heading line (number, sender, subject, date), Gmail deep link on the next line, no raw headers.
- Calendar timezone: always `Asia/Kolkata` (`RFC 3339` datetimes with `+05:30`).
- Two-step calendar event creation: `events.create` with `sendUpdates: 'all'`, then `events.update` to attach a Google Meet link via `conferenceDataVersion: 1`.
- `send_email` tool only — never call raw `messages.send` (requires RFC 2822 encoding that `send_email` handles).

---

## Authentication

better-auth handles authentication:

- **Provider:** Google OAuth 2.0
- **Scopes:** `gmail.compose`, `gmail.labels`, `gmail.modify`, `gmail.send`, `calendar`, `userinfo.email`, `userinfo.profile`
- **Admin plugin:** adds `role`, `banned`, `banReason`, `banExpires` fields to the `user` table
- **Default role:** `user`. Admin role set via SQL: `UPDATE "user" SET role = 'admin' WHERE email = '...'`
- **Session:** HTTP-only cookie — `better-auth.session_token` (HTTP) / `__Secure-better-auth.session_token` (HTTPS)

The middleware checks both cookie names. Logged-in users visiting `/` are redirected to `/dashboard`. Unauthenticated users visiting `/dashboard/*` or `/admin/*` are redirected to `/`.

### Seeding admin

```bash
pnpm tsx src/server/scripts/seed-admin.ts
```

Sets role to `admin`, assigns Premium plan, sets `usageResetAt` to 2099-01-01 so the admin never hits usage limits.

---

## Database Schema

All tables are defined in `src/server/db/schema.ts`.

### better-auth tables

| Table | Purpose |
|---|---|
| `user` | User accounts. Extra fields: `role`, `banned`, `banReason`, `banExpires`. |
| `session` | Active sessions with `expiresAt`, `ipAddress`, `userAgent`. References `user.id`. |
| `account` | OAuth account links — access token, refresh token, scopes. |
| `verification` | Email/phone verification tokens. |

### Corsair tables

| Table | Purpose |
|---|---|
| `corsair_integrations` | One row per integration (gmail, googlecalendar). Encrypted config and DEK. |
| `corsair_accounts` | One row per (tenant, integration) pair. Encrypted OAuth credentials. |
| `corsair_entities` | Entity cache. `entity_type`, `entity_id`, `account_id`, `data` (jsonb). |
| `corsair_events` | Webhook event log. |

### Application tables

| Table | Purpose |
|---|---|
| `chat_sessions` | OpenAI Agents SDK `AgentInputItem[]` per user. `items` is jsonb. Capped at 40 items on read. |
| `user_plans` | Plan, usage counters (`messagesUsed`, `voiceUsed`, `composeUsed`), `usageResetAt`, Razorpay fields. |
| `user_preferences` | `focuses` (text[]), `onboardingDone` (bool). One row per user. |
| `orders` | Razorpay payment orders. `razorpayOrderId`, `razorpayPaymentId`, `plan`, `amount` (paise), `status`. |

### Admin tables

| Table | Purpose |
|---|---|
| `admin_prompt_logs` | Every `runChat()` call. Full prompt, enhanced prompt, AI reply, status, injection flag, model, tokens (prompt + completion + total), cost (USD, numeric 10,6), IP, user agent, duration. |
| `admin_audit_log` | Every admin action (ban, unban, plan change). `adminId`, `action`, `targetId`, `meta` (jsonb). |

**`admin_prompt_logs` columns:**

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | random uid |
| `userId` | text → user.id | cascade delete |
| `conversationId` | text | nullable |
| `rawPrompt` | text | exactly what the user typed |
| `enhancedPrompt` | text | after enhancer pass, null if same as raw |
| `agentReply` | text | `result.finalOutput` — the full AI response |
| `status` | text | `ok` \| `blocked_input` \| `blocked_output` \| `error` |
| `blockedReason` | text | guardrail reason, null if ok |
| `injectionFlag` | bool | true when `InputGuardrailTripwireTriggered` caught |
| `model` | text | default `gpt-4.1` |
| `promptTokens` | int | `result.state.usage.inputTokens` |
| `completionTokens` | int | `result.state.usage.outputTokens` |
| `totalTokens` | int | sum |
| `estimatedCostUsd` | numeric(10,6) | per model pricing table in `logger.ts` |
| `ipAddress` | text | `x-forwarded-for` / `x-real-ip` header |
| `userAgent` | text | `user-agent` header |
| `durationMs` | int | wall-clock from before enhancer call |
| `createdAt` | timestamp with tz | auto |

**Model pricing table (`logger.ts`):**

| Model | Input $/1M | Output $/1M |
|---|---|---|
| gpt-4.1 | $2.00 | $8.00 |
| gpt-4.1-mini | $0.40 | $1.60 |
| gpt-4.1-nano | $0.10 | $0.40 |
| gpt-4o | $5.00 | $15.00 |
| gpt-4o-mini | $0.15 | $0.60 |

---

## API Routes

### POST /api/agent/chat

Three-layer gating before running the agent:

1. **Character limit** — checks last user message length against plan `charLimit`. Returns 400 if exceeded.
2. **Rate limit** — Upstash Redis sliding window per user per plan tier. Returns 429 with `Retry-After` header.
3. **Monthly quota** — atomic increment of `messagesUsed`. Returns 429 when cap reached.

Runs `runChat()` wrapped in a 25-second `Promise.race` timeout. Streams the result as SSE:

| Type | Payload |
|---|---|
| `delta` | `{ type: "delta", text: string }` — 20-char chunk, no delay |
| `done` | `{ type: "done", conversationId: string }` |
| `blocked` | `{ type: "blocked", reason: string, conversationId: string }` |
| `error` | `{ type: "error", message: string }` |

### POST /api/voice/transcribe

Accepts `multipart/form-data` with an `audio` field (webm blob). Checks and increments `voiceUsed` quota. Calls OpenAI `whisper-1`. Returns `{ text: string }`.

### POST /api/payments/create-order

Creates a Razorpay order for `standard` or `premium`. Inserts an `orders` row with status `created`. Returns `{ orderId, amount, currency, keyId, planName }`.

### POST /api/payments/verify

Verifies HMAC: `hmac_sha256(orderId + "|" + paymentId, RAZORPAY_KEY_SECRET)`. On success: updates `user_plans` to new plan, resets usage counters, sets `usageResetAt` to 30 days from now, marks order as `paid`. Redirects to `/dashboard/billing?upgraded=1`.

### POST /api/payments/webhook

Server-to-server Razorpay backup. Verifies `X-Razorpay-Signature` header. Handles `payment.captured` to update order status as failsafe.

### GET /api/corsair/connect

Initiates Corsair OAuth connect flow. Designed to work inside a popup — the OAuth flow completes in the popup and the parent window polls `popup.closed` to detect completion, then refetches connection status.

### GET /api/corsair/callback

Handles the OAuth callback. Stores access and refresh tokens in `corsair_accounts`.

### GET /api/corsair/disconnect

Disconnects a Corsair integration by removing the `corsair_accounts` row.

---

## tRPC Routers

All user-facing procedures use `protectedProcedure` (enforces authentication). Admin procedures use `adminProcedure` (additionally queries `user.role === 'admin'`).

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

`listEvents`, `createEvent`, `updateEvent`, `deleteEvent` — backed by Google Calendar via Corsair.

### statsRouter

Email volume aggregation queries for the overview dashboard and connection status check.

### plansRouter

| Procedure | Type | Description |
|---|---|---|
| `getMyPlan` | query | Current plan, usage counters, limits, reset date |
| `getOrders` | query | Payment history from `orders` table |

### userRouter

| Procedure | Type | Description |
|---|---|---|
| `getPreferences` | query | Returns `{ focuses: string[], onboardingDone: boolean }` |
| `savePreferences` | mutation | Upserts `user_preferences` row, sets `onboardingDone: true` |

### adminRouter

All procedures require `role === 'admin'`. See [Admin Panel](#admin-panel) for full details.

---

## Admin Panel

The admin panel at `/admin` is a role-gated internal operations centre. Access requires `user.role = 'admin'` in the database.

### Setting admin role

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'your@email.com';
```

Or run the seed script:

```bash
pnpm tsx src/server/scripts/seed-admin.ts
```

### Sections

| Route | What it shows |
|---|---|
| `/admin/overview` | 8 KPI cards: total users, new today/week, active sessions, total prompts, prompts today, blocked today, injection attempts, total cost. 30-day daily prompts AreaChart (zero-filled). Plan distribution bars. |
| `/admin/users` | Paginated user table with search and plan filter. Per-user: avatar, name, email, plan badge, prompt count, Gmail/Calendar integration status (coloured icons), join date, active/banned status. Ban/unban mutations with audit logging. Link to full profile. |
| `/admin/users/[id]` | Full user profile: token usage bars, estimated cost, recent prompt logs, active sessions. |
| `/admin/prompts` | Every `runChat()` call. Columns: user, plan badge, prompt (truncated), status badge, tokens, cost, duration, date+time (UTC AM/PM). Click to expand: raw prompt, enhanced prompt, AI reply, model, token breakdown, IP. Searchable and filterable by status. |
| `/admin/security` | Injection attempts only (`injectionFlag = true`). `PromptSnapshot` cards: monospace prompt display with regex-highlighted danger phrases (`ignore.*instructions`, `act as`, `jailbreak`, `DAN mode`, `[INST]`, `<|im_start|>` etc). Red/amber border by status. |
| `/admin/plans` | Total ₹ revenue, plan distribution, all payment orders with status. |
| `/admin/sessions` | Active (non-expired) sessions. Per session: user, device type (mobile/tablet/desktop), browser, OS (parsed from user agent), IP address, start time, expiry — all in UTC AM/PM, `whitespace-nowrap`. |
| `/admin/insights` | GPT-4.1 analyses the last 30 days of platform metrics and returns 5 insights with `critical` / `warning` / `info` severity badges. |

### Admin tRPC procedures (`trpc.admin.*`)

| Procedure | Type | Description |
|---|---|---|
| `getStats` | query | Overview KPIs + 30-day daily prompt chart data |
| `listUsers` | query | Paginated users with plan, prompt count, per-integration status |
| `getUser` | query | Full profile + token stats + recent prompts + sessions |
| `banUser` | mutation | Sets `banned = true`, logs to `admin_audit_log` |
| `unbanUser` | mutation | Clears ban, logs to `admin_audit_log` |
| `changeUserPlan` | mutation | Updates `userPlans.plan`, logs to `admin_audit_log` |
| `listPromptLogs` | query | Paginated logs with user + plan join, filter by status/injection/search |
| `getPromptLog` | query | Single log with user details |
| `listInjections` | query | `injectionFlag = true` rows only |
| `listSessions` | query | Non-expired sessions with user join |
| `listOrders` | query | Payment orders, filter by status |
| `getAiInsights` | query | GPT-4.1 platform analysis, 5 insights with severity |
| `listAuditLog` | query | Admin action history |

### Injection detection

`InputGuardrailTripwireTriggered` is caught in `runChat()` and logged with `injectionFlag: true`, `status: 'blocked_input'`. The `PromptSnapshot` component renders the raw prompt with client-side regex scanning — matched spans are wrapped in `<mark>` with `bg-red-500/25 text-red-300`. No real browser screenshot is taken (GDPR/IT Act compliance). The styled card captures more forensic detail than a screenshot.

### Sessions device parsing

`parseUA(ua)` in `/admin/sessions/page.tsx` extracts:
- **Browser:** Edge / Chrome / Safari / Firefox / Opera
- **OS:** Windows 11/10 / Windows / macOS / Android / iOS / Linux
- **Device:** mobile / tablet / desktop (from iPhone/iPad/Android UA strings)

Dates shown as `DD/MM/YY, HH:MM AM/PM UTC`.

---

## Plans and Billing

All plan limits are defined in `src/lib/plans.ts`.

| Tier | Price | AI Messages | Voice | Email Compose | Char Limit | Rate (req/min) |
|---|---|---|---|---|---|---|
| Free | ₹0 | 30 / month | 1 / month | 10 / month | 1,000 | 5 |
| Standard | ₹199 / month | 150 / month | 15 / month | 50 / month | 2,000 | 20 |
| Premium | ₹499 / month | 500 / month | 30 / month | 150 / month | 5,000 | 60 |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited | 10,000 | 120 |

Usage counters (`messagesUsed`, `voiceUsed`, `composeUsed`) are stored in `user_plans`. `checkAndIncrement` atomically increments the counter. If `usageResetAt` has passed, all counters reset to zero before the check.

A free-plan row is created automatically on the first chat request. No extra step required beyond Google sign-in.

---

## Rate Limiting and Quotas

Rate limiting uses Upstash Redis with a sliding window algorithm, defined per plan tier in `src/lib/rate-limit.ts`.

In addition to per-minute rate limiting, every chat request checks:

1. **Character limit** — enforced client-side (counter turns yellow → red) and server-side (400 with clear error).
2. **Monthly message quota** — atomic increment, 429 when exhausted.
3. **Monthly voice quota** — incremented on each Whisper call.

`MAX_PROMPT_CHARS` is exported from `src/lib/constants.ts` to keep the Redis client out of the browser bundle.

---

## Email Cache

`GmailService.listInbox` uses a two-level cache strategy:

1. **Cache read** — `corsair.gmail.db.messages.list({ limit })` reads from `corsair_entities`.
2. **Freshness check** — if the most recent `updated_at` is within 3 minutes, return cached data sorted by `internalDate` desc.
3. **Cache miss** — fetch from Gmail API, upsert each message via `corsair.gmail.db.messages.upsertByEntityId`.
4. **Search bypass** — `q` parameter always bypasses cache and hits Gmail API directly.
5. **Mutation eviction** — `trashMessage` and `modifyMessage` call `deleteByEntityId` to evict stale cache entries.

---

## Voice Input

1. User clicks the microphone button. Browser requests `getUserMedia({ audio: true })`.
2. Recording starts via `MediaRecorder` (webm). 20-second hard limit.
3. On stop, audio blob is sent as `multipart/form-data` to `/api/voice/transcribe`.
4. Route checks and increments `voiceUsed`, calls `whisper-1`.
5. Transcription is inserted into the chat input field.

---

## Payment Integration

Razorpay processes all payments. Lazy instantiation via `getRazorpay()` avoids build-time crashes during Vercel static page collection.

### Order flow

1. User clicks upgrade on `/pricing` or `/dashboard/billing`.
2. Browser calls `POST /api/payments/create-order` with `{ plan }`.
3. Server creates Razorpay order, returns `{ orderId, amount, currency, keyId }`.
4. Razorpay checkout modal opens.
5. On payment success, Razorpay calls the handler with `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`.
6. Browser sends to `POST /api/payments/verify`.
7. Server verifies: `hmac_sha256(orderId + "|" + paymentId, RAZORPAY_KEY_SECRET)`.
8. On success: plan upgraded, counters reset, redirect to `/dashboard/billing?upgraded=1`.

### Webhook

`POST /api/payments/webhook` handles `payment.captured` as a server-to-server backup. Verifies `X-Razorpay-Signature` using `RAZORPAY_WEBHOOK_SECRET`.

---

## Middleware

`src/proxy.ts` runs on every request except `_next/static`, `_next/image`, `favicon.ico`, and `api/auth` routes.

Checks both cookie names:
- `better-auth.session_token` (HTTP / development)
- `__Secure-better-auth.session_token` (HTTPS / production)

Rules:
- Unauthenticated → `/dashboard/*` or `/admin/*`: redirect to `/`
- Authenticated → `/`: redirect to `/dashboard`
- All other requests: pass through

---

## Testing

Tests are written with [Vitest](https://vitest.dev/) and live in `src/__tests__/`. They cover pure/unit-testable modules — no database, no network, no OpenAI calls.

```bash
pnpm test              # run once
pnpm test:watch        # watch mode
pnpm test:coverage     # coverage report (v8)
```

**51 tests across 7 files:**

| File | What's covered |
|---|---|
| `lib/utils.test.ts` | `cn()` — merges, deduplicates Tailwind classes, handles falsy values |
| `lib/plans.test.ts` | PLANS data integrity — prices, paise = priceInr×100, tier ordering, required fields |
| `lib/razorpay.test.ts` | `verifyPaymentSignature` + `verifyWebhookSignature` — valid HMAC, tampered signature, wrong-length guard |
| `lib/schemas.test.ts` | `idSchema`, `emailSchema`, `isoDateTimeSchema`, `isoDateSchema` — valid and invalid inputs |
| `agent/sensitive-patterns.test.ts` | SENSITIVE_PATTERNS — Bearer tokens, PEM headers, base64 blobs, safe content passes |
| `agent/output-guardrail.test.ts` | `sensitiveDataGuardrail.execute` — clean output, token leak, PEM key, object output |
| `agent/enhancer.test.ts` | `needsEnhancement()` — short messages / email addresses / follow-ups skip; long first messages enhance |

Env vars required by Zod at import time are stubbed via `vi.mock('@/env', ...)` in the razorpay test. No real secrets are needed to run the suite.

---

## CI/CD

GitHub Actions workflow at `.github/workflows/ci.yml` runs on every push and pull request to `main`.

```
push / PR to main
  │
  ├─ lint          ESLint + tsc --noEmit (parallel)
  ├─ test          Vitest unit suite (parallel)
  │
  └─ build         next build  (only after lint + test pass)
```

- **Concurrency:** in-progress runs on the same ref are cancelled when a new push arrives.
- **Node version:** 22 (satisfies pnpm v11's `>=22.13` requirement).
- **pnpm version:** 11 (pinned via `pnpm/action-setup@v4`).
- **Env vars:** build step stubs all required vars so Zod validation passes without real credentials.

---

## Environment Variables

All variables are validated at startup via Zod in `src/env.ts`. Missing required variables throw at boot with a descriptive error.

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL pooler URL (port 6543) for application queries |
| `DIRECT_URL` | Supabase PostgreSQL direct URL (port 5432) for migrations |
| `CORSAIR_KEK` | Key Encryption Key for Corsair credential encryption |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |
| `BETTER_AUTH_SECRET` | Secret for better-auth session signing (min 32 random bytes) |
| `NEXT_PUBLIC_APP_URL` | Full public URL (e.g. `https://www.yugati.in`). Defaults to `http://localhost:3000`. |
| `OPENAI_API_KEY` | OpenAI API key — used for GPT-4.1, GPT-4.1-nano, Whisper-1 |

### Rate limiting

| Variable | Description |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

### Payments

| Variable | Description |
|---|---|
| `RAZORPAY_KEY_ID` | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signature secret |

---

## Local Development

### Prerequisites

- Node.js 22+
- pnpm 11+
- Supabase project or local PostgreSQL
- Google Cloud project with OAuth 2.0 credentials (see scopes below)
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

In Google Cloud Console → OAuth 2.0 client → Authorised JavaScript origins:
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

`/api/auth/callback/google` — better-auth sign-in flow.
`/api/corsair/callback` — Corsair integration OAuth flow.

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

Sign in with the target email at least once, then either run the seed script or set via SQL:

```bash
pnpm tsx src/server/scripts/seed-admin.ts
```

```sql
-- Manual promotion
UPDATE "user" SET role = 'admin' WHERE email = 'your@email.com';
```

Navigate to `/admin` or click the Admin link in the sidebar (only visible to admin users).

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

If `drizzle.config.js` doesn't load `.env.local` automatically:

```bash
DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." pnpm db:push
```

Use the pooler URL (port 6543) for `DATABASE_URL` at runtime. Use the direct URL (port 5432) for `DIRECT_URL` for DDL operations — Supabase requires a non-pooled connection for schema changes.

---

## Deployment

Deployed on Vercel. All API routes with Node.js-only modules export `export const runtime = 'nodejs'`.

### Vercel environment variables

Set all variables from [Environment Variables](#environment-variables) under Settings → Environment Variables.

- `NEXT_PUBLIC_APP_URL` must be the production domain for better-auth to construct correct OAuth redirect URLs.
- `DATABASE_URL` must be the pooler URL (port 6543).
- `DIRECT_URL` (port 5432) only needed if running migrations from CI.

### Razorpay webhook

Create a webhook in the Razorpay dashboard pointing to:

```
https://www.yugati.in/api/payments/webhook
```

Enable the `payment.captured` event. Copy the webhook secret to `RAZORPAY_WEBHOOK_SECRET` in Vercel.

### Build

```bash
pnpm build
```

Build fails if required environment variables are missing. Razorpay is lazily instantiated to prevent failures during Vercel's static page collection phase, which runs without payment variables.
