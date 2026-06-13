import { corsair } from "@/server/corsair";

export class GmailService {
  private readonly c: ReturnType<typeof corsair.withTenant>;

  constructor(tenantId: string) {
    this.c = corsair.withTenant(tenantId);
  }

  listMessages(opts: { q?: string; maxResults?: number; labelIds?: string[] } = {}) {
    return this.c.gmail.api.messages.list({ maxResults: 20, ...opts });
  }

  getMessage(id: string) {
    return this.c.gmail.api.messages.get({ id, format: "full" });
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
    const raw = GmailService.buildRfc2822(opts);
    return this.c.gmail.api.messages.send({ raw, threadId: opts.threadId });
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

  updateLabel(id: string, opts: { name?: string; labelListVisibility?: string; messageListVisibility?: string }) {
    return this.c.gmail.api.labels.update({ id, label: { name: opts.name } });
  }

  deleteLabel(id: string) {
    return this.c.gmail.api.labels.delete({ id });
  }

  trashMessage(id: string) {
    return this.c.gmail.api.messages.trash({ id });
  }

  modifyMessage(id: string, opts: { addLabelIds?: string[]; removeLabelIds?: string[] }) {
    return this.c.gmail.api.messages.modify({ id, ...opts });
  }

  listThreads(opts: { q?: string; maxResults?: number; labelIds?: string[] } = {}) {
    return this.c.gmail.api.threads.list({ maxResults: 20, ...opts });
  }

  getThread(id: string) {
    return this.c.gmail.api.threads.get({ id, format: "full" });
  }

  trashThread(id: string) {
    return this.c.gmail.api.threads.trash({ id });
  }

  listLabels() {
    return this.c.gmail.api.labels.list({});
  }

  // Encodes a plain-text email as base64url RFC2822 (required by the Gmail API).
  private static buildRfc2822(opts: {
    to: string | string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body?: string;
  }) {
    const toHeader = Array.isArray(opts.to) ? opts.to.join(', ') : opts.to;
    const lines: string[] = [
      `To: ${toHeader}`,
      opts.cc?.length  ? `Cc: ${opts.cc.join(', ')}`  : '',
      opts.bcc?.length ? `Bcc: ${opts.bcc.join(', ')}` : '',
      `Subject: ${opts.subject ?? ''}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      opts.body ?? '',
    ].filter((l) => l !== '');

    const message = lines.join("\r\n");

    return Buffer.from(message).toString("base64url");
  }
}
