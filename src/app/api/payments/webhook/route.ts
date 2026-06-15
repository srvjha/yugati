import { verifyWebhookSignature } from '@/lib/razorpay';
import { db }                     from '@/server/db';
import { orders, userPlans }      from '@/server/db/schema';
import { eq }                     from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const rawBody  = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';

  if (!verifyWebhookSignature(rawBody, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    payload: { payment: { entity: { order_id: string; id: string } } };
  };

  if (event.event === 'payment.captured') {
    const { order_id: orderId, id: paymentId } = event.payload.payment.entity;

    const order = await db.query.orders.findFirst({ where: eq(orders.razorpayOrderId, orderId) });
    if (!order || order.status === 'paid') return Response.json({ ok: true });

    await db.update(orders).set({
      razorpayPaymentId: paymentId,
      status:    'paid',
      updatedAt: new Date(),
    }).where(eq(orders.razorpayOrderId, orderId));

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    const existing = await db.query.userPlans.findFirst({ where: eq(userPlans.userId, order.userId) });
    if (existing) {
      await db.update(userPlans).set({
        plan:               order.plan,
        messagesUsed:       0,
        voiceUsed:          0,
        composeUsed:        0,
        usageResetAt:       periodEnd,
        subscriptionStatus: 'active',
        currentPeriodEnd:   periodEnd,
        updatedAt:          new Date(),
      }).where(eq(userPlans.userId, order.userId));
    }
  }

  return Response.json({ ok: true });
}
