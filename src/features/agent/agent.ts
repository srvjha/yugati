import { OpenAIAgentsProvider } from '@corsair-dev/mcp';
import { Agent, run, tool } from '@openai/agents';
import { corsair } from '@/server/corsair';
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

export async function runChat(tenantId: string, messages: ChatMessage[]): Promise<string> {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const result = await run(createAgent(tenantId), lastUserMessage);
  return result.finalOutput ?? '';
}
