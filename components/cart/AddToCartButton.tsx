"use client";

import { Plus, ShoppingBag } from "lucide-react";
import { useState, useTransition } from "react";
import { addToCart } from "@/app/(site)/cart/actions";
import { setCart, setCartOpen } from "@/components/account/customer-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The full button on the product page, or a small + on product cards (first color and size). */
export default function AddToCartButton({ productId, inStock, quantity = 1, color, size, compact = false, className }: { productId: number; inStock: boolean; quantity?: number; color?: string; size?: string; compact?: boolean; className?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const add = () =>
    start(async () => {
      const result = await addToCart(productId, quantity, color, size);
      setCart(result.cart);
      // A successful add can still carry a note, such as the quantity being capped at stock.
      setError(result.message ?? (result.ok ? "" : "Could not add this to your bag."));
      if (result.ok) setCartOpen(true);
    });

  if (compact) {
    if (!inStock) return null;
    return (
      <button type="button" disabled={pending} aria-label="Add to bag" title="Add to bag" onClick={add} className={cn("grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-110 disabled:opacity-60", className)}>
        <Plus className="size-4" aria-hidden="true" />
      </button>
    );
  }
  return (
    <div className="flex-1">
      <Button type="button" disabled={!inStock || pending} onClick={add} className={cn("h-12 w-full rounded-full", className)}>
        <ShoppingBag aria-hidden="true" /> {inStock ? (pending ? "Adding..." : "Add to Bag") : "Out of Stock"}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
