import { AlertTriangle, ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { Pill, statusTone } from "@/components/admin/SeoShell";
import { AdminPage, Card, CardHead, EmptyState, formatDate, StatGrid, Th } from "@/components/admin/ui";
import { healthScore, loadSeoTargets } from "@/lib/admin/seo-audit";
import { rows, sql } from "@/lib/db";
import { AWAITING_PAYMENT } from "@/lib/orders";
import { formatPrice } from "@/lib/routes";

export const metadata = { title: "Dashboard" };

const LOW_STOCK = 5;

export default async function DashboardPage() {
  const [[stats], recent, low, { targets }] = await Promise.all([
    rows<{ revenue: string; orders: number; today: number; pending: number; products: number; customers: number; reviews: number; messages: number }>(sql`
      SELECT
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE order_status NOT IN ('cancelled', ${AWAITING_PAYMENT})) AS revenue,
        (SELECT COUNT(*)::int FROM orders WHERE order_status <> ${AWAITING_PAYMENT}) AS orders,
        (SELECT COUNT(*)::int FROM orders WHERE order_status <> ${AWAITING_PAYMENT} AND created_at >= date_trunc('day', LOCALTIMESTAMP)) AS today,
        (SELECT COUNT(*)::int FROM orders WHERE order_status = 'pending') AS pending,
        (SELECT COUNT(*)::int FROM products WHERE status = 'active') AS products,
        (SELECT COUNT(*)::int FROM customers) AS customers,
        (SELECT COUNT(*)::int FROM product_reviews WHERE status = 'pending') AS reviews,
        (SELECT COUNT(*)::int FROM contact_messages WHERE is_read = 0) AS messages
    `),
    rows<{ id: number; order_number: string; customer_name: string; total: string; order_status: string; payment_status: string; created_at: Date }>(sql`
      SELECT id, order_number, customer_name, total, order_status, payment_status, created_at FROM orders WHERE order_status <> ${AWAITING_PAYMENT} ORDER BY created_at DESC, id DESC LIMIT 8
    `),
    rows<{ id: number; name: string; quantity: number | null }>(sql`SELECT id, name, quantity FROM products WHERE status = 'active' AND COALESCE(quantity, 0) <= ${LOW_STOCK} ORDER BY quantity NULLS FIRST, name LIMIT 8`),
    loadSeoTargets(),
  ]);
  const score = healthScore(targets);
  const todo: [number, string, string][] = [
    [stats.pending, "orders waiting to be processed", "/admin/orders?status=pending"],
    [stats.reviews, "reviews waiting for approval", "/admin/reviews"],
    [stats.messages, "unread messages", "/admin/messages?filter=unread"],
  ];
  const waiting = todo.filter(([n]) => n > 0);

  return (
    <AdminPage title="Dashboard">
      <StatGrid
        stats={[
          [formatPrice(stats.revenue), "Sales, excluding cancelled"],
          [stats.orders, `Orders, ${stats.today} today`],
          [stats.products, "Active products"],
          [stats.customers, "Customers"],
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHead title="Recent orders"><Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">All orders <ArrowRight className="size-3.5" aria-hidden="true" /></Link></CardHead>
          {recent.length === 0 ? <EmptyState>No orders yet.</EmptyState> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr><Th>Order</Th><Th>Customer</Th><Th className="text-right">Total</Th><Th>Status</Th><Th hide="hidden md:table-cell">Date</Th></tr></thead>
                <tbody className="divide-y">
                  {recent.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 whitespace-nowrap"><Link href={`/admin/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline">{o.order_number}</Link></td>
                      <td className="max-w-48 truncate px-4 py-3">{o.customer_name}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">{formatPrice(o.total)}</td>
                      <td className="px-4 py-3"><Pill tone={statusTone(o.order_status)}>{o.order_status}</Pill></td>
                      <td className="hidden px-4 py-3 text-xs whitespace-nowrap text-muted-foreground md:table-cell">{formatDate(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">To do</h2>
            {waiting.length === 0 ? <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p> : (
              <ul className="space-y-2">
                {waiting.map(([n, label, href]) => <li key={href}><Link href={href} className="text-sm underline-offset-4 hover:underline"><strong>{n}</strong> {label}</Link></li>)}
              </ul>
            )}
          </Card>
          <Link href="/admin/seo" className="block rounded-xl border bg-card p-5 transition-colors hover:bg-muted/40">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Search className="size-4" aria-hidden="true" /> SEO health</h2>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{score}<span className="text-sm font-normal text-muted-foreground"> / 100</span></p>
            <p className="mt-1 text-xs text-muted-foreground">Across {targets.length} URLs. Open the SEO manager to see what to fix.</p>
          </Link>
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="size-4" aria-hidden="true" /> Low stock</h2>
            {low.length === 0 ? <p className="text-sm text-muted-foreground">Everything is well stocked.</p> : (
              <ul className="space-y-2">
                {low.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 text-sm"><Link href={`/admin/products/${p.id}`} className="min-w-0 truncate underline-offset-4 hover:underline">{p.name}</Link><span className="font-medium text-destructive">{p.quantity ?? 0}</span></li>)}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AdminPage>
  );
}
