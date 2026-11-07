import { CheckCircle2, FileText, Truck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CancelOrder from "@/components/account/CancelOrder";
import Crumbs from "@/components/catalog/Crumbs";
import { container } from "@/components/site/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireCustomer } from "@/lib/auth/session";
import { canCancel, feeOf, getCustomerOrder, invoiceReady } from "@/lib/orders";
import { formatPrice, productImage, productUrl } from "@/lib/routes";

export const metadata: Metadata = { title: "Order Details", robots: { index: false, follow: false } };

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ placed?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const { number } = await params;
  const { placed } = await searchParams;
  const customer = await requireCustomer(`/order/${encodeURIComponent(number)}`);
  const found = await getCustomerOrder(number, customer);
  if (!found) notFound();
  const { order, items } = found;
  const fee = feeOf(order);
  const cod = order.payment_method === "cod";
  const row = "flex justify-between gap-4 text-sm";

  return (
    <div className={`${container} py-8 sm:py-12`}>
      <Crumbs items={[["Home", "/"], ["My Orders", "/account?tab=orders"], [order.order_number]]} />

      {placed === "1" && order.order_status !== "cancelled" && (
        <div className="mt-6 rounded-3xl border bg-card p-6 text-center" role="status">
          <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden="true" />
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Thank you! Your order is placed.</h2>
          <p className="mt-1 text-sm text-muted-foreground">Delivery usually takes 3–7 business days. We&apos;ll email your tracking details once it ships.</p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Order {order.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Placed on {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={order.order_status === "cancelled" ? "destructive" : "secondary"} className="capitalize">{order.order_status}</Badge>
            <Badge variant="outline" className="capitalize">Payment {order.payment_status}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {invoiceReady(order) ? (
            <Button asChild variant="outline" className="rounded-full"><Link href={`/invoice/${order.order_number}`} target="_blank"><FileText aria-hidden="true" /> Invoice</Link></Button>
          ) : (
            cod && order.order_status !== "cancelled" && <p className="py-2 text-xs text-muted-foreground">Invoice available after shipping</p>
          )}
          {canCancel(order) && <CancelOrder number={order.order_number} />}
        </div>
      </div>

      {order.tracking_number && order.order_status !== "cancelled" && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
          <p className="flex items-center gap-3 text-sm">
            <Truck className="size-5 shrink-0" aria-hidden="true" />
            <span>
              <span className="block font-medium">{order.order_status === "delivered" ? "Delivered" : "On its way"}{order.courier_name ? ` with ${order.courier_name}` : ""}</span>
              <span className="block text-muted-foreground">Tracking number: <span className="font-mono">{order.tracking_number}</span></span>
            </span>
          </p>
          {order.tracking_url && <Button asChild variant="outline" className="rounded-full"><a href={order.tracking_url} target="_blank" rel="noopener noreferrer">Track package</a></Button>}
        </div>
      )}

      {order.order_status === "cancelled" && (
        <p className="mt-4 rounded-xl border bg-muted/40 p-3 text-sm">
          Cancelled{order.cancellation_reason ? `: ${order.cancellation_reason}` : ""}.
          {order.refund_status && ` Refund of ${formatPrice(order.refund_amount ?? 0)} is ${order.refund_status}.`}
        </p>
      )}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <ul className="grid min-w-0 gap-3" aria-label="Items in this order">
          {items.map((item) => {
            const content = (
              <>
                <span className="relative size-20 shrink-0 overflow-hidden rounded-xl border bg-white">
                  {item.image && <Image src={productImage(item.image)} alt="" fill sizes="80px" className="object-contain p-1" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-medium">{item.product_name}</span>
                  {(item.variant_color || item.variant_size) && <span className="block text-xs text-muted-foreground">{[item.variant_color, item.variant_size].filter(Boolean).join(" · ")}</span>}
                  <span className="mt-1 block text-sm text-muted-foreground">{item.quantity} × {formatPrice(item.price)}</span>
                </span>
                <span className="font-semibold">{formatPrice(item.total)}</span>
              </>
            );
            return (
              <li key={item.id}>
                {item.slug ? <Link href={productUrl(item.slug)} className="flex gap-3 rounded-2xl border bg-card p-3 transition-colors hover:border-primary">{content}</Link> : <div className="flex gap-3 rounded-2xl border bg-card p-3">{content}</div>}
              </li>
            );
          })}
        </ul>

        <aside className="grid gap-4 lg:sticky lg:top-24">
          <section className="rounded-2xl border bg-card p-5" aria-label="Price details">
            <h2 className="mb-3 font-semibold">Price Details</h2>
            <dl className="grid gap-2">
              <div className={row}><dt className="text-muted-foreground">Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
              <div className={row}><dt className="text-muted-foreground">Shipping</dt><dd>{Number(order.shipping_cost) === 0 ? <span className="text-success">FREE</span> : formatPrice(order.shipping_cost)}</dd></div>
              {fee > 0 && <div className={row}><dt className="text-muted-foreground">COD Charges</dt><dd>{formatPrice(fee)}</dd></div>}
              <div className="flex justify-between gap-4 border-t pt-3 font-semibold"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
            </dl>
            <p className="mt-3 text-sm text-muted-foreground">{cod ? "Cash on Delivery" : "Paid online"}</p>
          </section>
          <section className="rounded-2xl border bg-card p-5" aria-label="Delivery address">
            <h2 className="mb-2 font-semibold">Delivery Address</h2>
            <p className="text-sm whitespace-pre-line text-muted-foreground">{order.shipping_address}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
