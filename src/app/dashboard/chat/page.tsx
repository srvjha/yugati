import { redirect }    from 'next/navigation';
import { SidebarNav }  from '../components/sidebar-nav';
import { auth }        from '@/lib/auth';
import { headers }     from 'next/headers';
import { initCorsair } from '@/server/corsair';
import { db }          from '@/server/db';
import { corsairAccounts, corsairIntegrations } from '@/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { ChatClient }  from './chat-client';

export default async function ChatPage() {
  await initCorsair();
  const session = await auth.api.getSession({ headers: await headers() });
  const userId  = session!.user.id;

  const rows = await db
    .select({ config: corsairAccounts.config })
    .from(corsairAccounts)
    .innerJoin(corsairIntegrations, eq(corsairAccounts.integrationId, corsairIntegrations.id))
    .where(and(
      eq(corsairAccounts.tenantId, userId),
      inArray(corsairIntegrations.name, ['gmail', 'googlecalendar']),
    ));

  const anyConnected = rows.some((r) => Object.keys(r.config as Record<string, unknown>).length > 0);
  if (!anyConnected) redirect('/dashboard/integrations');

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-50">
      <SidebarNav user={session!.user} isAdmin={session!.user.role === 'admin'} />
      <div className="flex-1 min-w-0 overflow-hidden">
        <ChatClient userName={session?.user?.name ?? undefined} />
      </div>
    </div>
  );
}
