import { auth }                from '@/lib/auth';
import { headers }             from 'next/headers';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { db }                  from '@/server/db';
import { orders, userPlans }   from '@/server/db/schema';
import { randomUUID }          from 'crypto';
import { eq }                  from 'drizzle-orm';
import { z }                   from 'zod';
import { paymentLimiter }      from '@/lib/rate-limit';

export const runtime = 'nodejs';

const bodySchema = z.object({
  razorpayOrderId:   z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { success } = await paymentLimiter.limit(session.user.id);
  if (!success) return Response.json({ error: 'Too many requests — slow down.' }, { status: 429 });

  const body = bodySchema.safeParse(await request.json());
  if (!body.success) return Response.json({ error: 'Invalid payload' }, { status: 400 });

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body.data;

  const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!isValid) return Response.json({ error: 'Invalid signature' }, { status: 400 });

  const order = await db.query.orders.findFirst({ where: eq(orders.razorpayOrderId, razorpayOrderId) });
  if (!order || order.userId !== session.user.id) {
    return Response.json({ error: 'Order not found' }, { status: 404 });
  }
  if (order.status === 'paid') return Response.json({ success: true, plan: order.plan });

  // Mark order as paid
  await db.update(orders).set({
    razorpayPaymentId,
    razorpaySignature,
    status:    'paid',
    updatedAt: new Date(),
  }).where(eq(orders.razorpayOrderId, razorpayOrderId));

  // Upgrade plan — reset usage, set period end to 30 days from now
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  const existing = await db.query.userPlans.findFirst({ where: eq(userPlans.userId, session.user.id) });
  if (existing) {
    await db.update(userPlans).set({
      plan:                   order.plan,
      messagesUsed:           0,
      voiceUsed:              0,
      composeUsed:            0,
      usageResetAt:           periodEnd,
      subscriptionStatus:     'active',
      currentPeriodEnd:       periodEnd,
      updatedAt:              new Date(),
    }).where(eq(userPlans.userId, session.user.id));
  } else {
    await db.insert(userPlans).values({
      id:                     randomUUID(),
      userId:                 session.user.id,
      plan:                   order.plan,
      messagesUsed:           0,
      voiceUsed:              0,
      composeUsed:            0,
      usageResetAt:           periodEnd,
      subscriptionStatus:     'active',
      currentPeriodEnd:       periodEnd,
    });
  }

  return Response.json({ success: true, plan: order.plan });
}
