"use server";

import { after } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { finish, intField } from "@/lib/admin/common";
import { rows, sql } from "@/lib/db";
import { escapeHtml, sendMail } from "@/lib/mailer";
import { AWAITING_PAYMENT } from "@/lib/orders";
import { SITE_URL } from "@/lib/config";
import { field } from "@/lib/validation";

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const PAYMENTS = ["pending", "paid", "failed", "refunded"];
const REFUNDS = ["", "processing", "completed", "failed"];

const STATUS_LINE: Record<string, string> = {
  confirmed: "is confirmed",
  processing: "is being prepared",
  shipped: "has been shipped and is on its way",
  delivered: "has been delivered. We hope you love it",
  cancelled: "has been cancelled",
};

/** Moves an order on. Cancelling puts its items back in stock, once; a cancelled order can't be reopened. */
export async function updateOrder(fd: FormData) {
  const admin = await requireAdmin();
  const id = intField(fd, "id");
  const back = `/admin/orders/${id}`;
  const status = field(fd, "order_status");
  const payment = field(fd, "payment_status");
  const reason = field(fd, "cancellation_reason").slice(0, 255);
  if (!STATUSES.includes(status) || !PAYMENTS.includes(payment)) await finish("error", "Pick a valid status.", back);

  const outcome = await sql.begin(async (tx) => {
    const [order] = await tx<{ order_number: string; order_status: string; payment_status: string; payment_method: string | null; total: string; customer_name: string; customer_email: string }[]>`
      SELECT order_number, order_status, payment_status, payment_method, total, customer_name, customer_email FROM orders WHERE id = ${id} AND order_status <> ${AWAITING_PAYMENT} FOR UPDATE
    `;
    if (!order) return { error: "Order not found." };
    if (order.order_status === "cancelled" && status !== "cancelled") return { error: "A cancelled order can't be reopened. Its items are already back in stock." };

    const cancelling = status === "cancelled" && order.order_status !== "cancelled";
    const refund = cancelling && order.payment_method !== "cod" && payment === "paid";
    await tx`
      UPDATE orders SET order_status = ${status}, payment_status = ${payment}, updated_at = LOCALTIMESTAMP,
        cancellation_reason = CASE WHEN ${cancelling}::boolean THEN ${reason || "Cancelled by the store"}::text ELSE cancellation_reason END,
        cancelled_at = CASE WHEN ${cancelling}::boolean THEN LOCALTIMESTAMP ELSE cancelled_at END,
        refund_status = CASE WHEN ${refund}::boolean THEN 'processing' ELSE refund_status END,
        refund_amount = CASE WHEN ${refund}::boolean THEN total ELSE refund_amount END
      WHERE id = ${id}
    `;
    if (cancelling) {
      const items = await tx<{ product_id: number; quantity: number }[]>`SELECT product_id, quantity FROM order_items WHERE order_id = ${id} AND product_id IS NOT NULL ORDER BY product_id`;
      for (const i of items) await tx`UPDATE products SET quantity = COALESCE(quantity, 0) + ${i.quantity} WHERE id = ${i.product_id}`;
    }
    const changes = [order.order_status !== status && `Status ${order.order_status} → ${status}`, order.payment_status !== payment && `Payment ${order.payment_status} → ${payment}`].filter(Boolean).join(". ");
    if (changes) await tx`INSERT INTO order_logs (order_id, action, description, created_by) VALUES (${id}, 'updated', ${changes}, ${admin.username})`;
    return { order, statusChanged: order.order_status !== status };
  });

  if (outcome.error) await finish("error", outcome.error, back);
  const { order, statusChanged } = outcome;

  if (order && statusChanged && fd.get("notify") && STATUS_LINE[status] && !(process.env.NODE_ENV !== "production" && order.customer_email.endsWith("@example.com"))) {
    const number = escapeHtml(order.order_number);
    after(() =>
      sendMail({
        to: order.customer_email,
        subject: `Order ${order.order_number}: ${status}`,
        html: `<p>Hi ${escapeHtml(order.customer_name)},</p><p>Your SliceDot order <strong>${number}</strong> ${STATUS_LINE[status]}.</p><p><a href="${SITE_URL}/order/${encodeURIComponent(order.order_number)}">View your order</a></p>`,
      }),
    );
  }
  await finish("success", "Order updated.", back);
}

/** Records a refund made in the Razorpay dashboard. This does not move any money. */
export async function updateRefund(fd: FormData) {
  const admin = await requireAdmin();
  const id = intField(fd, "id");
  const back = `/admin/orders/${id}`;
  const status = field(fd, "refund_status");
  const amount = Number(field(fd, "refund_amount") || 0);
  if (!REFUNDS.includes(status)) await finish("error", "Pick a valid refund status.", back);
  const [order] = await rows<{ total: string }>(sql`SELECT total FROM orders WHERE id = ${id}`);
  if (!order) await finish("error", "Order not found.", "/admin/orders");
  if (!(amount >= 0) || amount > Number(order.total)) await finish("error", "The refund can't be more than the order total.", back);
  const completed = status === "completed";
  await sql`
    UPDATE orders SET refund_status = ${status || null}, refund_amount = ${amount}, refund_id = ${field(fd, "refund_id").slice(0, 50) || null}, refund_notes = ${field(fd, "refund_notes") || null},
      refund_completed_at = CASE WHEN ${completed}::boolean THEN COALESCE(refund_completed_at, LOCALTIMESTAMP) ELSE NULL END,
      payment_status = CASE WHEN ${completed}::boolean THEN 'refunded' ELSE payment_status END, updated_at = LOCALTIMESTAMP
    WHERE id = ${id}
  `;
  await sql`INSERT INTO order_logs (order_id, action, description, created_by) VALUES (${id}, 'refund', ${`Refund ${status || "cleared"}: ₹${amount}`}, ${admin.username})`;
  await finish("success", "Refund details saved.", back);
}

export async function addOrderNote(fd: FormData) {
  const admin = await requireAdmin();
  const id = intField(fd, "id");
  const note = field(fd, "note").slice(0, 1000);
  if (note) await sql`INSERT INTO order_logs (order_id, action, description, created_by) VALUES (${id}, 'note', ${note}, ${admin.username})`;
  await finish("success", "Note added.", `/admin/orders/${id}`);
}

/** Online checkouts never paid. Stock was never taken for them. A day's wait leaves room for a late Razorpay webhook. */
export async function clearAbandoned() {
  await requireAdmin();
  const gone = await sql`DELETE FROM orders WHERE order_status = ${AWAITING_PAYMENT} AND created_at < LOCALTIMESTAMP - INTERVAL '1 day' RETURNING id`;
  await finish("success", `Cleared ${gone.length} abandoned checkout${gone.length === 1 ? "" : "s"}.`, "/admin/orders");
}
