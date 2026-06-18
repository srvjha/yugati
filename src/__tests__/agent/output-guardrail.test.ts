import { describe, it, expect } from 'vitest';
import { sensitiveDataGuardrail } from '@/features/agent/guardrails';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const exec = (agentOutput: string) =>
  sensitiveDataGuardrail.execute({ agentOutput } as any);

describe('sensitiveDataGuardrail', () => {
  it('passes clean assistant output', async () => {
    const result = await exec('Here are your 3 unread emails: one from Alice about the project, one from Bob about the invoice, and one newsletter.');
    expect(result.tripwireTriggered).toBe(false);
  });

  it('blocks output containing a Bearer token', async () => {
    const result = await exec('Your OAuth token is: Bearer eyJhbGciOiJIUzI1NiJ9abcdefghijklmnop');
    expect(result.tripwireTriggered).toBe(true);
  });

  it('blocks output containing a PEM private key', async () => {
    const result = await exec('Here is your private key:\n-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAK...');
    expect(result.tripwireTriggered).toBe(true);
  });

  it('handles object output by stringifying it', async () => {
    const result = await exec(JSON.stringify({ message: 'All good', emails: 5 }));
    expect(result.tripwireTriggered).toBe(false);
  });
});
