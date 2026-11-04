// Navigation rows store PHP URLs (pages/products.php?category=x); the site uses clean ones (/category/x).
export function toRoute(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  const path = url.replace(/^\/+/, "");
  const page = path.match(/^pages\/([a-z-]+)\.php(\?.*)?$/);
  const route = page ? `/${page[1]}${page[2] ?? ""}` : `/${path}`;
  const category = route.match(/^\/products\?category=([a-z0-9-]+)$/);
  return category ? categoryUrl(category[1]) : route;
}

export const categoryUrl = (slug: string) => `/category/${slug}`;
export const productUrl = (slug: string) => `/product/${slug}`;
const isFullUrl = (file: string) => /^https?:\/\//i.test(file);
export const productImage = (file: string) => (isFullUrl(file) ? file : `/uploads/products/${file}`);
export const categoryImage = (file: string) => (isFullUrl(file) ? file : `/uploads/categories/${file}`);
export const formatPrice = (value: string | number) => `₹${Math.round(Number(value)).toLocaleString("en-US")}`;
