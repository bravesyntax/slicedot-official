"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { checkbox, finish, intField, makeSlug, refreshPublicSite } from "@/lib/admin/common";
import { deleteImage, isOwnUpload } from "@/lib/admin/images";
import { rows, sql } from "@/lib/db";
import { productUrl } from "@/lib/routes";
import { field } from "@/lib/validation";

const LIST = "/admin/products";
const money = (v: string) => (/^\d{1,8}(\.\d{1,2})?$/.test(v) ? v : null);

type Picked = { path: string; alt: string; color: string };
function parseImages(raw: string): Picked[] {
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter((x) => typeof x?.path === "string" && x.path).map((x) => ({ path: x.path.slice(0, 255), alt: String(x.alt ?? "").slice(0, 255), color: String(x.color ?? "").slice(0, 100) }));
  } catch {
    return [];
  }
}

/** "Red, #ff0000" per line → the colors_json the store reads. */
function parseColors(raw: string) {
  const out: { name: string; code: string }[] = [];
  for (const line of raw.split("\n")) {
    const [name, code] = line.split(",").map((x) => x.trim());
    if (name) out.push({ name: name.slice(0, 50), code: /^#[0-9a-f]{3,8}$/i.test(code ?? "") ? code : "#a1a1aa" });
  }
  return out;
}

const list = (raw: string) => [...new Set(raw.split(",").map((x) => x.trim()).filter(Boolean))];

export async function saveProduct(fd: FormData) {
  await requireAdmin();
  const id = intField(fd, "id");
  const back = id ? `${LIST}/${id}` : `${LIST}/new`;

  const name = field(fd, "name").slice(0, 255);
  const slug = makeSlug(field(fd, "slug") || name).slice(0, 250);
  const price = money(field(fd, "price"));
  const compare = field(fd, "compare_price") ? money(field(fd, "compare_price")) : null;
  const cost = field(fd, "cost_price") ? money(field(fd, "cost_price")) : null;
  const quantity = intField(fd, "quantity");
  if (!name || !slug) await finish("error", "Enter the product name.", back);
  if (!price || Number(price) <= 0) await finish("error", "Enter a valid price.", back);
  if ((field(fd, "compare_price") && !compare) || (field(fd, "cost_price") && !cost)) await finish("error", "Compare and cost prices must be plain amounts.", back);
  if (compare && Number(compare) <= Number(price)) await finish("error", "The compare-at price must be higher than the price.", back);
  if (quantity < 0) await finish("error", "Stock can't be negative.", back);

  const [taken] = await rows<{ id: number }>(sql`SELECT id FROM products WHERE slug = ${slug} AND id <> ${id} LIMIT 1`);
  if (taken) await finish("error", `The URL "${slug}" is already used by another product.`, back);
  const sku = field(fd, "sku").slice(0, 50) || null;
  if (sku) {
    const [dup] = await rows<{ id: number }>(sql`SELECT id FROM products WHERE sku = ${sku} AND id <> ${id} LIMIT 1`);
    if (dup) await finish("error", `SKU ${sku} is already used by another product.`, back);
  }

  const [old] = id ? await rows<{ slug: string; status: string; image: string | null }>(sql`SELECT slug, status, image FROM products WHERE id = ${id}`) : [];
  if (id && !old) await finish("error", "That product no longer exists.", LIST);
  const before = id ? await rows<{ image_path: string }>(sql`SELECT image_path FROM product_images WHERE product_id = ${id}`) : [];
  const existing = [old?.image ?? null, ...before.map((b) => b.image_path)];

  const images = parseImages(String(fd.get("images") ?? "[]"));
  for (const img of images) if (!(await isOwnUpload("products", img.path, existing))) await finish("error", "One of the images is invalid. Upload it again.", back);

  const categoryId = intField(fd, "category_id") || null;
  const colors = parseColors(String(fd.get("colors") ?? ""));
  const status = field(fd, "status") === "inactive" ? "inactive" : "active";
  const featured = checkbox(fd, "is_featured");
  const str = (k: string, max: number) => field(fd, k).slice(0, max) || null;
  const collections = fd.getAll("collections").map(Number).filter((n) => n > 0);
  const keywords = list(String(fd.get("keywords") ?? "")).slice(0, 30);

  const productId = await sql.begin(async (tx) => {
    const fields = {
      name, slug, sku, category_id: categoryId, price, compare_price: compare, cost_price: cost, quantity, status, is_featured: featured,
      short_description: str("short_description", 500), description: String(fd.get("description") ?? "").trim() || null,
      material: str("material", 100), size: list(field(fd, "size")).join(",").slice(0, 100) || null, weight: str("weight", 100), dimensions: str("dimensions", 100), barcode: str("barcode", 100),
      vendor: str("vendor", 100), product_type: str("product_type", 100), product_tags: list(field(fd, "product_tags")).join(",") || null,
      colors_json: colors.length ? JSON.stringify(colors) : null, color: colors.length === 1 ? colors[0].name : null, image: images[0]?.path ?? null,
    };
    let pid = id;
    if (id) await tx`UPDATE products SET ${tx(fields)}, updated_at = LOCALTIMESTAMP WHERE id = ${id}`;
    else [{ id: pid }] = await tx<{ id: number }[]>`INSERT INTO products ${tx(fields)} RETURNING id`;

    await tx`DELETE FROM product_images WHERE product_id = ${pid}`;
    for (const [i, img] of images.entries()) {
      await tx`INSERT INTO product_images (product_id, image_path, alt_text, color_name, is_main, is_primary, sort_order)
        VALUES (${pid}, ${img.path}, ${img.alt || null}, ${img.color || null}, ${i === 0 ? 1 : 0}, ${i === 0 ? 1 : 0}, ${i})`;
    }

    await tx`DELETE FROM product_collection_map WHERE product_id = ${pid}`;
    for (const c of collections) await tx`INSERT INTO product_collection_map (product_id, collection_id) VALUES (${pid}, ${c})`;

    // Keywords shown on the product page. New ones stay out of the footer's global list.
    await tx`DELETE FROM product_seo_tags WHERE product_id = ${pid}`;
    for (const tag of keywords) {
      const tagSlug = makeSlug(tag);
      if (!tagSlug) continue;
      await tx`INSERT INTO seo_tags (tag_name, tag_slug, is_global, status) VALUES (${tag.slice(0, 255)}, ${tagSlug}, 0, 'active') ON CONFLICT DO NOTHING`;
      await tx`INSERT INTO product_seo_tags (product_id, tag_id) SELECT ${pid}::int, id FROM seo_tags WHERE tag_slug = ${tagSlug} LIMIT 1 ON CONFLICT DO NOTHING`;
    }

    // A renamed live product keeps its old URL working, and its rankings.
    if (old && old.slug !== slug) {
      const from = productUrl(old.slug);
      const to = productUrl(slug);
      await tx`DELETE FROM seo_redirects WHERE old_url = ${to}`;
      await tx`INSERT INTO seo_redirects (old_url, new_url, redirect_type, status, note) VALUES (${from}, ${to}, '301', 'active', 'Product renamed')
        ON CONFLICT (old_url) DO UPDATE SET new_url = EXCLUDED.new_url, status = 'active'`;
      await tx`UPDATE seo_redirects SET new_url = ${to} WHERE new_url = ${from}`;
    }
    return pid;
  });

  const kept = new Set(images.map((i) => i.path));
  await Promise.all(existing.filter((p): p is string => !!p && !kept.has(p)).map((p) => deleteImage("products", p)));

  refreshPublicSite();
  await finish("success", old && old.slug !== slug ? "Product saved. The old URL now redirects to the new one." : "Product saved.", `${LIST}/${productId}`);
}

export async function toggleProduct(fd: FormData) {
  await requireAdmin();
  await sql`UPDATE products SET status = CASE WHEN status = 'active' THEN 'inactive' ELSE 'active' END, updated_at = LOCALTIMESTAMP WHERE id = ${intField(fd, "id")}`;
  refreshPublicSite();
  await finish("success", "Product updated.", field(fd, "return_to").startsWith(LIST) ? field(fd, "return_to") : LIST);
}

/** A product with orders stays on record so order history keeps its link; it can be made inactive instead. */
export async function deleteProduct(fd: FormData) {
  await requireAdmin();
  const id = intField(fd, "id");
  const [{ n }] = await rows<{ n: number }>(sql`SELECT COUNT(*)::int AS n FROM order_items WHERE product_id = ${id}`);
  if (n) await finish("error", `This product is on ${n} order${n === 1 ? "" : "s"}, so it can't be deleted. Make it inactive instead.`, LIST);
  const images = await rows<{ image_path: string }>(sql`SELECT image_path FROM product_images WHERE product_id = ${id}`);
  const [product] = await rows<{ image: string | null }>(sql`SELECT image FROM products WHERE id = ${id}`);
  await sql.begin(async (tx) => {
    for (const table of ["product_images", "product_collection_map", "product_seo_tags", "product_variants", "product_regional_prices", "product_seo_audit", "cart", "wishlist"]) {
      await tx`DELETE FROM ${tx(table)} WHERE product_id = ${id}`;
    }
    await tx`DELETE FROM review_helpful WHERE review_id IN (SELECT id FROM product_reviews WHERE product_id = ${id})`;
    await tx`DELETE FROM review_images WHERE review_id IN (SELECT id FROM product_reviews WHERE product_id = ${id})`;
    await tx`DELETE FROM product_reviews WHERE product_id = ${id}`;
    await tx`DELETE FROM seo_meta WHERE entity_type = 'product' AND entity_key = ${String(id)}`;
    await tx`DELETE FROM products WHERE id = ${id}`;
  });
  await Promise.all([product?.image ?? null, ...images.map((i) => i.image_path)].map((p) => deleteImage("products", p)));
  refreshPublicSite();
  await finish("success", "Product deleted.", LIST);
}
