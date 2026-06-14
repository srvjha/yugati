import { auth } from '@/lib/auth';
import { createAgent } from '@/server/agent';
import { run } from '@openai/agents';
import { headers } from 'next/headers';

type ChatMessage = { role: 'user' | 'assistant'; content: string };


export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { messages } = await request.json() as { messages: ChatMessage[] };
  console.log('Received messages:', messages);

  const latestMessage = messages.map((m)=>{
    if(m.role === 'user') return m.content;
  });

  const agent = createAgent(session.user.id);
  const result = await run(agent, latestMessage[latestMessage.length - 1] || 'Hello');

  return Response.json({ output: result.finalOutput });
}
