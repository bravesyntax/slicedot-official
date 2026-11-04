import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// SMTP mailer. Without SMTP_PASSWORD, mail is skipped and logged so forms still work.
let transporter: Transporter | null = null;

/** Where store alerts go, such as new contact form messages. */
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "info@slicedot.in";

export const mailConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USERNAME && process.env.SMTP_PASSWORD);

function getTransporter() {
  if (!mailConfigured()) return null;
  const port = Number(process.env.SMTP_PORT ?? 465);
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
    auth: { user: process.env.SMTP_USERNAME, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 15_000,
  });
  return transporter;
}

export const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Sends an HTML email. Returns false (and logs) instead of throwing. */
export async function sendMail({ to, subject, html, replyTo }: { to: string; subject: string; html: string; replyTo?: string }) {
  const t = getTransporter();
  if (!t) {
    console.warn(`[sendMail] SMTP not configured; skipped "${subject}"`);
    return false;
  }
  try {
    await t.sendMail({
      from: { name: process.env.SMTP_FROM_NAME ?? "SliceDot", address: process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USERNAME! },
      to,
      replyTo,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("[sendMail]", err);
    return false;
  }
}
