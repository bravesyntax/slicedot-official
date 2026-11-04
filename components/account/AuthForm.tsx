"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { completeProfile, requestOtp, verifyOtp } from "@/app/(site)/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DotsLoader } from "@/components/velora/loaders";

type Step = "email" | "code" | "profile";

export default function AuthForm({ redirectTo, googleEnabled, startAtProfile, initialError }: { redirectTo: string; googleEnabled: boolean; startAtProfile: boolean; initialError?: string }) {
  const [step, setStep] = useState<Step>(startAtProfile ? "profile" : "email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [wait, setWait] = useState(0);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  // A full page load, so the header picks up the signed-in customer.
  const finish = () => window.location.assign(redirectTo);

  const send = () =>
    start(async () => {
      setError("");
      const result = await requestOtp(email);
      if (result.waitSeconds) setWait(result.waitSeconds);
      if (result.ok) {
        setCode("");
        setStep("code");
      } else {
        setError(result.message ?? "Something went wrong.");
      }
    });
  const verify = (value: string) =>
    start(async () => {
      setError("");
      const result = await verifyOtp(email, value);
      if (!result.ok) {
        setError(result.message ?? "Something went wrong.");
        setCode("");
      } else if (result.needsProfile) {
        setStep("profile");
      } else {
        finish();
      }
    });
  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    start(async () => {
      setError("");
      const result = await completeProfile(name, phone);
      if (result.ok) finish();
      else setError(result.message ?? "Something went wrong.");
    });
  };

  return (
    <div className="rounded-3xl border bg-card p-6 text-card-foreground shadow-xl shadow-primary/5 sm:p-8">
      {error && (
        <p className="mb-5 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}

      {step === "email" && (
        <>
          <h2 className="text-xl font-semibold tracking-tight">Sign in or create an account</h2>
          <p className="mt-1 text-sm text-muted-foreground">We&apos;ll email you a one-time code. No password needed.</p>
          <form
            className="mt-6 grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="auth-email">Email address</Label>
              <Input id="auth-email" type="email" required maxLength={100} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" className="h-11" />
            </div>
            <Button type="submit" disabled={pending} className="h-11 rounded-full">{pending ? <DotsLoader size="sm" label="Sending" /> : "Continue"}</Button>
          </form>
          {googleEnabled && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><Separator className="flex-1" /> or <Separator className="flex-1" /></div>
              <Button asChild variant="outline" className="h-11 w-full rounded-full">
                <a href={`/api/auth/google?redirect=${encodeURIComponent(redirectTo)}`}>Continue with Google</a>
              </Button>
            </>
          )}
        </>
      )}

      {step === "code" && (
        <>
          <h2 className="text-xl font-semibold tracking-tight">Enter your code</h2>
          <p className="mt-1 text-sm text-muted-foreground">We sent a 6-digit code to <strong className="font-medium text-foreground">{email}</strong>. It expires in 10 minutes. Check spam if you don&apos;t see it.</p>
          <div className="mt-6 flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              disabled={pending}
              autoFocus
              aria-label="6-digit code"
              onChange={(value) => {
                setCode(value);
                if (value.length === 6) verify(value);
              }}
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
          </div>
          {pending && <div className="mt-4 flex justify-center"><DotsLoader size="sm" label="Checking" /></div>}
          <div className="mt-6 flex items-center justify-between text-sm">
            <button type="button" onClick={() => { setStep("email"); setError(""); }} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Change email</button>
            <button type="button" onClick={send} disabled={wait > 0 || pending} className="font-medium underline-offset-4 hover:underline disabled:font-normal disabled:text-muted-foreground disabled:no-underline">
              {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
            </button>
          </div>
        </>
      )}

      {step === "profile" && (
        <>
          <h2 className="text-xl font-semibold tracking-tight">Complete your profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">We use these for delivery updates.</p>
          <form onSubmit={saveProfile} className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="auth-name">Full name</Label>
              <Input id="auth-name" required minLength={2} maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" className="h-11" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="auth-phone">Mobile number</Label>
              <Input id="auth-phone" type="tel" required inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="9876543210" autoComplete="tel-national" className="h-11" />
            </div>
            <Button type="submit" disabled={pending} className="h-11 rounded-full">{pending ? <DotsLoader size="sm" label="Saving" /> : "Save and Continue"}</Button>
            <button type="button" onClick={finish} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Skip for now</button>
          </form>
        </>
      )}
    </div>
  );
}
