import { redirect }      from 'next/navigation';
import { CalendarView }  from '../components/calendar-view';
import { SidebarNav }    from '../components/sidebar-nav';
import { auth }          from '@/lib/auth';
import { headers }       from 'next/headers';
import { initCorsair }   from '@/server/corsair';
import { db }            from '@/server/db';
import { corsairAccounts, corsairIntegrations } from '@/server/db/schema';
import { eq, and }       from 'drizzle-orm';

export default async function CalendarPage() {
  await initCorsair();
  const session = await auth.api.getSession({ headers: await headers() });
  const userId  = session!.user.id;

  const row = await db
    .select({ config: corsairAccounts.config })
    .from(corsairAccounts)
    .innerJoin(corsairIntegrations, eq(corsairAccounts.integrationId, corsairIntegrations.id))
    .where(and(eq(corsairAccounts.tenantId, userId), eq(corsairIntegrations.name, 'googlecalendar')))
    .limit(1);

  const calendarConnected = row.length > 0 && Object.keys(row[0]!.config as Record<string, unknown>).length > 0;
  if (!calendarConnected) redirect('/dashboard/integrations');

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-50">
      <SidebarNav user={session!.user} isAdmin={session!.user.role === 'admin'} />
      <div className="flex-1 min-w-0 overflow-hidden">
        <CalendarView userName={session?.user?.name ?? undefined} />
      </div>
    </div>
  );
}
