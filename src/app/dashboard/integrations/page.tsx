import { SidebarNav }  from '../components/sidebar-nav';
import { auth }         from '@/lib/auth';
import { headers }      from 'next/headers';
import { initCorsair }  from '@/server/corsair';
import { IntegrationsView } from '../components/integrations-view';

export default async function IntegrationsPage() {
  await initCorsair();
  const session = await auth.api.getSession({ headers: await headers() });
  return (
    <div className="flex h-screen overflow-hidden bg-black text-white">
      <SidebarNav user={session!.user} />
      <div className="flex-1 min-w-0 overflow-hidden">
        <IntegrationsView />
      </div>
    </div>
  );
}
