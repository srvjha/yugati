import { auth } from '@/lib/auth';
import { corsair } from '@/server/corsair';
import { initCorsair } from '@/server/corsair-setup';
import { env } from '@/env';
import { setupCorsair } from 'corsair';
import { generateOAuthUrl } from 'corsair/oauth';
import { type NextRequest } from 'next/server';

const REDIRECT_URI = `${env.NEXT_PUBLIC_APP_URL}/api/corsair/callback`;
const ALLOWED_PLUGINS = ['gmail', 'googlecalendar'] as const;

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const plugin = request.nextUrl.searchParams.get('plugin');
  if (!plugin || !ALLOWED_PLUGINS.includes(plugin as (typeof ALLOWED_PLUGINS)[number])) {
    return Response.json({ error: 'Invalid plugin. Use gmail or googlecalendar.' }, { status: 400 });
  }

  // Ensure integration rows exist (shared, one-time).
  await initCorsair();

  // Provision this specific user's tenant account row before starting OAuth.
  await setupCorsair(corsair, { tenantId: session.user.id });

  const { url } = await generateOAuthUrl(corsair, plugin, {
    tenantId:    session.user.id,
    redirectUri: REDIRECT_URI,
  });

  console.log('Redirecting to OAuth URL:', url);

  return Response.redirect(url);
}
