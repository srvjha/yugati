import { auth }              from '@/lib/auth';
import { headers }           from 'next/headers';
import OpenAI                from 'openai';
import { toFile }            from 'openai';
import { checkAndIncrement } from '@/lib/usage';
import { getUserPlan }       from '@/lib/usage';
import { PLANS }             from '@/lib/plans';
import type { PlanId }       from '@/lib/plans';

export const runtime = 'nodejs';

const openai = new OpenAI();

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const userPlan = await getUserPlan(session.user.id);
  const planId   = (userPlan.plan ?? 'free') as PlanId;
  const usage    = await checkAndIncrement(session.user.id, 'voiceUsed');
  if (!usage.allowed) {
    return Response.json(
      { error: `Voice limit reached. Your ${PLANS[planId].name} plan allows ${usage.limit} voice messages/month.` },
      { status: 429 },
    );
  }

  const form  = await request.formData();
  const audio = form.get('audio') as Blob | null;

  if (!audio) return Response.json({ error: 'No audio' }, { status: 400 });

  const file = await toFile(audio, 'voice.webm', { type: audio.type || 'audio/webm' });

  const transcription = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'en',
  });

  return Response.json({ text: transcription.text });
}
