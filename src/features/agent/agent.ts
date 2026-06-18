import { OpenAIAgentsProvider } from '@corsair-dev/mcp';
import { Agent, run, tool, InputGuardrailTripwireTriggered, OutputGuardrailTripwireTriggered } from '@openai/agents';
import { corsair } from '@/server/corsair';
import { loadSession, saveSession } from './session';
import { enhancePrompt } from './enhancer';
import { safetyGuardrail, sensitiveDataGuardrail } from './guardrails';
import { buildAgentInstructions } from './prompts/agent';
import { buildGmailTools } from './tools';
import { logPrompt } from './logger';
import type { ChatMessage } from './types';

const MODEL = 'gpt-4.1';

// Cache agents per (tenantId, mode) — tool schemas don't change between requests
const agentCache = new Map<string, Agent>();

function getAgent(tenantId: string, userName: string, mode: 'guided' | 'auto'): Agent {
  const key = `${tenantId}:${mode}`;
  const cached = agentCache.get(key);
  if (cached) return cached;

  const provider     = new OpenAIAgentsProvider();
  const corsairTools = provider.build({ corsair: corsair.withTenant(tenantId), tool });
  const gmailTools   = buildGmailTools(tenantId);

  const agent = new Agent({
    name:             'yugati',
    model:            MODEL,
    instructions:     buildAgentInstructions(userName, mode),
    tools:            [...corsairTools, ...gmailTools],
    inputGuardrails:  [safetyGuardrail],
    outputGuardrails: [sensitiveDataGuardrail],
  });

  agentCache.set(key, agent);
  return agent;
}

export type ChatResult =
  | { status: 'ok';      output: string; conversationId: string; enhanced?: string }
  | { status: 'blocked'; reason: string; conversationId: string }
  | { status: 'error';   message: string; conversationId: string };

export interface ChatMeta {
  ipAddress?: string;
  userAgent?: string;
}

export async function runChat(
  tenantId:        string,
  messages:        ChatMessage[],
  conversationId?: string,
  userName?:       string,
  mode:            'guided' | 'auto' = 'guided',
  meta:            ChatMeta = {},
): Promise<ChatResult> {
  const t0       = Date.now();
  const { session, id } = await loadSession(tenantId, conversationId);
  const raw      = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const enhanced = await enhancePrompt(raw, messages);

  try {
    const result = await run(getAgent(tenantId, userName ?? 'User', mode), enhanced, { session });
    await saveSession(tenantId, id, session);
    const durationMs = Date.now() - t0;

    // SDK accumulates usage in result.state.usage (camelCase)
    const usage = (result as unknown as { state: { usage: { inputTokens: number; outputTokens: number; totalTokens: number } } }).state.usage;
    const promptTokens     = usage?.inputTokens  ?? 0;
    const completionTokens = usage?.outputTokens ?? 0;

    void logPrompt({
      userId:           tenantId,
      conversationId:   id,
      rawPrompt:        raw,
      enhancedPrompt:   enhanced !== raw ? enhanced : undefined,
      agentReply:       result.finalOutput ?? undefined,
      status:           'ok',
      injectionFlag:    false,
      model:            MODEL,
      promptTokens,
      completionTokens,
      totalTokens:      promptTokens + completionTokens,
      ipAddress:        meta.ipAddress,
      userAgent:        meta.userAgent,
      durationMs,
    });

    return {
      status:         'ok',
      output:         result.finalOutput ?? '',
      conversationId: id,
      enhanced:       enhanced !== raw ? enhanced : undefined,
    };
  } catch (err) {
    const durationMs = Date.now() - t0;

    if (err instanceof InputGuardrailTripwireTriggered) {
      const reason = (err.result?.output?.outputInfo as { reason?: string })?.reason
        ?? 'This request was blocked by the safety filter.';

      void logPrompt({
        userId:         tenantId,
        conversationId: id,
        rawPrompt:      raw,
        enhancedPrompt: enhanced !== raw ? enhanced : undefined,
        status:         'blocked_input',
        blockedReason:  reason,
        injectionFlag:  true,
        model:          MODEL,
        promptTokens:   0,
        completionTokens: 0,
        totalTokens:    0,
        ipAddress:      meta.ipAddress,
        userAgent:      meta.userAgent,
        durationMs,
      });

      return { status: 'blocked', reason, conversationId: id };
    }

    if (err instanceof OutputGuardrailTripwireTriggered) {
      const reason = 'The response was blocked to protect sensitive data.';
      void logPrompt({
        userId:         tenantId,
        conversationId: id,
        rawPrompt:      raw,
        status:         'blocked_output',
        blockedReason:  reason,
        injectionFlag:  false,
        model:          MODEL,
        promptTokens:   0,
        completionTokens: 0,
        totalTokens:    0,
        ipAddress:      meta.ipAddress,
        userAgent:      meta.userAgent,
        durationMs,
      });
      return { status: 'blocked', reason, conversationId: id };
    }

    const apiErr = err as { code?: string; status?: number };

    if (apiErr.code === 'rate_limit_exceeded' || apiErr.status === 429) {
      return {
        status: 'blocked',
        reason: 'Rate limit reached — please wait a few seconds and try again.',
        conversationId: id,
      };
    }

    if (apiErr.code === 'context_length_exceeded') {
      return {
        status: 'blocked',
        reason: "That request pulled in too much content for a single call. Try asking for fewer emails at once (e.g. \"summarize my last 5 unread emails\") or start a new conversation.",
        conversationId: id,
      };
    }

    throw err;
  }
}
