import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// Mock env before importing razorpay — env runs Zod at import time
vi.mock('@/env', () => ({
  env: {
    RAZORPAY_KEY_ID:       'rzp_test_key',
    RAZORPAY_KEY_SECRET:   'test_payment_secret',
    RAZORPAY_WEBHOOK_SECRET: 'test_webhook_secret',
  },
}));

// Import after mock is in place
const { verifyPaymentSignature, verifyWebhookSignature } = await import('@/lib/razorpay');

function hmac(secret: string, body: string) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

describe('verifyPaymentSignature', () => {
  const ORDER_ID   = 'order_abc123';
  const PAYMENT_ID = 'pay_xyz789';
  const SECRET     = 'test_payment_secret';

  it('returns true for a valid signature', () => {
    const sig = hmac(SECRET, `${ORDER_ID}|${PAYMENT_ID}`);
    expect(verifyPaymentSignature(ORDER_ID, PAYMENT_ID, sig)).toBe(true);
  });

  it('returns false for a tampered signature', () => {
    const sig = hmac(SECRET, `${ORDER_ID}|${PAYMENT_ID}`);
    const tampered = sig.replace(sig[0]!, sig[0] === 'a' ? 'b' : 'a');
    expect(verifyPaymentSignature(ORDER_ID, PAYMENT_ID, tampered)).toBe(false);
  });

  it('returns false for a wrong-length signature (prevents timingSafeEqual crash)', () => {
    expect(verifyPaymentSignature(ORDER_ID, PAYMENT_ID, 'tooshort')).toBe(false);
  });

  it('returns false when orderId is swapped', () => {
    const sig = hmac(SECRET, `${PAYMENT_ID}|${ORDER_ID}`); // wrong order
    expect(verifyPaymentSignature(ORDER_ID, PAYMENT_ID, sig)).toBe(false);
  });
});

describe('verifyWebhookSignature', () => {
  const SECRET  = 'test_webhook_secret';
  const PAYLOAD = '{"event":"payment.captured"}';

  it('returns true for a valid webhook signature', () => {
    const sig = hmac(SECRET, PAYLOAD);
    expect(verifyWebhookSignature(PAYLOAD, sig)).toBe(true);
  });

  it('returns false for a wrong webhook signature', () => {
    expect(verifyWebhookSignature(PAYLOAD, 'deadbeef'.repeat(8))).toBe(false);
  });

  it('returns false for a tampered payload', () => {
    const sig = hmac(SECRET, PAYLOAD);
    expect(verifyWebhookSignature('{"event":"payment.failed"}', sig)).toBe(false);
  });
});
