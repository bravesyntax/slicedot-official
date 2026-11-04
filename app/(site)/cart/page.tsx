import type { Metadata } from "next";
import Crumbs from "@/components/catalog/Crumbs";
import CartPageView from "@/components/cart/CartPageView";
import { container } from "@/components/site/ui";
import { getCartView } from "@/lib/cart";

export const metadata: Metadata = {
  title: "Shopping Bag",
  description: "Your shopping bag at SliceDot. Review items and proceed to checkout.",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  return (
    <div className={`${container} py-8 sm:py-12`}>
      <Crumbs items={[["Home", "/"], ["Shopping Bag"]]} />
      <h1 className="mt-4 mb-8 text-3xl font-semibold tracking-tight">Shopping Bag</h1>
      <CartPageView initial={await getCartView()} />
    </div>
  );
}
