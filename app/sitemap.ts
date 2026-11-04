import type { MetadataRoute } from "next";
import { getCategoryTree } from "@/lib/catalog";
import { SITE_URL } from "@/lib/config";
import { rows, sql } from "@/lib/db";
import { categoryUrl, productImage, productUrl } from "@/lib/routes";
import { sitemapExclusions } from "@/lib/seo";
import { SEO_PAGES } from "@/lib/seo-pages";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tree, categories, products, excluded] = await Promise.all([
    getCategoryTree(),
    rows<{ id: number; slug: string; updated_at: Date | null }>(sql`SELECT id, slug, updated_at FROM categories WHERE status = 'active'`),
    rows<{ id: number; slug: string; updated_at: Date | null; image: string | null; gallery: string[] }>(sql`
      SELECT p.id, p.slug, p.updated_at, p.image,
        ARRAY(SELECT i.image_path FROM product_images i WHERE i.product_id = p.id AND i.image_path IS DISTINCT FROM p.image ORDER BY i.sort_order, i.id) AS gallery
      FROM products p WHERE p.status = 'active' ORDER BY p.id
    `),
    sitemapExclusions(),
  ]);
  // A category with nothing in it is a thin page; it joins the sitemap when it gets a product.
  const stocked = new Set(tree.filter((c) => c.product_count > 0).map((c) => c.slug));

  return [
    ...SEO_PAGES.filter((p) => !excluded.has(`page:${p.slug}`)).map((p) => ({ url: p.path === "/" ? SITE_URL : `${SITE_URL}${p.path}`, changeFrequency: p.changeFrequency, priority: p.priority })),
    ...categories
      .filter((c) => stocked.has(c.slug) && !excluded.has(`category:${c.id}`))
      .map((c) => ({ url: `${SITE_URL}${categoryUrl(c.slug)}`, lastModified: c.updated_at ?? undefined, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.filter((p) => !excluded.has(`product:${p.id}`)).map((p) => ({
      url: `${SITE_URL}${productUrl(p.slug)}`,
      lastModified: p.updated_at ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: [p.image, ...p.gallery].filter(Boolean).map((file) => new URL(productImage(file!), SITE_URL).href),
    })),
  ];
}
