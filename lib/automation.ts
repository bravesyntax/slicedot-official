import "server-only";
import { SITE_URL } from "./config";
import { rows, sql } from "./db";
import { ADMIN_EMAIL, escapeHtml, sendMail } from "./mailer";
import { AWAITING_PAYMENT } from "./orders";
import { productUrl } from "./routes";

// Store chores that run on their own: back-in-stock emails, a reminder about a forgotten bag, a low-stock note for the
// admin, and clearing online checkouts that were never paid.

const LOW_STOCK = 5;
const wrap = (body: string) => `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#171717">${body}</div>`;
const button = (href: string, label: string) => `<p><a href="${href}" style="display:inline-block;background:#171717;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">${label}</a></p>`;
// Test accounts on @example.com never reach a mailbox.
const isLocalTest = (email: string) => process.env.NODE_ENV !== "production" && email.endsWith("@example.com");

/** Emails everyone waiting for a product that is back in stock. Each address is told once. */
export async function notifyBackInStock(productId?: number) {
  const waiting = await rows<{ id: number; email: string; name: string; slug: string }>(sql`
    SELECT a.id, a.email, p.name, p.slug FROM stock_alerts a JOIN products p ON p.id = a.product_id
    WHERE a.notified_at IS NULL AND p.status = 'active' AND p.quantity > 0 ${productId ? sql`AND p.id = ${productId}` : sql``}
    ORDER BY a.id LIMIT 200
  `);
  let sent = 0;
  for (const alert of waiting) {
    // Marked first, so a slow or failed send never mails the same person twice.
    const [claimed] = await rows<{ id: number }>(sql`UPDATE stock_alerts SET notified_at = LOCALTIMESTAMP WHERE id = ${alert.id} AND notified_at IS NULL RETURNING id`);
    if (!claimed || isLocalTest(alert.email)) continue;
    const ok = await sendMail({
      to: alert.email,
      subject: `Back in stock: ${alert.name}`,
      html: wrap(`<h2 style="margin:0 0 12px">It's back</h2><p><strong>${escapeHtml(alert.name)}</strong> is in stock again at SliceDot. Stock is limited, so order soon if you still want it.</p>${button(`${SITE_URL}${productUrl(alert.slug)}`, "View product")}<p style="color:#737373;font-size:12px">You asked us to tell you when this item returned. This is the only email you'll get about it.</p>`),
    });
    if (ok) sent++;
  }
  return sent;
}

/** One gentle reminder to signed-in customers whose bag has sat for a day, at most once a week. */
export async function remindAbandonedBags() {
  const customers = await rows<{ id: number; email: string; first_name: string }>(sql`
    SELECT c.id, c.email, c.first_name FROM customers c
    WHERE c.status = 'active'
      AND EXISTS (SELECT 1 FROM cart k JOIN products p ON p.id = k.product_id AND p.status = 'active' AND p.quantity > 0 WHERE k.customer_id = c.id)
      AND (SELECT max(COALESCE(k.updated_at, k.created_at)) FROM cart k WHERE k.customer_id = c.id) BETWEEN LOCALTIMESTAMP - INTERVAL '7 days' AND LOCALTIMESTAMP - INTERVAL '1 day'
      AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.order_status <> ${AWAITING_PAYMENT} AND o.created_at > LOCALTIMESTAMP - INTERVAL '2 days')
      AND NOT EXISTS (SELECT 1 FROM cart_reminders r WHERE r.customer_id = c.id AND r.sent_at > LOCALTIMESTAMP - INTERVAL '7 days')
    LIMIT 100
  `);
  let sent = 0;
  for (const customer of customers) {
    const items = await rows<{ name: string; slug: string }>(sql`
      SELECT DISTINCT p.name, p.slug FROM cart k JOIN products p ON p.id = k.product_id AND p.status = 'active' AND p.quantity > 0 WHERE k.customer_id = ${customer.id} LIMIT 5
    `);
    await sql`INSERT INTO cart_reminders (customer_id, sent_at) VALUES (${customer.id}, LOCALTIMESTAMP) ON CONFLICT (customer_id) DO UPDATE SET sent_at = LOCALTIMESTAMP`;
    if (!items.length || isLocalTest(customer.email)) continue;
    const list = items.map((i) => `<li><a href="${SITE_URL}${productUrl(i.slug)}" style="color:#171717">${escapeHtml(i.name)}</a></li>`).join("");
    const hello = customer.first_name?.trim() ? `Hi ${escapeHtml(customer.first_name.trim())},` : "Hi,";
    const ok = await sendMail({
      to: customer.email,
      subject: "You left something in your SliceDot bag",
      html: wrap(`<p>${hello}</p><p>These are still waiting in your bag:</p><ul>${list}</ul><p>Free shipping on orders of ₹499 and above, and Cash on Delivery is available.</p>${button(`${SITE_URL}/cart`, "View my bag")}<p style="color:#737373;font-size:12px">We send this at most once a week, and only while items are in your bag.</p>`),
    });
    if (ok) sent++;
  }
  return sent;
}

/** A short list for the admin when products are running out. Sent only when there is something to say. */
export async function lowStockDigest() {
  const low = await rows<{ name: string; quantity: number | null }>(sql`SELECT name, quantity FROM products WHERE status = 'active' AND COALESCE(quantity, 0) <= ${LOW_STOCK} ORDER BY quantity NULLS FIRST, name LIMIT 30`);
  if (!low.length) return 0;
  const list = low.map((p) => `<li>${escapeHtml(p.name)}: <strong>${p.quantity ?? 0}</strong> left</li>`).join("");
  await sendMail({ to: ADMIN_EMAIL, subject: `${low.length} product${low.length === 1 ? "" : "s"} running low on stock`, html: wrap(`<h2 style="margin:0 0 12px">Low stock</h2><ul>${list}</ul>${button(`${SITE_URL}/admin/products?filter=low`, "Open products")}`) });
  return low.length;
}

/** Online checkouts that were never paid. Stock was never taken; a day leaves room for a late Razorpay webhook. */
export async function clearAbandonedCheckouts() {
  const gone = await sql`DELETE FROM orders WHERE order_status = ${AWAITING_PAYMENT} AND created_at < LOCALTIMESTAMP - INTERVAL '1 day' RETURNING id`;
  return gone.length;
}
