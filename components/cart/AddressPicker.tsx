"use client";

import { MapPin, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { chooseAddress } from "@/app/(site)/checkout/actions";
import { AddressForm, type AddressValues } from "@/components/account/AccountForms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DotsLoader } from "@/components/velora/loaders";
import { cn } from "@/lib/utils";

export default function AddressPicker({ addresses }: { addresses: AddressValues[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(addresses[0]?.id ?? 0);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  // An address just added becomes the choice.
  const known = useRef(addresses.map((a) => a.id));
  useEffect(() => {
    const added = addresses.find((a) => !known.current.includes(a.id));
    if (added) setSelected(added.id);
    known.current = addresses.map((a) => a.id);
  }, [addresses]);

  const proceed = () =>
    start(async () => {
      setError("");
      const result = await chooseAddress(selected);
      if (result?.message) setError(result.message);
    });

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold">Delivery Address</h2>
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => setAdding(true)}><Plus aria-hidden="true" /> Add New</Button>
      </div>
      {addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-12 text-center">
          <MapPin className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
          <h3 className="mt-3 font-medium">No saved addresses</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add one to continue.</p>
        </div>
      ) : (
        <fieldset className="grid gap-3">
          <legend className="sr-only">Choose a delivery address</legend>
          {addresses.map((a) => (
            <label key={a.id} className={cn("flex cursor-pointer gap-3 rounded-2xl border bg-card p-4 transition-colors", selected === a.id && "border-primary ring-1 ring-primary")}>
              <input type="radio" name="address" checked={selected === a.id} onChange={() => setSelected(a.id)} className="mt-1 accent-(--primary)" />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{a.name}</span>
                  <Badge variant="secondary" className="capitalize">{a.address_type ?? "home"}</Badge>
                  {a.is_default === 1 && <Badge>Default</Badge>}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">{[a.address, a.locality, a.city, a.state].filter(Boolean).join(", ")} - {a.pincode}</span>
                <span className="block text-sm text-muted-foreground">{a.phone}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
      <Button disabled={!selected || pending} onClick={proceed} className="mt-5 h-12 w-full rounded-full sm:w-64">{pending ? <DotsLoader size="sm" label="Continuing" /> : "Continue"}</Button>

      <Sheet open={adding} onOpenChange={setAdding}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add New Address</SheetTitle>
            <SheetDescription className="sr-only">Delivery address details</SheetDescription>
          </SheetHeader>
          {adding && (
            <AddressForm
              address={null}
              onDone={() => {
                setAdding(false);
                router.refresh();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
