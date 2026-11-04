import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE_LIVE } from "./config";

// Razorpay keys come only from the environment. Outside production a live key is refused, so testing can't take real money.
// On the live site a test key is refused, so no order can be marked paid without real money. Customers then see COD only.
export function razorpayKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  if (!keyId || !secret) return null;
  if (process.env.NODE_ENV !== "production" && keyId.startsWith("rzp_live_")) return null;
  if (SITE_LIVE && keyId.startsWith("rzp_test_")) return null;
  return { keyId, secret };
}

export const liveKeyBlocked = () => process.env.NODE_ENV !== "production" && (process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_live_");

const hmacMatches = (body: string, secret: string, signature: string) => {
  const expected = Buffer.from(createHmac("sha256", secret).update(body).digest("hex"));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
};

export function checkoutSignatureValid(orderId: string, paymentId: string, signature: string) {
  const keys = razorpayKeys();
  return !!keys && hmacMatches(`${orderId}|${paymentId}`, keys.secret, signature);
}

export function webhookSignatureValid(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  return !!secret && hmacMatches(rawBody, secret, signature);
}

/** Creates the Razorpay order that fixes the amount the customer pays. */
export async function createRazorpayOrder(amountRupees: number, receipt: string) {
  const keys = razorpayKeys();
  if (!keys) throw new Error("Razorpay is not configured");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${keys.keyId}:${keys.secret}`).toString("base64")}` },
    body: JSON.stringify({ amount: Math.round(amountRupees * 100), currency: "INR", receipt, payment_capture: 1 }),
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await response.json()) as { id?: string; amount?: number; currency?: string };
  if (!response.ok || !data.id) throw new Error(`Razorpay order failed with status ${response.status}`);
  return { id: data.id, amount: data.amount!, currency: data.currency!, keyId: keys.keyId };
}
