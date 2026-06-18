import { z } from "zod";

const schema = z.object({
  DATABASE_URL:             z.string().min(1),
  CORSAIR_KEK:              z.string().min(1),
  GOOGLE_CLIENT_ID:         z.string().min(1),
  GOOGLE_CLIENT_SECRET:     z.string().min(1),
  BETTER_AUTH_SECRET:       z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  NEXT_PUBLIC_APP_URL:      z.string().min(1).default("http://localhost:3000"),
  OPENAI_API_KEY:           z.string().min(1),
  UPSTASH_REDIS_REST_URL:   z.string().min(1).optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  // Razorpay — required once payments go live
  RAZORPAY_KEY_ID:          z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET:      z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET:  z.string().min(1).optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.issues);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
