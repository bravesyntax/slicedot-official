import Link from "next/link";
import { ConfirmButton } from "@/components/admin/client";
import { Pill, statusTone } from "@/components/admin/SeoShell";
import { AdminPage, Card, CardHead, EmptyState, FilterTabs, formatDate, Pagination, paging, SearchBox, secondaryBtn, Th } from "@/components/admin/ui";
import { rows, sql } from "@/lib/db";
import { AWAITING_PAYMENT } from "@/lib/orders";
import { formatPrice } from "@/lib/routes";
import { clearAbandoned } from "./actions";

export const metadata = { title: "Orders" };

const BASE = "/admin/orders";
const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

type Props = { searchParams: Promise<{ q?: string; status?: string; page?: string }> };

export default async function OrdersPage({ searchParams }: Props) {
  const { q = "", status = "all", page: pageParam } = await searchParams;
  const { page, perPage, offset, pages } = paging(pageParam);
  const term = `%${q.trim()}%`;
  // Checkouts still waiting for online payment aren't orders yet, so they stay out of every count here.
  const where = sql`WHERE order_status <> ${AWAITING_PAYMENT} AND (${q.trim()}::text = '' OR order_number ILIKE ${term} OR customer_name ILIKE ${term} OR customer_email ILIKE ${term} OR customer_phone ILIKE ${term})
    AND (${status}::text = 'all' OR order_status = ${status})`;
  const [counts, [{ n: total }], list, [{ n: abandoned }]] = await Promise.all([
    rows<{ order_status: string; n: number }>(sql`SELECT order_status, COUNT(*)::int AS n FROM orders WHERE order_status <> ${AWAITING_PAYMENT} GROUP BY 1`),
    rows<{ n: number }>(sql`SELECT COUNT(*)::int AS n FROM orders ${where}`),
    rows<{ id: number; order_number: string; customer_name: string; customer_email: string; total: string; order_status: string; payment_status: string; payment_method: string | null; created_at: Date; items: number }>(sql`
      SELECT o.id, o.order_number, o.customer_name, o.customer_email, o.total, o.order_status, o.payment_status, o.payment_method, o.created_at,
        (SELECT COALESCE(SUM(i.quantity), 0)::int FROM order_items i WHERE i.order_id = o.id) AS items
      FROM orders o ${where} ORDER BY o.created_at DESC, o.id DESC LIMIT ${perPage} OFFSET ${offset}
    `),
    rows<{ n: number }>(sql`SELECT COUNT(*)::int AS n FROM orders WHERE order_status = ${AWAITING_PAYMENT} AND created_at < LOCALTIMESTAMP - INTERVAL '1 day'`),
  ]);
  const count = (s: string) => counts.find((c) => c.order_status === s)?.n ?? 0;
  const all = counts.reduce((sum, c) => sum + c.n, 0);
  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...(status !== "all" ? { status } : {}), ...over });
    return `${BASE}${p.size ? `?${p}` : ""}`;
  };

  return (
    <AdminPage title="Orders">
      <Card>
        <CardHead title="All orders" description={`${all} total`}>
          <div className="flex flex-wrap items-center gap-2">
            {abandoned > 0 && (
              <form action={clearAbandoned}><ConfirmButton message={`Remove ${abandoned} checkout${abandoned === 1 ? "" : "s"} that never got paid?`} className={secondaryBtn}>Clear {abandoned} abandoned</ConfirmButton></form>
            )}
            <SearchBox action={BASE} q={q} placeholder="Order, name, email or phone" keep={{ status: status === "all" ? "" : status }} />
          </div>
        </CardHead>
        <div className="border-b px-5 py-3">
          <FilterTabs tabs={[["all", `All (${all})`], ...STATUSES.map((s): [string, string] => [s, `${s[0].toUpperCase()}${s.slice(1)} (${count(s)})`])]} active={status} hrefFor={(k) => `${BASE}?${new URLSearchParams({ ...(q ? { q } : {}), ...(k !== "all" ? { status: k } : {}) })}`} />
        </div>
        {list.length === 0 ? <EmptyState>No orders match.</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr><Th>Order</Th><Th>Customer</Th><Th className="text-right">Total</Th><Th>Status</Th><Th>Payment</Th><Th hide="hidden lg:table-cell">Date</Th></tr></thead>
              <tbody className="divide-y">
                {list.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 whitespace-nowrap"><Link href={`${BASE}/${o.id}`} className="font-medium underline-offset-4 hover:underline">{o.order_number}</Link><div className="text-xs text-muted-foreground">{o.items} item{o.items === 1 ? "" : "s"}</div></td>
                    <td className="max-w-56 px-4 py-3"><div className="truncate">{o.customer_name}</div><div className="truncate text-xs text-muted-foreground">{o.customer_email}</div></td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{formatPrice(o.total)}</td>
                    <td className="px-4 py-3"><Pill tone={statusTone(o.order_status)}>{o.order_status}</Pill></td>
                    <td className="px-4 py-3 whitespace-nowrap"><Pill tone={statusTone(o.payment_status)}>{o.payment_status}</Pill> <span className="text-xs uppercase text-muted-foreground">{o.payment_method}</span></td>
                    <td className="hidden px-4 py-3 text-xs whitespace-nowrap text-muted-foreground lg:table-cell">{formatDate(o.created_at)}</td>
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
