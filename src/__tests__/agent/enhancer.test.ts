import { describe, it, expect } from 'vitest';
import { needsEnhancement } from '@/features/agent/enhancer';
import type { ChatMessage } from '@/features/agent/types';

const noHistory: ChatMessage[] = [];
const twoTurns: ChatMessage[]  = [
  { role: 'user',      content: 'Show me my emails' },
  { role: 'assistant', content: 'Here are your emails...' },
];

describe('needsEnhancement', () => {
  it('skips very short messages (≤3 words)', () => {
    expect(needsEnhancement('Show emails', noHistory)).toBe(false);
    expect(needsEnhancement('ok', noHistory)).toBe(false);
  });

  it('enhances medium messages in fresh sessions (4–6 words)', () => {
    // These are short but ambiguous enough to benefit from enhancement
    expect(needsEnhancement('What are my meetings today', noHistory)).toBe(true);
    expect(needsEnhancement('Show me unread emails', noHistory)).toBe(true);
  });

  it('skips messages that contain an email address with many words (>12)', () => {
    expect(needsEnhancement(
      'Send a follow-up to alice@example.com about the Q3 budget report we discussed last Tuesday',
      noHistory,
    )).toBe(false);
  });

  it('enhances short messages that contain an email address (≤12 words)', () => {
    expect(needsEnhancement('Send a follow-up to alice@example.com about the Q3 report', noHistory)).toBe(true);
  });

  it('skips short follow-ups in an active conversation', () => {
    // 10 words, history length ≥ 2 → skip
    expect(needsEnhancement('What did she say in the last email thread', twoTurns)).toBe(false);
  });

  it('enhances long messages with no email or context', () => {
    expect(needsEnhancement(
      'Please look through all my recent emails and find any that mention the new product launch and summarise them',
      noHistory,
    )).toBe(true);
  });

  it('enhances medium-length first messages in fresh sessions', () => {
    // 8 words, no history — should be enhanced
    expect(needsEnhancement('Find all emails about the budget approval process', noHistory)).toBe(true);
  });
});
