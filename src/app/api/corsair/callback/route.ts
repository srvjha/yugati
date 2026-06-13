import { corsair } from '@/server/corsair';
import { initCorsair } from '@/server/corsair-setup';
import { env } from '@/env';
import { processOAuthCallback } from 'corsair/oauth';
import { type NextRequest } from 'next/server';

const REDIRECT_URI = `${env.NEXT_PUBLIC_APP_URL}/api/corsair/callback`;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code  = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return Response.redirect(new URL('/dashboard?error=missing_params', request.url));
  }

  try {
    await initCorsair();
    await processOAuthCallback(corsair, { code, state, redirectUri: REDIRECT_URI });
    return Response.redirect(new URL('/dashboard?connected=1', request.url));
  } catch (err) {
    console.error('[Corsair OAuth callback]', err);
    return Response.redirect(new URL('/dashboard?error=connect_failed', request.url));
  }
}
