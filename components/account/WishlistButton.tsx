"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleWishlist } from "@/app/(site)/account/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setWishlist, useCustomer } from "./customer-store";

/** Heart on product cards, or a labelled button on the product page. Visitors go to sign in first and come back. */
export default function WishlistButton({ productId, color, size, labelled = false, className }: { productId: number; color?: string; size?: string; labelled?: boolean; className?: string }) {
  const { loaded, customer, wishlist } = useCustomer();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, start] = useTransition();
  const saved = wishlist.includes(productId);

  const onClick = () => {
    if (!customer) {
      router.push(`/auth?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    start(async () => {
      const result = await toggleWishlist(productId, color, size);
      if (result.ok) {
        setWishlist(result.saved ? [...wishlist, productId] : wishlist.filter((id) => id !== productId));
        if (pathname === "/account") router.refresh();
      }
    });
  };

  const label = saved ? "Remove from wishlist" : "Add to wishlist";
  const heart = <Heart className={cn(labelled ? undefined : "size-4", saved && "fill-destructive text-destructive")} aria-hidden="true" />;

  if (labelled) {
    return (
      <Button type="button" variant="outline" disabled={!loaded || pending} aria-pressed={saved} onClick={onClick} className={cn("h-12 rounded-full px-6", className)}>
        {heart} {saved ? "In Wishlist" : "Wishlist"}
      </Button>
    );
  }
  return (
    <button type="button" disabled={!loaded || pending} aria-label={label} aria-pressed={saved} title={label} onClick={onClick} className={cn("grid size-8 place-items-center rounded-full border bg-background/90 text-foreground shadow-sm backdrop-blur transition-transform hover:scale-110", className)}>
      {heart}
    </button>
  );
}
