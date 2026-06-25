import { Ratelimit, type Duration } from '@upstash/ratelimit';
import { Redis }                    from '@upstash/redis';
import type { PlanId } from './plans';

const redis = Redis.fromEnv();

function makeRl(n: number, window: Duration = '1 m', prefix?: string) {
  return new Ratelimit({
    redis,
    limiter:   Ratelimit.slidingWindow(n, window),
    analytics: true,
    prefix:    prefix ?? `yugati_rl_${n}`,
  });
}

// Per-plan rate limiters — limits match PLANS[id].ratePerMin
export const rateLimiters: Record<PlanId, Ratelimit> = {
  free:       makeRl(5),
  standard:   makeRl(20),
  premium:    makeRl(60),
  enterprise: makeRl(120),
};

// DDoS-protection limiters — not plan-aware, just a hard ceiling.
// Applied per authenticated userId except webhookLimiter which uses IP.
export const paymentLimiter  = makeRl(10, '1 m',  'yugati_pay');      // 10 payment actions/min per user
export const corsairLimiter  = makeRl(15, '1 m',  'yugati_cors');     // 15 OAuth connects/min per user
export const voiceLimiter    = makeRl(10, '1 m',  'yugati_voice');    // 10 voice requests/min per user
export const webhookLimiter  = makeRl(60, '1 m',  'yugati_webhook');  // 60 webhook hits/min per IP
