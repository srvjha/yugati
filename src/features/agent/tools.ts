import { tool } from '@openai/agents';
import { z } from 'zod';
import { corsair } from '@/server/corsair';

function encodeSubject(s: string): string {
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  return `=?utf-8?B?${Buffer.from(s).toString('base64')}?=`;
}

function buildRfc2822(opts: {
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
    `Subject: ${encodeSubject(opts.subject ?? '')}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
  ];
  // RFC 2822 requires a blank line between headers and body — never filter it out
  const body = (opts.body ?? '').replace(/\r?\n/g, '\r\n');
  return Buffer.from([...headers, '', body].join('\r\n')).toString('base64url');
}

export function buildGmailTools(tenantId: string) {
  const c = corsair.withTenant(tenantId);

  const sendEmail = tool({
    name: 'send_email',
    description:
      'Send an email via Gmail. Use this instead of the raw Gmail API to avoid encoding issues.',
    parameters: z.object({
      to:       z.union([z.string(), z.array(z.string())]).describe('Recipient email address(es)'),
      subject:  z.string().describe('Email subject line'),
      body:     z.string().describe('Plain-text email body'),
      cc:       z.array(z.string()).optional().describe('CC recipients'),
      bcc:      z.array(z.string()).optional().describe('BCC recipients'),
      threadId: z.string().optional().describe('Thread ID to reply in the same thread'),
    }),
    execute: async (args) => {
      const raw = buildRfc2822(args);
      const result = await c.gmail.api.messages.send({ raw, threadId: args.threadId });
      return JSON.stringify(result);
    },
  });

  return [sendEmail];
}
