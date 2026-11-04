"use server";

import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/auth/session";
import { setCheckoutAddress } from "@/lib/checkout";
import { rows, sql } from "@/lib/db";

export async function chooseAddress(addressId: number): Promise<{ message: string }> {
  const customer = await requireCustomer("/checkout/address");
  const [owned] = await rows<{ id: number }>(sql`SELECT id FROM customer_addresses WHERE id = ${addressId} AND customer_id = ${customer.id}`);
  if (!owned) return { message: "Please choose a delivery address." };
  await setCheckoutAddress(owned.id);
  redirect("/checkout/payment");
}
