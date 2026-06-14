import { createCorsair, setupCorsair } from 'corsair';
import { gmail } from '@corsair-dev/gmail';
import { googlecalendar } from '@corsair-dev/googlecalendar';
import { env } from '@/env';
import { db } from '@/server/db';

export const corsair = createCorsair({
  plugins:      [gmail(), googlecalendar()],
  database:     db.$client,
  kek:          env.CORSAIR_KEK,
  multiTenancy: true,
});

let initialized = false;

export async function initCorsair() {
  if (initialized) return;
  initialized = true;
  await setupCorsair(corsair, {
    credentials: {
      gmail:          { client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET },
      googlecalendar: { client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET },
    },
  });
}
