"use client";

import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, MailCheck, User } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { cancelLogin, login, resendLoginCode, verifyLoginCode, type LoginState, type OtpState } from "./actions";

const inputCls =
  "w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
const primaryCls =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

function Alert({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
        tone === "error" ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-700 dark:text-red-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-700 dark:text-emerald-400"
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: "" });
  const [show, setShow] = useState(false);

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold">Sign in to admin</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Enter your credentials. We&apos;ll email you a verification code next.</p>
      </div>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <form action={action} className="space-y-5">
        <div>
          <label htmlFor="username" className="mb-2 block text-xs font-medium text-muted-foreground">
            Username
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input key={state.username ?? ""} id="username" type="text" name="username" required autoComplete="username" autoFocus={!state.username} defaultValue={state.username} className={inputCls} />
          </div>
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-xs font-medium text-muted-foreground">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input id="password" type={show ? "text" : "password"} name="password" required autoComplete="current-password" autoFocus={!!state.username} className={`${inputCls} pr-11`} />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={pending} className={primaryCls}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {pending ? "Checking…" : "Continue"}
          {!pending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </form>
    </>
  );
}

const DIGITS = 6;

export function OtpForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<OtpState, FormData>(verifyLoginCode, { error: "" });
  const [resendState, resend, resending] = useActionState<OtpState>(resendLoginCode, { error: "" });
  const [digits, setDigits] = useState<string[]>(Array(DIGITS).fill(""));
  const [cooldown, setCooldown] = useState(60);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  useEffect(() => {
    if (resendState.notice) {
      setCooldown(60);
      setDigits(Array(DIGITS).fill(""));
      refs.current[0]?.focus();
    }
  }, [resendState]);
  // Clear the boxes after a wrong code so the next attempt starts clean.
  useEffect(() => {
    if (state.error) {
      setDigits(Array(DIGITS).fill(""));
      refs.current[0]?.focus();
    }
  }, [state]);

  const fill = (start: number, value: string) => {
    const chars = value.replace(/\D/g, "").slice(0, DIGITS - start).split("");
    if (!chars.length) return;
    const next = [...digits];
    chars.forEach((ch, i) => (next[start + i] = ch));
    setDigits(next);
    const last = Math.min(start + chars.length, DIGITS - 1);
    refs.current[last]?.focus();
    if (next.every(Boolean)) requestAnimationFrame(() => formRef.current?.requestSubmit());
  };

  const error = state.error || resendState.error;
  return (
    <>
      <div className="mb-8">
        <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
          <MailCheck className="h-6 w-6 text-primary" aria-hidden="true" />
        </span>
        <h1 className="font-display text-2xl font-bold">Check your email</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>. It expires in 10 minutes.
        </p>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {!error && resendState.notice && <Alert tone="success">{resendState.notice}</Alert>}

      <form ref={formRef} action={action} className="space-y-5">
        <input type="hidden" name="code" value={digits.join("")} />
        <fieldset>
          <legend className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Verification code
          </legend>
          <div className="flex justify-between gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                value={d}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                autoFocus={i === 0}
                maxLength={DIGITS}
                aria-label={`Digit ${i + 1}`}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  if (!v) {
                    const next = [...digits];
                    next[i] = "";
                    setDigits(next);
                  } else if (v.length >= DIGITS) fill(0, v); // whole code autofilled into one box
                  else fill(i, v.slice(-1));
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  fill(0, e.clipboardData.getData("text"));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
                  if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
                  if (e.key === "ArrowRight" && i < DIGITS - 1) refs.current[i + 1]?.focus();
                }}
                className="h-14 w-full min-w-0 rounded-xl border border-border bg-card text-center font-mono text-xl font-semibold text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            ))}
          </div>
        </fieldset>
        <button type="submit" disabled={pending || digits.some((d) => !d)} className={primaryCls}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {pending ? "Verifying…" : "Verify & sign in"}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-xs">
        <form action={resend}>
          <button type="submit" disabled={cooldown > 0 || resending} className="font-medium text-primary transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:text-muted-foreground">
            {resending ? "Sending…" : cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
        </form>
        <form action={cancelLogin}>
          <button type="submit" className="text-muted-foreground transition-colors hover:text-foreground">
            Use a different account
          </button>
        </form>
      </div>
    </>
  );
}
