import { OpenAIAgentsProvider } from '@corsair-dev/mcp';
import { Agent, run, tool, InputGuardrailTripwireTriggered, OutputGuardrailTripwireTriggered } from '@openai/agents';
import { corsair } from '@/server/corsair';
import { loadSession, saveSession } from './session';
import { enhancePrompt } from './enhancer';
import { safetyGuardrail, sensitiveDataGuardrail } from './guardrails';
import { AGENT_INSTRUCTIONS } from './prompts/agent';
import { buildGmailTools } from './tools';
import type { ChatMessage } from './types';

function createAgent(tenantId: string) {
  const provider    = new OpenAIAgentsProvider();
  const corsairTools = provider.build({ corsair: corsair.withTenant(tenantId), tool });
  const gmailTools  = buildGmailTools(tenantId);

  return new Agent({
    name:             'yugati',
    model:            'gpt-4.1',
    instructions:     AGENT_INSTRUCTIONS,
    tools:            [...corsairTools, ...gmailTools],
    inputGuardrails:  [safetyGuardrail],
    outputGuardrails: [sensitiveDataGuardrail],
  });
}

export type ChatResult =
  | { status: 'ok';      output: string; conversationId: string; enhanced?: string }
  | { status: 'blocked'; reason: string; conversationId: string }
  | { status: 'error';   message: string; conversationId: string };

export async function runChat(
  tenantId:        string,
  messages:        ChatMessage[],
  conversationId?: string,
): Promise<ChatResult> {
  const { session, id } = await loadSession(tenantId, conversationId);

  const raw      = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const enhanced = await enhancePrompt(raw, messages);

  try {
    const result = await run(createAgent(tenantId), enhanced, { session });
    await saveSession(tenantId, id, session);

    return {
      status:         'ok',
      output:         result.finalOutput ?? '',
      conversationId: id,
      enhanced:       enhanced !== raw ? enhanced : undefined,
    };
  } catch (err) {
    if (err instanceof InputGuardrailTripwireTriggered) {
      const reason = (err.result?.output?.outputInfo as { reason?: string })?.reason
        ?? 'This request was blocked by the safety filter.';
      return { status: 'blocked', reason, conversationId: id };
    }
    if (err instanceof OutputGuardrailTripwireTriggered) {
      return { status: 'blocked', reason: 'The response was blocked to protect sensitive data.', conversationId: id };
    }
    throw err;
  }
}
