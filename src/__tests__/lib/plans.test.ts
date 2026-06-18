import { describe, it, expect } from 'vitest';
import { PLANS } from '@/lib/plans';
import type { PlanId } from '@/lib/plans';

const PLAN_IDS: PlanId[] = ['free', 'standard', 'premium', 'enterprise'];

describe('PLANS', () => {
  it('has all expected plan tiers', () => {
    expect(Object.keys(PLANS)).toEqual(PLAN_IDS);
  });

  it('free plan has zero price', () => {
    expect(PLANS.free.priceInr).toBe(0);
    expect(PLANS.free.paise).toBe(0);
  });

  it('paid plans have paise = priceInr * 100', () => {
    for (const id of ['standard', 'premium'] as PlanId[]) {
      const plan = PLANS[id];
      expect(plan.paise).toBe((plan.priceInr as number) * 100);
    }
  });

  it('enterprise plan has Infinity limits', () => {
    expect(PLANS.enterprise.messages).toBe(Infinity);
    expect(PLANS.enterprise.voice).toBe(Infinity);
    expect(PLANS.enterprise.compose).toBe(Infinity);
  });

  it('message limits increase with plan tier', () => {
    expect(PLANS.free.messages).toBeLessThan(PLANS.standard.messages);
    expect(PLANS.standard.messages).toBeLessThan(PLANS.premium.messages);
    expect(PLANS.premium.messages).toBeLessThan(PLANS.enterprise.messages);
  });

  it('charLimit increases with plan tier', () => {
    expect(PLANS.free.charLimit).toBeLessThan(PLANS.standard.charLimit);
    expect(PLANS.standard.charLimit).toBeLessThan(PLANS.premium.charLimit);
    expect(PLANS.premium.charLimit).toBeLessThan(PLANS.enterprise.charLimit);
  });

  it('every plan has required fields', () => {
    for (const id of PLAN_IDS) {
      const plan = PLANS[id];
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('messages');
      expect(plan).toHaveProperty('voice');
      expect(plan).toHaveProperty('compose');
      expect(plan).toHaveProperty('charLimit');
      expect(plan).toHaveProperty('ratePerMin');
    }
  });
});
