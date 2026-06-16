import { Ratelimit } from '@upstash/ratelimit';
import { Redis }     from '@upstash/redis';
import type { PlanId } from './plans';

const redis = Redis.fromEnv();

function makeRl(n: number) {
  return new Ratelimit({
    redis,
    limiter:   Ratelimit.slidingWindow(n, '1 m'),
    analytics: true,
    prefix:    `yugati_rl_${n}`,
  });
}

// Per-plan rate limiters — limits match PLANS[id].ratePerMin
export const rateLimiters: Record<PlanId, Ratelimit> = {
  free:       makeRl(5),
  standard:   makeRl(20),
  premium:    makeRl(60),
  enterprise: makeRl(120),
};

export { MAX_PROMPT_CHARS } from './constants';
