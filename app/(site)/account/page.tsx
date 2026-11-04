import { Heart, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AddressBook, DeleteAccountForm, ProfileForm, type AddressValues } from "@/components/account/AccountForms";
import AccountTabs from "@/components/account/AccountTabs";
import ProductCard from "@/components/home/ProductCard";
import { CtaLink, container } from "@/components/site/ui";
import { Badge } from "@/components/ui/badge";
import { fullName, requireCustomer } from "@/lib/auth/session";
import { getWishlistProducts } from "@/lib/catalog";
import { rows, sql } from "@/lib/db";
import { AWAITING_PAYMENT } from "@/lib/orders";
import { formatPrice } from "@/lib/routes";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
};

type Order = { id: number; order_number: string; created_at: Date; order_status: string; payment_status: string; payment_method: string; total: string };
type OrderItem = { order_id: number; product_name: string; quantity: number; variant_color: string | null; variant_size: string | null };

const EmptyState = ({ icon: Icon, title, text }: { icon: typeof Package; title: string; text: string }) => (
  <div className="rounded-2xl border border-dashed py-14 text-center">
    <Icon className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
    <h3 className="mt-3 font-medium">{title}</h3>
    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    <div className="mt-5"><CtaLink href="/products" variant="outline">Browse Products</CtaLink></div>
  </div>
);

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const customer = await requireCustomer(`/account${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`);

  const [addresses, orders, wishlist] = await Promise.all([
    rows<AddressValues>(sql`
      SELECT id, name, phone, pincode, address, locality, city, state, address_type, is_default
      FROM customer_addresses WHERE customer_id = ${customer.id} ORDER BY is_default DESC, created_at DESC
    `),
    rows<Order>(sql`
      SELECT id, order_number, created_at, order_status, payment_status, payment_method, total FROM orders
      WHERE (customer_id = ${customer.id} OR lower(customer_email) = ${customer.email.toLowerCase()}) AND order_status <> ${AWAITING_PAYMENT}
      ORDER BY created_at DESC LIMIT 50
    `),
    getWishlistProducts(customer.id),
  ]);
  const items = orders.length
    ? await rows<OrderItem>(sql`SELECT order_id, product_name, quantity, variant_color, variant_size FROM order_items WHERE order_id IN ${sql(orders.map((o) => o.id))}`)
    : [];

  return (
    <div className={`${container} py-8 sm:py-12`}>
      <p className="text-sm text-muted-foreground">My Account</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{fullName(customer) ? `Hello, ${customer.first_name}` : "Welcome"}</h1>
      <p className="mt-1 truncate text-sm text-muted-foreground">{customer.email}</p>

      <div className="mt-8">
        <AccountTabs
          initial={tab ?? "profile"}
          panels={{
            profile: (
              <div className="max-w-3xl">
                <ProfileForm customer={customer} />
                <DeleteAccountForm />
              </div>
            ),
            orders: orders.length ? (
              <ul className="grid gap-4">
                {orders.map((order) => (
                  <li key={order.id} className="rounded-2xl border bg-card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <Link href={`/order/${order.order_number}`} className="font-medium underline-offset-4 hover:underline">{order.order_number}</Link>
                        <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={order.order_status === "cancelled" ? "destructive" : "secondary"} className="capitalize">{order.order_status}</Badge>
                        <span className="font-semibold">{formatPrice(order.total)}</span>
                      </div>
                    </div>
                    <ul className="mt-3 grid gap-1 border-t pt-3 text-sm text-muted-foreground">
                      {items.filter((i) => i.order_id === order.id).map((item, i) => (
                        <li key={i}>{item.quantity} × {item.product_name}{[item.variant_color, item.variant_size].filter(Boolean).length > 0 && ` (${[item.variant_color, item.variant_size].filter(Boolean).join(", ")})`}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Package} title="No orders yet" text="Your orders will show up here." />
            ),
            addresses: <AddressBook addresses={addresses} />,
            wishlist: wishlist.length ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {wishlist.map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
            ) : (
              <EmptyState icon={Heart} title="Your wishlist is empty" text="Tap the heart on any product to save it." />
            ),
          }}
        />
      </div>
    </div>
  );
}
