# Yugati Admin Panel — Implementation

## Vision
Not a traditional CRUD admin. An AI-augmented operations center where every user action,
AI call, security event, and revenue signal is captured, visualized, and analysed live.

---

## Status: FULLY IMPLEMENTED ✓

All sections built, DB migrated, logging wired, admin button visible in both sidebars.

---

## Sections (sidebar)

| # | Route | Status | What it shows |
|---|-------|--------|---------------|
| 1 | `/admin/overview` | ✓ | KPI cards (8) + daily prompts chart + plan distribution |
| 2 | `/admin/users` | ✓ | Paginated table, search, ban/unban, plan badge, per-user detail |
| 3 | `/admin/users/[id]` | ✓ | Full profile, token stats, usage bars, recent prompts, sessions |
| 4 | `/admin/prompts` | ✓ | Every prompt log, expandable rows, search + status filter |
| 5 | `/admin/security` | ✓ | Injection attempts only — PromptSnapshot cards with highlighted text |
| 6 | `/admin/plans` | ✓ | ₹ revenue total, plan breakdown, all payment orders |
| 7 | `/admin/sessions` | ✓ | Live sessions, device column, browser+OS parsed, IP, inline dates |
| 8 | `/admin/insights` | ✓ | GPT-4o-mini platform analysis (critical / warning / info severity) |

---

## DB Tables Added

### `admin_prompt_logs`
Captures every `runChat()` call automatically.

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | random uid |
| userId | text → user.id | cascade delete |
| conversationId | text | nullable |
| rawPrompt | text | exactly what user typed |
| enhancedPrompt | text | after enhancer pass, null if same as raw |
| status | text | `ok` \| `blocked_input` \| `blocked_output` \| `error` |
| blockedReason | text | guardrail GPT reason, null if ok |
| injectionFlag | bool | true when `InputGuardrailTripwireTriggered` caught |
| model | text | default `gpt-4.1-mini` |
| promptTokens | int | from `result.rawResponses[].usage.input_tokens` |
| completionTokens | int | from `result.rawResponses[].usage.output_tokens` |
| totalTokens | int | sum |
| estimatedCostUsd | numeric(10,6) | calculated per model pricing table |
| ipAddress | text | `x-forwarded-for` / `x-real-ip` header |
| userAgent | text | `user-agent` header |
| durationMs | int | wall-clock time of runChat() |
| createdAt | timestamp | auto |

### `admin_audit_log`
Tracks every admin action (ban, unban, plan change).

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| adminId | text → user.id | who performed the action |
| action | text | `ban_user` \| `unban_user` \| `change_plan` |
| targetId | text | userId being acted on |
| meta | jsonb | reason, new plan, etc. |
| createdAt | timestamp | auto |

**Model pricing table (in `logger.ts`):**
| Model | Input $/1M | Output $/1M |
|-------|-----------|------------|
| gpt-4.1-mini | $0.40 | $1.60 |
| gpt-4o-mini | $0.15 | $0.60 |
| gpt-4o | $5.00 | $15.00 |
| gpt-4.1 | $2.00 | $8.00 |

---

## Auth Guard
- `/admin/*` layout: server-side `session.user.role === 'admin'` → redirect to `/dashboard/mail` if not
- tRPC `adminProcedure`: DB query checks role before any procedure runs
- Set admin: `UPDATE "user" SET role = 'admin' WHERE email = '...'`

---

## Files Created / Modified

### New files
| File | Purpose |
|------|---------|
| `src/features/agent/logger.ts` | `logPrompt()` — fire-and-forget DB insert, cost estimator |
| `src/trpc/routers/admin.ts` | Full admin tRPC router (9 procedures) |
| `src/app/admin/layout.tsx` | Auth guard + AdminSidebar wrapper |
| `src/app/admin/page.tsx` | Redirects → `/admin/overview` |
| `src/app/admin/components/admin-sidebar.tsx` | Red "INTERNAL" badge sidebar |
| `src/app/admin/components/admin-stat-card.tsx` | KPI card with delta badge |
| `src/app/admin/components/prompt-snapshot.tsx` | Injection "screenshot" card |
| `src/app/admin/overview/page.tsx` | 8 KPI cards + charts |
| `src/app/admin/users/page.tsx` | User table with ban/unban |
| `src/app/admin/users/[id]/page.tsx` | Full user detail page |
| `src/app/admin/prompts/page.tsx` | Prompt log table, expandable rows |
| `src/app/admin/security/page.tsx` | Injection snapshots |
| `src/app/admin/plans/page.tsx` | Revenue + orders |
| `src/app/admin/sessions/page.tsx` | Live sessions + device parsing |
| `src/app/admin/insights/page.tsx` | GPT-generated platform insights |

### Modified files
| File | Change |
|------|--------|
| `src/server/db/schema.ts` | Added `adminPromptLogs`, `adminAuditLog` tables; added `numeric` import |
| `src/features/agent/agent.ts` | Added `ChatMeta` param (IP/UA), token extraction, `void logPrompt()` on every path |
| `src/app/api/agent/chat/route.ts` | Passes `ipAddress` + `userAgent` headers into `runChat()` |
| `src/trpc/routers/_app.ts` | Wired `adminRouter` |
| `src/app/dashboard/components/sidebar-nav.tsx` | Added `isAdmin?: boolean` prop + red Admin Panel button |
| `src/app/dashboard/mail/components/MailSidebar.tsx` | Added `isAdmin?: boolean` prop + Admin nav item |
| `src/app/dashboard/mail/page.tsx` | Passes `isAdmin={user?.role === 'admin'}` |
| `src/app/dashboard/overview/page.tsx` | Passes `isAdmin` |
| `src/app/dashboard/calendar/page.tsx` | Passes `isAdmin` |
| `src/app/dashboard/chat/page.tsx` | Passes `isAdmin` |
| `src/app/dashboard/integrations/page.tsx` | Passes `isAdmin` |
| `src/app/dashboard/billing/page.tsx` | Passes `isAdmin` |

---

## tRPC Procedures (`trpc.admin.*`)

| Procedure | Type | Description |
|-----------|------|-------------|
| `getStats` | query | Overview KPIs + 30-day daily prompt chart |
| `listUsers` | query | Paginated users with plan/prompt/connection data |
| `getUser` | query | Full user profile + token stats + recent prompts/sessions |
| `banUser` | mutation | Sets `banned=true`, logs to audit |
| `unbanUser` | mutation | Clears ban, logs to audit |
| `changeUserPlan` | mutation | Updates `userPlans.plan`, logs to audit |
| `listPromptLogs` | query | Paginated logs, filter by user/status/injection/search |
| `getPromptLog` | query | Single log with user details |
| `listInjections` | query | Only `injectionFlag=true` rows |
| `listSessions` | query | Active (non-expired) sessions |
| `listOrders` | query | Payment orders, filter by status |
| `getAiInsights` | query | GPT-4o-mini platform analysis, 5 insights |
| `listAuditLog` | query | Admin action history |

---

## Security / Injection Detection

**What triggers `injectionFlag = true`:**
- Prompts unrelated to email/calendar (e.g. "what is 1+1", "write a poem")
- Explicit injection phrases ("ignore previous instructions", "jailbreak", etc.)
- Requests to exfiltrate data / bulk spam

**How `PromptSnapshot` highlights danger:**
- Regex patterns scanned client-side: `ignore.*instructions`, `act as`, `jailbreak`, `DAN mode`, `[INST]`, `<|im_start|>`, etc.
- Matched spans wrapped in `<mark>` with `bg-red-500/25 text-red-300`
- All other text rendered normally in monospace

**Note:** No real browser screenshot is taken. Capturing screenshots without explicit consent would violate GDPR/IT Act. The styled card renders more forensic data than a screenshot anyway.

---

## Sessions Page — Device Parsing

`parseUA(ua)` extracts from User-Agent string:
- **browser**: Edge / Chrome / Safari / Firefox / Opera
- **os**: Windows 11/10 / macOS / Android / iOS / Linux
- **device**: mobile / tablet / desktop

Dates formatted as `DD/MM/YY, HH:MM` (single line, `whitespace-nowrap`).

---

## How to Access

1. Set DB role: `UPDATE "user" SET role = 'admin' WHERE email = 'your@email.com'`
2. Navigate to `/admin` — or use the **Admin** link in either sidebar (mail or main nav)
3. Prompt logs populate automatically after the next AI chat message is sent
