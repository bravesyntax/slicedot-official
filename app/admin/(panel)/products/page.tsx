import { ExternalLink, Pencil, Plus, Power, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { ConfirmButton } from "@/components/admin/client";
import { Pill } from "@/components/admin/SeoShell";
import { AdminPage, Card, CardHead, EmptyState, FilterTabs, iconBtnDelete, iconBtnEdit, iconBtnToggle, iconBtnView, Pagination, paging, SearchBox, smallPrimaryBtn, Th } from "@/components/admin/ui";
import { rows, sql } from "@/lib/db";
import { formatPrice, productImage, productUrl } from "@/lib/routes";
import { deleteProduct, toggleProduct } from "./actions";

export const metadata = { title: "Products" };

const LOW_STOCK = 5;
const BASE = "/admin/products";
type Props = { searchParams: Promise<{ q?: string; filter?: string; page?: string }> };

export default async function ProductsPage({ searchParams }: Props) {
  const { q = "", filter = "all", page: pageParam } = await searchParams;
  const { page, perPage, offset, pages } = paging(pageParam);
  const term = `%${q.trim()}%`;
  const where = sql`WHERE (${q.trim()}::text = '' OR p.name ILIKE ${term} OR p.sku ILIKE ${term})
    AND (${filter}::text = 'all' OR (${filter}::text = 'active' AND p.status = 'active') OR (${filter}::text = 'inactive' AND p.status <> 'active') OR (${filter}::text = 'low' AND COALESCE(p.quantity, 0) <= ${LOW_STOCK}))`;
  const [[counts], [{ n: total }], list] = await Promise.all([
    rows<{ all: number; active: number; inactive: number; low: number }>(sql`SELECT COUNT(*)::int AS all, COUNT(*) FILTER (WHERE status = 'active')::int AS active, COUNT(*) FILTER (WHERE status <> 'active')::int AS inactive, COUNT(*) FILTER (WHERE COALESCE(quantity, 0) <= ${LOW_STOCK})::int AS low FROM products`),
    rows<{ n: number }>(sql`SELECT COUNT(*)::int AS n FROM products p ${where}`),
    rows<{ id: number; name: string; slug: string; sku: string | null; price: string; quantity: number | null; status: string; image: string | null; category: string | null }>(sql`
      SELECT p.id, p.name, p.slug, p.sku, p.price, p.quantity, p.status, p.image, c.name AS category
      FROM products p LEFT JOIN categories c ON c.id = p.category_id ${where} ORDER BY p.id DESC LIMIT ${perPage} OFFSET ${offset}
    `),
  ]);
  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...(filter !== "all" ? { filter } : {}), ...over });
    return `${BASE}${p.size ? `?${p}` : ""}`;
  };
  const current = qs(page > 1 ? { page: String(page) } : {});

  return (
    <AdminPage title="Products" actions={<Link href={`${BASE}/new`} className={smallPrimaryBtn}><Plus className="size-3.5" aria-hidden="true" /> Add product</Link>}>
      <Card>
        <CardHead title="All products" description={`${counts.all} in the catalog`}>
          <SearchBox action={BASE} q={q} placeholder="Search name or SKU" keep={{ filter: filter === "all" ? "" : filter }} />
        </CardHead>
        <div className="border-b px-5 py-3">
          <FilterTabs tabs={[["all", `All (${counts.all})`], ["active", `Active (${counts.active})`], ["inactive", `Inactive (${counts.inactive})`], ["low", `Low stock (${counts.low})`]]} active={filter} hrefFor={(k) => `${BASE}?${new URLSearchParams({ ...(q ? { q } : {}), ...(k !== "all" ? { filter: k } : {}) })}`} />
        </div>
        {list.length === 0 ? <EmptyState>No products match.</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr><Th>Product</Th><Th hide="hidden md:table-cell">Category</Th><Th className="text-right">Price</Th><Th className="text-right">Stock</Th><Th>Status</Th><Th /></tr></thead>
              <tbody className="divide-y">
                {list.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <Link href={`${BASE}/${p.id}`} className="flex min-w-48 items-center gap-3">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                          <img src={productImage(p.image)} alt="" className="size-11 shrink-0 rounded-md bg-muted object-cover" />
                        ) : <span className="size-11 shrink-0 rounded-md bg-muted" />}
                        <span className="min-w-0"><span className="block truncate font-medium">{p.name}</span><span className="block truncate text-xs text-muted-foreground">{p.sku || "No SKU"}</span></span>
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">{p.category ?? "None"}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{formatPrice(p.price)}</td>
                    <td className={`px-4 py-3 text-right ${(p.quantity ?? 0) <= LOW_STOCK ? "font-medium text-destructive" : ""}`}>{p.quantity ?? 0}</td>
                    <td className="px-4 py-3"><Pill tone={p.status === "active" ? "ok" : "muted"}>{p.status === "active" ? "Active" : "Inactive"}</Pill></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link href={`${BASE}/${p.id}`} className={iconBtnEdit} title="Edit" aria-label={`Edit ${p.name}`}><Pencil className="size-4" aria-hidden="true" /></Link>
                        <Link href={`/admin/seo/edit?type=product&key=${p.id}`} className={iconBtnView} title="SEO" aria-label={`SEO for ${p.name}`}><Search className="size-4" aria-hidden="true" /></Link>
                        <a href={productUrl(p.slug)} target="_blank" rel="noopener noreferrer" className={iconBtnView} title="View in store" aria-label={`View ${p.name}`}><ExternalLink className="size-4" aria-hidden="true" /></a>
                        <form action={toggleProduct}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="return_to" value={current} /><button type="submit" className={iconBtnToggle} title={p.status === "active" ? "Make inactive" : "Make active"} aria-label={p.status === "active" ? "Make inactive" : "Make active"}><Power className="size-4" aria-hidden="true" /></button></form>
                        <form action={deleteProduct}><input type="hidden" name="id" value={p.id} /><ConfirmButton message={`Permanently delete "${p.name}"?`} className={iconBtnDelete} title="Delete"><Trash2 className="size-4" aria-hidden="true" /></ConfirmButton></form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={pages(total)} total={total} perPage={perPage} hrefFor={(p) => qs({ page: String(p) })} />
      </Card>
    </AdminPage>
  );
}
