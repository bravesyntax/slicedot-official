import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/auth";
import { OTP_COOKIE, verifyOtpTicket } from "@/lib/admin/session";
import { SITE_NAME } from "@/lib/config";
import { rows, sql } from "@/lib/db";
import Logo from "@/components/Logo";
import { AuroraBackground } from "@/components/velora/aurora-background";
import { LoginForm, OtpForm } from "./LoginForm";

export const metadata: Metadata = {
  title: { absolute: `Admin Sign-in | ${SITE_NAME}` },
  robots: { index: false, follow: false },
};

/** s•••••t@example.com */
function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return "your email";
  return `${user.charAt(0)}${"•".repeat(Math.max(2, user.length - 2))}${user.length > 1 ? user.at(-1) : ""}@${domain}`;
}

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");

  // Password already checked? Then show the code step.
  const ticket = await verifyOtpTicket((await cookies()).get(OTP_COOKIE)?.value);
  const [pending] = ticket ? await rows<{ email: string }>(sql`SELECT email FROM admin_users WHERE id = ${ticket.uid} AND status = 'active'`) : [];

  return (
    <div className="admin-shell grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden isolate border-r p-12">
        <AuroraBackground intensity="medium" />
        <Link href="/" className="relative inline-block" aria-label="SliceDot — website">
          <Logo className="h-8" />
        </Link>
        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-bold leading-tight">
            Run your store, <span className="text-primary">orders and SEO</span> in one place.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Products, orders, customers, reviews and search settings. Every change goes live on the store.</p>
        </div>
        <p className="relative flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          Protected by two-step verification
        </p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 flex justify-center lg:hidden" aria-label="SliceDot — website">
            <Logo className="h-8" priority />
          </Link>
          {pending ? <OtpForm email={maskEmail(pending.email)} /> : <LoginForm />}
          <p className="mt-10 text-center">
            <Link href="/" className="text-xs text-muted-foreground transition-colors hover:text-primary">
              &larr; Back to website
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
