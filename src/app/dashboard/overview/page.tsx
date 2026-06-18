import { OverviewView } from '../components/overview-view';
import { SidebarNav }   from '../components/sidebar-nav';
import { auth }         from '@/lib/auth';
import { headers }      from 'next/headers';
import { initCorsair }  from '@/server/corsair';

export default async function OverviewPage() {
  await initCorsair();
  const session = await auth.api.getSession({ headers: await headers() });
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-50">
      <SidebarNav user={session!.user} isAdmin={session!.user.role === 'admin'} />
      <div className="flex-1 min-w-0 overflow-hidden">
        <OverviewView userName={session?.user?.name ?? undefined} />
      </div>
    </div>
  );
}
