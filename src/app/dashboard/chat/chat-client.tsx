'use client';

import dynamic from 'next/dynamic';

const ChatView = dynamic(
  () => import('../components/chat-view').then((m) => ({ default: m.ChatView })),
  { ssr: false, loading: () => null },
);

export function ChatClient({ userName }: { userName?: string }) {
  return <ChatView showSidebar={true} userName={userName} />;
}
