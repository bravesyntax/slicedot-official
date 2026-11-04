// Checks the SMTP settings in .env.local. Usage: node --env-file=.env.local scripts/test-mail.mjs [--send]
// Without --send it only logs in to the mail server; with it, one test email goes to ADMIN_EMAIL.
import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL, SMTP_FROM_NAME, ADMIN_EMAIL } = process.env;
if (!SMTP_PASSWORD) {
  console.error("SMTP_PASSWORD is empty in .env.local");
  process.exit(1);
}
const port = Number(SMTP_PORT ?? 465);
const transporter = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USERNAME, pass: SMTP_PASSWORD }, connectionTimeout: 15_000 });

try {
  await transporter.verify();
  console.log(`Logged in to ${SMTP_HOST} as ${SMTP_USERNAME}`);
  if (process.argv.includes("--send")) {
    await transporter.sendMail({
      from: { name: SMTP_FROM_NAME ?? "SliceDot", address: SMTP_FROM_EMAIL ?? SMTP_USERNAME },
      to: ADMIN_EMAIL,
      subject: "SliceDot test email",
      text: "The SliceDot website can send email.",
    });
    console.log(`Test email sent to ${ADMIN_EMAIL}`);
  }
} catch (err) {
  console.error("Mail check failed:", err.message);
  process.exitCode = 1;
}
