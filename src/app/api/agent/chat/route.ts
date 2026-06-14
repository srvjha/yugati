import { auth } from '@/lib/auth';
import { runChat } from '@/features/agent/agent';
import type { ChatMessage } from '@/features/agent/types';
import { initCorsair } from '@/server/corsair';
import { headers } from 'next/headers';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  await initCorsair();

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { messages, conversationId } = await request.json() as {
    messages:        ChatMessage[];
    conversationId?: string;
  };

  const result = await runChat(session.user.id, messages, conversationId);

  if (result.status === 'blocked') {
    return Response.json({ error: result.reason, conversationId: result.conversationId }, { status: 400 });
  }

  return Response.json(result);
}
