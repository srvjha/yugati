import dynamic from 'next/dynamic';
import { SidebarNav } from '../components/sidebar-nav';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const ChatView = dynamic(
  () => import('../components/chat-view').then((m) => ({ default: m.ChatView })),
  { ssr: false, loading: () => null },
);

export default async function ChatPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  return (
    <div className="flex h-screen overflow-hidden bg-black text-white">
      <SidebarNav user={session!.user} />
      <div className="flex-1 min-w-0 overflow-hidden">
        <ChatView showSidebar={true} userName={session?.user?.name ?? undefined} />
      </div>
    </div>
  );
}
