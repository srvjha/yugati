import { db } from '@/server/db';
import { adminPromptLogs } from '@/server/db/schema';
import { randomUUID } from 'crypto';

function uid() { return randomUUID(); }

// Pricing per 1M tokens (USD). Approximate — update as OpenAI changes rates.
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4.1':       { input: 2.00,  output: 8.00  },
  'gpt-4.1-mini':  { input: 0.40,  output: 1.60  },
  'gpt-4.1-nano':  { input: 0.10,  output: 0.40  },
  'gpt-4o':        { input: 5.00,  output: 15.00 },
  'gpt-4o-mini':   { input: 0.15,  output: 0.60  },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const p = MODEL_PRICING[model] ?? { input: 0.40, output: 1.60 };
  return (promptTokens / 1_000_000) * p.input + (completionTokens / 1_000_000) * p.output;
}

export interface PromptLogEntry {
  userId:           string;
  conversationId?:  string;
  rawPrompt:        string;
  enhancedPrompt?:  string;
  agentReply?:      string;
  status:           'ok' | 'blocked_input' | 'blocked_output' | 'error';
  blockedReason?:   string;
  injectionFlag:    boolean;
  model:            string;
  promptTokens:     number;
  completionTokens: number;
  totalTokens:      number;
  ipAddress?:       string;
  userAgent?:       string;
  durationMs:       number;
}

export async function logPrompt(entry: PromptLogEntry): Promise<void> {
  try {
    const cost = estimateCost(entry.model, entry.promptTokens, entry.completionTokens);
    await db.insert(adminPromptLogs).values({
      id:               uid(),
      userId:           entry.userId,
      conversationId:   entry.conversationId ?? null,
      rawPrompt:        entry.rawPrompt,
      enhancedPrompt:   entry.enhancedPrompt ?? null,
      agentReply:       entry.agentReply ?? null,
      status:           entry.status,
      blockedReason:    entry.blockedReason ?? null,
      injectionFlag:    entry.injectionFlag,
      model:            entry.model,
      promptTokens:     entry.promptTokens,
      completionTokens: entry.completionTokens,
      totalTokens:      entry.totalTokens,
      estimatedCostUsd: cost.toFixed(6),
      ipAddress:        entry.ipAddress ?? null,
      userAgent:        entry.userAgent ?? null,
      durationMs:       entry.durationMs,
    });
  } catch (err) {
    // Never crash a user request because of logging failure
    console.error('[admin/logger] failed to log prompt:', err);
  }
}
