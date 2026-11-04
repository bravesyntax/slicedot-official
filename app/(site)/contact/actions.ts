"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { sql } from "@/lib/db";
import { ADMIN_EMAIL, escapeHtml, sendMail } from "@/lib/mailer";
import { getStoreSettings } from "@/lib/settings";
import { looksLikeSpam } from "@/lib/spam";
import { field, getClientIp, isValidEmail, sanitizeEmail, sanitizePhone } from "@/lib/validation";

export type ContactState = {
  status: "idle" | "ok" | "error";
  message?: string;
  errors: string[];
  values: Record<string, string>;
};

const SUBJECTS = ["General Inquiry", "Order Support", "Product Question", "Returns & Refunds", "Feedback", "Other"];
const RATE_MAX = 3;
const MESSAGE_MAX = 2000;
const THANKS = "Thank you for your message! We'll get back to you soon.";
// Bots get the same success message, so they don't learn they were filtered.
const BOT_SUCCESS: ContactState = { status: "ok", message: THANKS, errors: [], values: {} };

export async function submitContact(_prev: ContactState, fd: FormData): Promise<ContactState> {
  const values = {
    name: field(fd, "name"),
    email: field(fd, "email"),
    phone: field(fd, "phone"),
    subject: field(fd, "subject"),
    message: field(fd, "message"),
  };
  const fail = (errors: string[]): ContactState => ({ status: "error", errors, values });

  // Honeypot: a hidden field humans never fill in.
  if (field(fd, "website_url")) return BOT_SUCCESS;

  // Time trap: under 3 seconds is a bot; over an hour is a stale or replayed form.
  const age = Date.now() - Number(field(fd, "form_ts"));
  if (!Number.isFinite(age) || age < 3_000 || age > 3_600_000) return BOT_SUCCESS;

  if (looksLikeSpam(values.name, values.message)) return BOT_SUCCESS;

  const errors: string[] = [];
  if (values.name.length < 2) errors.push("Full name is required (at least 2 characters).");
  else if (values.name.length > 100) errors.push("Full name is too long.");
  if (!isValidEmail(values.email) || values.email.length > 150) errors.push("A valid email address is required.");
  if (values.message.length < 10) errors.push("Message is required (at least 10 characters).");
  else if (values.message.length > MESSAGE_MAX) errors.push(`Message is too long (max ${MESSAGE_MAX} characters).`);

  const ip = await getClientIp();
  // Rate limit: 3 messages per IP per 10 minutes, counted from saved messages.
  if (ip) {
    const [{ n }] = (await sql`
      SELECT COUNT(*)::int AS n FROM contact_messages
      WHERE ip_address = ${ip} AND created_at > LOCALTIMESTAMP - INTERVAL '10 minutes'
    `) as unknown as { n: number }[];
    if (n >= RATE_MAX) errors.push("You have sent too many messages recently. Please wait 10 minutes before trying again.");
  }
  if (errors.length) return fail(errors);

  const email = sanitizeEmail(values.email);
  const phone = sanitizePhone(values.phone).slice(0, 30);
  const subject = SUBJECTS.includes(values.subject) ? values.subject : "General Inquiry";
  const userAgent = ((await headers()).get("user-agent") ?? "").slice(0, 500);
  const store = await getStoreSettings();

  try {
    await sql`
      INSERT INTO contact_messages (name, email, phone, subject, message, ip_address, user_agent)
      VALUES (${values.name}, ${email}, ${phone}, ${subject}, ${values.message}, ${ip}, ${userAgent})
    `;
  } catch (err) {
    console.error("[submitContact]", err);
    return fail([`Something went wrong saving your message. Please email us directly at ${store.email}`]);
  }

  // Sent after the response, so the visitor isn't kept waiting on SMTP. The message is already saved if this fails.
  after(() =>
    sendMail({
      to: ADMIN_EMAIL,
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      html: `<p><strong>Name:</strong> ${escapeHtml(values.name)}<br><strong>Email:</strong> ${escapeHtml(email)}<br><strong>Phone:</strong> ${escapeHtml(phone)}</p><p style="white-space:pre-line">${escapeHtml(values.message)}</p>`,
    }),
  );

  return { status: "ok", message: THANKS, errors: [], values: {} };
}
