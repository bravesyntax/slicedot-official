import { NextResponse } from "next/server";
import { fullName, getCustomer, setCustomerSession } from "@/lib/auth/session";
import { getCartView } from "@/lib/cart";
import { rows, sql } from "@/lib/db";

// Who is signed in and what is in the bag, for the header, cart and wishlist buttons. Store pages are cached and shared
// by everyone, so this can't be part of them. Each call renews the session, so it only ends after a week without a visit.
export async function GET() {
  const [customer, cart] = await Promise.all([getCustomer(), getCartView()]);
  if (!customer) return NextResponse.json({ customer: null, wishlist: [], cart });
  await setCustomerSession(customer.id);
  const wishlist = await rows<{ product_id: number }>(sql`SELECT product_id FROM wishlist WHERE customer_id = ${customer.id}`);
  return NextResponse.json({
    customer: { name: fullName(customer), email: customer.email },
    wishlist: wishlist.map((w) => w.product_id),
    cart,
  });
}
