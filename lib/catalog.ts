import "server-only";
import { cache } from "react";
import { rows, sql } from "./db";
import { PRICE_RANGES, type ListingFilters } from "./listing";
import { searchTokens } from "./search";

export type ProductCard = {
  id: number;
  name: string;
  slug: string;
  price: string;
  compare_price: string | null;
  image: string | null;
  avg_rating: string | null;
  review_count: number | null;
  colors_json: string | null;
  color: string | null;
  category_name: string | null;
  stock: number;
  total_sold?: number;
};

export type CategoryCard = { id: number; name: string; slug: string; image: string | null; product_count: number };
export type CategoryNode = CategoryCard & { parent_id: number | null; depth: number; sample_image: string | null };

export type ProductDetail = ProductCard & {
  sku: string | null;
  barcode: string | null;
  quantity: number;
  description: string | null;
  short_description: string | null;
  material: string | null;
  size: string | null;
  weight: string | null;
  dimensions: string | null;
  vendor: string | null;
  product_type: string | null;
  product_tags: string | null;
  category_id: number | null;
  category_slug: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
};

export type Review = {
  id: number;
  customer_name: string;
  rating: number;
  title: string | null;
  review_text: string;
  verified_purchase: number | null;
  helpful_count: number | null;
  admin_reply: string | null;
  created_at: Date;
};

// Ratings come from approved reviews, not products.avg_rating / review_count: those columns hold numbers for products
// whose reviews no longer exist.
const realRating = sql`(SELECT ROUND(AVG(r.rating), 1) FROM product_reviews r WHERE r.product_id = p.id AND r.status = 'approved' AND r.rating >= 1)`;
const realReviewCount = sql`(SELECT count(*)::int FROM product_reviews r WHERE r.product_id = p.id AND r.status = 'approved' AND r.rating >= 1)`;

const cardColumns = sql`p.id, p.name, p.slug, p.price, p.compare_price, p.image, ${realRating} AS avg_rating, ${realReviewCount} AS review_count, p.colors_json, p.color, c.name AS category_name, COALESCE(p.quantity, 0) AS stock`;

// product_count covers the category and everything below it.
export const getRootCategories = () =>
  rows<CategoryCard>(sql`
    SELECT cat.id, cat.name, cat.slug, cat.image, (
      WITH RECURSIVE tree AS (
        SELECT cat.id AS id
        UNION ALL
        SELECT c2.id FROM categories c2 JOIN tree ON c2.parent_id = tree.id WHERE c2.status = 'active'
      )
      SELECT count(*)::int FROM products p WHERE p.status = 'active' AND p.category_id IN (SELECT id FROM tree)
    ) AS product_count
    FROM categories cat
    WHERE cat.status = 'active' AND (cat.parent_id IS NULL OR cat.parent_id = 0)
    ORDER BY cat.sort_order ASC, cat.name ASC
  `);

/** Every active category in tree order, each with the product count of its whole subtree. */
export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  const all = await rows<Omit<CategoryNode, "depth" | "product_count"> & { direct: number }>(sql`
    SELECT c.id, c.parent_id, c.name, c.slug, c.image,
      (SELECT count(*)::int FROM products p WHERE p.category_id = c.id AND p.status = 'active') AS direct,
      (SELECT p.image FROM products p WHERE p.category_id = c.id AND p.status = 'active' AND p.image IS NOT NULL ORDER BY p.id LIMIT 1) AS sample_image
    FROM categories c WHERE c.status = 'active' ORDER BY c.sort_order ASC, c.name ASC
  `);
  const children = (id: number | null) => all.filter((c) => (c.parent_id || null) === id);
  const count = (id: number): number => (all.find((c) => c.id === id)?.direct ?? 0) + children(id).reduce((n, c) => n + count(c.id), 0);
  const walk = (id: number | null, depth: number): CategoryNode[] =>
    children(id).flatMap((c) => [{ id: c.id, parent_id: c.parent_id, name: c.name, slug: c.slug, image: c.image, sample_image: c.sample_image, depth, product_count: count(c.id) }, ...walk(c.id, depth + 1)]);
  return walk(null, 0);
});

export const getCategoryBySlug = cache(async (slug: string) => {
  const [category] = await rows<{ id: number; parent_id: number | null; name: string; slug: string; description: string | null; meta_title: string | null; meta_description: string | null; keywords: string | null; image: string | null }>(
    sql`SELECT id, parent_id, name, slug, description, meta_title, meta_description, keywords, image FROM categories WHERE slug = ${slug} AND status = 'active'`,
  );
  return category ?? null;
});

/** Newest products of a category and everything below it. */
export const getCategoryProducts = (categoryId: number, limit = 8) =>
  rows<ProductCard>(sql`
    SELECT ${cardColumns} FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'active' AND p.category_id IN (
      WITH RECURSIVE tree AS (
        SELECT c1.id FROM categories c1 WHERE c1.id = ${categoryId}
        UNION ALL
        SELECT c2.id FROM categories c2 JOIN tree ON c2.parent_id = tree.id WHERE c2.status = 'active'
      ) SELECT id FROM tree
    )
    ORDER BY p.created_at DESC LIMIT ${limit}
  `);

/** Biggest real discounts that can be bought right now. */
export const getDealProducts = () =>
  rows<ProductCard>(sql`
    SELECT ${cardColumns} FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'active' AND p.compare_price > p.price AND p.quantity > 0
    ORDER BY 1 - p.price / p.compare_price DESC, p.created_at DESC LIMIT 8
  `);

export const getFeaturedProducts = () =>
  rows<ProductCard>(sql`
    SELECT ${cardColumns} FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'active' AND p.is_featured = 1
    ORDER BY p.created_at DESC LIMIT 8
  `);

export const getTrendingProducts = () =>
  rows<ProductCard>(sql`
    SELECT ${cardColumns}, COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.product_id = p.id), 0)::int AS total_sold
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'active'
    ORDER BY total_sold DESC, p.created_at DESC LIMIT 4
  `);

export const getLatestProducts = () =>
  rows<ProductCard>(sql`
    SELECT ${cardColumns} FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'active'
    ORDER BY p.created_at DESC LIMIT 8
  `);

export const getHomeFaqs = () =>
  rows<{ question: string; answer: string }>(sql`
    SELECT question, answer FROM seo_faq
    WHERE status = 'active' AND (page = 'homepage' OR page = 'all')
    ORDER BY sort_order ASC LIMIT 6
  `);

// How closely a misspelt search word must match a word in a product name (pg_trgm word_similarity, 0 to 1).
const FUZZY = 0.5;

// User text inside LIKE: % and _ must match literally.
const like = (text: string) => `%${text.replace(/[\\%_]/g, "\\$&")}%`;

/** Every search word has to appear in the product, its category, its tags or its search keywords. A longer word also
 * matches a product name that spells it almost the same way ("lotin" finds "lotion"), through Postgres's pg_trgm. */
function searchMatch(query: string) {
  const tokens = searchTokens(query);
  if (!tokens.length) return sql``;
  return tokens
    .map((t) => {
      const w = like(t);
      const near = t.length >= 4 ? sql`OR word_similarity(${t}::text, lower(p.name)) >= ${FUZZY}::real` : sql``;
      return sql`AND (p.name ILIKE ${w} ${near} OR p.short_description ILIKE ${w} OR p.description ILIKE ${w} OR p.sku ILIKE ${w} OR p.product_tags ILIKE ${w}
        OR EXISTS (SELECT 1 FROM categories sc WHERE sc.id = p.category_id AND sc.name ILIKE ${w})
        OR EXISTS (SELECT 1 FROM product_seo_tags pst JOIN seo_tags st ON st.id = pst.tag_id WHERE pst.product_id = p.id AND st.tag_name ILIKE ${w}))`;
    })
    .reduce((a, b) => sql`${a} ${b}`);
}

/** Words the catalog actually uses, for "did you mean" when a search finds nothing. */
export const getSearchVocabulary = cache(async () => {
  const data = await rows<{ text: string }>(sql`
    SELECT name AS text FROM products WHERE status = 'active'
    UNION ALL SELECT name FROM categories WHERE status = 'active'
    UNION ALL SELECT tag_name FROM seo_tags WHERE status = 'active'
  `);
  return data.flatMap((r) => searchTokens(r.text));
});

const LISTING_ORDER = {
  // Searches order by relevanceOrder(); without a search, "best match" means newest.
  relevance: sql`p.created_at DESC`,
  newest: sql`p.created_at DESC`,
  "price-low": sql`p.price ASC, p.id DESC`,
  "price-high": sql`p.price DESC, p.id DESC`,
  popularity: sql`p.is_featured DESC, ${realReviewCount} DESC, p.created_at DESC`,
  rating: sql`COALESCE(${realRating}, 0) DESC, ${realReviewCount} DESC, p.created_at DESC`,
  discount: sql`CASE WHEN p.compare_price > p.price THEN 1 - p.price / p.compare_price ELSE 0 END DESC, p.created_at DESC`,
  recommended: sql`p.is_featured DESC, COALESCE(${realRating}, 0) * 0.6 + LEAST(${realReviewCount} / 10.0, 5) * 0.4 DESC, p.created_at DESC`,
};

/** Best match first: names closest to the search, then names that contain it whole, then featured and newest. */
function relevanceOrder(search: string) {
  const q = searchTokens(search).join(" ") || search.toLowerCase();
  return sql`word_similarity(${q}::text, lower(p.name)) DESC, (lower(p.name) LIKE ${like(q)}) DESC, p.is_featured DESC, p.created_at DESC`;
}

export async function listProducts(f: ListingFilters & { categoryId?: number }, perPage = 12) {
  const anyOf = (conditions: ReturnType<typeof sql>[]) => conditions.reduce((a, b) => sql`${a} OR ${b}`);
  const ranges = f.price.map((key) => PRICE_RANGES.find((r) => r.value === key)!);
  const where = sql`
    p.status = 'active'
    ${f.categoryId ? sql`AND p.category_id IN (
      WITH RECURSIVE tree AS (
        SELECT c1.id FROM categories c1 WHERE c1.id = ${f.categoryId}
        UNION ALL
        SELECT c2.id FROM categories c2 JOIN tree ON c2.parent_id = tree.id WHERE c2.status = 'active'
      ) SELECT id FROM tree
    )` : sql``}
    ${f.search ? searchMatch(f.search) : sql``}
    ${ranges.length ? sql`AND (${anyOf(ranges.map((r) => sql`(p.price >= ${r.min} AND p.price <= ${r.max})`))})` : sql``}
    ${f.color.length ? sql`AND (${anyOf(f.color.map((name) => sql`(p.colors_json ILIKE ${like(name)} OR p.color ILIKE ${like(name)})`))})` : sql``}
    ${f.rating ? sql`AND COALESCE(${realRating}, 0) >= ${f.rating}` : sql``}
    ${f.discount ? sql`AND p.compare_price > p.price AND ROUND((1 - p.price / p.compare_price) * 100) >= ${f.discount}` : sql``}
    ${f.inStock ? sql`AND p.quantity > 0` : sql``}
    ${f.featured ? sql`AND p.is_featured = 1` : sql``}
    ${f.tag ? sql`AND p.product_tags ILIKE ${like(f.tag)}` : sql``}
    ${f.collection ? sql`AND p.id IN (SELECT m.product_id FROM product_collection_map m JOIN product_collections pc ON pc.id = m.collection_id WHERE pc.collection_slug = ${f.collection})` : sql``}
  `;
  const [{ total }] = await rows<{ total: number }>(sql`SELECT count(*)::int AS total FROM products p WHERE ${where}`);
  const pages = Math.max(1, Math.ceil(total / perPage));
  // A page number past the end (an old link, say) shows the last page rather than an empty list.
  const page = Math.min(f.page, pages);
  const items = await rows<ProductCard>(sql`
    SELECT ${cardColumns} FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE ${where}
    ORDER BY ${f.sort === "relevance" && f.search ? relevanceOrder(f.search) : LISTING_ORDER[f.sort]}
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `);
  return { items, total, pages, page };
}

const COLOR_CODES: Record<string, string> = {
  red: "#ef4444", blue: "#3b82f6", green: "#22c55e", black: "#18181b", white: "#ffffff", yellow: "#eab308",
  orange: "#f97316", purple: "#a855f7", pink: "#ec4899", brown: "#92400e", grey: "#71717a", gray: "#71717a",
  navy: "#1e3a5f", beige: "#d4c4a8", maroon: "#7f1d1d", gold: "#ca8a04", silver: "#a1a1aa", cream: "#fef3c7",
  teal: "#14b8a6", coral: "#fb7185",
};

export function productColors(p: Pick<ProductCard, "colors_json" | "color">): { name: string; code: string }[] {
  if (p.colors_json) {
    try {
      const parsed = JSON.parse(p.colors_json);
      if (Array.isArray(parsed) && parsed.length) return parsed.filter((c) => c?.name && c?.code);
    } catch {
      // Malformed JSON falls through to the single color column.
    }
  }
  const name = p.color?.trim();
  return name ? [{ name, code: COLOR_CODES[name.toLowerCase()] ?? "#a1a1aa" }] : [];
}

/** Distinct colors across active products, for the listing filter. */
export async function getFilterColors() {
  const data = await rows<{ colors_json: string | null; color: string | null }>(sql`SELECT colors_json, color FROM products WHERE status = 'active'`);
  const seen = new Map<string, { name: string; code: string }>();
  for (const c of data.flatMap(productColors)) if (!seen.has(c.name.toLowerCase())) seen.set(c.name.toLowerCase(), c);
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const getProductBySlug = cache(async (slug: string) => {
  const [product] = await rows<ProductDetail>(sql`
    SELECT ${cardColumns}, p.sku, p.barcode, p.quantity, p.description, p.short_description, p.material, p.size, p.weight, p.dimensions,
      p.vendor, p.product_type, p.product_tags, p.category_id, c.slug AS category_slug, p.meta_title, p.meta_description, p.meta_keywords,
      p.og_title, p.og_description, p.og_image
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.slug = ${slug} AND p.status = 'active' LIMIT 1
  `);
  return product ?? null;
});

export const getProductImages = (productId: number) =>
  rows<{ image_path: string; alt_text: string | null; color_name: string | null }>(sql`
    SELECT image_path, alt_text, color_name FROM product_images WHERE product_id = ${productId} ORDER BY is_main DESC, sort_order ASC, id ASC
  `);

export const getProductCollections = (productId: number) =>
  rows<{ collection_name: string; collection_slug: string }>(sql`
    SELECT pc.collection_name, pc.collection_slug FROM product_collection_map m JOIN product_collections pc ON m.collection_id = pc.id
    WHERE m.product_id = ${productId} AND pc.status = 'active' ORDER BY pc.sort_order ASC
  `);

/** Products like this one: same category first, then the same family of categories, then a similar price. */
export const getSimilarProducts = (product: { id: number; category_id: number | null; price: string }) =>
  rows<ProductCard>(sql`
    SELECT ${cardColumns} FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'active' AND p.id <> ${product.id}
    ORDER BY
      (p.category_id IS NOT DISTINCT FROM ${product.category_id}::int)::int * 4
      + (c.parent_id IS NOT NULL AND c.parent_id = (SELECT parent_id FROM categories WHERE id = ${product.category_id}::int))::int * 2
      + (abs(p.price - ${product.price}::numeric) <= ${product.price}::numeric * 0.4)::int
      + (p.quantity > 0)::int DESC,
      p.created_at DESC
    LIMIT 8
  `);

/** What other customers bought in the same order as this product, most often first. */
export const getBoughtTogether = (productId: number) =>
  rows<ProductCard>(sql`
    SELECT ${cardColumns} FROM (
      SELECT b.product_id, count(*) AS n FROM order_items a
      JOIN order_items b ON b.order_id = a.order_id AND b.product_id IS NOT NULL AND b.product_id <> a.product_id
      JOIN orders o ON o.id = a.order_id AND o.order_status NOT IN ('cancelled', 'payment_pending')
      WHERE a.product_id = ${productId} GROUP BY b.product_id
    ) pair
    JOIN products p ON p.id = pair.product_id AND p.status = 'active' AND p.quantity > 0
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY pair.n DESC, p.created_at DESC LIMIT 4
  `);

export const getWishlistProducts = (customerId: number) =>
  rows<ProductCard>(sql`
    SELECT ${cardColumns} FROM wishlist w JOIN products p ON p.id = w.product_id LEFT JOIN categories c ON p.category_id = c.id
    WHERE w.customer_id = ${customerId} AND p.status = 'active'
    ORDER BY w.created_at DESC
  `);


/** Popular searches for the search box: trending terms first, then the keywords in Admin → SEO. */
export const getSuggestedSearches = () =>
  rows<{ term: string }>(sql`
    SELECT term FROM (
      SELECT DISTINCT ON (lower(term)) term, rank, pos FROM (
        SELECT COALESCE(NULLIF(display_text, ''), search_term) AS term, 0 AS rank, ROW_NUMBER() OVER (ORDER BY is_featured DESC, sort_order ASC, search_count DESC) AS pos FROM seo_trending_searches WHERE status = 'active'
        UNION ALL
        SELECT tag_name, 1, ROW_NUMBER() OVER (ORDER BY is_featured DESC, display_priority DESC, id) FROM seo_tags WHERE status = 'active' AND is_global = 1
      ) both_lists ORDER BY lower(term), rank, pos
    ) terms ORDER BY rank, pos LIMIT 12
  `);

export const getActiveProductSlugs = () => rows<{ slug: string }>(sql`SELECT slug FROM products WHERE status = 'active'`);

export const getProductReviews = (productId: number) =>
  rows<Review>(sql`
    SELECT id, customer_name, rating, title, review_text, verified_purchase, helpful_count, admin_reply, created_at
    FROM product_reviews WHERE product_id = ${productId} AND status = 'approved' AND rating >= 1
    ORDER BY created_at DESC LIMIT 20
  `);

export async function searchSuggestions(q: string) {
  const term = like(q);
  const starts = `${q.replace(/[\\%_]/g, "\\$&")}%`;
  const [products, categories] = await Promise.all([
    rows<{ name: string; slug: string; price: string; image: string | null }>(sql`
      SELECT p.name, p.slug, p.price, p.image FROM products p
      WHERE p.status = 'active' ${searchMatch(q)}
      ORDER BY CASE WHEN p.name ILIKE ${starts} THEN 1 WHEN p.name ILIKE ${term} THEN 2 ELSE 3 END, p.name LIMIT 8
    `),
    rows<{ name: string; slug: string }>(sql`
      SELECT name, slug FROM categories WHERE status = 'active' AND (name ILIKE ${term} OR description ILIKE ${term}) ORDER BY name LIMIT 5
    `),
  ]);
  return { products, categories };
}
