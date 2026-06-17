import { boolean, pgTable, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Better Auth tables ────────────────────────────────────────────────────────
// These are managed by Better Auth — do not write to them directly.

export const user = pgTable('user', {
  id:            text('id').primaryKey(),
  name:          text('name').notNull(),
  email:         text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image:         text('image'),
  createdAt:     timestamp('created_at').notNull(),
  updatedAt:     timestamp('updated_at').notNull(),
  // better-auth admin plugin fields
  role:          text('role').default('user'),
  banned:        boolean('banned').default(false),
  banReason:     text('ban_reason'),
  banExpires:    timestamp('ban_expires'),
});

export const session = pgTable('session', {
  id:          text('id').primaryKey(),
  expiresAt:   timestamp('expires_at').notNull(),
  token:       text('token').notNull().unique(),
  createdAt:   timestamp('created_at').notNull(),
  updatedAt:   timestamp('updated_at').notNull(),
  ipAddress:   text('ip_address'),
  userAgent:   text('user_agent'),
  userId:      text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id:                     text('id').primaryKey(),
  accountId:              text('account_id').notNull(),
  providerId:             text('provider_id').notNull(),
  userId:                 text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken:            text('access_token'),
  refreshToken:           text('refresh_token'),
  idToken:                text('id_token'),
  accessTokenExpiresAt:   timestamp('access_token_expires_at'),
  refreshTokenExpiresAt:  timestamp('refresh_token_expires_at'),
  scope:                  text('scope'),
  password:               text('password'),
  createdAt:              timestamp('created_at').notNull(),
  updatedAt:              timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
  id:         text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value:      text('value').notNull(),
  expiresAt:  timestamp('expires_at').notNull(),
  createdAt:  timestamp('created_at'),
  updatedAt:  timestamp('updated_at'),
});

// ─── Corsair tables ────────────────────────────────────────────────────────────
// These are managed by Corsair — do not write to them directly.

export const corsairIntegrations = pgTable('corsair_integrations', {
  id:        text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  name:      text('name').notNull(),
  config:    jsonb('config').notNull().default({}),
  dek:       text('dek'),
});

export const corsairAccounts = pgTable('corsair_accounts', {
  id:            text('id').primaryKey(),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  tenantId:      text('tenant_id').notNull(),
  integrationId: text('integration_id').notNull().references(() => corsairIntegrations.id),
  config:        jsonb('config').notNull().default({}),
  dek:           text('dek'),
});

export const corsairEntities = pgTable('corsair_entities', {
  id:         text('id').primaryKey(),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  accountId:  text('account_id').notNull().references(() => corsairAccounts.id),
  entityId:   text('entity_id').notNull(),
  entityType: text('entity_type').notNull(),
  version:    text('version').notNull(),
  data:       jsonb('data').notNull().default({}),
});

// ─── Chat sessions ─────────────────────────────────────────────────────────────
// Persists OpenAI Agents SDK conversation history (AgentInputItem[]) per user.
// items is the full turn-by-turn transcript — user msgs, assistant msgs, tool calls, tool results.

export const chatSessions = pgTable('chat_sessions', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  items:     jsonb('items').notNull().default(sql`'[]'::jsonb`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const corsairEvents = pgTable('corsair_events', {
  id:        text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  accountId: text('account_id').notNull().references(() => corsairAccounts.id),
  eventType: text('event_type').notNull(),
  payload:   jsonb('payload').notNull().default({}),
  status:    text('status'),
});

// ─── Plans & billing ───────────────────────────────────────────────────────────

// Tracks each user's active plan and monthly usage counters.
// A row is created (free plan) on first chat request if it doesn't exist.
export const userPlans = pgTable('user_plans', {
  id:     text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),

  plan: text('plan').notNull().default('free'), // 'free' | 'standard' | 'premium' | 'enterprise'

  // Monthly usage counters — reset each billing cycle
  messagesUsed: integer('messages_used').notNull().default(0),
  voiceUsed:    integer('voice_used').notNull().default(0),
  composeUsed:  integer('compose_used').notNull().default(0),

  // When counters reset (30 days from signup / last payment cycle)
  usageResetAt: timestamp('usage_reset_at', { withTimezone: true }).notNull(),

  // Razorpay subscription (null for free plan)
  razorpaySubscriptionId: text('razorpay_subscription_id'),
  subscriptionStatus:     text('subscription_status').default('active'), // 'active' | 'cancelled' | 'expired' | 'paused'
  currentPeriodEnd:       timestamp('current_period_end', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── User preferences ──────────────────────────────────────────────────────────

export const userPreferences = pgTable('user_preferences', {
  userId:         text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  focuses:        jsonb('focuses').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  onboardingDone: boolean('onboarding_done').notNull().default(false),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Tracks every Razorpay payment order for audit trail.
export const orders = pgTable('orders', {
  id:     text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),

  // Razorpay identifiers
  razorpayOrderId:   text('razorpay_order_id').notNull().unique(),
  razorpayPaymentId: text('razorpay_payment_id'),
  razorpaySignature: text('razorpay_signature'),

  plan:     text('plan').notNull(),           // 'standard' | 'premium'
  amount:   integer('amount').notNull(),      // in paise (INR × 100)
  currency: text('currency').notNull().default('INR'),
  status:   text('status').notNull().default('created'), // 'created' | 'paid' | 'failed'

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
