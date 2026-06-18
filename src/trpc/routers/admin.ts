import { initTRPC, TRPCError } from '@trpc/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { db } from '@/server/db';
import { user, session, userPlans, userPreferences, orders, adminPromptLogs, adminAuditLog, corsairAccounts, corsairIntegrations } from '@/server/db/schema';
import { eq, desc, and, like, or, count, sum, sql, gte, lte, ne, inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { PLANS } from '@/lib/plans';
import type { TRPCContext } from '../types';
import OpenAI from 'openai';

// ─── Admin-only tRPC instance ─────────────────────────────────────────────────

const t = initTRPC.context<TRPCContext>().create();

const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.tenantId) throw new TRPCError({ code: 'UNAUTHORIZED' });

  const u = await db.query.user.findFirst({ where: eq(user.id, ctx.tenantId), columns: { role: true } });
  if (u?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });

  return next({ ctx: { ...ctx, adminId: ctx.tenantId } });
});

function uid() { return randomUUID(); }

// ─── Router ───────────────────────────────────────────────────────────────────

export const adminRouter = t.router({

  // ── Overview stats ──────────────────────────────────────────────────────────

  getStats: adminProcedure.query(async () => {
    const now    = new Date();
    const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week   = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const month  = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      activeSessionsToday,
      totalPrompts,
      promptsToday,
      blockedToday,
      injections,
      totalTokens,
      totalCost,
      planBreakdown,
      revenueTotal,
    ] = await Promise.all([
      db.select({ c: count() }).from(user).then(r => r[0]?.c ?? 0),
      db.select({ c: count() }).from(user).where(gte(user.createdAt, today)).then(r => r[0]?.c ?? 0),
      db.select({ c: count() }).from(user).where(gte(user.createdAt, week)).then(r => r[0]?.c ?? 0),
      db.select({ c: count() }).from(session).where(gte(session.createdAt, today)).then(r => r[0]?.c ?? 0),
      db.select({ c: count() }).from(adminPromptLogs).then(r => r[0]?.c ?? 0),
      db.select({ c: count() }).from(adminPromptLogs).where(gte(adminPromptLogs.createdAt, today)).then(r => r[0]?.c ?? 0),
      db.select({ c: count() }).from(adminPromptLogs).where(and(gte(adminPromptLogs.createdAt, today), ne(adminPromptLogs.status, 'ok'))).then(r => r[0]?.c ?? 0),
      db.select({ c: count() }).from(adminPromptLogs).where(eq(adminPromptLogs.injectionFlag, true)).then(r => r[0]?.c ?? 0),
      db.select({ t: sum(adminPromptLogs.totalTokens) }).from(adminPromptLogs).then(r => Number(r[0]?.t ?? 0)),
      db.select({ c: sum(adminPromptLogs.estimatedCostUsd) }).from(adminPromptLogs).then(r => Number(r[0]?.c ?? 0)),
      db.select({ plan: userPlans.plan, c: count() }).from(userPlans).groupBy(userPlans.plan).then(rows =>
        Object.fromEntries(rows.map(r => [r.plan, Number(r.c)]))
      ),
      db.select({ t: sum(orders.amount) }).from(orders).where(eq(orders.status, 'paid')).then(r => Number(r[0]?.t ?? 0)),
    ]);

    // Daily prompts last 30 days
    const dailyPrompts = await db
      .select({
        day: sql<string>`DATE(${adminPromptLogs.createdAt})`,
        count: count(),
        blocked: sql<number>`COUNT(*) FILTER (WHERE ${adminPromptLogs.status} != 'ok')`,
      })
      .from(adminPromptLogs)
      .where(gte(adminPromptLogs.createdAt, month))
      .groupBy(sql`DATE(${adminPromptLogs.createdAt})`)
      .orderBy(sql`DATE(${adminPromptLogs.createdAt})`);

    return {
      totalUsers: Number(totalUsers),
      newUsersToday: Number(newUsersToday),
      newUsersWeek: Number(newUsersWeek),
      activeSessionsToday: Number(activeSessionsToday),
      totalPrompts: Number(totalPrompts),
      promptsToday: Number(promptsToday),
      blockedToday: Number(blockedToday),
      totalInjections: Number(injections),
      totalTokens,
      totalCostUsd: totalCost,
      planBreakdown,
      revenuePaise: revenueTotal,
      dailyPrompts: dailyPrompts.map(d => ({
        day:     d.day,
        count:   Number(d.count),
        blocked: Number(d.blocked),
      })),
    };
  }),

  // ── Users ───────────────────────────────────────────────────────────────────

  listUsers: adminProcedure
    .input(z.object({
      page:   z.number().int().min(1).default(1),
      limit:  z.number().int().min(1).max(100).default(25),
      search: z.string().max(200).optional(),
      plan:   z.string().optional(),
    }))
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.limit;

      const escaped = input.search?.replace(/[%_\\]/g, '\\$&');
      const where = escaped
        ? or(like(user.name, `%${escaped}%`), like(user.email, `%${escaped}%`))
        : undefined;

      const [users, total] = await Promise.all([
        db.select().from(user).where(where).orderBy(desc(user.createdAt)).limit(input.limit).offset(offset),
        db.select({ c: count() }).from(user).where(where).then(r => Number(r[0]?.c ?? 0)),
      ]);

      const userIds = users.map(u => u.id);
      const [plans, prefs, promptCounts, corsairRows] = userIds.length
        ? await Promise.all([
            db.select().from(userPlans).where(inArray(userPlans.userId, userIds)),
            db.select().from(userPreferences).where(inArray(userPreferences.userId, userIds)),
            db.select({ userId: adminPromptLogs.userId, c: count() }).from(adminPromptLogs)
              .where(inArray(adminPromptLogs.userId, userIds))
              .groupBy(adminPromptLogs.userId),
            db.select({ tenantId: corsairAccounts.tenantId, name: corsairIntegrations.name })
              .from(corsairAccounts)
              .innerJoin(corsairIntegrations, eq(corsairAccounts.integrationId, corsairIntegrations.id))
              .where(inArray(corsairAccounts.tenantId, userIds)),
          ])
        : [[], [], [], []];

      const planMap    = Object.fromEntries(plans.map(p => [p.userId, p]));
      const prefMap    = Object.fromEntries(prefs.map(p => [p.userId, p]));
      const promptMap  = Object.fromEntries(promptCounts.map(p => [p.userId, Number(p.c)]));

      // Build per-user integration map: userId → Set of integration names
      const intgMap: Record<string, Set<string>> = {};
      for (const r of corsairRows) {
        if (!intgMap[r.tenantId]) intgMap[r.tenantId] = new Set();
        intgMap[r.tenantId]!.add(r.name);
      }

      const result = users.map(u => ({
        ...u,
        plan:         planMap[u.id] ?? null,
        prefs:        prefMap[u.id] ?? null,
        promptCount:  promptMap[u.id] ?? 0,
        connected:    (intgMap[u.id]?.size ?? 0) > 0,
        integrations: {
          gmail:           intgMap[u.id]?.has('gmail') ?? false,
          googlecalendar:  intgMap[u.id]?.has('googlecalendar') ?? false,
        },
      }));

      // Filter by plan if requested
      const filtered = input.plan
        ? result.filter(u => (u.plan?.plan ?? 'free') === input.plan)
        : result;

      return { users: filtered, total, pages: Math.ceil(total / input.limit) };
    }),

  getUser: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const [u, plan, pref, sessions, recentPrompts, recentOrders, corsairRow] = await Promise.all([
        db.query.user.findFirst({ where: eq(user.id, input.id) }),
        db.query.userPlans.findFirst({ where: eq(userPlans.userId, input.id) }),
        db.query.userPreferences.findFirst({ where: eq(userPreferences.userId, input.id) }),
        db.select().from(session).where(eq(session.userId, input.id)).orderBy(desc(session.createdAt)).limit(10),
        db.select().from(adminPromptLogs).where(eq(adminPromptLogs.userId, input.id)).orderBy(desc(adminPromptLogs.createdAt)).limit(20),
        db.select().from(orders).where(eq(orders.userId, input.id)).orderBy(desc(orders.createdAt)).limit(10),
        db.query.corsairAccounts.findFirst({ where: eq(corsairAccounts.tenantId, input.id), columns: { id: true, createdAt: true } }),
      ]);

      if (!u) throw new TRPCError({ code: 'NOT_FOUND' });

      const tokenStats = await db
        .select({ total: sum(adminPromptLogs.totalTokens), cost: sum(adminPromptLogs.estimatedCostUsd), cnt: count() })
        .from(adminPromptLogs)
        .where(eq(adminPromptLogs.userId, input.id))
        .then(r => ({
          totalTokens: Number(r[0]?.total ?? 0),
          totalCostUsd: Number(r[0]?.cost ?? 0),
          promptCount: Number(r[0]?.cnt ?? 0),
        }));

      return { user: u, plan, pref, sessions, recentPrompts, recentOrders, corsairRow, tokenStats };
    }),

  banUser: adminProcedure
    .input(z.object({ userId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await db.update(user).set({ banned: true, banReason: input.reason ?? 'Banned by admin', updatedAt: new Date() }).where(eq(user.id, input.userId));
      await db.insert(adminAuditLog).values({ id: uid(), adminId: (ctx as { adminId: string }).adminId, action: 'ban_user', targetId: input.userId, meta: { reason: input.reason } });
    }),

  unbanUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await db.update(user).set({ banned: false, banReason: null, updatedAt: new Date() }).where(eq(user.id, input.userId));
      await db.insert(adminAuditLog).values({ id: uid(), adminId: (ctx as { adminId: string }).adminId, action: 'unban_user', targetId: input.userId, meta: {} });
    }),

  changeUserPlan: adminProcedure
    .input(z.object({ userId: z.string(), plan: z.enum(['free', 'standard', 'premium', 'enterprise']) }))
    .mutation(async ({ input, ctx }) => {
      await db.update(userPlans).set({ plan: input.plan, updatedAt: new Date() }).where(eq(userPlans.userId, input.userId));
      await db.insert(adminAuditLog).values({ id: uid(), adminId: (ctx as { adminId: string }).adminId, action: 'change_plan', targetId: input.userId, meta: { plan: input.plan } });
    }),

  // ── Prompt logs ─────────────────────────────────────────────────────────────

  listPromptLogs: adminProcedure
    .input(z.object({
      page:      z.number().int().min(1).default(1),
      limit:     z.number().int().min(1).max(100).default(30),
      userId:    z.string().optional(),
      status:    z.enum(['ok', 'blocked_input', 'blocked_output', 'error', 'all']).default('all'),
      injection: z.boolean().optional(),
      search:    z.string().max(200).optional(),
    }))
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.limit;

      const conditions = [];
      if (input.userId)              conditions.push(eq(adminPromptLogs.userId, input.userId));
      if (input.status !== 'all')    conditions.push(eq(adminPromptLogs.status, input.status));
      if (input.injection != null)   conditions.push(eq(adminPromptLogs.injectionFlag, input.injection));
      if (input.search) {
        const escapedSearch = input.search.replace(/[%_\\]/g, '\\$&');
        conditions.push(like(adminPromptLogs.rawPrompt, `%${escapedSearch}%`));
      }

      const where = conditions.length ? and(...conditions) : undefined;

      const [logs, total] = await Promise.all([
        db.select().from(adminPromptLogs).where(where).orderBy(desc(adminPromptLogs.createdAt)).limit(input.limit).offset(offset),
        db.select({ c: count() }).from(adminPromptLogs).where(where).then(r => Number(r[0]?.c ?? 0)),
      ]);

      // Attach user names + plans
      const userIds = [...new Set(logs.map(l => l.userId))];
      const [users, plans] = userIds.length
        ? await Promise.all([
            db.select({ id: user.id, name: user.name, email: user.email, image: user.image }).from(user)
              .where(inArray(user.id, userIds)),
            db.select({ userId: userPlans.userId, plan: userPlans.plan }).from(userPlans)
              .where(inArray(userPlans.userId, userIds)),
          ])
        : [[], []];
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));
      const planMap = Object.fromEntries(plans.map(p => [p.userId, p.plan]));

      return {
        logs: logs.map(l => ({ ...l, user: userMap[l.userId] ?? null, userPlan: planMap[l.userId] ?? 'free' })),
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  getPromptLog: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const log = await db.query.adminPromptLogs.findFirst({ where: eq(adminPromptLogs.id, input.id) });
      if (!log) throw new TRPCError({ code: 'NOT_FOUND' });
      const u = await db.query.user.findFirst({ where: eq(user.id, log.userId), columns: { id: true, name: true, email: true, image: true } });
      return { ...log, user: u ?? null };
    }),

  // ── Sessions ────────────────────────────────────────────────────────────────

  listSessions: adminProcedure
    .input(z.object({ page: z.number().int().min(1).default(1), limit: z.number().int().min(1).max(100).default(30) }))
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.limit;
      const now = new Date();

      const sessions = await db.select().from(session)
        .where(gte(session.expiresAt, now))
        .orderBy(desc(session.createdAt))
        .limit(input.limit).offset(offset);

      const total = await db.select({ c: count() }).from(session).where(gte(session.expiresAt, now)).then(r => Number(r[0]?.c ?? 0));

      const userIds = [...new Set(sessions.map(s => s.userId))];
      const users = userIds.length
        ? await db.select({ id: user.id, name: user.name, email: user.email, image: user.image }).from(user)
            .where(inArray(user.id, userIds))
        : [];
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));

      return {
        sessions: sessions.map(s => ({ ...s, user: userMap[s.userId] ?? null })),
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  // ── Orders / Revenue ────────────────────────────────────────────────────────

  listOrders: adminProcedure
    .input(z.object({
      page:   z.number().int().min(1).default(1),
      limit:  z.number().int().min(1).max(100).default(30),
      status: z.enum(['all', 'paid', 'created', 'failed']).default('all'),
    }))
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.limit;
      const where = input.status !== 'all' ? eq(orders.status, input.status) : undefined;

      const [rows, total] = await Promise.all([
        db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(input.limit).offset(offset),
        db.select({ c: count() }).from(orders).where(where).then(r => Number(r[0]?.c ?? 0)),
      ]);

      const userIds = [...new Set(rows.map(r => r.userId))];
      const users = userIds.length
        ? await db.select({ id: user.id, name: user.name, email: user.email }).from(user)
            .where(inArray(user.id, userIds))
        : [];
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));

      return {
        orders: rows.map(r => ({ ...r, user: userMap[r.userId] ?? null })),
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  // ── Security flags ──────────────────────────────────────────────────────────

  listInjections: adminProcedure
    .input(z.object({ page: z.number().int().min(1).default(1), limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.limit;

      const [logs, total] = await Promise.all([
        db.select().from(adminPromptLogs)
          .where(eq(adminPromptLogs.injectionFlag, true))
          .orderBy(desc(adminPromptLogs.createdAt))
          .limit(input.limit).offset(offset),
        db.select({ c: count() }).from(adminPromptLogs).where(eq(adminPromptLogs.injectionFlag, true)).then(r => Number(r[0]?.c ?? 0)),
      ]);

      const userIds = [...new Set(logs.map(l => l.userId))];
      const users = userIds.length
        ? await db.select({ id: user.id, name: user.name, email: user.email, image: user.image }).from(user)
            .where(inArray(user.id, userIds))
        : [];
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));

      return {
        logs: logs.map(l => ({ ...l, user: userMap[l.userId] ?? null })),
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  // ── AI-generated platform insights ──────────────────────────────────────────

  getAiInsights: adminProcedure.query(async () => {
    const stats = await (async () => {
      const [totalUsers, totalPrompts, blockedAll, injections, costRow, planRows] = await Promise.all([
        db.select({ c: count() }).from(user).then(r => Number(r[0]?.c ?? 0)),
        db.select({ c: count() }).from(adminPromptLogs).then(r => Number(r[0]?.c ?? 0)),
        db.select({ c: count() }).from(adminPromptLogs).where(ne(adminPromptLogs.status, 'ok')).then(r => Number(r[0]?.c ?? 0)),
        db.select({ c: count() }).from(adminPromptLogs).where(eq(adminPromptLogs.injectionFlag, true)).then(r => Number(r[0]?.c ?? 0)),
        db.select({ cost: sum(adminPromptLogs.estimatedCostUsd) }).from(adminPromptLogs).then(r => Number(r[0]?.cost ?? 0)),
        db.select({ plan: userPlans.plan, c: count() }).from(userPlans).groupBy(userPlans.plan),
      ]);
      return { totalUsers, totalPrompts, blockedAll, injections, totalCostUsd: costRow, planRows };
    })();

    const planSummary = stats.planRows.map(r => `${r.plan}: ${r.c}`).join(', ');

    const prompt = `You are an AI analyst reviewing stats for a SaaS email + calendar AI assistant called Yugati.

Platform stats:
- Total users: ${stats.totalUsers}
- Total AI prompts sent: ${stats.totalPrompts}
- Blocked prompts (any reason): ${stats.blockedAll}
- Prompt injection attempts detected: ${stats.injections}
- Total AI cost so far (USD): $${stats.totalCostUsd.toFixed(4)}
- Plan distribution: ${planSummary}

Provide exactly 5 actionable insights for the admin. Consider: security patterns, monetisation opportunities, cost optimisation, user growth, engagement.
Return JSON: { "insights": [{ "title": "...", "body": "...", "severity": "info|warning|critical" }] }`;

    const client = new OpenAI();
    const res = await client.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 500,
    });

    type Insight = { title: string; body: string; severity: 'info' | 'warning' | 'critical' };
    try {
      const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}') as { insights?: Insight[] };
      return { insights: parsed.insights ?? [], stats };
    } catch {
      return { insights: [], stats };
    }
  }),

  // ── Audit log ───────────────────────────────────────────────────────────────

  listAuditLog: adminProcedure
    .input(z.object({ page: z.number().int().min(1).default(1), limit: z.number().int().min(1).max(100).default(30) }))
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.limit;
      const logs = await db.select().from(adminAuditLog).orderBy(desc(adminAuditLog.createdAt)).limit(input.limit).offset(offset);
      const total = await db.select({ c: count() }).from(adminAuditLog).then(r => Number(r[0]?.c ?? 0));

      const adminIds = [...new Set(logs.map(l => l.adminId))];
      const admins = adminIds.length
        ? await db.select({ id: user.id, name: user.name }).from(user)
            .where(inArray(user.id, adminIds))
        : [];
      const adminMap = Object.fromEntries(admins.map(u => [u.id, u]));

      return {
        logs: logs.map(l => ({ ...l, admin: adminMap[l.adminId] ?? null })),
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),
});
