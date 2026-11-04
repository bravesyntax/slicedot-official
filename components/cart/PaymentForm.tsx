"use client";

import { AlertTriangle, Banknote, CreditCard } from "lucide-react";
import { useState, useTransition } from "react";
import { confirmOnlinePayment, placeCod, startOnlinePayment } from "@/app/(site)/checkout/payment/actions";
import { Button } from "@/components/ui/button";
import { DotsLoader } from "@/components/velora/loaders";
import { COD_FEE } from "@/lib/pricing";
import { formatPrice } from "@/lib/routes";
import { cn } from "@/lib/utils";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
};
type RazorpayCheckout = { open: () => void; on: (event: string, listener: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}

const loadCheckout = () =>
  new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("checkout script failed"));
    document.body.appendChild(script);
  });

export default function PaymentForm({ total, onlineAvailable }: { total: number; onlineAvailable: boolean }) {
  const [method, setMethod] = useState<"online" | "cod">(onlineAvailable ? "online" : "cod");
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [pending, start] = useTransition();
  const busy = pending || paying;
  const amount = method === "cod" ? total + COD_FEE : total;

  // A full page load, so the header's bag count starts fresh.
  const showOrder = (orderNumber: string) => {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/order/${orderNumber}?placed=1`;
  };

  const payOnline = () =>
    start(async () => {
      setError("");
      const started = await startOnlinePayment();
      if (!started.ok) return setError(started.message);
      try {
        await loadCheckout();
      } catch {
        return setError("The payment window couldn't load. Please check your connection and try again.");
      }
      setPaying(true);
      const checkout = new window.Razorpay!({
        key: started.keyId,
        amount: started.amount,
        currency: started.currency,
        name: "SliceDot",
        description: "Order payment",
        order_id: started.razorpayOrderId,
        prefill: started.prefill,
        theme: { color: "#171717" },
        modal: { ondismiss: () => setPaying(false) },
        handler: async (response) => {
          const result = await confirmOnlinePayment(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature);
          if (result.ok) return showOrder(result.orderNumber);
          setPaying(false);
          setError(result.message);
        },
      });
      checkout.on("payment.failed", (r) => setError(r.error?.description ?? "The payment failed. No money was taken; please try again."));
      checkout.open();
    });

  const payCod = () =>
    start(async () => {
      setError("");
      const result = await placeCod();
      if (result.ok) showOrder(result.orderNumber);
      else setError(result.message);
    });

  const option = (value: "online" | "cod", title: string, text: string, Icon: typeof Banknote, disabled = false) => (
    <label className={cn("flex gap-3 rounded-2xl border bg-card p-4 transition-colors", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer", method === value && "border-primary ring-1 ring-primary")}>
      <input type="radio" name="payment" checked={method === value} disabled={disabled || busy} onChange={() => setMethod(value)} className="mt-1 accent-(--primary)" />
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{text}</span>
      </span>
    </label>
  );

  return (
    <section aria-label="Payment method">
      <h2 className="mb-3 font-semibold">Choose Payment Mode</h2>
      <fieldset className="grid gap-3">
        <legend className="sr-only">Payment method</legend>
        {option("online", "Pay Online", onlineAvailable ? "UPI, cards, net banking and wallets, secured by Razorpay." : "Not available right now.", CreditCard, !onlineAvailable)}
        {option("cod", "Cash on Delivery", `Pay when it arrives. ${formatPrice(COD_FEE)} extra fee applies.`, Banknote)}
      </fieldset>
      {error && <p className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {error}</p>}
      {method === "cod" && <p className="mt-4 text-sm text-muted-foreground">{formatPrice(COD_FEE)} COD charge included in the amount below.</p>}
      <Button disabled={busy} onClick={method === "cod" ? payCod : payOnline} className="mt-4 h-12 w-full rounded-full sm:w-72">
        {busy ? <DotsLoader size="sm" label="Processing" /> : method === "cod" ? `Place Order, ${formatPrice(amount)}` : `Pay ${formatPrice(amount)}`}
      </Button>
    </section>
  );
}
