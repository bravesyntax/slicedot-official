import { after, NextResponse, type NextRequest } from "next/server";
import { rows, sql } from "@/lib/db";
import { completeRazorpayPayment, sendOrderEmails } from "@/lib/orders";
import { webhookSignatureValid } from "@/lib/razorpay";

// Razorpay's own report of a payment, for when the customer pays and closes the tab before returning to the site.
// In the Razorpay dashboard: point a webhook at this URL with the payment.captured event, and set RAZORPAY_WEBHOOK_SECRET.
export async function POST(request: NextRequest) {
  const body = await request.text();
  if (!webhookSignatureValid(body, request.headers.get("x-razorpay-signature") ?? "")) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  const event = JSON.parse(body) as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; status?: string } } } };
  const payment = event.payload?.payment?.entity;
  if (event.event !== "payment.captured" || !payment?.id || !payment.order_id) return NextResponse.json({ ok: true });

  const [order] = await rows<{ total: string }>(sql`SELECT total FROM orders WHERE razorpay_order_id = ${payment.order_id}`);
  if (!order) return NextResponse.json({ ok: true });
  if (payment.amount !== Math.round(Number(order.total) * 100)) {
    console.error(`[razorpay webhook] amount mismatch on ${payment.order_id}`);
    return NextResponse.json({ ok: true });
  }
  const done = await completeRazorpayPayment(payment.order_id, payment.id, null);
  if (done?.firstTime) after(() => sendOrderEmails(done.number, done.stockShort ? "Stock ran short for this paid order." : undefined).catch((err) => console.error("[order email]", err)));
  return NextResponse.json({ ok: true });
}
