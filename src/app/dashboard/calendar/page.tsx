import { CalendarView } from '../components/calendar-view';
import { SidebarNav } from '../components/sidebar-nav';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export default async function CalendarPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  return (
    <div className="flex h-screen overflow-hidden bg-black text-white">
      <SidebarNav user={session!.user} isAdmin={session!.user.role === 'admin'} />
      <div className="flex-1 min-w-0 overflow-hidden">
        <CalendarView userName={session?.user?.name ?? undefined} />
      </div>
    </div>
  );
}
