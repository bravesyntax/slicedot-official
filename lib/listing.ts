// Product listing filters: the URL query string is the source of truth, so filtered pages can be shared and reloaded.

export const SORTS = [
  ["recommended", "Recommended"],
  ["newest", "Newest First"],
  ["popularity", "Popularity"],
  ["price-low", "Price: Low to High"],
  ["price-high", "Price: High to Low"],
  ["rating", "Highest Rated"],
  ["discount", "Biggest Discount"],
] as const;
export type ListingSort = (typeof SORTS)[number][0];

export const PRICE_RANGES = [
  { value: "0-500", label: "Under ₹500", min: 0, max: 500 },
  { value: "500-1000", label: "₹500 - ₹1,000", min: 500, max: 1000 },
  { value: "1000-2000", label: "₹1,000 - ₹2,000", min: 1000, max: 2000 },
  { value: "2000-5000", label: "₹2,000 - ₹5,000", min: 2000, max: 5000 },
  { value: "5000-10000", label: "₹5,000 - ₹10,000", min: 5000, max: 10000 },
  { value: "10000-999999", label: "₹10,000+", min: 10000, max: 999999 },
];
export const DISCOUNTS = [10, 20, 30, 40, 50];
export const RATINGS = [4, 3, 2];

export type SearchParams = Record<string, string | string[] | undefined>;

export type ListingFilters = {
  search: string;
  sort: ListingSort;
  page: number;
  price: string[];
  color: string[];
  rating: number;
  discount: number;
  inStock: boolean;
  featured: boolean;
  tag: string;
  collection: string;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const list = (v: string | string[] | undefined) => one(v).split(",").map((s) => s.trim()).filter(Boolean);

export function parseFilters(sp: SearchParams): ListingFilters {
  // ?sort=popular is the old home page link.
  const sort = one(sp.sort) === "popular" ? "popularity" : one(sp.sort);
  return {
    search: one(sp.search).trim().slice(0, 100),
    sort: SORTS.some(([key]) => key === sort) ? (sort as ListingSort) : "newest",
    page: Math.max(1, Math.min(10_000, parseInt(one(sp.page), 10) || 1)),
    price: list(sp.price).filter((v) => PRICE_RANGES.some((r) => r.value === v)),
    color: list(sp.color).slice(0, 20).map((c) => c.slice(0, 50)),
    rating: RATINGS.includes(Number(one(sp.rating))) ? Number(one(sp.rating)) : 0,
    discount: DISCOUNTS.includes(Number(one(sp.discount))) ? Number(one(sp.discount)) : 0,
    inStock: one(sp.in_stock) === "1",
    featured: one(sp.featured) === "1",
    tag: one(sp.tag).trim().slice(0, 100),
    collection: one(sp.collection).trim().slice(0, 100),
  };
}

/** The query string for a link that keeps the current filters, with some replaced. Empty values are dropped. */
export function queryWith(sp: SearchParams, changes: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) if (one(value)) params.set(key, one(value));
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}
