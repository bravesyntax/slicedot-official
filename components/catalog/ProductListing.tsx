import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { after } from "next/server";
import ProductCard from "@/components/home/ProductCard";
import { CtaLink, container } from "@/components/site/ui";
import { getCategoryTree, getFilterColors, listProducts } from "@/lib/catalog";
import { sql } from "@/lib/db";
import { parseFilters, queryWith, type SearchParams } from "@/lib/listing";
import { cn } from "@/lib/utils";
import Crumbs from "./Crumbs";
import { MobileFilters, SidebarFilters, SortSelect } from "./Filters";

type Props = {
  searchParams: SearchParams;
  basePath: string;
  title: string;
  description?: string | null;
  crumbs: [string, string?][];
  category?: { id: number; slug: string };
};

export default async function ProductListing({ searchParams, basePath, title, description, crumbs, category }: Props) {
  const filters = parseFilters(searchParams);
  const [{ items, total, pages, page }, tree, colors] = await Promise.all([
    listProducts({ ...filters, categoryId: category?.id }),
    getCategoryTree(),
    getFilterColors(),
  ]);
  // Feeds the trending searches in the admin. Only the first page, so paging through results counts once.
  if (filters.search && filters.page === 1) {
    const term = filters.search.toLowerCase();
    after(() => Promise.resolve(sql`INSERT INTO search_logs (search_query, results_count) VALUES (${term}, ${total})`).then(() => undefined).catch((err) => console.error("[search log]", err)));
  }
  const categories = tree.map(({ id, name, slug, depth, product_count }) => ({ id, name, slug, depth, product_count }));
  const filterProps = { categories, colors, activeCategory: category?.slug };

  return (
    <div className={cn(container, "py-8 sm:py-12")}>
      <Crumbs items={crumbs} />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{filters.search ? `Results for "${filters.search}"` : title}</h1>
      {description && !filters.search && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_1fr]">
        <SidebarFilters {...filterProps} />
        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" role="status">{total} {total === 1 ? "product" : "products"}</p>
            <div className="flex items-center gap-2">
              <MobileFilters {...filterProps} />
              <SortSelect value={filters.sort} />
            </div>
          </div>

          {items.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} sizes="(max-width: 1280px) 50vw, 25vw" />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed py-16 text-center">
              <PackageSearch className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
              <h2 className="mt-4 font-medium">No products found</h2>
              <p className="mt-1 text-sm text-muted-foreground">Try removing a filter, or browse everything we have.</p>
              <div className="mt-5"><CtaLink href="/products" variant="outline" arrow={false}>View All Products</CtaLink></div>
            </div>
          )}

          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex flex-wrap justify-center gap-1.5">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={`${basePath}${queryWith(searchParams, { page: n === 1 ? "" : String(n) })}`}
                  aria-current={n === page ? "page" : undefined}
                  className={cn("grid size-10 place-items-center rounded-full border text-sm transition-colors", n === page ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary")}
                >
                  {n}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
