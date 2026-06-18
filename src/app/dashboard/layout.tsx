import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect('/');
  }

  return (
    <div className="h-screen overflow-hidden bg-zinc-950 text-zinc-50">
      {children}
    </div>
  );
}
