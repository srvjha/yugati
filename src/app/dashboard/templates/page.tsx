import { SidebarNav }    from '../components/sidebar-nav';
import { TemplatesView } from '../components/templates-view';
import { auth }          from '@/lib/auth';
import { headers }       from 'next/headers';

export default async function TemplatesPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-50">
      <SidebarNav user={session!.user} isAdmin={session!.user.role === 'admin'} />
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <TemplatesView />
      </div>
    </div>
  );
}
