"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { submitContact, type ContactState } from "@/app/(site)/contact/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DotsLoader } from "@/components/velora/loaders";

const SUBJECTS = ["General Inquiry", "Order Support", "Product Question", "Returns & Refunds", "Feedback", "Other"];
const initial: ContactState = { status: "idle", errors: [], values: {} };

export default function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, initial);
  const [startedAt, setStartedAt] = useState("");
  useEffect(() => setStartedAt(String(Date.now())), []);
  const v = state.status === "error" ? state.values : {};

  if (state.status === "ok") {
    return (
      <div className="rounded-3xl border bg-card p-8 py-16 text-center text-card-foreground shadow-xl shadow-primary/5" role="status">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">Message sent</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border bg-card p-6 text-card-foreground shadow-xl shadow-primary/5 sm:p-8">
      <h2 className="text-xl font-semibold tracking-tight">Send us a Message</h2>
      <p className="mt-1 text-sm text-muted-foreground">Fill out the form below and we&apos;ll get back to you as soon as possible.</p>
      {state.errors.length > 0 && (
        <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4" role="alert">
          {state.errors.map((e) => (
            <p key={e} className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {e}
            </p>
          ))}
        </div>
      )}
      <form action={action} className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* Honeypot: hidden from people, filled in by bots. */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label>Website<input type="text" name="website_url" tabIndex={-1} autoComplete="off" /></label>
        </div>
        <input type="hidden" name="form_ts" value={startedAt} />
        <div className="grid gap-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input id="name" name="name" required minLength={2} maxLength={100} defaultValue={v.name} placeholder="Your name" autoComplete="name" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input id="email" name="email" type="email" required maxLength={150} defaultValue={v.email} placeholder="your@email.com" autoComplete="email" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" name="phone" type="tel" maxLength={30} defaultValue={v.phone} placeholder="+91 98765 43210" autoComplete="tel" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="subject">Subject</Label>
          <Select name="subject" defaultValue={v.subject || SUBJECTS[0]}>
            <SelectTrigger id="subject" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="message">Message *</Label>
          <Textarea id="message" name="message" rows={5} required minLength={10} maxLength={2000} defaultValue={v.message} placeholder="How can we help you?" />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending} className="h-11 w-full rounded-full px-6 sm:w-auto">
            {pending ? <DotsLoader size="sm" label="Sending" /> : "Send Message"}
          </Button>
        </div>
      </form>
    </div>
  );
}
