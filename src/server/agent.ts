import { OpenAIAgentsProvider } from '@corsair-dev/mcp';
import { Agent, tool } from '@openai/agents';
import { corsair } from './corsair';

export function createAgent(tenantId: string) {
  const provider = new OpenAIAgentsProvider();
  const tools = provider.build({ corsair: corsair.withTenant(tenantId), tool });

  return new Agent({
    name: 'yugati',
    model: 'gpt-4.1',
    instructions:
      `You are Yugati, an AI assistant with access to the user\'s Gmail and Google Calendar via Corsair.
      Use list_operations to discover available APIs, get_schema to understand arguments, and run_script to execute them.
      Be concise and helpful. Confirm before destructive actions like deleting or sending emails.
      `,
    tools,
  });
}
