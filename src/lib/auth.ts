import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { db } from '@/server/db';
import { env } from '@/env';
import * as schema from '@/server/db/schema';

export const auth = betterAuth({
  secret:  env.BETTER_AUTH_SECRET,
  baseURL: env.NEXT_PUBLIC_APP_URL,

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user:         schema.user,
      session:      schema.session,
      account:      schema.account,
      verification: schema.verification,
    },
  }),

  socialProviders: {
    google: {
      clientId:     env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  plugins: [
    admin({
      // Only users with role='admin' can access admin APIs
      defaultRole: 'user',
    }),
  ],

  user: {
    additionalFields: {
      role:       { type: 'string',  defaultValue: 'user',  input: false },
      banned:     { type: 'boolean', defaultValue: false,   input: false },
      banReason:  { type: 'string',  required: false,       input: false },
      banExpires: { type: 'date',    required: false,       input: false },
    },
  },
});
