"use server";

import { after } from "next/server";
import { fullName, requireCustomer } from "@/lib/auth/session";
import { getCheckoutAddress } from "@/lib/checkout";
import { attachRazorpayOrder, completeRazorpayPayment, createAwaitingOrder, dropAwaitingOrder, OrderProblem, placeCodOrder, sendOrderEmails } from "@/lib/orders";
import { checkoutSignatureValid, createRazorpayOrder, razorpayKeys } from "@/lib/razorpay";

export type PlaceResult = { ok: true; orderNumber: string } | { ok: false; message: string };
export type StartResult =
  | { ok: true; keyId: string; razorpayOrderId: string; amount: number; currency: string; prefill: { name: string; email: string; contact: string } }
  | { ok: false; message: string };

const problem = (err: unknown, fallback: string, where: string) => {
  if (err instanceof OrderProblem) return err.message;
  console.error(`[${where}]`, err);
  return fallback;
};

export async function placeCod(): Promise<PlaceResult> {
  const customer = await requireCustomer("/checkout/payment");
  const address = await getCheckoutAddress(customer.id);
  if (!address) return { ok: false, message: "Please choose a delivery address." };
  try {
    const order = await placeCodOrder(customer, address);
    after(() => sendOrderEmails(order.number).catch((err) => console.error("[order email]", err)));
    return { ok: true, orderNumber: order.number };
  } catch (err) {
    return { ok: false, message: problem(err, "We couldn't place your order. Please try again.", "placeCod") };
  }
}

export async function startOnlinePayment(): Promise<StartResult> {
  const customer = await requireCustomer("/checkout/payment");
  const address = await getCheckoutAddress(customer.id);
  if (!address) return { ok: false, message: "Please choose a delivery address." };
  if (!razorpayKeys()) return { ok: false, message: "Online payment isn't available right now. Please choose Cash on Delivery." };

  let orderId = 0;
  try {
    const order = await createAwaitingOrder(customer, address);
    orderId = order.id;
    const razorpay = await createRazorpayOrder(order.total, order.number);
    await attachRazorpayOrder(order.id, razorpay.id);
    return {
      ok: true,
      keyId: razorpay.keyId,
      razorpayOrderId: razorpay.id,
      amount: razorpay.amount,
      currency: razorpay.currency,
      prefill: { name: fullName(customer) || address.name, email: customer.email, contact: address.phone },
    };
  } catch (err) {
    // Razorpay never heard of this order, so it can't be paid; don't leave it behind.
    if (orderId) await dropAwaitingOrder(orderId).catch(() => {});
    return { ok: false, message: problem(err, "We couldn't start the payment. Please try again.", "startOnlinePayment") };
  }
}

export async function confirmOnlinePayment(razorpayOrderId: string, paymentId: string, signature: string): Promise<PlaceResult> {
  const customer = await requireCustomer("/checkout/payment");
  const help = `If money was deducted, contact support with Payment ID ${String(paymentId).slice(0, 40)}.`;
  if (![razorpayOrderId, paymentId, signature].every((v) => typeof v === "string" && v.length > 0 && v.length <= 255) || !checkoutSignatureValid(razorpayOrderId, paymentId, signature)) {
    return { ok: false, message: `We couldn't verify this payment. ${help}` };
  }
  try {
    const done = await completeRazorpayPayment(razorpayOrderId, paymentId, signature);
    if (!done || done.customerId !== customer.id) return { ok: false, message: `We couldn't match this payment to your order. ${help}` };
    if (done.firstTime) after(() => sendOrderEmails(done.number, done.stockShort ? "Stock ran short for this paid order." : undefined).catch((err) => console.error("[order email]", err)));
    return { ok: true, orderNumber: done.number };
  } catch (err) {
    console.error("[confirmOnlinePayment]", err);
    return { ok: false, message: `Something went wrong saving your order. ${help}` };
  }
}
