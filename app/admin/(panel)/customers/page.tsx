import { Download } from "lucide-react";
import Link from "next/link";
import { Pill } from "@/components/admin/SeoShell";
import { AdminPage, Card, CardHead, EmptyState, formatDate, Pagination, paging, SearchBox, secondaryBtn, Th } from "@/components/admin/ui";
import { rows, sql } from "@/lib/db";
import { AWAITING_PAYMENT } from "@/lib/orders";
import { formatPrice } from "@/lib/routes";

export const metadata = { title: "Customers" };

const BASE = "/admin/customers";
type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function CustomersPage({ searchParams }: Props) {
  const { q = "", page: pageParam } = await searchParams;
  const { page, perPage, offset, pages } = paging(pageParam);
  const term = `%${q.trim()}%`;
  const where = sql`WHERE (${q.trim()}::text = '' OR c.first_name ILIKE ${term} OR c.last_name ILIKE ${term} OR c.email ILIKE ${term} OR c.phone ILIKE ${term})`;
  const [[{ n: total }], list] = await Promise.all([
    rows<{ n: number }>(sql`SELECT COUNT(*)::int AS n FROM customers c ${where}`),
    rows<{ id: number; first_name: string; last_name: string; email: string; phone: string | null; status: string; created_at: Date; orders: number; spent: string }>(sql`
      SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.status, c.created_at, COUNT(o.id)::int AS orders, COALESCE(SUM(o.total) FILTER (WHERE o.order_status <> 'cancelled'), 0) AS spent
      FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.order_status <> ${AWAITING_PAYMENT}
      ${where} GROUP BY c.id ORDER BY c.id DESC LIMIT ${perPage} OFFSET ${offset}
    `),
  ]);

  return (
    <AdminPage title="Customers" actions={<a href={`${BASE}/export`} className={secondaryBtn}><Download className="size-3.5" aria-hidden="true" /> Export CSV</a>}>
      <Card>
        <CardHead title="All customers" description={`${total} ${q ? "matching" : "total"}`}>
          <SearchBox action={BASE} q={q} placeholder="Name, email or phone" />
        </CardHead>
        {list.length === 0 ? <EmptyState>No customers match.</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr><Th>Customer</Th><Th hide="hidden md:table-cell">Phone</Th><Th className="text-right">Orders</Th><Th className="text-right">Spent</Th><Th>Status</Th><Th hide="hidden lg:table-cell">Joined</Th></tr></thead>
              <tbody className="divide-y">
                {list.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/40">
                    <td className="max-w-64 px-4 py-3"><Link href={`${BASE}/${c.id}`} className="block truncate font-medium underline-offset-4 hover:underline">{`${c.first_name} ${c.last_name}`.trim() || "No name yet"}</Link><div className="truncate text-xs text-muted-foreground">{c.email}</div></td>
                    <td className="hidden px-4 py-3 text-xs md:table-cell">{c.phone}</td>
                    <td className="px-4 py-3 text-right">{c.orders}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{formatPrice(c.spent)}</td>
                    <td className="px-4 py-3"><Pill tone={c.status === "active" ? "ok" : "error"}>{c.status === "active" ? "Active" : "Blocked"}</Pill></td>
                    <td className="hidden px-4 py-3 text-xs whitespace-nowrap text-muted-foreground lg:table-cell">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={pages(total)} total={total} perPage={perPage} hrefFor={(p) => `${BASE}?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`} />
      </Card>
    </AdminPage>
  );
}
