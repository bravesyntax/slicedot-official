"use server";

import { revalidatePath } from "next/cache";
import { clearCustomerSession, getCustomer, requireCustomer } from "@/lib/auth/session";
import { rows, sql } from "@/lib/db";
import { INDIAN_STATES } from "@/lib/indian-states";
import { field } from "@/lib/validation";

export type FormState = { status: "idle" | "ok" | "error"; message?: string };

const ok = (message: string): FormState => {
  revalidatePath("/account");
  revalidatePath("/checkout/address");
  return { status: "ok", message };
};
const fail = (message: string): FormState => ({ status: "error", message });

export async function updateProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const customer = await requireCustomer("/account");
  const first = field(fd, "first_name");
  const last = field(fd, "last_name");
  const phone = field(fd, "phone").replace(/\D/g, "");
  const gender = field(fd, "gender");
  const dob = field(fd, "dob");

  if (first.length < 1 || first.length > 100 || last.length > 100) return fail("Please enter your name.");
  if (phone && !/^[6-9]\d{9}$/.test(phone)) return fail("Please enter a valid 10-digit mobile number.");
  if (gender && !["male", "female", "other"].includes(gender)) return fail("Please choose a valid gender.");
  if (dob && (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob)) || Date.parse(dob) > Date.now())) return fail("Please enter a valid date of birth.");

  try {
    await sql`UPDATE customers SET first_name = ${first}, last_name = ${last}, phone = ${phone || null}, gender = ${gender || null}, date_of_birth = ${dob || null}::date WHERE id = ${customer.id}`;
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return fail("This phone number is already registered with another account.");
    console.error("[updateProfile]", err);
    return fail("Something went wrong. Please try again.");
  }
  return ok("Profile updated.");
}

export async function saveAddress(_prev: FormState, fd: FormData): Promise<FormState> {
  const customer = await requireCustomer("/account?tab=addresses");
  const id = parseInt(field(fd, "id"), 10) || 0;
  const a = {
    name: field(fd, "name"),
    phone: field(fd, "phone").replace(/\D/g, ""),
    pincode: field(fd, "pincode"),
    address: field(fd, "address"),
    locality: field(fd, "locality"),
    city: field(fd, "city"),
    state: field(fd, "state"),
    type: field(fd, "address_type"),
  };
  if (a.name.length < 2 || a.name.length > 100) return fail("Please enter the recipient's name.");
  if (!/^[6-9]\d{9}$/.test(a.phone)) return fail("Please enter a valid 10-digit mobile number.");
  if (!/^[1-9]\d{5}$/.test(a.pincode)) return fail("Please enter a valid 6-digit pincode.");
  if (a.address.length < 5 || a.address.length > 500) return fail("Please enter the full street address.");
  if (a.locality.length > 100) return fail("Locality is too long.");
  if (a.city.length < 2 || a.city.length > 100) return fail("Please enter the city.");
  if (!INDIAN_STATES.includes(a.state)) return fail("Please choose a state.");
  const type = ["home", "work", "other"].includes(a.type) ? a.type : "home";
  const makeDefault = fd.get("is_default") === "on";

  const saved = await sql.begin(async (tx) => {
    const [{ n }] = await tx`SELECT count(*)::int AS n FROM customer_addresses WHERE customer_id = ${customer.id}`;
    const isDefault = makeDefault || n === 0;
    if (isDefault) await tx`UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ${customer.id}`;
    if (id) {
      // customer_id in the WHERE: an address id from someone else's account changes nothing.
      const updated = await tx`
        UPDATE customer_addresses SET name = ${a.name}, phone = ${a.phone}, pincode = ${a.pincode}, address = ${a.address}, locality = ${a.locality || null},
          city = ${a.city}, state = ${a.state}, address_type = ${type}, is_default = CASE WHEN ${isDefault}::boolean THEN 1 ELSE is_default END
        WHERE id = ${id} AND customer_id = ${customer.id} RETURNING id
      `;
      return updated.length > 0;
    }
    await tx`
      INSERT INTO customer_addresses (customer_id, name, phone, pincode, address, locality, city, state, address_type, is_default)
      VALUES (${customer.id}, ${a.name}, ${a.phone}, ${a.pincode}, ${a.address}, ${a.locality || null}, ${a.city}, ${a.state}, ${type}, ${isDefault ? 1 : 0})
    `;
    return true;
  });
  return saved ? ok("Address saved.") : fail("This address no longer exists.");
}

export async function deleteAddress(id: number) {
  const customer = await requireCustomer("/account?tab=addresses");
  await sql.begin(async (tx) => {
    const removed = await tx`DELETE FROM customer_addresses WHERE id = ${id} AND customer_id = ${customer.id} RETURNING is_default`;
    if (removed[0]?.is_default) {
      await tx`UPDATE customer_addresses SET is_default = 1 WHERE id = (SELECT id FROM customer_addresses WHERE customer_id = ${customer.id} ORDER BY created_at DESC LIMIT 1)`;
    }
  });
  revalidatePath("/account");
}

export async function setDefaultAddress(id: number) {
  const customer = await requireCustomer("/account?tab=addresses");
  await sql.begin(async (tx) => {
    const owned = await tx`SELECT id FROM customer_addresses WHERE id = ${id} AND customer_id = ${customer.id}`;
    if (!owned.length) return;
    await tx`UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ${customer.id}`;
    await tx`UPDATE customer_addresses SET is_default = 1 WHERE id = ${id}`;
  });
  revalidatePath("/account");
}

/** Adds or removes a product. Sign-in is checked here, not only in the browser. */
export async function toggleWishlist(productId: number, color?: string, size?: string): Promise<{ ok: boolean; saved?: boolean }> {
  const customer = await getCustomer();
  if (!customer || !Number.isInteger(productId)) return { ok: false };
  const removed = await sql`DELETE FROM wishlist WHERE customer_id = ${customer.id} AND product_id = ${productId} RETURNING id`;
  if (removed.length) return { ok: true, saved: false };

  const [product] = await rows<{ id: number }>(sql`SELECT id FROM products WHERE id = ${productId} AND status = 'active'`);
  if (!product) return { ok: false };
  await sql`
    INSERT INTO wishlist (customer_id, product_id, variant_color, variant_size)
    VALUES (${customer.id}, ${product.id}, ${String(color ?? "").slice(0, 100) || null}, ${String(size ?? "").slice(0, 50) || null})
    ON CONFLICT (customer_id, product_id) DO NOTHING
  `;
  return { ok: true, saved: true };
}

export async function deleteAccount(_prev: FormState, fd: FormData): Promise<FormState> {
  const customer = await requireCustomer("/account");
  if (field(fd, "confirm") !== "DELETE") return fail('Please type DELETE to confirm.');
  try {
    await sql.begin(async (tx) => {
      // Orders stay for the store's records, without the link to this account. Addresses, wishlist and cart go with the account.
      await tx`UPDATE orders SET customer_id = NULL, customer_email = 'deleted@example.com' WHERE customer_id = ${customer.id} OR lower(customer_email) = ${customer.email.toLowerCase()}`;
      await tx`UPDATE product_reviews SET customer_id = NULL, customer_name = 'Former customer', customer_email = 'deleted@example.com' WHERE customer_id = ${customer.id} OR lower(customer_email) = ${customer.email.toLowerCase()}`;
      await tx`DELETE FROM otp_codes WHERE email = ${customer.email.toLowerCase()}`;
      await tx`DELETE FROM customers WHERE id = ${customer.id}`;
    });
  } catch (err) {
    console.error("[deleteAccount]", err);
    return fail("Something went wrong. Please contact support.");
  }
  await clearCustomerSession();
  return { status: "ok" };
}
