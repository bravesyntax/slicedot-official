"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { setCartOpen, useCustomer } from "@/components/account/customer-store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CartLines, PriceDetails, ShippingNudge } from "./CartLines";

export default function CartDrawer() {
  const { cart, cartOpen } = useCustomer();
  const close = () => setCartOpen(false);
  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Your Bag{cart?.count ? ` (${cart.count})` : ""}</SheetTitle>
          <SheetDescription className="sr-only">Items in your shopping bag</SheetDescription>
        </SheetHeader>
        {cart && cart.lines.length > 0 ? (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-3"><ShippingNudge subtotal={cart.subtotal} /></div>
              <CartLines cart={cart} compact />
            </div>
            <div className="grid gap-3 border-t p-4">
              <PriceDetails cart={cart} />
              {!cart.canCheckout && <p className="text-xs text-destructive">Please fix the items marked above to continue.</p>}
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" className="h-11 rounded-full"><Link href="/cart" onClick={close}>View Bag</Link></Button>
                {cart.canCheckout ? (
                  <Button asChild className="h-11 rounded-full"><Link href="/checkout/address" onClick={close}>Checkout</Link></Button>
                ) : (
                  <Button disabled className="h-11 rounded-full">Checkout</Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <ShoppingBag className="size-10 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">Your bag is empty</p>
            <Button asChild variant="outline" className="rounded-full"><Link href="/products" onClick={close}>Continue Shopping</Link></Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
