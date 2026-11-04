"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { cancelOrder, OrderProblem, sendCancelAlert } from "@/lib/orders";
import { formatPrice } from "@/lib/routes";

const REASONS: Record<string, string> = {
  changed_mind: "Changed my mind",
  found_better_price: "Found a better price",
  ordered_by_mistake: "Ordered by mistake",
  delivery_time: "Delivery time too long",
  other: "Other",
};

export async function cancelMyOrder(number: string, reasonKey: string): Promise<{ ok: boolean; message: string }> {
  const customer = await requireCustomer(`/order/${encodeURIComponent(number)}`);
  try {
    const result = await cancelOrder(number, customer, REASONS[reasonKey] ?? "Customer requested cancellation");
    after(() => sendCancelAlert(number, customer.email, result.refund, result.amount).catch((err) => console.error("[cancel email]", err)));
    revalidatePath(`/order/${number}`);
    revalidatePath("/account");
    return {
      ok: true,
      message: result.refund ? `Order cancelled. Your refund of ${formatPrice(result.amount)} will be credited to your original payment method in 5–7 business days.` : "Order cancelled.",
    };
  } catch (err) {
    if (err instanceof OrderProblem) return { ok: false, message: err.message };
    console.error("[cancelMyOrder]", err);
    return { ok: false, message: "We couldn't cancel this order. Please try again." };
  }
}
