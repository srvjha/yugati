import { auth } from '@/lib/auth';
import { runChat } from '@/features/agent/agent';
import type { ChatMessage } from '@/features/agent/types';
import { headers } from 'next/headers';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { messages } = await request.json() as { messages: ChatMessage[] };
  const output = await runChat(session.user.id, messages);

  return Response.json({ output });
}
