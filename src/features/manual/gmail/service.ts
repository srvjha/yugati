import { corsair } from '@/server/corsair';

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export class GmailService {
  private readonly c: ReturnType<typeof corsair.withTenant>;

  constructor(tenantId: string) {
    this.c = corsair.withTenant(tenantId);
  }

  listMessages(opts: { q?: string; maxResults?: number; labelIds?: string[] } = {}) {
    return this.c.gmail.api.messages.list({ maxResults: 20, ...opts });
  }

  async listInbox(opts: { maxResults?: number; q?: string } = {}) {
    const limit = opts.maxResults ?? 20;

    // Serve from Corsair entity DB when no search query and cache is fresh
    if (!opts.q) {
      const cached = await this.c.gmail.db.messages.list({ limit });

      if (cached.length > 0) {
        const newestUpdatedAt = Math.max(...cached.map((e) => new Date(e.updated_at).getTime()));
        if (Date.now() - newestUpdatedAt < CACHE_TTL_MS) {
          const sorted = [...cached]
            .sort((a, b) => Number(b.data.internalDate ?? 0) - Number(a.data.internalDate ?? 0))
            .map((e) => e.data);
          return { messages: sorted, nextPageToken: null };
        }
      }
    }

    // Fetch fresh from Gmail API
    const list = await this.c.gmail.api.messages.list({
      maxResults: limit,
      labelIds: ['INBOX'],
      q: opts.q,
    });
    if (!list.messages?.length) return { messages: [], nextPageToken: list.nextPageToken };

    const messages = await Promise.all(
      list.messages.map(({ id }) =>
        this.c.gmail.api.messages.get({ id: id!, format: 'metadata' })
      )
    );

    // Upsert into Corsair entity DB (only for non-search fetches)
    if (!opts.q && messages.length > 0) {
      await Promise.all(
        messages.map((m) => {
          const msg = m as { id: string } & Record<string, unknown>;
          return this.c.gmail.db.messages.upsertByEntityId(msg.id, msg as Parameters<typeof this.c.gmail.db.messages.upsertByEntityId>[1]);
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

  async trashMessage(id: string) {
    const result = await this.c.gmail.api.messages.trash({ id });
    await this.c.gmail.db.messages.deleteByEntityId(id);
    return result;
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

  private static buildRfc2822(opts: {
    to: string | string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body?: string;
  }) {
    const toHeader = Array.isArray(opts.to) ? opts.to.join(', ') : opts.to;
    const headers = [
      `To: ${toHeader}`,
      ...(opts.cc?.length  ? [`Cc: ${opts.cc.join(', ')}`]   : []),
      ...(opts.bcc?.length ? [`Bcc: ${opts.bcc.join(', ')}`] : []),
      `Subject: ${opts.subject ?? ''}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
    ];
    // RFC 2822 requires a blank line between headers and body — never filter it out
    const body = (opts.body ?? '').replace(/\r?\n/g, '\r\n');
    return Buffer.from([...headers, '', body].join('\r\n')).toString('base64url');
  }
}
