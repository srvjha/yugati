import { redirect } from 'next/navigation';
import { auth }     from '@/lib/auth';
import { headers }  from 'next/headers';
import { db }       from '@/server/db';
import { user }     from '@/server/db/schema';
import { eq }       from 'drizzle-orm';
import { AdminSidebar } from './components/admin-sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/');

  const u = await db.query.user.findFirst({ where: eq(user.id, session.user.id), columns: { role: true } });
  if (u?.role !== 'admin') redirect('/dashboard/mail');

  return (
    <div className="flex h-screen overflow-hidden bg-black text-white">
      <AdminSidebar user={{ name: session.user.name, email: session.user.email, image: session.user.image ?? null }} />
      <main className="flex-1 min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
