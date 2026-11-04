import type { MetadataRoute } from "next";
import { getCategoryTree } from "@/lib/catalog";
import { SITE_URL } from "@/lib/config";
import { rows, sql } from "@/lib/db";
import { categoryUrl, productImage, productUrl } from "@/lib/routes";

export const revalidate = 3600;

const STATIC_PAGES: [string, MetadataRoute.Sitemap[number]["changeFrequency"], number][] = [
  ["/products", "daily", 0.9],
  ["/categories", "weekly", 0.8],
  ["/about", "monthly", 0.6],
  ["/contact", "monthly", 0.6],
  ["/faq", "monthly", 0.5],
  ["/shipping", "monthly", 0.4],
  ["/returns", "monthly", 0.4],
  ["/privacy-policy", "monthly", 0.3],
  ["/terms", "monthly", 0.3],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tree, categories, products] = await Promise.all([
    getCategoryTree(),
    rows<{ slug: string; updated_at: Date | null }>(sql`SELECT slug, updated_at FROM categories WHERE status = 'active'`),
    rows<{ slug: string; updated_at: Date | null; image: string | null; gallery: string[] }>(sql`
      SELECT p.slug, p.updated_at, p.image,
        ARRAY(SELECT i.image_path FROM product_images i WHERE i.product_id = p.id AND i.image_path IS DISTINCT FROM p.image ORDER BY i.sort_order, i.id) AS gallery
      FROM products p WHERE p.status = 'active' ORDER BY p.id
    `),
  ]);
  // A category with nothing in it is a thin page; it joins the sitemap when it gets a product.
  const stocked = new Set(tree.filter((c) => c.product_count > 0).map((c) => c.slug));

  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    ...STATIC_PAGES.map(([path, changeFrequency, priority]) => ({ url: `${SITE_URL}${path}`, changeFrequency, priority })),
    ...categories
      .filter((c) => stocked.has(c.slug))
      .map((c) => ({ url: `${SITE_URL}${categoryUrl(c.slug)}`, lastModified: c.updated_at ?? undefined, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.map((p) => ({
      url: `${SITE_URL}${productUrl(p.slug)}`,
      lastModified: p.updated_at ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: [p.image, ...p.gallery].filter(Boolean).map((file) => `${SITE_URL}${productImage(file!)}`),
    })),
  ];
}
