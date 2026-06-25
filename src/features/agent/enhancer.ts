import OpenAI from 'openai';
import { ENHANCER_SYSTEM } from './prompts/enhancer';
import type { ChatMessage } from './types';

const client = new OpenAI();

// Skip enhancement for short, already-clear messages — saves ~1s per request.
export function needsEnhancement(msg: string, history: ChatMessage[]): boolean {
  const words = msg.trim().split(/\s+/).length;
  // Single-word replies and very short confirmations → skip (yes, ok, send it, do it…)
  if (words <= 3) return false;
  // Long messages with an email address are already specific — but short ones still benefit from enhancement
  if (/\b[\w.+-]+@[\w-]+\.\w+\b/.test(msg) && words > 12) return false;
  // Follow-up in an active conversation is usually clear from context
  if (history.length >= 2 && words <= 12) return false;
  return true;
}

export async function enhancePrompt(userMessage: string, history: ChatMessage[] = []): Promise<string> {
  if (!needsEnhancement(userMessage, history)) return userMessage;

  // Include the last 4 messages before the current one so the enhancer understands follow-ups
  const context = history.slice(-5, -1);

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: ENHANCER_SYSTEM },
    ...context.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const res = await client.chat.completions.create({
    model:       'gpt-4.1-nano',
    messages,
    max_tokens:  250,
    temperature: 0.2,
  });
  return res.choices[0]?.message?.content?.trim() ?? userMessage;
}
