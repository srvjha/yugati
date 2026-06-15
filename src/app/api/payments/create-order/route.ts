import { auth }      from '@/lib/auth';
import { headers }   from 'next/headers';
import { razorpay }  from '@/lib/razorpay';
import { db }        from '@/server/db';
import { orders }    from '@/server/db/schema';
import { PLANS }     from '@/lib/plans';
import { env }       from '@/env';
import type { PlanId } from '@/lib/plans';
import { z }         from 'zod';

export const runtime = 'nodejs';

const bodySchema = z.object({ plan: z.enum(['standard', 'premium']) });

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = bodySchema.safeParse(await request.json());
  if (!body.success) return Response.json({ error: 'Invalid plan' }, { status: 400 });

  const planId  = body.data.plan as PlanId;
  const plan    = PLANS[planId];
  const receipt = `rcpt_${session.user.id.slice(0, 10)}_${Date.now()}`;

  const rzpOrder = await razorpay.orders.create({
    amount:   plan.paise!,
    currency: 'INR',
    receipt,
    notes:    { userId: session.user.id, plan: planId },
  });

  await db.insert(orders).values({
    id:              Math.random().toString(36).slice(2) + Date.now().toString(36),
    userId:          session.user.id,
    razorpayOrderId: rzpOrder.id,
    plan:            planId,
    amount:          plan.paise!,
    currency:        'INR',
    status:          'created',
  });

  return Response.json({
    orderId:  rzpOrder.id,
    amount:   plan.paise!,
    currency: 'INR',
    keyId:    env.RAZORPAY_KEY_ID,
    planName: plan.name,
  });
}
