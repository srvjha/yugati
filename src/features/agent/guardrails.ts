import OpenAI from 'openai';
import type { InputGuardrail, OutputGuardrail } from '@openai/agents';
import { SAFETY_SYSTEM, SENSITIVE_PATTERNS } from './prompts/guardrails';

const client = new OpenAI();

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /\bimportant\s+system\s+message\b/i,
  /\bimportant\s+update\b[\s\S]*?instructions?/i,
  /new\s+system\s+directive/i,
  /you\s+are\s+no\s+longer\s+bound/i,
  /developer\s+has\s+changed\s+your\s+system/i,
  /<!--[\s\S]*?-->/,           // HTML comment injection (any content)
  /\[system\s*:/i,             // [SYSTEM: ...] overrides
  /^#\s*(system|instruction)/im,  // markdown heading overrides
];

export const INJECTION_BLOCKED_REASON = "I'm focused on your Gmail and Google Calendar — I can't help with that. Try asking me to manage your emails, search your inbox, schedule meetings, or anything related to Gmail or Google Calendar!";

/** Fast regex injection pre-check — catches wrapped injections before any LLM call. */
export function detectInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((re) => re.test(text));
}

async function callSafetyModel(text: string): Promise<{ safe: boolean; reason: string }> {
  const res = await client.chat.completions.create({
    model:           'gpt-4o-mini',
    messages:        [{ role: 'system', content: SAFETY_SYSTEM }, { role: 'user', content: text }],
    response_format: { type: 'json_object' },
    max_tokens:      80,
    temperature:     0,
  });
  try {
    return JSON.parse(res.choices[0]?.message?.content ?? '{"safe":true,"reason":""}');
  } catch {
    return { safe: true, reason: '' };
  }
}

/** Pre-enhancer safety check — call this BEFORE enhancePrompt to prevent injection from reaching any LLM. */
export async function checkSafety(text: string): Promise<{ safe: boolean; reason: string }> {
  return callSafetyModel(text);
}

export const safetyGuardrail: InputGuardrail = {
  name: 'safety-check',
  // runInParallel defaults to true — guardrail races the main model call, zero added latency
  execute: async ({ input }) => {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    // If the safety model is rate-limited or unavailable, allow the request rather than
    // killing the entire agent run with a 429 that surfaces as "I'm a bit busy".
    try {
      const result = await callSafetyModel(text);
      return { tripwireTriggered: !result.safe, outputInfo: { reason: result.reason } };
    } catch {
      return { tripwireTriggered: false, outputInfo: { reason: '' } };
    }
  },
};

export const sensitiveDataGuardrail: OutputGuardrail = {
  name: 'sensitive-data-check',
  execute: async ({ agentOutput }) => {
    const text      = typeof agentOutput === 'string' ? agentOutput : JSON.stringify(agentOutput);
    const triggered = SENSITIVE_PATTERNS.some((re) => re.test(text));
    return { tripwireTriggered: triggered, outputInfo: { reason: 'Response contained sensitive data pattern' } };
  },
};
