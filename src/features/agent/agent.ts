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

// Cache agents per (tenantId, mode, skipGuardrail)
const agentCache = new Map<string, Agent>();

function getAgent(tenantId: string, userName: string, mode: 'guided' | 'auto', skipGuardrail = false): Agent {
  const key = `${tenantId}:${mode}:${skipGuardrail}`;
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
    inputGuardrails:  skipGuardrail ? [] : [safetyGuardrail],
    outputGuardrails: [sensitiveDataGuardrail],
  });

  agentCache.set(key, agent);
  return agent;
}

export interface ChatMeta {
  ipAddress?: string;
  userAgent?: string;
}

export type ChatStreamChunk =
  | { type: 'delta';   text: string }
  | { type: 'done';    conversationId: string }
  | { type: 'blocked'; reason: string; conversationId: string }
  | { type: 'error';   message: string; conversationId: string };

export async function* streamChat(
  tenantId:        string,
  messages:        ChatMessage[],
  conversationId?: string,
  userName?:       string,
  mode:            'guided' | 'auto' = 'guided',
  meta:            ChatMeta = {},
  skipGuardrail:   boolean = false,
): AsyncGenerator<ChatStreamChunk> {
  const t0                  = Date.now();
  const { session, id }     = await loadSession(tenantId, conversationId);
  const raw                 = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const enhanced            = await enhancePrompt(raw, messages);

  // Retry up to 3 times on OpenAI 429 with exponential backoff (2s → 5s → 10s)
  const RETRY_DELAYS = [2_000, 5_000, 10_000];
  for (let attempt = 1; attempt <= 3; attempt++) {
    let yieldedTokens = false;

    try {
      const streamedResult = await run(getAgent(tenantId, userName ?? 'User', mode, skipGuardrail), enhanced, {
        session,
        stream: true,
      });

      // Stream tokens to the caller as the model generates them.
      // setEncoding('utf8') makes the Node Readable yield strings instead of Buffers —
      // without it, chunks are Buffer objects and JSON.stringify produces {"type":"Buffer",...}
      // which renders as [object Object] on the client.
      const textStream = streamedResult.toTextStream({ compatibleWithNodeStreams: true });
      textStream.setEncoding('utf8');
      for await (const chunk of textStream) {
        yieldedTokens = true;
        yield { type: 'delta', text: chunk as string };
      }

      // Ensure the full run (tool calls, guardrails) has completed before saving
      await streamedResult.completed;
      await saveSession(tenantId, id, session);

      const usage = (streamedResult as unknown as { state: { usage: { inputTokens: number; outputTokens: number; totalTokens: number } } }).state.usage;
      const promptTokens     = usage?.inputTokens  ?? 0;
      const completionTokens = usage?.outputTokens ?? 0;

      void logPrompt({
        userId:           tenantId,
        conversationId:   id,
        rawPrompt:        raw,
        enhancedPrompt:   enhanced !== raw ? enhanced : undefined,
        agentReply:       (streamedResult.finalOutput as string) ?? undefined,
        status:           'ok',
        injectionFlag:    false,
        model:            MODEL,
        promptTokens,
        completionTokens,
        totalTokens:      promptTokens + completionTokens,
        ipAddress:        meta.ipAddress,
        userAgent:        meta.userAgent,
        durationMs:       Date.now() - t0,
      });

      yield { type: 'done', conversationId: id };
      return;

    } catch (err) {
      const durationMs = Date.now() - t0;

      if (err instanceof InputGuardrailTripwireTriggered) {
        const reason = (err.result?.output?.outputInfo as { reason?: string })?.reason
          ?? 'This request was blocked by the safety filter.';

        void logPrompt({
          userId: tenantId, conversationId: id, rawPrompt: raw,
          enhancedPrompt: enhanced !== raw ? enhanced : undefined,
          status: 'blocked_input', blockedReason: reason, injectionFlag: true,
          model: MODEL, promptTokens: 0, completionTokens: 0, totalTokens: 0,
          ipAddress: meta.ipAddress, userAgent: meta.userAgent, durationMs,
        });

        yield { type: 'blocked', reason, conversationId: id };
        return;
      }

      if (err instanceof OutputGuardrailTripwireTriggered) {
        const reason = 'The response was blocked to protect sensitive data.';
        void logPrompt({
          userId: tenantId, conversationId: id, rawPrompt: raw,
          status: 'blocked_output', blockedReason: reason, injectionFlag: false,
          model: MODEL, promptTokens: 0, completionTokens: 0, totalTokens: 0,
          ipAddress: meta.ipAddress, userAgent: meta.userAgent, durationMs,
        });

        yield { type: 'blocked', reason, conversationId: id };
        return;
      }

      const apiErr = err as { code?: string; status?: number };

      // Retry on OpenAI rate limit if we haven't streamed anything yet
      if ((apiErr.code === 'rate_limit_exceeded' || apiErr.status === 429) && !yieldedTokens && attempt < 3) {
        const delay = RETRY_DELAYS[attempt - 1] ?? 5_000;
        console.warn(`[agent] 429 on attempt ${attempt}, retrying in ${delay}ms`);
        await new Promise<void>((r) => setTimeout(r, delay));
        continue;
      }

      if (apiErr.code === 'rate_limit_exceeded' || apiErr.status === 429) {
        console.error('[agent] 429 after all retries:', err);
        yield { type: 'error', message: "I'm a bit busy right now — please try again in a moment.", conversationId: id };
        return;
      }

      if (apiErr.code === 'context_length_exceeded') {
        yield { type: 'blocked', reason: "That request pulled in too much content for a single call. Try asking for fewer emails at once or start a new conversation.", conversationId: id };
        return;
      }

      // Only surface safe, user-facing error messages — never raw API errors
      console.error('[agent] unhandled error:', err);
      const msg = err instanceof Error ? err.message : '';
      const safeMessage = (
        msg.startsWith('Agent timed out') ||
        msg.startsWith("I'm a bit busy") ||
        msg.startsWith('That request pulled') ||
        apiErr.code === 'model_not_found'
      ) ? (apiErr.code === 'model_not_found' ? `Model not found: ${MODEL}` : msg)
        : 'Something went wrong — please try again.';
      yield { type: 'error', message: safeMessage, conversationId: id };
      return;
    }
  }
}
