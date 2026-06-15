import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect('/api/auth/clear-session');
  }

  return (
    <div className="h-screen overflow-hidden bg-black text-white">
      {children}
    </div>
  );
}
