import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SubmitButton } from "@/components/admin/client";
import { Pill, statusTone } from "@/components/admin/SeoShell";
import { AdminPage, BackLink, Card, CardHead, formatDate, inputCls, labelCls, secondaryBtn, smallPrimaryBtn } from "@/components/admin/ui";
import { rows, sql } from "@/lib/db";
import { AWAITING_PAYMENT, feeOf } from "@/lib/orders";
import { formatPrice } from "@/lib/routes";
import { addOrderNote, updateOrder, updateRefund } from "../actions";

export const metadata = { title: "Order" };

type Order = {
  id: number; order_number: string; customer_id: number | null; customer_name: string; customer_email: string; customer_phone: string | null; shipping_address: string; billing_address: string;
  payment_method: string | null; payment_status: string; order_status: string; subtotal: string; tax: string; shipping_cost: string; total: string; notes: string | null; razorpay_payment_id: string | null;
  cancellation_reason: string | null; cancelled_at: Date | null; refund_status: string | null; refund_amount: string | null; refund_notes: string | null; refund_id: string | null; created_at: Date;
};

const Row = ({ label, children, strong }: { label: string; children: ReactNode; strong?: boolean }) => (
  <div className={`flex justify-between gap-4 py-1 text-sm ${strong ? "font-semibold" : ""}`}><span className={strong ? "" : "text-muted-foreground"}>{label}</span><span>{children}</span></div>
);

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!(id > 0)) notFound();
  const [[order], items, logs] = await Promise.all([
    rows<Order>(sql`
      SELECT id, order_number, customer_id, customer_name, customer_email, customer_phone, shipping_address, billing_address, payment_method, payment_status, order_status, subtotal, tax, shipping_cost, total, notes,
        razorpay_payment_id, cancellation_reason, cancelled_at, refund_status, refund_amount, refund_notes, refund_id, created_at
      FROM orders WHERE id = ${id} AND order_status <> ${AWAITING_PAYMENT}
    `),
    rows<{ id: number; product_id: number | null; product_name: string; product_sku: string | null; variant_color: string | null; variant_size: string | null; quantity: number; price: string; total: string }>(sql`
      SELECT id, product_id, product_name, product_sku, variant_color, variant_size, quantity, price, total FROM order_items WHERE order_id = ${id} ORDER BY id
    `),
    rows<{ id: number; action: string; description: string; created_by: string | null; created_at: Date }>(sql`SELECT id, action, description, created_by, created_at FROM order_logs WHERE order_id = ${id} ORDER BY created_at DESC, id DESC`),
  ]);
  if (!order) notFound();
  const fee = feeOf(order);
  const cancelled = order.order_status === "cancelled";
  const online = order.payment_method !== "cod";

  return (
    <AdminPage title={`Order ${order.order_number}`}>
      <div className="mb-5"><BackLink href="/admin/orders">All orders</BackLink></div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHead title="Items" description={formatDate(order.created_at)}>
              <div className="flex gap-1.5"><Pill tone={statusTone(order.order_status)}>{order.order_status}</Pill><Pill tone={statusTone(order.payment_status)}>{order.payment_status}</Pill></div>
            </CardHead>
            <ul className="divide-y">
              {items.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    {i.product_id ? <Link href={`/admin/products/${i.product_id}`} className="font-medium underline-offset-4 hover:underline">{i.product_name}</Link> : <span className="font-medium">{i.product_name}</span>}
                    <div className="text-xs text-muted-foreground">{[i.product_sku, i.variant_color, i.variant_size].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div className="text-right whitespace-nowrap"><div>{formatPrice(i.total)}</div><div className="text-xs text-muted-foreground">{i.quantity} × {formatPrice(i.price)}</div></div>
                </li>
              ))}
            </ul>
            <div className="border-t px-5 py-3">
              <Row label="Subtotal">{formatPrice(order.subtotal)}</Row>
              <Row label="Shipping">{formatPrice(order.shipping_cost)}</Row>
              {Number(order.tax) > 0 && <Row label="Tax">{formatPrice(order.tax)}</Row>}
              {fee > 0 && <Row label="COD fee">{formatPrice(fee)}</Row>}
              <Row label="Total" strong>{formatPrice(order.total)}</Row>
            </div>
          </Card>

          <Card>
            <CardHead title="Activity" />
            <div className="px-5 py-4">
              <form action={addOrderNote} className="flex gap-2">
                <input type="hidden" name="id" value={order.id} />
                <input name="note" required maxLength={1000} placeholder="Add a private note" aria-label="Private note" className={inputCls} />
                <SubmitButton className={secondaryBtn}>Add</SubmitButton>
              </form>
              {logs.length > 0 && (
                <ul className="mt-4 space-y-3">
                  {logs.map((l) => (
                    <li key={l.id} className="text-sm">{l.description}<div className="text-xs text-muted-foreground">{formatDate(l.created_at)}{l.created_by ? ` · ${l.created_by}` : ""}</div></li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold">Update order</h2>
            <form action={updateOrder} className="space-y-4">
              <input type="hidden" name="id" value={order.id} />
              <div>
                <label htmlFor="order_status" className={labelCls}>Order status</label>
                <select id="order_status" name="order_status" defaultValue={order.order_status} disabled={cancelled} className={inputCls}>
                  {["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {cancelled && <input type="hidden" name="order_status" value="cancelled" />}
              </div>
              <div>
                <label htmlFor="payment_status" className={labelCls}>Payment status</label>
                <select id="payment_status" name="payment_status" defaultValue={order.payment_status} className={inputCls}>
                  {["pending", "paid", "failed", "refunded"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {!cancelled && (
                <div>
                  <label htmlFor="cancellation_reason" className={labelCls}>Reason, if cancelling</label>
                  <input id="cancellation_reason" name="cancellation_reason" maxLength={255} className={inputCls} />
                  <p className="mt-1 text-[11px] text-muted-foreground">Cancelling puts the items back in stock and can&apos;t be undone.</p>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" value="1" defaultChecked className="accent-primary" /> Email the customer about a status change</label>
              <SubmitButton className={`${smallPrimaryBtn} w-full`}>Save</SubmitButton>
            </form>
            {order.cancellation_reason && <p className="mt-4 rounded-lg bg-muted p-3 text-xs">Cancelled: {order.cancellation_reason}</p>}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Customer</h2>
            <p className="text-sm font-medium">{order.customer_id ? <Link href={`/admin/customers/${order.customer_id}`} className="underline-offset-4 hover:underline">{order.customer_name}</Link> : order.customer_name}</p>
            <p className="text-sm break-all text-muted-foreground">{order.customer_email}</p>
            {order.customer_phone && <p className="text-sm text-muted-foreground">{order.customer_phone}</p>}
            <h3 className="mt-4 mb-1 text-xs font-medium text-muted-foreground">Ship to</h3>
            <p className="text-sm whitespace-pre-line">{order.shipping_address}</p>
            {order.notes && <><h3 className="mt-4 mb-1 text-xs font-medium text-muted-foreground">Customer note</h3><p className="text-sm whitespace-pre-line">{order.notes}</p></>}
          </Card>

          {online && (
            <Card className="p-5">
              <h2 className="mb-1 text-sm font-semibold">Refund</h2>
              <p className="mb-4 text-xs text-muted-foreground">Make the refund in the Razorpay dashboard, then record it here. Saving this moves no money.</p>
              {order.razorpay_payment_id && <p className="mb-3 text-xs break-all text-muted-foreground">Payment: {order.razorpay_payment_id}</p>}
              <form action={updateRefund} className="space-y-3">
                <input type="hidden" name="id" value={order.id} />
                <div><label htmlFor="refund_status" className={labelCls}>Status</label><select id="refund_status" name="refund_status" defaultValue={order.refund_status ?? ""} className={inputCls}><option value="">None</option><option value="processing">Processing</option><option value="completed">Completed</option><option value="failed">Failed</option></select></div>
                <div><label htmlFor="refund_amount" className={labelCls}>Amount (₹)</label><input id="refund_amount" name="refund_amount" type="number" step="0.01" min="0" max={order.total} defaultValue={order.refund_amount ?? 0} className={inputCls} /></div>
                <div><label htmlFor="refund_id" className={labelCls}>Razorpay refund ID</label><input id="refund_id" name="refund_id" maxLength={50} defaultValue={order.refund_id ?? ""} className={inputCls} /></div>
                <div><label htmlFor="refund_notes" className={labelCls}>Notes</label><textarea id="refund_notes" name="refund_notes" rows={2} defaultValue={order.refund_notes ?? ""} className={inputCls} /></div>
                <SubmitButton className={secondaryBtn}>Save refund</SubmitButton>
              </form>
            </Card>
          )}
        </aside>
      </div>
    </AdminPage>
  );
}
