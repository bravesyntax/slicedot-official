"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { makeSlug, refreshPublicSite } from "@/lib/admin/common";
import { loadSeoTarget, loadSeoTargets } from "@/lib/admin/seo-audit";
import { AiProblem, aiConfigured, askAi, fetchAiImage, seoRules, writeSeoCopy, type AiImage } from "@/lib/ai";
import { others, untilPerfect, type Scored } from "@/lib/ai-seo";
import { SITE_URL } from "@/lib/config";
import { rows, sql } from "@/lib/db";
import { COD_FEE, FREE_SHIPPING_FROM, SHIPPING_FEE } from "@/lib/pricing";
import { categoryUrl, productImage } from "@/lib/routes";
import type { SeoEntity } from "@/lib/seo";

// AI helpers for the admin screens. Each drafts something for the admin to read; only "Fix SEO" and
// "Apply" on a search fix save anything, and only after the admin presses the button.

type Result<T> = { ok: true; data: T } | { ok: false; message: string };

async function run<T>(work: () => Promise<T>): Promise<Result<T>> {
  await requireAdmin();
  if (!aiConfigured()) return { ok: false, message: "AI needs GEMINI_API_KEY (free) or ANTHROPIC_API_KEY on the server." };
  try {
    return { ok: true, data: await work() };
  } catch (err) {
    return { ok: false, message: err instanceof AiProblem ? err.message : "The AI didn't respond. Try again." };
  }
}

/** The store's own shipping and returns pages as plain text, so answers quote real policy instead of guessing. */
async function storePolicies() {
  const page = async (path: string) => {
    try {
      const html = await (await fetch(`${SITE_URL}${path}`, { signal: AbortSignal.timeout(8000) })).text();
      const main = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? "";
      return main.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim().slice(0, 3000);
    } catch {
      return "";
    }
  };
  const [shipping, returns] = await Promise.all([page("/shipping"), page("/returns")]);
  return [
    `Free shipping on orders of ₹${FREE_SHIPPING_FROM} and above; otherwise ₹${SHIPPING_FEE}. Cash on Delivery costs ₹${COD_FEE} extra. Online payment through Razorpay.`,
    shipping && `Shipping page: ${shipping}`,
    returns && `Returns page: ${returns}`,
  ].filter(Boolean).join("\n\n");
}

const NO_GUESS = "If the policies below don't answer something, say the team will check and reply, instead of guessing.";

// ── Product images: alt text from what the AI sees ─────────────────────────────

const AltTexts = z.object({ alts: z.array(z.string().describe("Alt text for the image at the same position: what it shows, under 120 characters, no 'image of'.")) });

export async function aiAltTexts(input: { name: string; paths: string[] }): Promise<Result<{ path: string; alt: string }[]>> {
  return run(async () => {
    const paths = input.paths.slice(0, 8).map(String);
    if (!paths.length) throw new AiProblem("Add an image first.");
    const images = await Promise.all(paths.map((p) => fetchAiImage(/^https?:\/\//.test(productImage(p)) ? productImage(p) : `${SITE_URL}${productImage(p)}`)));
    const seen = paths.map((path, i) => ({ path, image: images[i] })).filter((x): x is { path: string; image: AiImage } => !!x.image);
    if (!seen.length) throw new AiProblem("The images couldn't be opened. Save the product first, then try again.");
    const { alts } = await askAi(AltTexts, `Write alt text for these ${seen.length} photos of the product "${String(input.name).slice(0, 200)}", in the same order. Describe what each photo shows (colour, angle, how it is worn or used) for a shopper who can't see it.`, seen.map((x) => x.image));
    return seen.map((x, i) => ({ path: x.path, alt: (alts[i] ?? "").trim().slice(0, 200) })).filter((x) => x.alt);
  });
}

// ── Reviews and contact messages: reply drafts ────────────────────────────────

const Reply = z.object({ reply: z.string().describe("The reply text only, 1 to 4 sentences.") });

export async function aiReviewReply(reviewId: number): Promise<Result<string>> {
  return run(async () => {
    const [r] = await rows<{ customer_name: string; rating: number; title: string | null; review_text: string; product: string | null }>(sql`
      SELECT r.customer_name, r.rating, r.title, r.review_text, p.name AS product FROM product_reviews r LEFT JOIN products p ON p.id = r.product_id WHERE r.id = ${Number(reviewId) || 0}
    `);
    if (!r) throw new AiProblem("That review no longer exists.");
    const { reply } = await askAi(Reply, `Write the store's public reply to this product review. It appears under the review on the product page.
Thank the customer by first name. For 4–5 stars, keep it short and warm. For 1–3 stars, acknowledge the problem without arguing and invite them to write to the store through the contact page so the team can help. Never promise refunds or replacements. ${NO_GUESS}

Product: ${r.product ?? "unknown"}
Customer: ${r.customer_name}
Rating: ${r.rating} of 5
Title: ${r.title ?? ""}
Review: ${r.review_text.slice(0, 2000)}

${await storePolicies()}`);
    return reply.trim().slice(0, 2000);
  });
}

const EmailReply = z.object({ subject: z.string(), body: z.string().describe("Plain-text email body with a greeting and a sign-off from Team SliceDot.") });

export async function aiMessageReply(messageId: number): Promise<Result<{ subject: string; body: string }>> {
  return run(async () => {
    const [m] = await rows<{ name: string; subject: string | null; message: string }>(sql`SELECT name, subject, message FROM contact_messages WHERE id = ${Number(messageId) || 0}`);
    if (!m) throw new AiProblem("That message no longer exists.");
    const draft = await askAi(EmailReply, `Draft the store's email reply to this contact form message. Answer the question directly using only the store policies below. If it is about a specific order, ask for the order number if they haven't given it. ${NO_GUESS}

From: ${m.name}
Subject: ${m.subject ?? ""}
Message: ${m.message.slice(0, 3000)}

${await storePolicies()}`);
    return { subject: draft.subject.trim().slice(0, 150) || `Re: ${m.subject ?? "your message"}`, body: draft.body.trim().slice(0, 4000) };
  });
}

// ── Categories: description plus SEO ──────────────────────────────────────────

const CategoryCopy = z.object({
  description: z.string().describe("40 to 80 words of plain text for the top of the category page."),
  title: z.string().describe("Search result title. Follow the SEO rules."),
  meta_description: z.string().describe("Search result description. Follow the SEO rules."),
  focus_keyword: z.string().describe("Follow the SEO rules."),
});

export async function aiCategoryCopy(input: { categoryId: number | null; name: string; slug: string }): Promise<Result<z.infer<typeof CategoryCopy> & Scored>> {
  return run(async () => {
    const name = String(input.name ?? "").trim().slice(0, 100);
    if (name.length < 2) throw new AiProblem("Type the category name first.");
    const id = Number(input.categoryId) || 0;
    const [products, { targets, settings }] = await Promise.all([
      rows<{ name: string }>(sql`SELECT name FROM products WHERE category_id = ${id} AND status = 'active' ORDER BY id DESC LIMIT 15`),
      loadSeoTargets(),
    ]);
    const self = targets.find((t) => t.type === "category" && t.key === String(id));
    const path = categoryUrl(makeSlug(String(input.slug ?? "") || name).slice(0, 100));
    const contents = products.length ? ` It contains: ${products.map((p) => p.name).join(", ")}.` : "";
    return untilPerfect(
      (brief) => askAi(CategoryCopy, `Write the copy for the "${name}" category page of the store.${contents}
The description is shown at the top of the page: say what shoppers will find there and use the focus keyword once.
The page URL is ${brief.path}

${seoRules(brief)}`),
      (c) => ({ title: c.title, description: c.meta_description, focus_keyword: c.focus_keyword }),
      { path, image: self?.seo.image ?? settings.defaultImage, noindex: !!self?.seo.noindex, others: others(targets, self) },
    );
  });
}

// ── FAQ drafts ────────────────────────────────────────────────────────────────

const Faqs = z.object({ faqs: z.array(z.object({ question: z.string(), answer: z.string().describe("1 to 3 sentences.") })).describe("5 questions.") });

export async function aiFaqDrafts(): Promise<Result<{ question: string; answer: string }[]>> {
  return run(async () => {
    const [existing, categories] = await Promise.all([
      rows<{ question: string }>(sql`SELECT question FROM seo_faq`),
      rows<{ name: string }>(sql`SELECT name FROM categories WHERE status = 'active' AND parent_id IS NULL ORDER BY sort_order LIMIT 12`),
    ]);
    const { faqs } = await askAi(Faqs, `Write 5 questions shoppers often ask before buying from this online store, with answers taken only from the policies below. Skip anything the policies don't answer.
Store sells: ${categories.map((c) => c.name).join(", ")}.
Don't repeat these existing questions: ${existing.map((e) => e.question).join(" | ") || "none"}

${await storePolicies()}`);
    return faqs.filter((f) => f.question.trim() && f.answer.trim()).slice(0, 5);
  });
}

// ── Searches that found nothing ───────────────────────────────────────────────

const SearchFix = z.object({
  product_ids: z.array(z.number()).describe("Ids of products a shopper typing this search would want. Empty if none fit."),
  keyword: z.string().describe("The search term, corrected and lower case, to add as a keyword to those products."),
  reason: z.string().describe("One short sentence for the admin."),
});

export async function aiSearchFix(term: string): Promise<Result<z.infer<typeof SearchFix> & { products: { id: number; name: string }[] }>> {
  return run(async () => {
    const q = String(term ?? "").trim().toLowerCase().slice(0, 80);
    if (q.length < 2) throw new AiProblem("Pick a search first.");
    const catalog = await rows<{ id: number; name: string; category: string | null }>(sql`
      SELECT p.id, p.name, c.name AS category FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.status = 'active' ORDER BY p.id DESC LIMIT 300
    `);
    const fix = await askAi(SearchFix, `A shopper searched the store for "${q}" and got no results. From the catalogue below, pick only the products that genuinely match what they wanted (a misspelling, a synonym, Hindi or Hinglish words, a broader or narrower term). Don't stretch: if nothing fits, return no ids.

Catalogue (id | name | category):
${catalog.map((p) => `${p.id} | ${p.name} | ${p.category ?? ""}`).join("\n")}`);
    const ids = new Set(catalog.map((p) => p.id));
    const picked = fix.product_ids.filter((id) => ids.has(id)).slice(0, 12);
    return { ...fix, product_ids: picked, keyword: fix.keyword.trim().toLowerCase().slice(0, 80) || q, products: catalog.filter((p) => picked.includes(p.id)).map(({ id, name }) => ({ id, name })) };
  });
}

/** Adds the keyword to the products, so the search finds them from now on. */
export async function applySearchFix(input: { keyword: string; productIds: number[] }): Promise<Result<number>> {
  await requireAdmin();
  const keyword = String(input.keyword ?? "").trim().toLowerCase().slice(0, 80);
  const tagSlug = makeSlug(keyword);
  const ids = (input.productIds ?? []).map(Number).filter((n) => n > 0).slice(0, 12);
  if (!tagSlug || !ids.length) return { ok: false, message: "Nothing to apply." };
  await sql`INSERT INTO seo_tags (tag_name, tag_slug, is_global, status) VALUES (${keyword}, ${tagSlug}, 0, 'active') ON CONFLICT DO NOTHING`;
  for (const id of ids) await sql`INSERT INTO product_seo_tags (product_id, tag_id) SELECT ${id}::int, id FROM seo_tags WHERE tag_slug = ${tagSlug} LIMIT 1 ON CONFLICT DO NOTHING`;
  refreshPublicSite();
  return { ok: true, data: ids.length };
}

// ── Fix SEO for one URL and save it ───────────────────────────────────────────

/** Writes and saves a title, description and focus keyword for one URL, but only when they pass every text check. */
export async function aiFixSeo(type: SeoEntity, key: string): Promise<Result<{ score: number; saved: boolean }>> {
  return run(async () => {
    const { target, all } = await loadSeoTarget(type, String(key).slice(0, 200));
    if (!target) throw new AiProblem("Unknown URL.");
    const r = await untilPerfect(
      (brief) => writeSeoCopy(brief, { kind: type, label: target.label, path: target.path, currentTitle: target.seo.title, currentDescription: target.seo.description }),
      (c) => c,
      { path: target.path, image: target.seo.image, noindex: target.seo.noindex, others: others(all, target) },
    );
    if (r.score <= target.score) return { score: target.score, saved: false };
    await sql`
      INSERT INTO seo_meta (entity_type, entity_key, title, description, focus_keyword, updated_at)
      VALUES (${type}, ${target.key}, ${r.title.trim()}, ${r.description.trim()}, ${r.focus_keyword.trim()}, LOCALTIMESTAMP)
      ON CONFLICT (entity_type, entity_key) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, focus_keyword = EXCLUDED.focus_keyword, updated_at = LOCALTIMESTAMP
    `;
    refreshPublicSite();
    return { score: r.score, saved: true };
  });
}
