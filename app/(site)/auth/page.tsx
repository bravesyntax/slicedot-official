import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/components/account/AuthForm";
import { container } from "@/components/site/ui";
import { AuroraBackground } from "@/components/velora/aurora-background";
import { getCustomer, needsProfile, safeReturnPath } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in or create an account at SliceDot to start shopping.",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  google: "Google sign-in didn't work. Please try again or use your email.",
  google_cancelled: "Google sign-in was cancelled. Please try again or use your email.",
  inactive: "This account is not active. Please contact support.",
};

type Props = { searchParams: Promise<{ redirect?: string; complete?: string; error?: string }> };

export default async function AuthPage({ searchParams }: Props) {
  const sp = await searchParams;
  const redirectTo = safeReturnPath(sp.redirect);
  const customer = await getCustomer();
  // Signing in re-renders this page, so a customer with a missing name or phone stays here for that step.
  const completing = !!customer && needsProfile(customer);
  if (customer && !completing) redirect(redirectTo);

  return (
    <section className="relative isolate overflow-hidden">
      <AuroraBackground intensity="subtle" />
      <div className={`${container} relative flex min-h-[70vh] items-center justify-center py-14`}>
        <div className="w-full max-w-md">
          <AuthForm redirectTo={redirectTo} googleEnabled={!!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} startAtProfile={completing} initialError={sp.error ? ERRORS[sp.error] : undefined} />
        </div>
      </div>
    </section>
  );
}
