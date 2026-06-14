import OpenAI from 'openai';
import { ENHANCER_SYSTEM } from './prompts/enhancer';
import type { ChatMessage } from './types';

const client = new OpenAI();

export async function enhancePrompt(userMessage: string, history: ChatMessage[] = []): Promise<string> {
  // Include the last 4 messages before the current one so the enhancer understands follow-ups
  const context = history.slice(-5, -1);

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: ENHANCER_SYSTEM },
    ...context.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const res = await client.chat.completions.create({
    model:       'gpt-4o-mini',
    messages,
    max_tokens:  250,
    temperature: 0.2,
  });
  return res.choices[0]?.message?.content?.trim() ?? userMessage;
}
