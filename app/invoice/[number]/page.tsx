import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PrintButton from "@/components/account/PrintButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Logo from "@/components/Logo";
import { requireCustomer } from "@/lib/auth/session";
import { feeOf, getCustomerOrder, invoiceReady } from "@/lib/orders";
import { formatPrice } from "@/lib/routes";
import { getInvoiceDetails, getStoreSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };

// A page outside the store layout, so it prints as a clean sheet. "Save as PDF" in the print dialog gives the file.
export default async function InvoicePage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const customer = await requireCustomer(`/invoice/${encodeURIComponent(number)}`);
  const found = await getCustomerOrder(number, customer);
  if (!found || !invoiceReady(found.order)) notFound();
  const { order, items } = found;
  const [store, invoice] = await Promise.all([getStoreSettings(), getInvoiceDetails()]);
  const fee = feeOf(order);
  const row = "flex justify-between gap-6 text-sm";

  return (
    <main className="mx-auto max-w-3xl p-5 sm:p-10 print:max-w-none print:p-0">
      <div className="mb-6 flex justify-end print:hidden"><PrintButton /></div>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
        <Logo className="h-12" />
        <div className="text-right">
          <h1 className="text-2xl font-semibold tracking-tight">INVOICE</h1>
          <p className="text-sm text-muted-foreground">INV-{order.order_number}</p>
          <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</p>
        </div>
      </header>

      <section className="grid gap-6 border-b py-6 sm:grid-cols-3 print:grid-cols-3">
        <div>
          <h2 className="mb-1 text-xs font-medium text-muted-foreground uppercase">From</h2>
          <p className="text-sm font-medium">{store.name}</p>
          {store.address && <p className="text-sm whitespace-pre-line">{store.address}</p>}
          <p className="text-sm">{store.email}</p>
          {store.phone && <p className="text-sm">{store.phone}</p>}
          {invoice.gstin && <p className="text-sm">GSTIN: {invoice.gstin}</p>}
        </div>
        <div>
          <h2 className="mb-1 text-xs font-medium text-muted-foreground uppercase">Bill To</h2>
          <p className="text-sm font-medium">{order.customer_name}</p>
          <p className="text-sm break-all">{order.customer_email}</p>
          {order.customer_phone && <p className="text-sm">{order.customer_phone}</p>}
        </div>
        <div>
          <h2 className="mb-1 text-xs font-medium text-muted-foreground uppercase">Ship To</h2>
          <p className="text-sm whitespace-pre-line">{order.shipping_address}</p>
        </div>
      </section>

      <p className="py-4 text-sm"><span className="text-muted-foreground">Order</span> {order.order_number} · <span className="text-muted-foreground">Payment</span> {order.payment_method === "cod" ? "Cash on Delivery" : "Online"}, <span className="capitalize">{order.payment_status}</span></p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="whitespace-normal">
                {item.product_name}
                {(item.variant_color || item.variant_size) && <span className="block text-xs text-muted-foreground">{[item.variant_color, item.variant_size].filter(Boolean).join(" · ")}</span>}
                {item.product_sku && <span className="block text-xs text-muted-foreground">SKU: {item.product_sku}</span>}
              </TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">{formatPrice(item.price)}</TableCell>
              <TableCell className="text-right">{formatPrice(item.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <dl className="mt-6 ml-auto grid max-w-xs gap-2">
        <div className={row}><dt className="text-muted-foreground">Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
        <div className={row}><dt className="text-muted-foreground">Shipping</dt><dd>{Number(order.shipping_cost) === 0 ? "FREE" : formatPrice(order.shipping_cost)}</dd></div>
        {fee > 0 && <div className={row}><dt className="text-muted-foreground">COD Charges</dt><dd>{formatPrice(fee)}</dd></div>}
        {Number(order.tax) > 0 && <div className={row}><dt className="text-muted-foreground">Tax</dt><dd>{formatPrice(order.tax)}</dd></div>}
        <div className="flex justify-between gap-6 border-t pt-3 font-semibold"><dt>Total Amount</dt><dd>{formatPrice(order.total)}</dd></div>
      </dl>

      <footer className="mt-10 border-t pt-4 text-center text-xs text-muted-foreground">
        <p>Thank you for shopping with {store.name}.</p>
        <p>This is a computer-generated invoice and does not require a signature.</p>
      </footer>
    </main>
  );
}
