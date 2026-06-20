import { auth } from '@/lib/auth';
import { db } from '@/server/db';
import { corsairAccounts, corsairIntegrations } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { type NextRequest } from 'next/server';
import { env } from '@/env';

const ALLOWED_PLUGINS = ['gmail', 'googlecalendar'] as const;

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const plugin = request.nextUrl.searchParams.get('plugin');
  if (!plugin || !ALLOWED_PLUGINS.includes(plugin as (typeof ALLOWED_PLUGINS)[number])) {
    return Response.json({ error: 'Invalid plugin.' }, { status: 400 });
  }

  // Find the integration row by name
  const integration = await db
    .select({ id: corsairIntegrations.id })
    .from(corsairIntegrations)
    .where(eq(corsairIntegrations.name, plugin))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (integration) {
    // Clear both config and DEK — config: {} makes connectionStatus return false,
    // null DEK ensures any cached credentials can't be decrypted
    await db
      .update(corsairAccounts)
      .set({ dek: null, config: {}, updatedAt: new Date() })
      .where(
        and(
          eq(corsairAccounts.tenantId, session.user.id),
          eq(corsairAccounts.integrationId, integration.id),
        ),
      );
  }

  return Response.redirect(`${env.NEXT_PUBLIC_APP_URL}/dashboard/settings?disconnected=${plugin}`);
}
