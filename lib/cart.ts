import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getCustomer } from "@/lib/auth/session";
import { productColors } from "@/lib/catalog";
import { rows, sql } from "@/lib/db";
import { shippingFor } from "@/lib/pricing";

// The cart lives in the database: under customer_id when signed in, otherwise under a random id in an httpOnly cookie
// (cart.session_id). Prices always come from `products` at read time, never from the browser.
const GUEST_COOKIE = "sd_cart";

export type CartLine = {
  id: number;
  product_id: number;
  name: string;
  slug: string;
  image: string | null;
  price: number;
  compare_price: number;
  quantity: number;
  stock: number;
  color: string | null;
  size: string | null;
  /** Why this line can't be bought as it stands. */
  issue: string | null;
};

export type CartView = { lines: CartLine[]; count: number; subtotal: number; mrp: number; discount: number; shipping: number; total: number; canCheckout: boolean };

type Owner = { customerId: number } | { guestId: string };

async function readOwner(): Promise<Owner | null> {
  const customer = await getCustomer();
  if (customer) return { customerId: customer.id };
  const guestId = (await cookies()).get(GUEST_COOKIE)?.value;
  return guestId && /^[\w-]{20,64}$/.test(guestId) ? { guestId } : null;
}

async function ensureOwner(): Promise<Owner> {
  const owner = await readOwner();
  if (owner) return owner;
  const guestId = randomBytes(24).toString("base64url");
  (await cookies()).set(GUEST_COOKIE, guestId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60 });
  return { guestId };
}

const ownedBy = (owner: Owner) => ("customerId" in owner ? sql`c.customer_id = ${owner.customerId}` : sql`c.session_id = ${owner.guestId}::text AND c.customer_id IS NULL`);

const EMPTY: CartView = { lines: [], count: 0, subtotal: 0, mrp: 0, discount: 0, shipping: 0, total: 0, canCheckout: false };

export async function getCartView(): Promise<CartView> {
  const owner = await readOwner();
  if (!owner) return EMPTY;
  const data = await rows<{ id: number; product_id: number; name: string; slug: string; image: string | null; price: string; compare_price: string | null; quantity: number; stock: number; status: string; variant_color: string | null; variant_size: string | null }>(sql`
    SELECT c.id, c.product_id, p.name, p.slug, p.image, p.price, p.compare_price, c.quantity, COALESCE(p.quantity, 0) AS stock, p.status, c.variant_color, c.variant_size
    FROM cart c JOIN products p ON p.id = c.product_id
    WHERE ${ownedBy(owner)}
    ORDER BY c.created_at DESC, c.id DESC
  `);
  const lines: CartLine[] = data.map((row) => {
    const price = Number(row.price);
    const issue = row.status !== "active" ? "No longer available" : row.stock <= 0 ? "Out of stock" : row.quantity > row.stock ? `Only ${row.stock} left` : null;
    return { id: row.id, product_id: row.product_id, name: row.name, slug: row.slug, image: row.image, price, compare_price: Math.max(Number(row.compare_price ?? 0), price), quantity: row.quantity, stock: row.stock, color: row.variant_color, size: row.variant_size, issue };
  });
  const subtotal = lines.reduce((n, l) => n + l.price * l.quantity, 0);
  const mrp = lines.reduce((n, l) => n + l.compare_price * l.quantity, 0);
  const shipping = shippingFor(subtotal);
  return { lines, count: lines.reduce((n, l) => n + l.quantity, 0), subtotal, mrp, discount: mrp - subtotal, shipping, total: subtotal + shipping, canCheckout: lines.length > 0 && lines.every((l) => !l.issue) };
}

export type CartResult = { ok: boolean; message?: string; cart: CartView };

const result = async (ok: boolean, message?: string): Promise<CartResult> => ({ ok, message, cart: await getCartView() });

export async function addLine(productId: number, quantity: number, color?: string | null, size?: string | null): Promise<CartResult> {
  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) return result(false, "Please choose a valid quantity.");
  const [product] = await rows<{ id: number; quantity: number; size: string | null; colors_json: string | null; color: string | null }>(sql`
    SELECT id, COALESCE(quantity, 0) AS quantity, size, colors_json, color FROM products WHERE id = ${productId} AND status = 'active'
  `);
  if (!product) return result(false, "This product is no longer available.");
  if (product.quantity <= 0) return result(false, "This product is out of stock.");

  // Only variants the product really has; a quick add from a product card takes the first of each.
  const colors = productColors(product).map((c) => c.name);
  const sizes = (product.size ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const pickedColor = colors.length ? (color && colors.includes(color) ? color : colors[0]) : null;
  const pickedSize = sizes.length ? (size && sizes.includes(size) ? size : sizes[0]) : null;

  const owner = await ensureOwner();
  const [existing] = await rows<{ id: number; quantity: number }>(sql`
    SELECT c.id, c.quantity FROM cart c
    WHERE ${ownedBy(owner)} AND c.product_id = ${product.id}
      AND c.variant_color IS NOT DISTINCT FROM ${pickedColor}::text AND c.variant_size IS NOT DISTINCT FROM ${pickedSize}::text
    LIMIT 1
  `);
  const wanted = (existing?.quantity ?? 0) + quantity;
  const capped = Math.min(wanted, product.quantity);
  if (existing) {
    await sql`UPDATE cart SET quantity = ${capped} WHERE id = ${existing.id}`;
  } else {
    await sql`
      INSERT INTO cart (product_id, quantity, variant_color, variant_size, customer_id, session_id)
      VALUES (${product.id}, ${capped}, ${pickedColor}, ${pickedSize}, ${"customerId" in owner ? owner.customerId : null}, ${"guestId" in owner ? owner.guestId : null})
    `;
  }
  return result(true, capped < wanted ? `Only ${product.quantity} available, so your bag has ${capped}.` : undefined);
}

export async function setLineQuantity(lineId: number, quantity: number): Promise<CartResult> {
  const owner = await readOwner();
  if (!owner || !Number.isInteger(lineId) || !Number.isInteger(quantity)) return result(false);
  if (quantity <= 0) return removeLine(lineId);
  const [line] = await rows<{ id: number; stock: number }>(sql`
    SELECT c.id, COALESCE(p.quantity, 0) AS stock FROM cart c JOIN products p ON p.id = c.product_id WHERE c.id = ${lineId} AND ${ownedBy(owner)}
  `);
  if (!line) return result(false);
  if (quantity > line.stock) {
    await sql`UPDATE cart SET quantity = ${Math.max(line.stock, 1)} WHERE id = ${line.id}`;
    return result(false, `Only ${line.stock} available.`);
  }
  await sql`UPDATE cart SET quantity = ${quantity} WHERE id = ${line.id}`;
  return result(true);
}

export async function removeLine(lineId: number): Promise<CartResult> {
  const owner = await readOwner();
  if (owner && Number.isInteger(lineId)) await sql`DELETE FROM cart c WHERE c.id = ${lineId} AND ${ownedBy(owner)}`;
  return result(true);
}

/** Moves a guest's bag into the account at sign-in, combining lines for the same product and variant. */
export async function mergeGuestCart(customerId: number) {
  const store = await cookies();
  const guestId = store.get(GUEST_COOKIE)?.value;
  if (!guestId) return;
  await sql.begin(async (tx) => {
    const guestLines = await tx`SELECT id, product_id, quantity, variant_color, variant_size FROM cart WHERE session_id = ${guestId}::text AND customer_id IS NULL`;
    for (const line of guestLines) {
      const [existing] = await tx`
        SELECT c.id, c.quantity, COALESCE(p.quantity, 0) AS stock FROM cart c JOIN products p ON p.id = c.product_id
        WHERE c.customer_id = ${customerId} AND c.product_id = ${line.product_id}
          AND c.variant_color IS NOT DISTINCT FROM ${line.variant_color}::text AND c.variant_size IS NOT DISTINCT FROM ${line.variant_size}::text
        LIMIT 1
      `;
      if (existing) {
        await tx`UPDATE cart SET quantity = ${Math.max(Math.min(existing.quantity + line.quantity, existing.stock), 1)} WHERE id = ${existing.id}`;
        await tx`DELETE FROM cart WHERE id = ${line.id}`;
      } else {
        await tx`UPDATE cart SET customer_id = ${customerId}, session_id = NULL WHERE id = ${line.id}`;
      }
    }
  });
  store.delete(GUEST_COOKIE);
}
