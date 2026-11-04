"use client";

import { useState, useTransition } from "react";
import { cancelMyOrder } from "@/app/(site)/order/[number]/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DotsLoader } from "@/components/velora/loaders";

const REASONS = [
  ["changed_mind", "Changed my mind"],
  ["found_better_price", "Found a better price"],
  ["ordered_by_mistake", "Ordered by mistake"],
  ["delivery_time", "Delivery time too long"],
  ["other", "Other"],
];

export default function CancelOrder({ number }: { number: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  if (message?.ok) return <p className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success" role="status">{message.text}</p>;
  if (!open) return <Button variant="outline" className="rounded-full" onClick={() => setOpen(true)}>Cancel Order</Button>;
  return (
    <div className="grid w-full max-w-sm gap-3 rounded-2xl border p-4">
      <div className="grid gap-2">
        <Label htmlFor="cancel-reason">Why are you cancelling?</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger id="cancel-reason" className="w-full"><SelectValue placeholder="Choose a reason" /></SelectTrigger>
          <SelectContent>{REASONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {message && <p className="text-sm text-destructive" role="alert">{message.text}</p>}
      <div className="flex gap-2">
        <Button
          variant="destructive"
          disabled={!reason || pending}
          className="flex-1 rounded-full"
          onClick={() =>
            start(async () => {
              const result = await cancelMyOrder(number, reason);
              setMessage({ ok: result.ok, text: result.message });
            })
          }
        >
          {pending ? <DotsLoader size="sm" label="Cancelling" /> : "Confirm Cancel"}
        </Button>
        <Button variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>Keep Order</Button>
      </div>
    </div>
  );
}
