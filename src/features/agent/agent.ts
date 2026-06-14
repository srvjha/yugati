import { OpenAIAgentsProvider } from '@corsair-dev/mcp';
import { Agent, run, tool } from '@openai/agents';
import { corsair } from '@/server/corsair';
import { loadSession, saveSession } from './session';
import type { ChatMessage } from './types';

const INSTRUCTIONS =
  "You are Yugati, an AI assistant with access to the user's Gmail and Google Calendar via Corsair. " +
  'Use list_operations to discover available APIs, get_schema to understand arguments, and run_script to execute them. ' +
  'Be concise and helpful. Confirm before destructive actions like deleting or sending emails.';

function createAgent(tenantId: string) {
  const provider = new OpenAIAgentsProvider();
  const tools    = provider.build({ corsair: corsair.withTenant(tenantId), tool });

  return new Agent({
    name:         'yugati',
    model:        'gpt-4.1',
    instructions: INSTRUCTIONS,
    tools,
  });
}

export async function runChat(
  tenantId: string,
  messages: ChatMessage[],
  conversationId?: string,
): Promise<{ output: string; conversationId: string }> {
  const { session, id } = await loadSession(tenantId, conversationId);

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

  // Pass session so the SDK reads prior history before this turn
  // and appends all new items (assistant msgs, tool calls, results) to it after.
  const result = await run(createAgent(tenantId), lastUserMessage, { session });

  await saveSession(tenantId, id, session);

  return { output: result.finalOutput ?? '', conversationId: id };
}
