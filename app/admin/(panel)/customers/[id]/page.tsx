import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/admin/client";
import { Pill, statusTone } from "@/components/admin/SeoShell";
import { AdminPage, BackLink, Card, CardHead, EmptyState, formatDate, secondaryBtn, Th } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { finish, intField } from "@/lib/admin/common";
import { rows, sql } from "@/lib/db";
import { AWAITING_PAYMENT } from "@/lib/orders";
import { formatPrice } from "@/lib/routes";

export const metadata = { title: "Customer" };

async function toggleBlock(fd: FormData) {
  "use server";
  await requireAdmin();
  const id = intField(fd, "id");
  await sql`UPDATE customers SET status = CASE WHEN status = 'active' THEN 'inactive' ELSE 'active' END WHERE id = ${id}`;
  await finish("success", "Customer updated. A blocked customer is signed out at once.", `/admin/customers/${id}`);
}

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!(id > 0)) notFound();
  const [[c], orders, addresses] = await Promise.all([
    rows<{ id: number; first_name: string; last_name: string; email: string; phone: string | null; gender: string | null; status: string; google_id: string | null; last_login: Date | null; created_at: Date }>(sql`
      SELECT id, first_name, last_name, email, phone, gender, status, google_id, last_login, created_at FROM customers WHERE id = ${id}
    `),
    rows<{ id: number; order_number: string; total: string; order_status: string; payment_status: string; created_at: Date }>(sql`
      SELECT id, order_number, total, order_status, payment_status, created_at FROM orders WHERE customer_id = ${id} AND order_status <> ${AWAITING_PAYMENT} ORDER BY created_at DESC
    `),
    rows<{ id: number; address: string | null; city: string | null; state: string | null; pincode: string | null; phone: string | null }>(sql`
      SELECT id, address, city, state, pincode, phone FROM customer_addresses WHERE customer_id = ${id} ORDER BY id DESC
    `),
  ]);
  if (!c) notFound();
  const active = c.status === "active";

  return (
    <AdminPage title={`${c.first_name} ${c.last_name}`.trim() || c.email}>
      <div className="mb-5"><BackLink href="/admin/customers">All customers</BackLink></div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHead title="Orders" description={`${orders.length} placed`} />
          {orders.length === 0 ? <EmptyState>No orders yet.</EmptyState> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr><Th>Order</Th><Th className="text-right">Total</Th><Th>Status</Th><Th>Payment</Th><Th hide="hidden md:table-cell">Date</Th></tr></thead>
                <tbody className="divide-y">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="px-4 py-3 whitespace-nowrap"><Link href={`/admin/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline">{o.order_number}</Link></td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">{formatPrice(o.total)}</td>
                      <td className="px-4 py-3"><Pill tone={statusTone(o.order_status)}>{o.order_status}</Pill></td>
                      <td className="px-4 py-3"><Pill tone={statusTone(o.payment_status)}>{o.payment_status}</Pill></td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">{formatDate(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <aside className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Details</h2><Pill tone={active ? "ok" : "error"}>{active ? "Active" : "Blocked"}</Pill></div>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-xs text-muted-foreground">Email</dt><dd className="break-all">{c.email}</dd></div>
              {c.phone && <div><dt className="text-xs text-muted-foreground">Phone</dt><dd>{c.phone}</dd></div>}
              <div><dt className="text-xs text-muted-foreground">Signs in with</dt><dd>{c.google_id ? "Google or email code" : "Email code"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Joined</dt><dd>{formatDate(c.created_at)}</dd></div>
              {c.last_login && <div><dt className="text-xs text-muted-foreground">Last sign-in</dt><dd>{formatDate(c.last_login)}</dd></div>}
            </dl>
            <form action={toggleBlock} className="mt-4">
              <input type="hidden" name="id" value={c.id} />
              <ConfirmButton message={active ? "Block this customer? They are signed out and can't sign in again." : "Let this customer sign in again?"} className={secondaryBtn}>{active ? "Block customer" : "Unblock customer"}</ConfirmButton>
            </form>
          </Card>
          {addresses.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold">Addresses</h2>
              <ul className="space-y-3 text-sm">
                {addresses.map((a) => <li key={a.id}>{[a.address, a.city, a.state, a.pincode].filter(Boolean).join(", ")}{a.phone && <div className="text-xs text-muted-foreground">{a.phone}</div>}</li>)}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </AdminPage>
  );
}
