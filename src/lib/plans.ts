export const PLANS = {
  free: {
    name:       'Free',
    priceInr:   0,
    paise:      0,
    messages:   30,
    voice:      1,
    compose:    10,
    charLimit:  1000,
    ratePerMin: 5,
  },
  standard: {
    name:       'Standard',
    priceInr:   199,
    paise:      19900,
    messages:   150,
    voice:      15,
    compose:    50,
    charLimit:  2000,
    ratePerMin: 20,
  },
  premium: {
    name:       'Premium',
    priceInr:   499,
    paise:      49900,
    messages:   500,
    voice:      30,
    compose:    150,
    charLimit:  5000,
    ratePerMin: 60,
  },
  enterprise: {
    name:       'Enterprise',
    priceInr:   null,
    paise:      null,
    messages:   Infinity,
    voice:      Infinity,
    compose:    Infinity,
    charLimit:  10000,
    ratePerMin: 120,
  },
} as const;

export type PlanId = keyof typeof PLANS;

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];
