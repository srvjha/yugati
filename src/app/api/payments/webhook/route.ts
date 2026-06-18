import { verifyWebhookSignature } from '@/lib/razorpay';
import { db }                     from '@/server/db';
import { orders, userPlans }      from '@/server/db/schema';
import { eq }                     from 'drizzle-orm';
import { z }                      from 'zod';
import { webhookLimiter }         from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { success } = await webhookLimiter.limit(ip);
  if (!success) return Response.json({ error: 'Too many requests' }, { status: 429 });

  const rawBody  = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';

  if (!verifyWebhookSignature(rawBody, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const webhookSchema = z.object({
    event:   z.string(),
    payload: z.object({
      payment: z.object({
        entity: z.object({ order_id: z.string(), id: z.string() }),
      }),
    }).optional(),
  });

  const event = webhookSchema.safeParse(JSON.parse(rawBody));
  if (!event.success) return Response.json({ ok: true }); // silently ignore unknown shapes

  if (event.data.event === 'payment.captured') {
    const entity = event.data.payload?.payment?.entity;
    if (!entity) return Response.json({ ok: true });
    const { order_id: orderId, id: paymentId } = entity;

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
