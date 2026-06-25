import { corsair }         from '@/server/corsair';
import { db }              from '@/server/db';
import { corsairAccounts, corsairIntegrations, corsairEntities } from '@/server/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AuthMissingError } from 'corsair';

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export interface Subscription {
  messageId:   string;
  senderName:  string;
  senderEmail: string;
  domain:      string;
  subject:     string;
  mailtoUrl?:  string;
  httpsUrl?:   string;
  oneClick:    boolean;
}

export class GmailService {
  private readonly c:        ReturnType<typeof corsair.withTenant>;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.c = corsair.withTenant(tenantId);
  }

  private async getGmailAccountId(): Promise<string | null> {
    return db
      .select({ id: corsairAccounts.id })
      .from(corsairAccounts)
      .innerJoin(corsairIntegrations, eq(corsairAccounts.integrationId, corsairIntegrations.id))
      .where(and(eq(corsairAccounts.tenantId, this.tenantId), eq(corsairIntegrations.name, 'gmail')))
      .limit(1)
      .then((r) => r[0]?.id ?? null);
  }

  listMessages(opts: { q?: string; maxResults?: number; labelIds?: string[] } = {}) {
    return this.c.gmail.api.messages.list({ maxResults: 20, ...opts });
  }

  async listInbox(opts: { maxResults?: number; q?: string; forceRefresh?: boolean } = {}) {
    const limit = opts.maxResults ?? 15;

    // Non-inbox queries (search, category tabs, starred, etc.) always hit live API.
    // forceRefresh also bypasses cache and goes straight to the live API.
    const isNonCacheable = (opts.q && opts.q.trim() !== 'in:inbox') || opts.forceRefresh;
    if (isNonCacheable) {
      try { return await this.fetchFromApi(limit, opts.forceRefresh ? undefined : opts.q); }
      catch (err) {
        if (err instanceof AuthMissingError) return { messages: [], nextPageToken: null };
        throw err;
      }
    }

    // ── Tier 1: direct Drizzle query on corsairEntities (fast ~50ms) ──────────
    // Fastest path — single SQL query, no Corsair abstraction overhead.
    // Falls through to Tier 2 if Corsair ever changes internal schema/IDs.
    try {
      const accountId = await this.getGmailAccountId();
      if (accountId) {
        type RawMsg = { id?: string; internalDate?: string; labelIds?: string[]; snippet?: string; subject?: string; from?: string; payload?: { headers?: Array<{ name?: string; value?: string }> } };
        const rows = await db
          .select()
          .from(corsairEntities)
          .where(and(
            eq(corsairEntities.accountId, accountId),
            sql`${corsairEntities.data}->'labelIds' @> '["INBOX"]'::jsonb`,
          ))
          .orderBy(desc(sql`coalesce((${corsairEntities.data}->>'internalDate')::bigint, extract(epoch from ${corsairEntities.updatedAt})::bigint * 1000)`))
          .limit(limit);

        if (rows.length > 0) {
          const newest = Math.max(...rows.map((r) => new Date(r.updatedAt).getTime()));
          if (Date.now() - newest >= CACHE_TTL_MS) void this.fetchFromApi(limit).catch(() => {});

          const messages = rows.map((r) => {
            const msg = r.data as RawMsg;
            const headers = msg.payload?.headers ?? [];
            const get = (name: string) => headers.find((h) => h.name?.toLowerCase() === name)?.value ?? '';
            // Top-level fields (written by our fetchFromApi) take priority;
            // fall back to headers for Corsair-native records.
            return {
              ...msg,
              subject: msg.subject ?? get('subject'),
              from:    msg.from    ?? get('from'),
            };
          });

          return { messages, nextPageToken: null };
        }
      }
    } catch (err) {
      console.warn('[GmailService] direct cache query failed, falling back to Corsair:', err);
    }

    // ── Tier 2: Corsair abstraction (reliable fallback) ───────────────────────
    // Kicks in if Tier 1 returns empty (schema change) or throws.
    try {
      const cached = await this.c.gmail.db.messages.list({ limit });
      if (cached.length > 0) {
        const sorted = [...cached]
          .sort((a, b) => Number(b.data.internalDate ?? 0) - Number(a.data.internalDate ?? 0))
          .map((e) => e.data);

        const newest = Math.max(...cached.map((e) => new Date(e.updated_at).getTime()));
        if (Date.now() - newest >= CACHE_TTL_MS) void this.fetchFromApi(limit).catch(() => {});

        return { messages: sorted, nextPageToken: null };
      }
    } catch (err) {
      console.warn('[GmailService] Corsair cache query failed, falling back to API:', err);
    }

    // ── Tier 3: live Gmail API ─────────────────────────────────────────────────
    try {
      return await this.fetchFromApi(limit);
    } catch (err) {
      if (err instanceof AuthMissingError) return { messages: [], nextPageToken: null };
      throw err;
    }
  }

  private async fetchFromApi(limit: number, q?: string) {
    const list = await this.c.gmail.api.messages.list({
      maxResults: limit,
      // Only restrict to INBOX when there's no explicit query — queries like
      // "in:sent" or "in:trash" must not have labelIds set or they return empty.
      ...(q ? {} : { labelIds: ['INBOX'] }),
      q,
    });
    if (!list.messages?.length) return { messages: [], nextPageToken: list.nextPageToken };

    const messages = await Promise.all(
      list.messages.map(({ id }) =>
        this.c.gmail.api.messages.get({ id: id!, format: 'metadata' })
      )
    );

    if (!q && messages.length > 0) {
      await Promise.all(
        messages.map((m) => {
          const msg = m as { id: string; payload?: { headers?: Array<{ name?: string; value?: string }> } } & Record<string, unknown>;
          const get = (name: string) => msg.payload?.headers?.find((h) => h.name?.toLowerCase() === name)?.value ?? '';
          // Store subject/from/date as top-level fields alongside the raw payload so
          // the Tier 1 direct query can read them without parsing headers every time.
          const enriched = { ...msg, subject: get('subject'), from: get('from'), date: get('date') };
          return this.c.gmail.db.messages.upsertByEntityId(msg.id, enriched as Parameters<typeof this.c.gmail.db.messages.upsertByEntityId>[1]);
        })
      );
    }

    return { messages, nextPageToken: list.nextPageToken };
  }

  getMessage(id: string) {
    return this.c.gmail.api.messages.get({ id, format: 'full' });
  }

  sendMessage(opts: {
    to: string | string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body?: string;
    htmlBody?: string;
    threadId?: string;
    attachments?: Array<{ filename: string; mimeType: string; data: string; size: number }>;
  }) {
    return this.c.gmail.api.messages.send({
      raw: GmailService.buildRfc2822(opts),
      threadId: opts.threadId,
    });
  }

  createDraft(opts: { to?: string | string[]; subject?: string; body?: string; threadId?: string }) {
    const raw = GmailService.buildRfc2822({ to: opts.to ?? '', ...opts });
    return this.c.gmail.api.drafts.create({ draft: { message: { raw, threadId: opts.threadId } } });
  }

  updateDraft(id: string, opts: { to?: string | string[]; subject?: string; body?: string }) {
    const raw = GmailService.buildRfc2822({ to: opts.to ?? '', ...opts });
    return this.c.gmail.api.drafts.update({ id, draft: { message: { raw } } });
  }

  sendDraft(id: string) {
    return this.c.gmail.api.drafts.send({ id });
  }

  getDraft(id: string) {
    return this.c.gmail.api.drafts.get({ id, format: 'full' });
  }

  createLabel(opts: { name: string; labelListVisibility?: string; messageListVisibility?: string }) {
    return this.c.gmail.api.labels.create({ label: { name: opts.name } });
  }

  updateLabel(id: string, opts: { name?: string }) {
    return this.c.gmail.api.labels.update({ id, label: { name: opts.name } });
  }

  deleteLabel(id: string) {
    return this.c.gmail.api.labels.delete({ id });
  }

  listLabels() {
    return this.c.gmail.api.labels.list({});
  }

  async listSubscriptions(maxResults = 50) {
    // Search multiple categories since Gmail routes subscription emails to Promotions/Updates
    const [inboxList, promoList, updatesList] = await Promise.allSettled([
      this.c.gmail.api.messages.list({ q: 'has:unsubscribe', maxResults }),
      this.c.gmail.api.messages.list({ labelIds: ['CATEGORY_PROMOTIONS'], maxResults }),
      this.c.gmail.api.messages.list({ labelIds: ['CATEGORY_UPDATES'], maxResults }),
    ]);

    const allIds = new Set<string>();
    for (const result of [inboxList, promoList, updatesList]) {
      if (result.status === 'fulfilled') {
        const r = result.value as { messages?: Array<{ id?: string }> };
        for (const m of r.messages ?? []) {
          if (m.id) allIds.add(m.id);
        }
      }
    }

    if (!allIds.size) return { subscriptions: [] as Subscription[] };

    const details = await Promise.all(
      [...allIds].slice(0, maxResults).map((id) =>
        this.c.gmail.api.messages.get({ id, format: 'full' })
      )
    );

    const seen = new Map<string, Subscription>();
    for (const msg of details) {
      const m = msg as Record<string, unknown>;
      const headers = ((m.payload as Record<string, unknown>)?.headers ?? []) as Array<{ name?: string; value?: string }>;
      const get = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';

      const unsubHeader = get('List-Unsubscribe');
      if (!unsubHeader) continue;

      const from = get('From');
      const nameMatch = from.match(/^"?([^"<,]+)"?\s*</);
      const emailMatch = from.match(/<([^>]+)>/) ?? [null, from];
      const senderEmail = ((emailMatch[1] as string) ?? from).trim().toLowerCase();
      const senderName  = (nameMatch?.[1] ?? senderEmail).trim().replace(/"/g, '');
      const domain      = senderEmail.split('@')[1] ?? senderEmail;
      if (!domain || seen.has(domain)) continue;

      const mailtoMatch = unsubHeader.match(/<mailto:([^>]+)>/i);
      const httpsMatch  = unsubHeader.match(/<(https?:\/\/[^>]+)>/i);
      const unsubPost   = get('List-Unsubscribe-Post');

      seen.set(domain, {
        messageId:   String(m.id ?? ''),
        senderName,
        senderEmail,
        domain,
        subject:     get('Subject'),
        mailtoUrl:   mailtoMatch?.[1],
        httpsUrl:    httpsMatch?.[1],
        oneClick:    unsubPost.toLowerCase().includes('one-click'),
      });
    }

    return { subscriptions: Array.from(seen.values()) };
  }

  async unsubscribeViaEmail(mailtoUrl: string) {
    const [address, ...rest] = mailtoUrl.split('?');
    const params = new URLSearchParams(rest.join('?'));
    await this.sendMessage({
      to:      [address.trim()],
      subject: params.get('subject') ?? 'Unsubscribe',
      body:    params.get('body') ?? '',
    });
    return { success: true };
  }

  async trashMessage(id: string) {
    const result = await this.c.gmail.api.messages.trash({ id });
    await this.c.gmail.db.messages.deleteByEntityId(id);
    return result;
  }

  async deleteMessage(id: string) {
    await this.c.gmail.api.messages.delete({ id });
    await this.c.gmail.db.messages.deleteByEntityId(id);
    return { success: true };
  }

  async modifyMessage(id: string, opts: { addLabelIds?: string[]; removeLabelIds?: string[] }) {
    const result = await this.c.gmail.api.messages.modify({ id, ...opts });
    // Evict so the next listInbox re-fetches with updated labels
    await this.c.gmail.db.messages.deleteByEntityId(id);
    return result;
  }

  listThreads(opts: { q?: string; maxResults?: number; labelIds?: string[] } = {}) {
    return this.c.gmail.api.threads.list({ maxResults: 20, ...opts });
  }

  getThread(id: string) {
    return this.c.gmail.api.threads.get({ id, format: 'full' });
  }

  trashThread(id: string) {
    return this.c.gmail.api.threads.trash({ id });
  }

  private static chunkBase64(b64: string, width = 76): string {
    return b64.match(new RegExp(`.{1,${width}}`, 'g'))?.join('\r\n') ?? b64;
  }

  /** RFC 2047 §4: encode a header value as UTF-8 Base64 when it contains non-ASCII. */
  private static encodeHeader(str: string): string {
    if (/^[\x00-\x7F]*$/.test(str)) return str;
    return `=?UTF-8?B?${Buffer.from(str, 'utf-8').toString('base64')}?=`;
  }

  private static buildRfc2822(opts: {
    to: string | string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body?: string;
    htmlBody?: string;
    attachments?: Array<{ filename: string; mimeType: string; data: string }>;
  }) {
    const toHeader = Array.isArray(opts.to) ? opts.to.join(', ') : opts.to;
    const baseHeaders = [
      `To: ${toHeader}`,
      ...(opts.cc?.length  ? [`Cc: ${opts.cc.join(', ')}`]   : []),
      ...(opts.bcc?.length ? [`Bcc: ${opts.bcc.join(', ')}`] : []),
      `Subject: ${GmailService.encodeHeader(opts.subject ?? '')}`,
      'MIME-Version: 1.0',
    ];

    // ── With attachments: multipart/mixed wrapping body + each file ──────────
    if (opts.attachments?.length) {
      const mixBoundary = `----=_Mix_${Date.now()}`;
      const altBoundary = `----=_Alt_${Date.now() + 1}`;
      const plain = (opts.body ?? (opts.htmlBody?.replace(/<[^>]+>/g, '') ?? '')).replace(/\r?\n/g, '\r\n');

      // Body part: multipart/alternative if html, else plain text
      let bodySection: string;
      if (opts.htmlBody) {
        bodySection = [
          `--${mixBoundary}`,
          `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
          '',
          `--${altBoundary}`,
          'Content-Type: text/plain; charset=utf-8',
          'Content-Transfer-Encoding: quoted-printable',
          '',
          plain,
          `--${altBoundary}`,
          'Content-Type: text/html; charset=utf-8',
          'Content-Transfer-Encoding: quoted-printable',
          '',
          opts.htmlBody,
          `--${altBoundary}--`,
        ].join('\r\n');
      } else {
        bodySection = [
          `--${mixBoundary}`,
          'Content-Type: text/plain; charset=utf-8',
          'Content-Transfer-Encoding: quoted-printable',
          '',
          plain,
        ].join('\r\n');
      }

      const attachSections = opts.attachments.map((att) => [
        `--${mixBoundary}`,
        `Content-Type: ${att.mimeType}; name="${att.filename}"`,
        `Content-Disposition: attachment; filename="${att.filename}"`,
        'Content-Transfer-Encoding: base64',
        '',
        GmailService.chunkBase64(att.data),
      ].join('\r\n')).join('\r\n');

      const msgBody = [bodySection, attachSections, `--${mixBoundary}--`].join('\r\n');
      const headers = [...baseHeaders, `Content-Type: multipart/mixed; boundary="${mixBoundary}"`];
      return Buffer.from([...headers, '', msgBody].join('\r\n')).toString('base64url');
    }

    // ── No attachments: existing behaviour ───────────────────────────────────
    if (opts.htmlBody) {
      const boundary = `----=_Part_${Date.now()}`;
      const plain = (opts.body ?? opts.htmlBody.replace(/<[^>]+>/g, '')).replace(/\r?\n/g, '\r\n');
      const msgBody = [
        `--${boundary}`,
        'Content-Type: text/plain; charset=utf-8',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        plain,
        `--${boundary}`,
        'Content-Type: text/html; charset=utf-8',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        opts.htmlBody,
        `--${boundary}--`,
      ].join('\r\n');
      const headers = [...baseHeaders, `Content-Type: multipart/alternative; boundary="${boundary}"`];
      return Buffer.from([...headers, '', msgBody].join('\r\n')).toString('base64url');
    }

    // RFC 2822 requires a blank line between headers and body
    const body = (opts.body ?? '').replace(/\r?\n/g, '\r\n');
    return Buffer.from([...baseHeaders, 'Content-Type: text/plain; charset=utf-8', '', body].join('\r\n')).toString('base64url');
  }
}
