"use server";

import { getCustomer } from "@/lib/auth/session";
import { addLine, getCartView, removeLine, setLineQuantity, type CartResult } from "@/lib/cart";
import { rows, sql } from "@/lib/db";

export async function addToCart(productId: number, quantity = 1, color?: string | null, size?: string | null): Promise<CartResult> {
  return addLine(productId, quantity, color, size);
}

export async function updateCartLine(lineId: number, quantity: number): Promise<CartResult> {
  return setLineQuantity(lineId, quantity);
}

export async function removeCartLine(lineId: number): Promise<CartResult> {
  return removeLine(lineId);
}

/** Saves the product to the wishlist and takes it out of the bag. Only for signed-in customers. */
export async function moveToWishlist(lineId: number): Promise<CartResult & { wishlisted?: number }> {
  const customer = await getCustomer();
  if (!customer) return { ok: false, message: "Please sign in to use your wishlist.", cart: await getCartView() };
  const [line] = await rows<{ product_id: number; variant_color: string | null; variant_size: string | null }>(sql`
    SELECT product_id, variant_color, variant_size FROM cart WHERE id = ${lineId} AND customer_id = ${customer.id}
  `);
  if (!line) return { ok: false, cart: await getCartView() };
  await sql`
    INSERT INTO wishlist (customer_id, product_id, variant_color, variant_size)
    VALUES (${customer.id}, ${line.product_id}, ${line.variant_color}, ${line.variant_size})
    ON CONFLICT (customer_id, product_id) DO NOTHING
  `;
  return { ...(await removeLine(lineId)), wishlisted: line.product_id };
}
