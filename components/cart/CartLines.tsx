"use client";

import { Heart, Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { moveToWishlist, removeCartLine, updateCartLine } from "@/app/(site)/cart/actions";
import { setCart, setCartOpen, setWishlist, useCustomer } from "@/components/account/customer-store";
import { Button } from "@/components/ui/button";
import type { CartView } from "@/lib/cart";
import { FREE_SHIPPING_FROM } from "@/lib/pricing";
import { formatPrice, productImage, productUrl } from "@/lib/routes";

export function ShippingNudge({ subtotal }: { subtotal: number }) {
  if (subtotal <= 0) return null;
  const free = subtotal >= FREE_SHIPPING_FROM;
  return (
    <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm" role="status">
      {free ? "You get FREE delivery on this order." : `Add ${formatPrice(FREE_SHIPPING_FROM - subtotal)} more for FREE delivery.`}
    </p>
  );
}

export function CartLines({ cart, compact = false }: { cart: CartView; compact?: boolean }) {
  const { customer, wishlist } = useCustomer();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");

  const run = (action: () => Promise<{ message?: string; cart: CartView; wishlisted?: number }>) =>
    start(async () => {
      const result = await action();
      setCart(result.cart);
      setMessage(result.message ?? "");
      if (result.wishlisted && !wishlist.includes(result.wishlisted)) setWishlist([...wishlist, result.wishlisted]);
    });

  return (
    <>
      {message && <p className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{message}</p>}
      <ul className="grid gap-3">
        {cart.lines.map((line) => (
          <li key={line.id} className="flex gap-3 rounded-2xl border bg-card p-3">
            <Link href={productUrl(line.slug)} onClick={() => setCartOpen(false)} className="relative size-20 shrink-0 overflow-hidden rounded-xl border bg-white sm:size-24">
              {line.image && <Image src={productImage(line.image)} alt={line.name} fill sizes="96px" className="object-contain p-1" />}
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={productUrl(line.slug)} onClick={() => setCartOpen(false)} className="line-clamp-2 text-sm font-medium hover:underline">{line.name}</Link>
              {(line.color || line.size) && <p className="mt-0.5 text-xs text-muted-foreground">{[line.color, line.size].filter(Boolean).join(" · ")}</p>}
              <p className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="font-semibold">{formatPrice(line.price)}</span>
                {line.compare_price > line.price && <span className="text-xs text-muted-foreground line-through">{formatPrice(line.compare_price)}</span>}
              </p>
              {line.issue && <p className="mt-1 text-xs font-medium text-destructive">{line.issue}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <div className="inline-flex items-center rounded-full border">
                  <Button variant="ghost" size="icon-sm" className="rounded-full" aria-label={`Decrease quantity of ${line.name}`} disabled={pending || line.quantity <= 1} onClick={() => run(() => updateCartLine(line.id, line.quantity - 1))}><Minus aria-hidden="true" /></Button>
                  <span className="w-7 text-center text-sm tabular-nums">{line.quantity}</span>
                  <Button variant="ghost" size="icon-sm" className="rounded-full" aria-label={`Increase quantity of ${line.name}`} disabled={pending || line.quantity >= line.stock} onClick={() => run(() => updateCartLine(line.id, line.quantity + 1))}><Plus aria-hidden="true" /></Button>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label={`Remove ${line.name}`} disabled={pending} onClick={() => run(() => removeCartLine(line.id))}><Trash2 aria-hidden="true" /></Button>
                {!compact && customer && <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => moveToWishlist(line.id))}><Heart aria-hidden="true" /> Move to Wishlist</Button>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function PriceDetails({ cart, extra }: { cart: CartView; extra?: { label: string; amount: number } }) {
  const row = "flex justify-between gap-4 text-sm";
  return (
    <dl className="grid gap-2">
      <div className={row}><dt className="text-muted-foreground">Total MRP</dt><dd>{formatPrice(cart.mrp)}</dd></div>
      {cart.discount > 0 && <div className={row}><dt className="text-muted-foreground">Discount</dt><dd className="text-success">-{formatPrice(cart.discount)}</dd></div>}
      <div className={row}><dt className="text-muted-foreground">Shipping</dt><dd>{cart.shipping === 0 ? <span className="text-success">FREE</span> : formatPrice(cart.shipping)}</dd></div>
      {extra && <div className={row}><dt className="text-muted-foreground">{extra.label}</dt><dd>{formatPrice(extra.amount)}</dd></div>}
      <div className="flex justify-between gap-4 border-t pt-3 font-semibold"><dt>Total Amount</dt><dd>{formatPrice(cart.total + (extra?.amount ?? 0))}</dd></div>
    </dl>
  );
}
