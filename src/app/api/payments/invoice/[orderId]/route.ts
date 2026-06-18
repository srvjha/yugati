import { auth }    from '@/lib/auth';
import { headers }  from 'next/headers';
import { db }       from '@/server/db';
import { orders }   from '@/server/db/schema';
import { eq, and }  from 'drizzle-orm';
import { PLANS }    from '@/lib/plans';
import type { PlanId } from '@/lib/plans';
import React        from 'react';
import {
  Document, Page, Text, View, StyleSheet, renderToBuffer,
} from '@react-pdf/renderer';

export const runtime = 'nodejs';

const styles = StyleSheet.create({
  page:        { padding: 48, fontFamily: 'Helvetica', backgroundColor: '#ffffff', fontSize: 10, color: '#27272a' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 },
  logoBox:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoSquare:  { width: 22, height: 22, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center' },
  logoLetter:  { color: '#ffffff', fontSize: 11, fontFamily: 'Helvetica-Bold' },
  logoName:    { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#18181b', letterSpacing: -0.5 },
  headerRight: { alignItems: 'flex-end' },
  invoiceNum:  { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#18181b' },
  invoiceDate: { fontSize: 9, color: '#71717a', marginTop: 3 },

  divider:     { borderBottomWidth: 1, borderBottomColor: '#e4e4e7', marginVertical: 20 },

  twoCol:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  colLabel:    { fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1, color: '#71717a', marginBottom: 6 },
  colValue:    { fontSize: 10, color: '#3f3f46', lineHeight: 1.7 },
  colBold:     { fontFamily: 'Helvetica-Bold', color: '#18181b' },

  badge:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 28 },
  badgeDot:    { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' },
  badgeText:   { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#15803d', letterSpacing: 1 },

  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e4e4e7', paddingBottom: 7, marginBottom: 4 },
  thDesc:      { flex: 3, fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1, color: '#71717a' },
  thAmt:       { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1, color: '#71717a', textAlign: 'right' },
  tableRow:    { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  tdDesc:      { flex: 3 },
  tdAmt:       { flex: 1, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#18181b' },
  tdSub:       { fontSize: 9, color: '#71717a', marginTop: 2 },

  totalsBox:   { alignItems: 'flex-end', marginTop: 16 },
  totalRow:    { flexDirection: 'row', gap: 48, marginBottom: 4 },
  totalLabel:  { fontSize: 9, color: '#71717a', width: 80, textAlign: 'right' },
  totalValue:  { fontSize: 9, color: '#3f3f46', width: 64, textAlign: 'right' },
  finalRow:    { flexDirection: 'row', gap: 48, marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: '#18181b' },
  finalLabel:  { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#18181b', width: 80, textAlign: 'right' },
  finalValue:  { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#18181b', width: 64, textAlign: 'right' },

  refBox:      { marginTop: 28, backgroundColor: '#f4f4f5', padding: 12, borderRadius: 4 },
  refLabel:    { fontSize: 8, color: '#71717a', marginBottom: 3 },
  refValue:    { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#3f3f46' },

  footer:      { marginTop: 40, borderTopWidth: 1, borderTopColor: '#f4f4f5', paddingTop: 16 },
  footerText:  { fontSize: 8, color: '#a1a1aa', textAlign: 'center', lineHeight: 1.6 },
});

function InvoiceDoc({ order, planName, amountInr, subtotal, gst, invoiceNum, dateStr, userName, userEmail }: {
  order: { razorpayOrderId: string; razorpayPaymentId?: string | null };
  planName: string; amountInr: string; subtotal: string; gst: string;
  invoiceNum: string; dateStr: string; userName: string; userEmail: string;
}) {
  return React.createElement(Document, { title: `Invoice ${invoiceNum}` },
    React.createElement(Page, { size: 'A4', style: styles.page },

      // Header
      React.createElement(View, { style: styles.header },
        React.createElement(View, { style: styles.logoBox },
          React.createElement(View, { style: styles.logoSquare },
            React.createElement(Text, { style: styles.logoLetter }, 'Y'),
          ),
          React.createElement(Text, { style: styles.logoName }, 'Yugati'),
        ),
        React.createElement(View, { style: styles.headerRight },
          React.createElement(Text, { style: styles.invoiceNum }, `Invoice ${invoiceNum}`),
          React.createElement(Text, { style: styles.invoiceDate }, dateStr),
        ),
      ),

      React.createElement(View, { style: styles.divider }),

      // Paid badge
      React.createElement(View, { style: styles.badge },
        React.createElement(View, { style: styles.badgeDot }),
        React.createElement(Text, { style: styles.badgeText }, 'PAID'),
      ),

      // Bill to / From
      React.createElement(View, { style: styles.twoCol },
        React.createElement(View, null,
          React.createElement(Text, { style: styles.colLabel }, 'Bill To'),
          React.createElement(Text, { style: [styles.colValue, styles.colBold] }, userName),
          React.createElement(Text, { style: styles.colValue }, userEmail),
        ),
        React.createElement(View, { style: { alignItems: 'flex-end' } },
          React.createElement(Text, { style: styles.colLabel }, 'From'),
          React.createElement(Text, { style: [styles.colValue, styles.colBold] }, 'Yugati'),
          React.createElement(Text, { style: styles.colValue }, 'jhasaurav020900@gmail.com'),
        ),
      ),

      // Table
      React.createElement(View, { style: styles.tableHeader },
        React.createElement(Text, { style: styles.thDesc }, 'Description'),
        React.createElement(Text, { style: styles.thAmt }, 'Amount'),
      ),
      React.createElement(View, { style: styles.tableRow },
        React.createElement(View, { style: styles.tdDesc },
          React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold', color: '#18181b' } }, `${planName} Plan — Monthly Subscription`),
          React.createElement(Text, { style: styles.tdSub }, 'AI email & calendar assistant · 1 month'),
        ),
        React.createElement(Text, { style: styles.tdAmt }, `₹${subtotal}`),
      ),
      React.createElement(View, { style: styles.tableRow },
        React.createElement(View, { style: styles.tdDesc },
          React.createElement(Text, { style: { color: '#71717a' } }, 'GST (18%)'),
        ),
        React.createElement(Text, { style: styles.tdAmt }, `₹${gst}`),
      ),

      // Totals
      React.createElement(View, { style: styles.totalsBox },
        React.createElement(View, { style: styles.finalRow },
          React.createElement(Text, { style: styles.finalLabel }, 'Total Paid'),
          React.createElement(Text, { style: styles.finalValue }, `₹${amountInr}`),
        ),
      ),

      // Payment reference
      React.createElement(View, { style: styles.refBox },
        React.createElement(Text, { style: styles.refLabel }, 'Razorpay Order ID'),
        React.createElement(Text, { style: styles.refValue }, order.razorpayOrderId),
        ...(order.razorpayPaymentId ? [
          React.createElement(Text, { style: [styles.refLabel, { marginTop: 6 }] }, 'Payment ID'),
          React.createElement(Text, { style: styles.refValue }, order.razorpayPaymentId),
        ] : []),
      ),

      // Footer
      React.createElement(View, { style: styles.footer },
        React.createElement(Text, { style: styles.footerText },
          'Thank you for subscribing to Yugati. For billing queries email jhasaurav020900@gmail.com\n' +
          'Payments secured by Razorpay · All prices in INR inclusive of applicable taxes.',
        ),
      ),
    ),
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { orderId } = await params;

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, session.user.id)),
  });
  if (!order || order.status !== 'paid') return new Response('Invoice not found', { status: 404 });

  const planName  = PLANS[order.plan as PlanId]?.name ?? order.plan;
  const amountInr = ((order.amount ?? 0) / 100).toFixed(2);
  const gst       = (parseFloat(amountInr) * 0.18 / 1.18).toFixed(2);
  const subtotal  = (parseFloat(amountInr) - parseFloat(gst)).toFixed(2);
  const invoiceNum = `YUG-${order.createdAt.getFullYear()}-${order.id.slice(-6).toUpperCase()}`;
  const dateStr   = order.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const doc = React.createElement(InvoiceDoc, {
    order: { razorpayOrderId: order.razorpayOrderId, razorpayPaymentId: order.razorpayPaymentId },
    planName, amountInr, subtotal, gst, invoiceNum, dateStr,
    userName:  session.user.name,
    userEmail: session.user.email,
  }) as Parameters<typeof renderToBuffer>[0];

  const buffer = await renderToBuffer(doc);

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${invoiceNum}.pdf"`,
    },
  });
}
