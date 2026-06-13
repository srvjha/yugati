import { setupCorsair } from 'corsair';
import { corsair } from './corsair';
import { env } from '@/env';

let initialized = false;

// Ensures Corsair integration rows exist and credentials are stored in the DB.
// Safe to call multiple times — idempotent. Call this before any generateOAuthUrl call.
export async function initCorsair() {
  if (initialized) return;
  initialized = true;

  await setupCorsair(corsair, {
    credentials: {
      gmail: {
        client_id:     env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
      },
      googlecalendar: {
        client_id:     env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
      },
    },
  });
}
