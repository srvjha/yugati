'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

const ChatView = dynamic(
  () => import('../components/chat-view').then((m) => ({ default: m.ChatView })),
  { ssr: false, loading: () => null },
);

export function ChatClient({ userName }: { userName?: string }) {
  const params       = useSearchParams();
  const prefillRaw   = params.get('prompt');
  const prefillPrompt = prefillRaw ? decodeURIComponent(prefillRaw) : undefined;

  return <ChatView showSidebar={false} userName={userName} prefillPrompt={prefillPrompt} />;
}
