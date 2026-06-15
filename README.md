# Yugati

Yugati is a production-grade AI productivity platform that connects to your Gmail and Google Calendar and lets you manage them through natural language. It ships two distinct interaction modes: an agentic chat interface powered by the OpenAI Agents SDK and a traditional manual interface for direct inbox and calendar management. Both modes are served from a single Next.js 16 application deployed on Vercel.

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
11. [Plans and Billing](#plans-and-billing)
12. [Rate Limiting and Quotas](#rate-limiting-and-quotas)
13. [Email Cache](#email-cache)
14. [Voice Input](#voice-input)
15. [Payment Integration](#payment-integration)
16. [Middleware](#middleware)
17. [Environment Variables](#environment-variables)
18. [Local Development](#local-development)
19. [Database Management](#database-management)
20. [Deployment](#deployment)

---

## Overview

Yugati integrates with Gmail and Google Calendar using Corsair, an integration layer that handles OAuth flows, credential storage, API proxying, and entity caching. Users sign in with Google, grant the required OAuth scopes, and immediately get access to:

- An AI chat interface (Agentic mode) where a GPT-4.1-mini agent can read emails, draft and send messages, create calendar events, and answer productivity queries.
- A manual interface where the user browses, searches, reads, composes, and manages emails and events directly without AI involvement.

The platform enforces per-plan monthly usage quotas, per-minute rate limits, and per-message character limits. Payments are processed through Razorpay.

---

## Architecture

```
Browser
  |
  +-- Next.js 16 App Router (Vercel)
        |
        +-- Landing page         /
        +-- Dashboard            /dashboard/*
        +-- Pricing              /pricing
        +-- Auth callbacks       /api/auth/*
        +-- Agent SSE stream     /api/agent/chat
        +-- Voice transcription  /api/voice/transcribe
        +-- Payments             /api/payments/*
        +-- tRPC                 /api/trpc/*
        +-- Corsair management   /api/corsair/*
        |
        +-- better-auth          Session management, Google OAuth
        +-- Corsair              Gmail + Google Calendar integration layer
        +-- OpenAI Agents SDK    Agent runtime, tool execution, guardrails
        +-- Drizzle ORM          Type-safe queries against PostgreSQL
        +-- Supabase             Hosted PostgreSQL (pooler + direct URL)
        +-- Upstash Redis        Sliding-window rate limiter
        +-- Razorpay             Payment order creation and verification
```

Every request to `/dashboard/*` is gated by a middleware (`src/proxy.ts`) that checks for a valid better-auth session cookie before letting the request through. Unauthenticated requests are redirected to the landing page.

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
| AI runtime | OpenAI Agents SDK | Agent, tools, input/output guardrails, sessions |
| AI models | GPT-4.1-mini (agent), GPT-4o-mini (guardrails, enhancer), Whisper-1 (voice) | |
| Rate limiting | Upstash Redis (@upstash/ratelimit) | Sliding window, serverless-safe |
| Payments | Razorpay | INR, order creation, HMAC verification, webhook |
| Deployment | Vercel | Node.js runtime for API routes |
| Charts | Recharts | |
| Markdown | react-markdown + remark-gfm | Chat message rendering |
| Toasts | Sonner | |

---

## Project Structure

```
src/
  app/
    page.tsx                      Landing page (LandingNav, HeroSection, PricingSection, etc.)
    layout.tsx                    Root layout, fonts, TRPCReactProvider, Toaster
    globals.css                   Tailwind imports, CSS variables, smooth scroll
    pricing/
      page.tsx                    Pricing page with Razorpay checkout flow
    dashboard/
      page.tsx                    Redirect to /dashboard/mail
      mail/
        page.tsx                  Main mail page (Manual + Agentic modes, MailSidebar, ChatView)
        [id]/page.tsx             Single email thread view
      billing/
        page.tsx                  Plan card, usage meters, order history, upgrade section
      calendar/
        page.tsx                  Google Calendar event list
      chat/
        page.tsx                  Standalone chat page
      integrations/
        page.tsx                  Connected integrations status
      overview/
        page.tsx                  Dashboard overview with stats
      settings/
        page.tsx                  User settings
      components/
        chat-view.tsx             Agentic chat UI (SSE streaming, voice input, filler text)
        mail-view.tsx             Manual inbox UI (email list, read pane, compose)
        dashboard-shell.tsx       Shared dashboard shell component
        sidebar-nav.tsx           Left sidebar (nav links, UsagePill, Billing link)
        integrations-view.tsx     Integration connection status UI
        usage-pill.tsx            Reusable usage summary pill (collapsed + expanded)
    api/
      agent/chat/route.ts         POST -- runs agent, SSE stream, quota checks
      auth/[...all]/route.ts      better-auth catch-all handler
      auth/clear-session/route.ts DELETE -- clears session cookie
      corsair/callback/route.ts   OAuth callback for Corsair integrations
      corsair/connect/route.ts    Initiates Corsair OAuth connect flow
      payments/create-order/      POST -- creates Razorpay order, inserts orders row
      payments/verify/            POST -- verifies HMAC signature, upgrades plan
      payments/webhook/           POST -- Razorpay server-to-server webhook
      trpc/[trpc]/route.ts        tRPC HTTP handler
      voice/transcribe/route.ts   POST -- Whisper transcription, voice quota check

  features/
    agent/
      agent.ts                    createAgent() + runChat() -- main agent entry point
      enhancer.ts                 enhancePrompt() -- rewrites user input for clarity
      guardrails.ts               safetyGuardrail (input) + sensitiveDataGuardrail (output)
      session.ts                  loadSession() + saveSession() -- DB-backed conversation history
      tools.ts                    buildGmailTools() -- custom send_email tool with RFC 2822 encoding
      types.ts                    ChatMessage type
      prompts/
        agent.ts                  buildAgentInstructions() -- full system prompt with few-shot examples
        enhancer.ts               ENHANCER_SYSTEM prompt
        guardrails.ts             SAFETY_SYSTEM prompt + SENSITIVE_PATTERNS regexes
    manual/
      gmail/
        router.ts                 gmailRouter -- all Gmail tRPC procedures
        service.ts                GmailService -- API calls + Corsair entity DB cache
        schema.ts                 Zod schemas for Gmail inputs
      calendar/
        router.ts                 calendarRouter -- Google Calendar tRPC procedures
        service.ts                CalendarService
        schema.ts                 Zod schemas for Calendar inputs
      stats/
        router.ts                 statsRouter -- email stat aggregation
        service.ts                StatsService
    schemas.ts                    Shared Zod primitives (idSchema, etc.)

  lib/
    auth.ts                       better-auth config (Google provider, admin plugin, extra fields)
    auth-client.ts                better-auth browser client (signIn, useSession)
    plans.ts                      PLANS constant -- all tier limits in one place
    usage.ts                      getUserPlan() + checkAndIncrement() -- quota management
    rate-limit.ts                 Upstash Redis sliding-window rate limiter instance
    constants.ts                  MAX_PROMPT_CHARS -- shared between server and client
    razorpay.ts                   getRazorpay() lazy instance, verifyPaymentSignature(), verifyWebhookSignature()

  server/
    db/
      index.ts                    Drizzle db client (postgres.js)
      schema.ts                   All table definitions
    corsair.ts                    createCorsair() config + initCorsair()
    scripts/
      seed-admin.ts               Seeds admin user with premium plan

  trpc/
    routers/
      _app.ts                     Root router (merges gmail, calendar, stats, plans)
      plans.ts                    getMyPlan, getOrders queries
    trpc.ts                       createContext(), protectedProcedure, enforceAuth middleware
    types.ts                      TRPCContext, TRPCProtectedContext
    client/index.tsx              TRPCReactProvider, useTRPC hook
    server/index.ts               Server-side tRPC caller factory
    handler.ts                    fetchRequestHandler wrapper
    query-client.ts               TanStack Query client config

  proxy.ts                        Next.js middleware -- session cookie check, route protection
  env.ts                          Zod-validated environment variable schema
```

---

## Core Features

### Dual-mode mail interface

The `/dashboard/mail` page supports two modes, toggled by the user and persisted to `localStorage`:

- **Manual mode** -- a traditional email client. The left sidebar shows folder navigation (inbox, sent, drafts, trash, starred, spam, all mail) with unread counts. The main pane renders a paginated email list with sender, subject, date, snippet, and unread indicator. Clicking an email opens a read pane on the right. Manual mode includes compose, reply, trash, archive, mark-read/unread, and search.

- **Agentic mode** -- a conversational interface where the user types natural language requests. The agent has access to Gmail and Google Calendar via Corsair tools. The chat streams responses over SSE in 10-character chunks for a live-typing effect. A voice input button lets users record audio that is transcribed by Whisper and inserted into the text field.

Mode is initialized from `localStorage` after hydration to avoid SSR/client mismatch.

### Calendar view

`/dashboard/calendar` renders upcoming events from Google Calendar, grouped by date, using the `calendarRouter.listEvents` tRPC query.

### Overview and stats

`/dashboard/overview` shows email volume charts and unread counts via the `statsRouter`.

### Integrations

`/dashboard/integrations` shows the connection status of Gmail and Google Calendar, with a connect button that initiates the Corsair OAuth flow.

---

## Agent Pipeline

Each chat request goes through this pipeline:

```
User message
  |
  v
Prompt enhancer (gpt-4o-mini)
  Rewrites the message for clarity and specificity
  Uses last 4 messages as context for follow-up resolution
  |
  v
Input safety guardrail (gpt-4o-mini, parallel=false)
  Classifies: safe / unsafe
  Tripwire blocks the request if unsafe
  Returns reason string surfaced to user
  |
  v
Agent (gpt-4.1-mini, OpenAI Agents SDK)
  Tools available:
    - All Corsair tools via OpenAIAgentsProvider (list_operations, get_schema, run_script)
    - send_email (custom tool with RFC 2822 encoding)
  Session hydrated from DB (chat_sessions table)
  |
  v
Output sensitive-data guardrail (regex-based, no LLM call)
  Patterns: credit card numbers, SSNs, private keys
  Tripwire blocks if match found
  |
  v
Session persisted to DB
  |
  v
SSE stream to client (10-char chunks, 4ms delay between chunks)
```

### Prompt enhancer

`src/features/agent/enhancer.ts` calls `gpt-4o-mini` with a system prompt that instructs it to rewrite short or ambiguous user messages into complete, unambiguous instructions. The last 4 conversation turns are included as context. If the enhanced prompt matches the original, the original is used without modification to avoid unnecessary noise.

### Safety guardrail

`src/features/agent/guardrails.ts` runs `gpt-4o-mini` with `response_format: json_object` to return `{ safe: boolean, reason: string }`. On parse failure it defaults to `safe: true` to avoid false positives blocking legitimate requests.

### Sensitive data guardrail

An output guardrail that scans agent responses with regex patterns for credit card numbers, social security numbers, and PEM-encoded private keys. It does not make an LLM call -- purely client-side regex matching.

### Conversation sessions

`src/features/agent/session.ts` uses the OpenAI Agents SDK `MemorySession` class, which holds the full turn-by-turn transcript in memory during a request. On each request, the session is hydrated from the `chat_sessions` table. After the run completes, the updated items array is written back. This gives the agent persistent memory across page refreshes and sessions.

### Agent system prompt

The agent is instructed to:
- Always try `db.*` (Corsair entity cache) before `api.*` (live Gmail/Calendar API)
- Never fetch more than 10 emails in a single tool call
- Use only snippets for summarization, never full message bodies
- Always include a direct Gmail link for every referenced email
- Follow a confirm-then-send flow for outbound emails (ask for tone, show draft, wait for approval)
- Only answer questions related to email and calendar management

---

## Authentication

better-auth handles authentication with the following configuration:

- **Provider:** Google OAuth 2.0
- **Scopes:** `gmail.compose`, `gmail.labels`, `gmail.modify`, `gmail.send`, `calendar`, `userinfo.email`, `userinfo.profile`
- **Plugin:** `admin` plugin adds `role`, `banned`, `banReason`, `banExpires` fields to the user table
- **Default role:** `user`
- **Session:** HTTP-only cookie, `better-auth.session_token` on HTTP, `__Secure-better-auth.session_token` on HTTPS

The middleware (`src/proxy.ts`) checks both cookie names to handle the production/development difference. Logged-in users visiting `/` are redirected to `/dashboard`. Unauthenticated users visiting any `/dashboard/*` route are redirected to `/`.

### Admin seeding

Run `pnpm tsx src/server/scripts/seed-admin.ts` after the target user has signed in at least once to promote them to admin and assign the premium plan. The seed script sets `usageResetAt` to 2099-01-01 so the admin never hits usage limits.

---

## Database Schema

All tables are defined in `src/server/db/schema.ts` and managed by Drizzle ORM.

### better-auth tables

| Table | Purpose |
|---|---|
| `user` | User accounts. Includes `role`, `banned`, `banReason`, `banExpires` for the admin plugin. |
| `session` | Active sessions. References `user.id` with cascade delete. |
| `account` | OAuth account links (access token, refresh token, scopes). |
| `verification` | Email/phone verification tokens. |

### Corsair tables

| Table | Purpose |
|---|---|
| `corsair_integrations` | One row per integration (gmail, googlecalendar). Holds encrypted config and DEK. |
| `corsair_accounts` | One row per (tenant, integration) pair. Holds encrypted OAuth credentials. |
| `corsair_entities` | Entity cache. Rows have `entity_type`, `entity_id`, `account_id`, `data` (jsonb). Gmail messages and labels are stored here after first fetch. |
| `corsair_events` | Webhook event log. |

### Application tables

| Table | Purpose |
|---|---|
| `chat_sessions` | Stores OpenAI Agents SDK `AgentInputItem[]` per user. `items` is jsonb. Used to restore conversation history across sessions. |
| `user_plans` | One row per user. Tracks `plan`, `messagesUsed`, `voiceUsed`, `composeUsed`, `usageResetAt`, Razorpay subscription fields. Created automatically on first chat with a free-plan default. |
| `orders` | One row per Razorpay payment order. Tracks `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`, `plan`, `amount` (paise), `status`. |

---

## API Routes

### POST /api/agent/chat

Handles agentic chat requests. Enforces three layers of gating before running the agent:

1. **Character limit** -- checks the last user message length against the plan's `charLimit`. Returns 400 if exceeded.
2. **Rate limit** -- checks Upstash Redis sliding window (20 requests per minute per user). Returns 429 with `Retry-After` header if exceeded.
3. **Monthly quota** -- checks and atomically increments `messagesUsed`. Returns 429 if the monthly cap is reached.

On success, runs `runChat()` and streams the result as Server-Sent Events with `Content-Type: text/event-stream`. Event types:

| Type | Payload |
|---|---|
| `delta` | `{ type: "delta", text: string }` -- 10-character chunk |
| `done` | `{ type: "done", conversationId: string }` |
| `blocked` | `{ type: "blocked", reason: string, conversationId: string }` |
| `error` | `{ type: "error", message: string }` |

### POST /api/voice/transcribe

Accepts `multipart/form-data` with an `audio` field (webm blob). Checks and increments the `voiceUsed` quota. Calls OpenAI `whisper-1` via `openai.audio.transcriptions.create`. Returns `{ text: string }`.

### POST /api/payments/create-order

Creates a Razorpay order for the requested plan (`standard` or `premium`). Inserts a row into the `orders` table with status `created`. Returns `{ orderId, amount, currency, keyId, planName }`.

### POST /api/payments/verify

Verifies the HMAC signature from Razorpay checkout using `crypto.createHmac("sha256", RAZORPAY_KEY_SECRET)`. On success, updates the user's `user_plans` row to the new plan, resets usage counters, sets `usageResetAt` to 30 days from now, and marks the `orders` row as `paid`. Redirects to `/dashboard/billing?upgraded=1`.

### POST /api/payments/webhook

Server-to-server backup webhook from Razorpay. Verifies the `X-Razorpay-Signature` header using `RAZORPAY_WEBHOOK_SECRET`. Handles `payment.captured` event to update order status as a backup to the client-side verify flow.

### GET/POST /api/auth/[...all]

better-auth catch-all handler. Manages sign-in, sign-out, session retrieval, and Google OAuth callback at `/api/auth/callback/google`.

### GET /api/corsair/connect

Initiates the Corsair OAuth connect flow. Redirects the user to the provider's authorization URL.

### GET /api/corsair/callback

Handles the OAuth callback from the provider. Stores the access token and refresh token in `corsair_accounts` via Corsair's credential management.

---

## tRPC Routers

All tRPC procedures use `protectedProcedure`, which enforces authentication via the `enforceAuth` middleware. If Corsair throws an `AuthMissingError`, it is caught and re-thrown as a `UNAUTHORIZED` tRPC error with a human-readable message.

### gmailRouter (`src/features/manual/gmail/router.ts`)

| Procedure | Type | Description |
|---|---|---|
| `listInbox` | query | Lists inbox messages with cache-first strategy (Corsair entity DB, then Gmail API) |
| `listMessages` | query | Lists messages with arbitrary query and label filters |
| `getMessage` | query | Fetches full message with body |
| `sendMessage` | mutation | Sends an email via RFC 2822 encoding |
| `trashMessage` | mutation | Moves message to trash, evicts entity cache |
| `modifyMessage` | mutation | Adds/removes labels, evicts entity cache |
| `batchModifyMessages` | mutation | Applies label changes to multiple messages |
| `listThreads` | query | Lists threads |
| `getThread` | query | Fetches full thread |
| `trashThread` | mutation | Moves thread to trash |
| `modifyThread` | mutation | Adds/removes labels on a thread |
| `createDraft` | mutation | Creates a draft |
| `updateDraft` | mutation | Updates an existing draft |
| `sendDraft` | mutation | Sends a saved draft |
| `getDraft` | query | Fetches a draft |
| `listDrafts` | query | Lists all drafts |
| `listLabels` | query | Lists all Gmail labels |
| `createLabel` | mutation | Creates a custom label |
| `updateLabel` | mutation | Renames a label |
| `deleteLabel` | mutation | Deletes a label |

### calendarRouter (`src/features/manual/calendar/router.ts`)

Provides `listEvents`, `createEvent`, `updateEvent`, `deleteEvent` procedures backed by the Google Calendar API via Corsair.

### statsRouter (`src/features/manual/stats/router.ts`)

Provides email volume aggregation queries for the overview dashboard.

### plansRouter (`src/trpc/routers/plans.ts`)

| Procedure | Type | Description |
|---|---|---|
| `getMyPlan` | query | Returns current plan, usage counters, limits, and reset date |
| `getOrders` | query | Returns the user's payment history from the `orders` table |

---

## Plans and Billing

All plan limits are defined in a single source of truth: `src/lib/plans.ts`.

| Tier | Price | AI Messages | Voice | Email Compose | Char Limit | Rate (req/min) |
|---|---|---|---|---|---|---|
| Free | 0 | 30 / month | 1 / month | 10 / month | 1,000 | 5 |
| Standard | INR 199 / month | 150 / month | 15 / month | 50 / month | 2,000 | 20 |
| Premium | INR 499 / month | 500 / month | 30 / month | 150 / month | 5,000 | 60 |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited | 10,000 | 120 |

Usage counters (`messagesUsed`, `voiceUsed`, `composeUsed`) are stored in the `user_plans` table. The `checkAndIncrement` function atomically increments the counter and returns `{ allowed, used, limit }`. If `usageResetAt` has passed, all counters are reset to zero before the check.

A free-plan row is created automatically in `user_plans` on the first chat request for any new user. No additional registration step is required beyond Google sign-in.

Upgrades are processed through Razorpay and take effect immediately after the `verify` endpoint confirms payment signature.

---

## Rate Limiting and Quotas

Rate limiting uses Upstash Redis with a sliding window algorithm. The limiter is instantiated once in `src/lib/rate-limit.ts`. The limit is set at 20 requests per minute per user.

In addition to per-minute rate limiting, every chat request checks:

1. **Character limit** -- enforced both client-side (counter turns yellow above 80%, red above 100%) and server-side (400 response with a clear error message).
2. **Monthly message quota** -- incremented atomically on each successful agent chat. Returns 429 when exhausted.
3. **Monthly voice quota** -- incremented on each Whisper transcription request.

`MAX_PROMPT_CHARS` is exported from `src/lib/constants.ts` and imported by the client component directly to avoid bundling the Redis client into the browser bundle.

---

## Email Cache

`GmailService.listInbox` uses a two-level cache strategy backed by Corsair's built-in entity database:

1. **Cache read** -- calls `corsair.gmail.db.messages.list({ limit })` which reads from the `corsair_entities` table. Entities are scoped to the current tenant automatically.
2. **Freshness check** -- if entities exist and the most recent `updated_at` is within 3 minutes, the cached data is sorted by `internalDate` descending and returned immediately without any Gmail API call.
3. **Cache miss** -- fetches from the Gmail API (`api.messages.list` + `api.messages.get` per message in parallel), then upserts each message via `corsair.gmail.db.messages.upsertByEntityId`.
4. **Search bypass** -- when a `q` (search query) parameter is present, the cache is always bypassed and the request goes directly to the Gmail API.
5. **Mutation eviction** -- `trashMessage` and `modifyMessage` call `corsair.gmail.db.messages.deleteByEntityId` to evict the affected entity so the next `listInbox` returns fresh data.

This eliminates repeated Gmail API calls on every page load after the first visit to the inbox.

---

## Voice Input

The voice input flow:

1. User clicks the microphone button in the chat view. The browser requests `getUserMedia({ audio: true })`.
2. Recording starts via `MediaRecorder` (webm format). A 20-second hard limit stops recording automatically.
3. On stop, the recorded audio blob is sent as `multipart/form-data` to `/api/voice/transcribe`.
4. The route checks and increments the `voiceUsed` quota, then calls `openai.audio.transcriptions.create` with `model: "whisper-1"`.
5. The transcription text is inserted into the chat input field.

---

## Payment Integration

Razorpay is used for all payment processing. The integration uses lazy instantiation (`getRazorpay()`) to avoid build-time crashes during Vercel static page collection when environment variables are not yet injected.

### Order flow

1. User clicks an upgrade button on `/pricing` or `/dashboard/billing`.
2. The browser calls `POST /api/payments/create-order` with `{ plan: "standard" | "premium" }`.
3. The server creates a Razorpay order and returns `{ orderId, amount, currency, keyId }`.
4. The Razorpay checkout modal opens in the browser.
5. On successful payment, Razorpay calls the `handler` callback with `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`.
6. The browser sends these three values to `POST /api/payments/verify`.
7. The server verifies the HMAC signature: `hmac_sha256(orderId + "|" + paymentId, RAZORPAY_KEY_SECRET)`.
8. On success, the `user_plans` row is updated to the new plan, counters are reset, and the user is redirected to `/dashboard/billing?upgraded=1`.

### Webhook

`POST /api/payments/webhook` receives server-to-server events from Razorpay. It verifies the `X-Razorpay-Signature` header using `RAZORPAY_WEBHOOK_SECRET` and handles `payment.captured` to update order status as a failsafe backup to the client-side verify flow.

---

## Middleware

`src/proxy.ts` is the Next.js middleware file. It runs on every request except `_next/static`, `_next/image`, `favicon.ico`, and `api/auth` routes (via the `matcher` config).

It checks for valid session cookies. Two cookie names are checked to handle both environments:
- `better-auth.session_token` (development, HTTP)
- `__Secure-better-auth.session_token` (production, HTTPS -- automatically set by better-auth when the app is served over HTTPS)

Rules:
- Unauthenticated request to `/dashboard/*` -- redirect to `/`
- Authenticated request to `/` -- redirect to `/dashboard`
- All other requests -- pass through unchanged

---

## Environment Variables

All variables are validated at startup via Zod in `src/env.ts`. Missing required variables throw at boot time with a descriptive error message.

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL pooler URL (port 6543) for application queries |
| `DIRECT_URL` | Supabase PostgreSQL direct URL (port 5432) for migrations (used by drizzle.config.js) |
| `CORSAIR_KEK` | Key Encryption Key for Corsair envelope encryption of OAuth credentials |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |
| `BETTER_AUTH_SECRET` | Secret for better-auth session signing (min 32 random bytes) |
| `NEXT_PUBLIC_APP_URL` | Full public URL of the app (e.g. `https://www.yugati.in`). Used as better-auth `baseURL`. Defaults to `http://localhost:3000` in development. |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4.1-mini, GPT-4o-mini, and Whisper-1 |

### Required for rate limiting

| Variable | Description |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

### Required for payments

| Variable | Description |
|---|---|
| `RAZORPAY_KEY_ID` | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay API key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Secret for verifying Razorpay webhook signatures |

---

## Local Development

### Prerequisites

- Node.js 20 or later
- pnpm
- A Supabase project or local PostgreSQL instance
- A Google Cloud project with OAuth 2.0 credentials
- An Upstash Redis database (free tier is sufficient)
- A Razorpay account (optional, only needed to test payments)

### Setup

```bash
# Install dependencies
pnpm install

# Copy and fill in environment variables
cp .env.example .env.local

# Push the schema to your database
pnpm db:push

# Start the development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Google OAuth setup

In Google Cloud Console, under your OAuth 2.0 client, add the following:

**Authorized JavaScript origins:**
```
http://localhost:3000
https://www.yugati.in
```

**Authorized redirect URIs:**
```
http://localhost:3000/api/auth/callback/google
http://localhost:3000/api/corsair/callback
https://www.yugati.in/api/auth/callback/google
https://www.yugati.in/api/corsair/callback
```

The `/api/auth/callback/google` URI is used by better-auth for the initial sign-in flow. The `/api/corsair/callback` URI is used by Corsair when connecting Gmail/Calendar integrations from the dashboard.

### Seeding admin user

After signing in with your admin email at least once:

```bash
pnpm tsx src/server/scripts/seed-admin.ts
```

This sets the user's role to `admin`, assigns the Premium plan, and sets `usageResetAt` to 2099-01-01 so the admin never encounters usage limits during testing.

---

## Database Management

Drizzle ORM manages the schema. All table definitions live in `src/server/db/schema.ts`.

```bash
# Push schema changes directly to the database (no migration files generated)
pnpm db:push

# Generate SQL migration files from schema changes
pnpm db:generate

# Apply pending generated migrations
pnpm db:migrate

# Open Drizzle Studio (local DB browser at localhost:4983)
pnpm db:studio
```

Because `drizzle.config.js` reads `DATABASE_URL` from `process.env` without loading `.env.local`, pass the variable explicitly when running commands from the terminal:

```bash
DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." pnpm db:push
```

The application uses the pooler URL (port 6543) for runtime queries and the direct URL (port 5432) for migrations. Supabase requires a direct connection (not pooled) for DDL operations.

---

## Deployment

The application is deployed on Vercel. All API routes that use Node.js-only modules (Razorpay, OpenAI, Drizzle) include `export const runtime = 'nodejs'` to opt out of the Edge runtime.

### Vercel environment variables

Set all variables from the Environment Variables section in your Vercel project under Settings > Environment Variables. Key points:

- `NEXT_PUBLIC_APP_URL` must be set to your production domain (e.g. `https://www.yugati.in`) for better-auth to construct the correct OAuth redirect URL.
- `DATABASE_URL` must point to the Supabase pooler URL (port 6543), not the direct URL.
- `DIRECT_URL` should point to the Supabase direct URL (port 5432) if you run migrations from CI.

### Razorpay webhook configuration

In the Razorpay dashboard, create a webhook pointing to:

```
https://www.yugati.in/api/payments/webhook
```

Enable the `payment.captured` event. Copy the generated webhook secret and set it as `RAZORPAY_WEBHOOK_SECRET` in Vercel.

### Build

```bash
pnpm build
```

The build will fail if any required environment variables are missing. Razorpay is lazily instantiated via `getRazorpay()` to prevent failures during Vercel's static page collection phase, which runs without payment environment variables.
