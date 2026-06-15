import { Ratelimit } from '@upstash/ratelimit';
import { Redis }     from '@upstash/redis';

// 20 requests per user per minute, sliding window
export const rateLimiter = new Ratelimit({
  redis:     Redis.fromEnv(),
  limiter:   Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
  prefix:    'yugati_rl',
});

export const MAX_PROMPT_CHARS = 2000;
