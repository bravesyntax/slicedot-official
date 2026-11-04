"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { fullName, getCustomer } from "@/lib/auth/session";
import { rows, sql } from "@/lib/db";
import { getReviewSettings } from "@/lib/settings";
import { looksLikeSpam } from "@/lib/spam";
import { field, getClientIp, isValidEmail, sanitizeEmail } from "@/lib/validation";

export type ReviewState = {
  status: "idle" | "ok" | "error";
  message?: string;
  errors: string[];
  values: Record<string, string>;
};

const RATE_MAX = 3;
const THANKS = "Thanks for your review! It will appear here once approved.";
const BOT_SUCCESS: ReviewState = { status: "ok", message: THANKS, errors: [], values: {} };

const THANKS_LIVE = "Thanks for your review!";

// Reviews from visitors who aren't signed in always wait for approval: anyone can type any name and email.
// Signed-in customers follow the store's review settings, and their name and email come from the account.
export async function submitReview(_prev: ReviewState, fd: FormData): Promise<ReviewState> {
  const values = { rating: field(fd, "rating"), title: field(fd, "title"), name: field(fd, "name"), email: field(fd, "email"), text: field(fd, "text") };
  const fail = (errors: string[]): ReviewState => ({ status: "error", errors, values });

  if (field(fd, "website_url")) return BOT_SUCCESS;
  const age = Date.now() - Number(field(fd, "form_ts"));
  if (!Number.isFinite(age) || age < 3_000 || age > 3_600_000) return BOT_SUCCESS;
  if (looksLikeSpam(values.name, values.text)) return BOT_SUCCESS;

  const { enabled, minLength, autoApprove, requirePurchase } = await getReviewSettings();
  if (!enabled) return fail(["Reviews are currently disabled."]);
  const customer = await getCustomer();
  const reviewer = customer ? { name: fullName(customer) || customer.email.split("@")[0], email: customer.email } : { name: values.name, email: values.email };

  const productId = parseInt(field(fd, "product_id"), 10);
  const rating = parseInt(values.rating, 10);
  const errors: string[] = [];
  if (!(rating >= 1 && rating <= 5)) errors.push("Please choose a star rating.");
  if (reviewer.name.length < 2 || reviewer.name.length > 100) errors.push("Please enter your name.");
  if (!isValidEmail(reviewer.email) || reviewer.email.length > 150) errors.push("A valid email address is required.");
  if (values.title.length > 200) errors.push("Title is too long.");
  if (values.text.length < minLength) errors.push(`Review must be at least ${minLength} characters.`);
  else if (values.text.length > 3000) errors.push("Review is too long (max 3000 characters).");
  if (errors.length) return fail(errors);

  const [product] = await rows<{ id: number; slug: string }>(sql`SELECT id, slug FROM products WHERE id = ${productId || 0} AND status = 'active'`);
  if (!product) return fail(["This product is no longer available."]);

  const ip = await getClientIp();
  if (ip) {
    const [{ n }] = await rows<{ n: number }>(sql`SELECT count(*)::int AS n FROM product_reviews WHERE ip_address = ${ip} AND created_at > LOCALTIMESTAMP - INTERVAL '1 hour'`);
    if (n >= RATE_MAX) return fail(["You have sent too many reviews recently. Please try again later."]);
  }
  const email = sanitizeEmail(reviewer.email);
  const [{ n: existing }] = await rows<{ n: number }>(sql`SELECT count(*)::int AS n FROM product_reviews WHERE product_id = ${product.id} AND lower(customer_email) = ${email.toLowerCase()}`);
  if (existing > 0) return fail(["You have already reviewed this product."]);

  const [{ bought }] = customer
    ? await rows<{ bought: boolean }>(sql`
        SELECT EXISTS (
          SELECT 1 FROM order_items i JOIN orders o ON o.id = i.order_id
          WHERE i.product_id = ${product.id} AND o.customer_id = ${customer.id} AND o.order_status <> 'cancelled'
        ) AS bought
      `)
    : [{ bought: false }];
  if (requirePurchase && !bought) return fail(["Only customers who bought this product can review it."]);
  const live = !!customer && autoApprove;

  try {
    await sql`
      INSERT INTO product_reviews (product_id, customer_id, customer_name, customer_email, rating, title, review_text, verified_purchase, status, ip_address)
      VALUES (${product.id}, ${customer?.id ?? null}, ${reviewer.name}, ${email}, ${rating}, ${values.title || null}, ${values.text}, ${bought ? 1 : 0}, ${live ? "approved" : "pending"}, ${ip})
    `;
  } catch (err) {
    console.error("[submitReview]", err);
    return fail(["Something went wrong saving your review. Please try again."]);
  }
  if (live) revalidatePath(`/product/${product.slug}`);
  return { status: "ok", message: live ? THANKS_LIVE : THANKS, errors: [], values: {} };
}

/** Counts one "helpful" per visitor (hash of IP and browser). Returns the new count, or null if not counted. */
export async function markHelpful(reviewId: number): Promise<number | null> {
  if (!Number.isInteger(reviewId)) return null;
  const ip = await getClientIp();
  if (!ip) return null;
  const ua = (await headers()).get("user-agent") ?? "";
  const identifier = `v_${createHash("sha256").update(`${ip}|${ua}`).digest("hex").slice(0, 40)}`;
  const counted = await sql.begin(async (tx) => {
    const added = await tx`
      INSERT INTO review_helpful (review_id, identifier)
      SELECT r.id, ${identifier} FROM product_reviews r
      WHERE r.id = ${reviewId} AND r.status = 'approved'
        AND NOT EXISTS (SELECT 1 FROM review_helpful h WHERE h.review_id = r.id AND h.identifier = ${identifier})
      RETURNING id
    `;
    if (!added.length) return null;
    const [row] = await tx`UPDATE product_reviews SET helpful_count = COALESCE(helpful_count, 0) + 1 WHERE id = ${reviewId} RETURNING helpful_count`;
    return row.helpful_count as number;
  });
  return counted;
}
