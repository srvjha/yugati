import { describe, it, expect } from 'vitest';
import { SENSITIVE_PATTERNS } from '@/features/agent/prompts/guardrails';

const matches = (text: string) => SENSITIVE_PATTERNS.some((re) => re.test(text));

describe('SENSITIVE_PATTERNS', () => {
  describe('Bearer token detection', () => {
    it('flags Authorization Bearer header', () => {
      expect(matches('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9abc')).toBe(true);
    });

    it('flags inline Bearer token', () => {
      expect(matches('Use this token: Bearer ya29.a0AfH6SMDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(true);
    });
  });

  describe('PEM header detection', () => {
    it('flags RSA private key header', () => {
      expect(matches('-----BEGIN RSA PRIVATE KEY-----\nMIIE...')).toBe(true);
    });

    it('flags generic private key header', () => {
      expect(matches('-----BEGIN PRIVATE KEY-----')).toBe(true);
    });

    it('flags certificate header', () => {
      expect(matches('-----BEGIN CERTIFICATE-----')).toBe(true);
    });
  });

  describe('base64 blob detection', () => {
    it('flags a long base64 string with padding', () => {
      // 44-char base64 ending in ==
      expect(matches('dGVzdHRlc3R0ZXN0dGVzdHRlc3R0ZXN0dGVzdHRlc3Q=')).toBe(true);
    });
  });

  describe('safe content', () => {
    it('passes normal email content', () => {
      expect(matches('Here are your 5 unread emails from today.')).toBe(false);
    });

    it('passes email addresses', () => {
      expect(matches('Email from alice@example.com about the Q3 report')).toBe(false);
    });

    it('passes calendar event descriptions', () => {
      expect(matches('Meeting: Team standup at 10am in Conference Room B')).toBe(false);
    });

    it('passes short base64-looking IDs (order IDs etc)', () => {
      // Real Razorpay order IDs like "order_ABCdef123" are short and have no padding
      expect(matches('order_MnpQrStUvW123')).toBe(false);
    });
  });
});
