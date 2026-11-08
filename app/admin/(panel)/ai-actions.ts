"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { makeSlug } from "@/lib/admin/common";
import { AiProblem, aiConfigured, writeProductCopy, writeSeoCopy, type ProductCopy } from "@/lib/ai";
import { others, untilPerfect, type Scored, type SeoDraft } from "@/lib/ai-seo";
import { loadSeoTarget, loadSeoTargets, TYPE_LABEL } from "@/lib/admin/seo-audit";
import { rows, sql } from "@/lib/db";
import { productUrl } from "@/lib/routes";
import type { SeoEntity } from "@/lib/seo";

type Result<T> = { ok: true; data: T } | { ok: false; message: string };
const run = async <T>(work: () => Promise<T>): Promise<Result<T>> => {
  if (!aiConfigured()) return { ok: false, message: "AI writing needs GEMINI_API_KEY (free) or ANTHROPIC_API_KEY on the server." };
  try {
    return { ok: true, data: await work() };
  } catch (err) {
    return { ok: false, message: err instanceof AiProblem ? err.message : "The AI didn't respond. Try again." };
  }
};

/** Draft product copy and its SEO from what the admin has typed so far. Nothing is saved here. */
export async function aiProductCopy(input: { productId: number | null; name: string; slug: string; categoryId: number | null; price: string; colors: string; sizes: string; material: string; notes: string }): Promise<Result<ProductCopy & Scored>> {
  await requireAdmin();
  const name = String(input.name ?? "").trim().slice(0, 255);
  if (name.length < 3) return { ok: false, message: "Type the product name first." };
  const [[category], { targets, settings }] = await Promise.all([
    input.categoryId ? rows<{ name: string }>(sql`SELECT name FROM categories WHERE id = ${Number(input.categoryId) || 0}`) : Promise.resolve([]),
    loadSeoTargets(),
  ]);
  const self = targets.find((t) => t.type === "product" && t.key === String(Number(input.productId) || ""));
  const page = { path: productUrl(makeSlug(String(input.slug ?? "") || name).slice(0, 250)), image: self?.seo.image ?? settings.defaultImage, noindex: !!self?.seo.noindex, others: others(targets, self) };
  const details = { name, category: category?.name, price: String(input.price ?? "").slice(0, 20), colors: String(input.colors ?? "").slice(0, 500), sizes: String(input.sizes ?? "").slice(0, 200), material: String(input.material ?? "").slice(0, 100), notes: String(input.notes ?? "").slice(0, 4000) };
  return run(() => untilPerfect((brief) => writeProductCopy(brief, details), (c) => ({ title: c.meta_title, description: c.meta_description, focus_keyword: c.focus_keyword }), page));
}

/** Suggest a title, description and focus keyword for one URL. Nothing is saved here. */
export async function aiSeoCopy(type: SeoEntity, key: string): Promise<Result<SeoDraft & Scored>> {
  await requireAdmin();
  const { target, all } = await loadSeoTarget(type, String(key).slice(0, 200));
  if (!target) return { ok: false, message: "Unknown URL." };
  let context: string | null = null;
  if (type === "product") {
    const [p] = await rows<{ short_description: string | null; description: string | null }>(sql`SELECT short_description, description FROM products WHERE id = ${Number(key) || 0}`);
    context = [p?.short_description, p?.description].filter(Boolean).join("\n");
  } else if (type === "category") {
    const [c] = await rows<{ description: string | null; products: string | null }>(sql`
      SELECT c.description, (SELECT string_agg(p.name, ', ') FROM (SELECT name FROM products WHERE category_id = c.id AND status = 'active' LIMIT 12) p) AS products
      FROM categories c WHERE c.id = ${Number(key) || 0}
    `);
    context = [c?.description, c?.products && `Products: ${c.products}`].filter(Boolean).join("\n");
  }
  const page = { path: target.path, image: target.seo.image, noindex: target.seo.noindex, others: others(all, target) };
  const details = { kind: TYPE_LABEL[type], label: target.label, path: target.path, currentTitle: target.seo.title, currentDescription: target.seo.description, context };
  return run(async () => {
    const r = await untilPerfect((brief) => writeSeoCopy(brief, details), (c) => c, page);
    return { title: r.title, description: r.description, focus_keyword: r.focus_keyword, score: r.score, left: r.left };
  });
}
