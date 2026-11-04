"use client";

import { ShoppingBag } from "lucide-react";
import { useCustomer } from "@/components/account/customer-store";
import { CtaLink } from "@/components/site/ui";
import { Button } from "@/components/ui/button";
import type { CartView } from "@/lib/cart";
import Link from "next/link";
import { CartLines, PriceDetails, ShippingNudge } from "./CartLines";

export default function CartPageView({ initial }: { initial: CartView }) {
  const { cart: live } = useCustomer();
  const cart = live ?? initial;

  if (cart.lines.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed py-16 text-center">
        <ShoppingBag className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-medium">Hey, it feels so light!</h2>
        <p className="mt-1 text-sm text-muted-foreground">There is nothing in your bag. Let&apos;s add some items.</p>
        <div className="mt-5"><CtaLink href="/products">Continue Shopping</CtaLink></div>
      </div>
    );
  }
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0">
        <div className="mb-4"><ShippingNudge subtotal={cart.subtotal} /></div>
        <CartLines cart={cart} />
      </div>
      <aside className="rounded-2xl border bg-card p-5 lg:sticky lg:top-24" aria-label="Price details">
        <h2 className="mb-4 font-semibold">Price Details ({cart.count} {cart.count === 1 ? "Item" : "Items"})</h2>
        <PriceDetails cart={cart} />
        {cart.canCheckout ? (
          <Button asChild className="mt-5 h-12 w-full rounded-full"><Link href="/checkout/address">Place Order</Link></Button>
        ) : (
          <>
            <Button disabled className="mt-5 h-12 w-full rounded-full">Place Order</Button>
            <p className="mt-2 text-xs text-destructive">Please fix the items marked in your bag to continue.</p>
          </>
        )}
      </aside>
    </div>
  );
}
