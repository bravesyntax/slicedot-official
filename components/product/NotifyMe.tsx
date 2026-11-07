"use client";

import { BellRing } from "lucide-react";
import { useActionState, useState } from "react";
import { requestStockAlert, type AlertState } from "@/app/(site)/product/[slug]/actions";
import { useCustomer } from "@/components/account/customer-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NotifyMe({ productId }: { productId: number }) {
  const { customer } = useCustomer();
  const [state, action, pending] = useActionState<AlertState, FormData>(requestStockAlert, { status: "idle", message: "" });
  const [startedAt] = useState(() => Date.now());

  if (state.status === "ok") {
    return <p className="mt-4 rounded-xl border bg-muted/40 p-3 text-sm" role="status">{state.message}</p>;
  }
  return (
    <form action={action} className="mt-4 rounded-2xl border p-4">
      <p className="flex items-center gap-2 text-sm font-medium"><BellRing className="size-4" aria-hidden="true" /> Get an email when it&apos;s back</p>
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="form_ts" value={startedAt} />
      <input type="text" name="website_url" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="mt-3 flex gap-2">
        <Input type="email" name="email" required defaultValue={customer?.email ?? ""} placeholder="you@example.com" aria-label="Your email" className="h-10" />
        <Button type="submit" disabled={pending} className="h-10 rounded-full">{pending ? "Saving…" : "Notify me"}</Button>
      </div>
      {state.status === "error" && <p className="mt-2 text-sm text-destructive" role="alert">{state.message}</p>}
    </form>
  );
}
