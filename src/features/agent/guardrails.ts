import OpenAI from 'openai';
import type { InputGuardrail, OutputGuardrail } from '@openai/agents';
import { SAFETY_SYSTEM, SENSITIVE_PATTERNS } from './prompts/guardrails';

const client = new OpenAI();

export const safetyGuardrail: InputGuardrail = {
  name: 'safety-check',
  // runInParallel defaults to true — guardrail races the main model call, zero added latency
  execute: async ({ input }) => {
    const text = typeof input === 'string' ? input : JSON.stringify(input);

    const res = await client.chat.completions.create({
      model:           'gpt-4o-mini',
      messages:        [{ role: 'system', content: SAFETY_SYSTEM }, { role: 'user', content: text }],
      response_format: { type: 'json_object' },
      max_tokens:      80,
      temperature:     0,
    });

    let result: { safe: boolean; reason: string } = { safe: true, reason: '' };
    try {
      result = JSON.parse(res.choices[0]?.message?.content ?? '{"safe":true,"reason":""}');
    } catch {
      // parse failure → treat as safe to avoid false positives
    }

    return { tripwireTriggered: !result.safe, outputInfo: { reason: result.reason } };
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
