import { redirect }   from 'next/navigation';
import { auth }        from '@/lib/auth';
import { headers }     from 'next/headers';
import { db }          from '@/server/db';
import { corsairAccounts } from '@/server/db/schema';
import { eq }          from 'drizzle-orm';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId  = session?.user.id;

  if (userId) {
    const hasIntegration = await db.query.corsairAccounts.findFirst({
      where: eq(corsairAccounts.tenantId, userId),
      columns: { id: true },
    });
    if (!hasIntegration) {
      redirect('/dashboard/integrations');
    }
  }

  const params = await searchParams;
  const qs = new URLSearchParams(params).toString();
  redirect(`/dashboard/mail${qs ? `?${qs}` : ''}`);
}
