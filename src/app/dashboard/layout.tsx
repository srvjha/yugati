import { auth } from '@/lib/auth';
import { headers, cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SidebarNav } from './_components/sidebar-nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    const cookieStore = await cookies();
    cookieStore.delete('better-auth.session_token');
    redirect('/');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-black text-white">
      <SidebarNav user={session.user} />
      <div className="flex-1 min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
