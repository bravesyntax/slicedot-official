import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AddressPicker from "@/components/cart/AddressPicker";
import CheckoutSteps from "@/components/cart/CheckoutSteps";
import OrderSummary from "@/components/cart/OrderSummary";
import { container } from "@/components/site/ui";
import { requireCustomer } from "@/lib/auth/session";
import { getCartView } from "@/lib/cart";
import { getAddresses } from "@/lib/checkout";

export const metadata: Metadata = { title: "Select Address", robots: { index: false, follow: false } };

export default async function CheckoutAddressPage() {
  const customer = await requireCustomer("/checkout/address");
  const cart = await getCartView();
  if (!cart.canCheckout) redirect("/cart");
  const addresses = await getAddresses(customer.id);

  return (
    <div className={`${container} py-8 sm:py-12`}>
      <CheckoutSteps current={1} />
      <h1 className="sr-only">Select Delivery Address</h1>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0"><AddressPicker addresses={addresses} /></div>
        <OrderSummary cart={cart} />
      </div>
    </div>
  );
}
