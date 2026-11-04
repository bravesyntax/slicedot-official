import "server-only";
import { randomBytes } from "node:crypto";
import type { TransactionSql } from "postgres";
import { fullName, type Customer } from "@/lib/auth/session";
import type { CheckoutAddress } from "@/lib/checkout";
import { rows, sql } from "@/lib/db";
import { ADMIN_EMAIL, escapeHtml, sendMail } from "@/lib/mailer";
import { COD_FEE, shippingFor } from "@/lib/pricing";
import { SITE_URL } from "@/lib/config";

/** Waiting for Razorpay: no stock taken and hidden from the customer until payment is confirmed. */
export const AWAITING_PAYMENT = "payment_pending";
const CANCELLABLE = ["pending", "confirmed", "processing"];

export class OrderProblem extends Error {}

type Transaction = TransactionSql;
type Line = { id: number; product_id: number; quantity: number; variant_color: string | null; variant_size: string | null; name: string; sku: string | null; price: string; stock: number; status: string };

const orderNumber = () => `SD${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${randomBytes(3).toString("hex").toUpperCase()}`;

const addressText = (a: CheckoutAddress) => `${a.name}\n${[a.address, a.locality].filter(Boolean).join(", ")}\n${a.city} - ${a.pincode}\n${a.state}\nPhone: ${a.phone}`;

// Inside a transaction, with the customer and products locked, so two tabs or two shoppers can't both buy the last one.
async function lockedCart(tx: Transaction, customerId: number) {
  await tx`SELECT id FROM customers WHERE id = ${customerId} FOR UPDATE`;
  const lines = (await tx`
    SELECT c.id, c.product_id, c.quantity, c.variant_color, c.variant_size, p.name, p.sku, p.price, COALESCE(p.quantity, 0) AS stock, p.status
    FROM cart c JOIN products p ON p.id = c.product_id
    WHERE c.customer_id = ${customerId}
    ORDER BY p.id
    FOR UPDATE OF p
  `) as unknown as Line[];
  if (!lines.length) throw new OrderProblem("Your bag is empty.");
  for (const line of lines) {
    if (line.status !== "active") throw new OrderProblem(`${line.name} is no longer available. Please remove it from your bag.`);
    if (line.quantity > line.stock) throw new OrderProblem(`Only ${line.stock} of ${line.name} left. Please update your bag.`);
  }
  return lines;
}

const subtotalOf = (lines: Line[]) => lines.reduce((n, l) => n + Number(l.price) * l.quantity, 0);

async function insertOrder(tx: Transaction, customer: Customer, address: CheckoutAddress, lines: Line[], o: { method: string; paymentStatus: string; orderStatus: string; fee: number; notes: string }) {
  const subtotal = subtotalOf(lines);
  const shipping = shippingFor(subtotal);
  const total = subtotal + shipping + o.fee;
  const number = orderNumber();
  const text = addressText(address);
  const [order] = await tx`
    INSERT INTO orders (order_number, customer_id, customer_name, customer_email, customer_phone, shipping_address, billing_address, shipping_address_id,
      subtotal, tax, shipping_cost, total, payment_method, payment_status, order_status, notes)
    VALUES (${number}, ${customer.id}, ${(fullName(customer) || address.name).slice(0, 100)}, ${customer.email}, ${address.phone}, ${text}, ${text}, ${address.id},
      ${subtotal}, 0, ${shipping}, ${total}, ${o.method}, ${o.paymentStatus}, ${o.orderStatus}, ${o.notes})
    RETURNING id
  `;
  for (const l of lines) {
    await tx`
      INSERT INTO order_items (order_id, product_id, product_name, product_sku, variant_color, variant_size, quantity, price, total)
      VALUES (${order.id}, ${l.product_id}, ${l.name}, ${l.sku}, ${l.variant_color}, ${l.variant_size}, ${l.quantity}, ${l.price}, ${Number(l.price) * l.quantity})
    `;
  }
  return { id: order.id as number, number, total };
}

export async function placeCodOrder(customer: Customer, address: CheckoutAddress) {
  return sql.begin(async (tx) => {
    const lines = await lockedCart(tx, customer.id);
    const order = await insertOrder(tx, customer, address, lines, { method: "cod", paymentStatus: "pending", orderStatus: "pending", fee: COD_FEE, notes: `Cash on Delivery (+₹${COD_FEE} COD charge)` });
    for (const l of lines) await tx`UPDATE products SET quantity = GREATEST(0, quantity - ${l.quantity}) WHERE id = ${l.product_id}`;
    await tx`DELETE FROM cart WHERE customer_id = ${customer.id}`;
    await tx`INSERT INTO order_logs (order_id, action, description, created_by) VALUES (${order.id}, 'created', 'Order placed with Cash on Delivery', ${`customer:${customer.id}`})`;
    return order;
  });
}

/** Saves the order as it stands now, so the amount paid always matches what was in the bag at that moment. */
export async function createAwaitingOrder(customer: Customer, address: CheckoutAddress) {
  return sql.begin(async (tx) => {
    const lines = await lockedCart(tx, customer.id);
    return insertOrder(tx, customer, address, lines, { method: "razorpay", paymentStatus: "pending", orderStatus: AWAITING_PAYMENT, fee: 0, notes: "Waiting for online payment" });
  });
}

export const attachRazorpayOrder = (orderId: number, razorpayOrderId: string) => sql`UPDATE orders SET razorpay_order_id = ${razorpayOrderId} WHERE id = ${orderId}`;

export const dropAwaitingOrder = (orderId: number) => sql`DELETE FROM orders WHERE id = ${orderId} AND order_status = ${AWAITING_PAYMENT}`;

/**
 * Marks a Razorpay order paid, once: stock is taken and the bought lines leave the bag. Called from the browser's return
 * and the webhook, whichever comes first; the row lock makes the second one a no-op. Returns null for an unknown order.
 */
export async function completeRazorpayPayment(razorpayOrderId: string, paymentId: string, signature: string | null) {
  return sql.begin(async (tx) => {
    const [order] = await tx`SELECT id, order_number, customer_id, payment_status, order_status, total FROM orders WHERE razorpay_order_id = ${razorpayOrderId} FOR UPDATE`;
    if (!order) return null;
    if (order.payment_status === "paid") return { id: order.id as number, number: order.order_number as string, customerId: order.customer_id as number | null, firstTime: false, stockShort: false };

    const items = await tx`SELECT product_id, quantity, variant_color, variant_size FROM order_items WHERE order_id = ${order.id} ORDER BY product_id`;
    const productIds = items.map((i) => i.product_id).filter(Boolean);
    const products = productIds.length ? await tx`SELECT id, COALESCE(quantity, 0) AS stock FROM products WHERE id IN ${tx(productIds)} ORDER BY id FOR UPDATE` : [];
    // The customer has paid, so the order stands even if stock ran out meanwhile; the admin alert says so.
    const stockShort = items.some((i) => i.product_id && i.quantity > (products.find((p) => p.id === i.product_id)?.stock ?? 0));
    for (const i of items) {
      if (i.product_id) await tx`UPDATE products SET quantity = GREATEST(0, quantity - ${i.quantity}) WHERE id = ${i.product_id}`;
      if (order.customer_id) {
        await tx`
          DELETE FROM cart WHERE customer_id = ${order.customer_id} AND product_id = ${i.product_id}
            AND variant_color IS NOT DISTINCT FROM ${i.variant_color}::text AND variant_size IS NOT DISTINCT FROM ${i.variant_size}::text
        `;
      }
    }
    await tx`
      UPDATE orders SET payment_status = 'paid', order_status = 'confirmed', razorpay_payment_id = ${paymentId}, razorpay_signature = ${signature},
        notes = ${`Razorpay Payment ID: ${paymentId}`}, updated_at = LOCALTIMESTAMP
      WHERE id = ${order.id}
    `;
    await tx`INSERT INTO order_logs (order_id, action, description, created_by) VALUES (${order.id}, 'payment', ${`Paid online, Razorpay payment ${paymentId}${stockShort ? ". Stock was short for this order" : ""}`}, 'razorpay')`;
    return { id: order.id as number, number: order.order_number as string, customerId: order.customer_id as number | null, firstTime: true, stockShort };
  });
}

export type OrderDetail = {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string;
  payment_method: string | null;
  payment_status: string;
  order_status: string;
  subtotal: string;
  tax: string;
  shipping_cost: string;
  total: string;
  created_at: Date;
  cancellation_reason: string | null;
  refund_status: string | null;
  refund_amount: string | null;
};

export type OrderLine = { id: number; product_name: string; product_sku: string | null; variant_color: string | null; variant_size: string | null; quantity: number; price: string; total: string; image: string | null; slug: string | null };

/** The customer's own order, or null. Same ownership rule as the orders list. */
export async function getCustomerOrder(number: string, customer: Pick<Customer, "id" | "email">) {
  const [order] = await rows<OrderDetail>(sql`
    SELECT id, order_number, customer_name, customer_email, customer_phone, shipping_address, payment_method, payment_status, order_status,
      subtotal, tax, shipping_cost, total, created_at, cancellation_reason, refund_status, refund_amount
    FROM orders
    WHERE order_number = ${number} AND order_status <> ${AWAITING_PAYMENT}
      AND (customer_id = ${customer.id} OR lower(customer_email) = ${customer.email.toLowerCase()})
  `);
  if (!order) return null;
  const items = await rows<OrderLine>(sql`
    SELECT i.id, i.product_name, i.product_sku, i.variant_color, i.variant_size, i.quantity, i.price, i.total, p.image, p.slug
    FROM order_items i LEFT JOIN products p ON p.id = i.product_id WHERE i.order_id = ${order.id} ORDER BY i.id
  `);
  return { order, items };
}

export const canCancel = (order: Pick<OrderDetail, "order_status">) => CANCELLABLE.includes(order.order_status);

// Same rule as PHP: paid online straight away; COD once it has shipped.
export const invoiceReady = (order: Pick<OrderDetail, "payment_method" | "payment_status" | "order_status">) =>
  order.payment_method === "cod" ? ["shipped", "delivered"].includes(order.order_status) : order.payment_status === "paid";

/** Other charges in the total, which is the COD fee on these orders. */
export const feeOf = (order: Pick<OrderDetail, "total" | "subtotal" | "shipping_cost" | "tax">) =>
  Math.max(0, Number(order.total) - Number(order.subtotal) - Number(order.shipping_cost) - Number(order.tax));

export async function cancelOrder(number: string, customer: Pick<Customer, "id" | "email">, reason: string) {
  return sql.begin(async (tx) => {
    const [order] = await tx`
      SELECT id, order_status, payment_method, payment_status, total FROM orders
      WHERE order_number = ${number} AND (customer_id = ${customer.id} OR lower(customer_email) = ${customer.email.toLowerCase()})
      FOR UPDATE
    `;
    if (!order) throw new OrderProblem("Order not found.");
    if (!CANCELLABLE.includes(order.order_status)) throw new OrderProblem("This order can't be cancelled. Orders that are shipped or delivered can't be cancelled.");
    const refund = order.payment_method !== "cod" && order.payment_status === "paid";
    await tx`
      UPDATE orders SET order_status = 'cancelled', cancellation_reason = ${reason}, cancelled_at = LOCALTIMESTAMP,
        refund_status = ${refund ? "processing" : null}, refund_amount = ${refund ? order.total : 0}, updated_at = LOCALTIMESTAMP
      WHERE id = ${order.id}
    `;
    const items = await tx`SELECT product_id, quantity FROM order_items WHERE order_id = ${order.id} AND product_id IS NOT NULL ORDER BY product_id`;
    for (const i of items) await tx`UPDATE products SET quantity = COALESCE(quantity, 0) + ${i.quantity} WHERE id = ${i.product_id}`;
    await tx`INSERT INTO order_logs (order_id, action, description, created_by) VALUES (${order.id}, 'cancelled', ${`Order cancelled by customer. Reason: ${reason}`}, ${`customer:${customer.id}`})`;
    return { refund, amount: Number(order.total) };
  });
}

// Test accounts on @example.com never reach a mailbox, the admin's included.
const isLocalTest = (email: string) => process.env.NODE_ENV !== "production" && email.endsWith("@example.com");

/** Order confirmation to the customer and a new-order alert to the admin. Failures are logged, never shown. */
export async function sendOrderEmails(number: string, note?: string) {
  const [order] = await rows<OrderDetail>(sql`SELECT order_number, customer_name, customer_email, customer_phone, payment_method, total, shipping_address FROM orders WHERE order_number = ${number}`);
  if (!order || isLocalTest(order.customer_email)) return;
  const items = await rows<{ product_name: string; quantity: number; variant_color: string | null; variant_size: string | null }>(sql`
    SELECT i.product_name, i.quantity, i.variant_color, i.variant_size FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.order_number = ${number} ORDER BY i.id
  `);
  const list = items.map((i) => `<li>${i.quantity} × ${escapeHtml(i.product_name)}${[i.variant_color, i.variant_size].filter(Boolean).length ? ` (${escapeHtml([i.variant_color, i.variant_size].filter(Boolean).join(", "))})` : ""}</li>`).join("");
  const total = `₹${Math.round(Number(order.total)).toLocaleString("en-US")}`;
  const payment = order.payment_method === "cod" ? "Cash on Delivery" : "Paid online";
  const address = escapeHtml(order.shipping_address).replace(/\r?\n/g, "<br>");
  const wrap = (body: string) => `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#171717">${body}</div>`;

  await sendMail({
    to: order.customer_email,
    subject: `Your SliceDot order ${number} is placed`,
    html: wrap(`<h2 style="margin:0 0 12px">Thanks for your order!</h2><p><strong>Order:</strong> ${number}<br><strong>Total:</strong> ${total} (${payment})</p><ul>${list}</ul><p><strong>Delivering to:</strong><br>${address}</p><p><a href="${SITE_URL}/order/${number}">View your order</a></p>`),
  });
  await sendMail({
    to: ADMIN_EMAIL,
    replyTo: order.customer_email,
    subject: `New order ${number}: ${total} (${payment})`,
    html: wrap(`<h2 style="margin:0 0 12px">New order ${number}</h2>${note ? `<p style="color:#b91c1c"><strong>${escapeHtml(note)}</strong></p>` : ""}<p><strong>Customer:</strong> ${escapeHtml(order.customer_name)}, ${escapeHtml(order.customer_email)}, ${escapeHtml(order.customer_phone ?? "")}<br><strong>Total:</strong> ${total} (${payment})</p><ul>${list}</ul><p>${address}</p>`),
  });
}

/** Refunds are made by hand, so a cancelled paid order must reach the admin. */
export async function sendCancelAlert(number: string, customerEmail: string, refund: boolean, amount: number) {
  if (isLocalTest(customerEmail)) return;
  await sendMail({
    to: ADMIN_EMAIL,
    subject: refund ? `Refund needed: order ${number} cancelled` : `Order ${number} cancelled`,
    html: `<div style="font-family:Arial,sans-serif;color:#171717"><p>Order <strong>${number}</strong> was cancelled by the customer.</p>${refund ? `<p style="color:#b91c1c"><strong>Refund ₹${Math.round(amount).toLocaleString("en-US")} from the Razorpay dashboard.</strong></p>` : ""}</div>`,
  });
}
