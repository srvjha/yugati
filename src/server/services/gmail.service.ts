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

  sendMessage(opts: { to: string; subject: string; body: string; threadId?: string }) {
    const raw = GmailService.buildRfc2822(opts);
    return this.c.gmail.api.messages.send({ raw, threadId: opts.threadId });
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
  private static buildRfc2822(opts: { to: string; subject: string; body: string }) {
    const message = [
      `To: ${opts.to}`,
      `Subject: ${opts.subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      opts.body,
    ].join("\r\n");

    return Buffer.from(message).toString("base64url");
  }
}
