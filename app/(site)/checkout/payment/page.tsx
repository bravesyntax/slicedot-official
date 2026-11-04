import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import CheckoutSteps from "@/components/cart/CheckoutSteps";
import OrderSummary from "@/components/cart/OrderSummary";
import PaymentForm from "@/components/cart/PaymentForm";
import { container } from "@/components/site/ui";
import { requireCustomer } from "@/lib/auth/session";
import { getCartView } from "@/lib/cart";
import { formatAddress, getCheckoutAddress } from "@/lib/checkout";
import { liveKeyBlocked, razorpayKeys } from "@/lib/razorpay";

export const metadata: Metadata = { title: "Payment", robots: { index: false, follow: false } };

export default async function CheckoutPaymentPage() {
  const customer = await requireCustomer("/checkout/payment");
  const cart = await getCartView();
  if (!cart.canCheckout) redirect("/cart");
  const address = await getCheckoutAddress(customer.id);
  if (!address) redirect("/checkout/address");

  return (
    <div className={`${container} py-8 sm:py-12`}>
      <CheckoutSteps current={2} />
      <h1 className="sr-only">Payment</h1>
      {liveKeyBlocked() && (
        <p className="mx-auto mt-6 max-w-2xl rounded-xl border border-warning/40 bg-warning/10 p-3 text-center text-sm" role="status">
          Development: online payment is off because the Razorpay key in .env.local is a live key. Use a test key (rzp_test_).
        </p>
      )}
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="grid min-w-0 gap-6">
          <section className="rounded-2xl border bg-card p-5" aria-label="Delivering to">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Delivering to {address.name}</h2>
              <Link href="/checkout/address" className="text-sm underline underline-offset-4">Change</Link>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{formatAddress(address)}</p>
            <p className="text-sm text-muted-foreground">{address.phone}</p>
          </section>
          <PaymentForm total={cart.total} onlineAvailable={!!razorpayKeys()} />
        </div>
        <OrderSummary cart={cart} />
      </div>
    </div>
  );
}
