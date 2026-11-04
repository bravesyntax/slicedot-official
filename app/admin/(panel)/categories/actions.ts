"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { checkbox, finish, intField, makeSlug, refreshPublicSite } from "@/lib/admin/common";
import { deleteImage, isOwnUpload } from "@/lib/admin/images";
import { rows, sql } from "@/lib/db";
import { categoryUrl } from "@/lib/routes";
import { field } from "@/lib/validation";

const LIST = "/admin/categories";

export async function saveCategory(fd: FormData) {
  await requireAdmin();
  const id = intField(fd, "id");
  const back = id ? `${LIST}?edit=${id}` : LIST;
  const name = field(fd, "name").slice(0, 100);
  const slug = makeSlug(field(fd, "slug") || name).slice(0, 100);
  if (!name || !slug) await finish("error", "Enter the category name.", back);
  const [taken] = await rows<{ id: number }>(sql`SELECT id FROM categories WHERE slug = ${slug} AND id <> ${id} LIMIT 1`);
  if (taken) await finish("error", `The URL "${slug}" is already used by another category.`, back);

  const all = await rows<{ id: number; parent_id: number | null; name: string; level: number | null; image: string | null; slug: string }>(sql`SELECT id, parent_id, name, level, image, slug FROM categories`);
  const old = all.find((c) => c.id === id);
  const parentId = intField(fd, "parent_id") || null;
  // A category can't sit under itself, or under anything below it.
  for (let p = parentId; p; p = all.find((c) => c.id === p)?.parent_id ?? null) {
    if (p === id) await finish("error", "A category can't be placed under itself.", back);
  }
  const parent = all.find((c) => c.id === parentId);
  const trail: string[] = [name];
  for (let p = parent; p; p = all.find((c) => c.id === p!.parent_id)) trail.unshift(p.name);

  let image: string | null = null;
  try {
    const list = JSON.parse(String(fd.get("image") ?? "[]")) as { path?: string }[];
    image = list[0]?.path ?? null;
  } catch {
    // Treated as no image.
  }
  if (image && !(await isOwnUpload("categories", image, [old?.image ?? null]))) await finish("error", "That image is invalid. Upload it again.", back);

  const values = {
    name, slug, parent_id: parentId, level: trail.length, category_path: trail.join(" > ").slice(0, 500), description: field(fd, "description") || null, image,
    image_alt: field(fd, "image_alt") || null, sort_order: intField(fd, "sort_order"), status: checkbox(fd, "is_active") ? "active" : "inactive",
  };
  await sql.begin(async (tx) => {
    if (id) await tx`UPDATE categories SET ${tx(values)}, updated_at = LOCALTIMESTAMP WHERE id = ${id}`;
    else await tx`INSERT INTO categories ${tx(values)}`;
    // A renamed category keeps its old URL working, and its rankings.
    if (old && old.slug !== slug) {
      const from = categoryUrl(old.slug);
      const to = categoryUrl(slug);
      await tx`DELETE FROM seo_redirects WHERE old_url = ${to}`;
      await tx`INSERT INTO seo_redirects (old_url, new_url, redirect_type, status, note) VALUES (${from}, ${to}, '301', 'active', 'Category renamed')
        ON CONFLICT (old_url) DO UPDATE SET new_url = EXCLUDED.new_url, status = 'active'`;
      await tx`UPDATE seo_redirects SET new_url = ${to} WHERE new_url = ${from}`;
    }
  });
  if (old?.image && old.image !== image) await deleteImage("categories", old.image);
  refreshPublicSite();
  await finish("success", old && old.slug !== slug ? "Category saved. The old URL now redirects to the new one." : "Category saved.", LIST);
}

export async function deleteCategory(fd: FormData) {
  await requireAdmin();
  const id = intField(fd, "id");
  const [c] = await rows<{ image: string | null; children: number; products: number }>(sql`
    SELECT image, (SELECT COUNT(*)::int FROM categories k WHERE k.parent_id = ${id}) AS children, (SELECT COUNT(*)::int FROM products p WHERE p.category_id = ${id}) AS products
    FROM categories WHERE id = ${id}
  `);
  if (!c) await finish("error", "That category no longer exists.", LIST);
  if (c.children) await finish("error", `This category has ${c.children} sub-categor${c.children === 1 ? "y" : "ies"}. Move or delete ${c.children === 1 ? "it" : "them"} first.`, LIST);
  if (c.products) await finish("error", `This category has ${c.products} product${c.products === 1 ? "" : "s"}. Move ${c.products === 1 ? "it" : "them"} to another category first.`, LIST);
  await sql.begin(async (tx) => {
    await tx`UPDATE navigation_items SET category_id = NULL WHERE category_id = ${id}`;
    await tx`DELETE FROM category_seo_tags WHERE category_id = ${id}`;
    await tx`DELETE FROM seo_meta WHERE entity_type = 'category' AND entity_key = ${String(id)}`;
    await tx`DELETE FROM categories WHERE id = ${id}`;
  });
  await deleteImage("categories", c.image);
  refreshPublicSite();
  await finish("success", "Category deleted.", LIST);
}
