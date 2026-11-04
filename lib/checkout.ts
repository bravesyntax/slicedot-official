import "server-only";
import { cookies } from "next/headers";
import { rows, sql } from "@/lib/db";

// The delivery address chosen for the order in progress. The cookie only holds an id; ownership is checked on every read.
const ADDRESS_COOKIE = "sd_checkout_address";

export type CheckoutAddress = { id: number; name: string; phone: string; pincode: string; address: string; locality: string | null; city: string; state: string; address_type: string | null; is_default: number | null };

export const getAddresses = (customerId: number) =>
  rows<CheckoutAddress>(sql`
    SELECT id, name, phone, pincode, address, locality, city, state, address_type, is_default
    FROM customer_addresses WHERE customer_id = ${customerId} ORDER BY is_default DESC, created_at DESC, id DESC
  `);

export async function setCheckoutAddress(id: number) {
  (await cookies()).set(ADDRESS_COOKIE, String(id), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 24 * 60 * 60 });
}

export async function getCheckoutAddress(customerId: number) {
  const id = parseInt((await cookies()).get(ADDRESS_COOKIE)?.value ?? "", 10);
  if (!id) return null;
  const [address] = await rows<CheckoutAddress>(sql`
    SELECT id, name, phone, pincode, address, locality, city, state, address_type, is_default
    FROM customer_addresses WHERE id = ${id} AND customer_id = ${customerId}
  `);
  return address ?? null;
}

export const formatAddress = (a: Pick<CheckoutAddress, "address" | "locality" | "city" | "state" | "pincode">) =>
  `${[a.address, a.locality, a.city, a.state].filter(Boolean).join(", ")} - ${a.pincode}`;
