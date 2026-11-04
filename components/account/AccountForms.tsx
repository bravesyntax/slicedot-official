"use client";

import { AlertTriangle, CheckCircle2, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteAccount, deleteAddress, saveAddress, setDefaultAddress, updateProfile, type FormState } from "@/app/(site)/account/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { DotsLoader } from "@/components/velora/loaders";
import { INDIAN_STATES } from "@/lib/indian-states";

const idle: FormState = { status: "idle" };

function Notice({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;
  const good = state.status === "ok";
  return (
    <p className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${good ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"}`} role={good ? "status" : "alert"}>
      {good ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />} {state.message}
    </p>
  );
}

export type ProfileValues = { first_name: string; last_name: string; email: string; phone: string | null; gender: string | null; date_of_birth: string | null };

export function ProfileForm({ customer }: { customer: ProfileValues }) {
  const [state, action, pending] = useActionState(updateProfile, idle);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Notice state={state} /></div>
      <div className="grid gap-2"><Label htmlFor="first_name">First Name</Label><Input id="first_name" name="first_name" required maxLength={100} defaultValue={customer.first_name} autoComplete="given-name" /></div>
      <div className="grid gap-2"><Label htmlFor="last_name">Last Name</Label><Input id="last_name" name="last_name" maxLength={100} defaultValue={customer.last_name} autoComplete="family-name" /></div>
      <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" value={customer.email} disabled /></div>
      <div className="grid gap-2"><Label htmlFor="phone">Mobile Number</Label><Input id="phone" name="phone" type="tel" inputMode="numeric" maxLength={10} defaultValue={customer.phone ?? ""} autoComplete="tel-national" /></div>
      <div className="grid gap-2">
        <Label htmlFor="gender">Gender</Label>
        <Select name="gender" defaultValue={customer.gender ?? undefined}>
          <SelectTrigger id="gender" className="w-full"><SelectValue placeholder="Prefer not to say" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2"><Label htmlFor="dob">Date of Birth</Label><Input id="dob" name="dob" type="date" defaultValue={customer.date_of_birth ?? ""} autoComplete="bday" /></div>
      <div className="sm:col-span-2"><Button type="submit" disabled={pending} className="h-11 rounded-full px-6">{pending ? <DotsLoader size="sm" label="Saving" /> : "Save Changes"}</Button></div>
    </form>
  );
}

export type AddressValues = { id: number; name: string; phone: string; pincode: string; address: string; locality: string | null; city: string; state: string; address_type: string | null; is_default: number | null };

export function AddressForm({ address, onDone }: { address: AddressValues | null; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveAddress, idle);
  useEffect(() => {
    if (state.status === "ok") onDone();
  }, [state, onDone]);
  return (
    <form action={action} className="grid gap-4 px-4 pb-6">
      <Notice state={state} />
      {address && <input type="hidden" name="id" value={address.id} />}
      <div className="grid gap-2"><Label htmlFor="addr-name">Recipient Name</Label><Input id="addr-name" name="name" required maxLength={100} defaultValue={address?.name} autoComplete="name" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2"><Label htmlFor="addr-phone">Mobile</Label><Input id="addr-phone" name="phone" type="tel" inputMode="numeric" required maxLength={10} defaultValue={address?.phone} autoComplete="tel-national" /></div>
        <div className="grid gap-2"><Label htmlFor="addr-pin">Pincode</Label><Input id="addr-pin" name="pincode" inputMode="numeric" required maxLength={6} defaultValue={address?.pincode} autoComplete="postal-code" /></div>
      </div>
      <div className="grid gap-2"><Label htmlFor="addr-line">Street Address</Label><Textarea id="addr-line" name="address" rows={2} required maxLength={500} defaultValue={address?.address} autoComplete="street-address" /></div>
      <div className="grid gap-2"><Label htmlFor="addr-locality">Locality</Label><Input id="addr-locality" name="locality" maxLength={100} defaultValue={address?.locality ?? ""} /></div>
      <div className="grid gap-2"><Label htmlFor="addr-city">City</Label><Input id="addr-city" name="city" required maxLength={100} defaultValue={address?.city} autoComplete="address-level2" /></div>
      <div className="grid gap-2">
        <Label htmlFor="addr-state">State</Label>
        <Select name="state" defaultValue={address?.state} required>
          <SelectTrigger id="addr-state" className="w-full"><SelectValue placeholder="Choose a state" /></SelectTrigger>
          <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="addr-type">Address Type</Label>
        <Select name="address_type" defaultValue={address?.address_type ?? "home"}>
          <SelectTrigger id="addr-type" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="home">Home</SelectItem>
            <SelectItem value="work">Work</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2.5">
        <Checkbox id="addr-default" name="is_default" defaultChecked={address?.is_default === 1} />
        <Label htmlFor="addr-default" className="font-normal">Make this my default address</Label>
      </div>
      <Button type="submit" disabled={pending} className="h-11 rounded-full">{pending ? <DotsLoader size="sm" label="Saving" /> : "Save Address"}</Button>
    </form>
  );
}

export function AddressBook({ addresses }: { addresses: AddressValues[] }) {
  const [editing, setEditing] = useState<AddressValues | "new" | null>(null);
  const [pending, start] = useTransition();
  const current = editing === "new" ? null : editing;
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="outline" className="rounded-full" onClick={() => setEditing("new")}><Plus aria-hidden="true" /> Add New Address</Button>
      </div>
      {addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-14 text-center">
          <MapPin className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
          <h3 className="mt-3 font-medium">No addresses saved</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add one to check out faster.</p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{a.name}</p>
                <Badge variant="secondary" className="capitalize">{a.address_type ?? "home"}</Badge>
                {a.is_default === 1 && <Badge>Default</Badge>}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{[a.address, a.locality, a.city, a.state].filter(Boolean).join(", ")} - {a.pincode}</p>
              <p className="mt-1 text-sm text-muted-foreground">{a.phone}</p>
              <div className="mt-4 flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(a)}><Pencil aria-hidden="true" /> Edit</Button>
                {a.is_default !== 1 && <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(() => setDefaultAddress(a.id))}><Star aria-hidden="true" /> Set Default</Button>}
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => { if (window.confirm("Delete this address?")) start(() => deleteAddress(a.id)); }}><Trash2 aria-hidden="true" /> Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{current ? "Edit Address" : "Add New Address"}</SheetTitle>
            <SheetDescription className="sr-only">Delivery address details</SheetDescription>
          </SheetHeader>
          {editing !== null && <AddressForm key={current?.id ?? "new"} address={current} onDone={() => setEditing(null)} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, idle);
  useEffect(() => {
    // A full page load, so the header forgets the signed-out customer.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (state.status === "ok") window.location.assign("/");
  }, [state]);
  return (
    <details className="mt-10 rounded-2xl border border-destructive/30 p-5">
      <summary className="cursor-pointer text-sm font-medium text-destructive">Delete my account</summary>
      <p className="mt-3 text-sm text-muted-foreground">This removes your profile, saved addresses, wishlist and cart. It can&apos;t be undone. Past orders stay in the store&apos;s records, no longer linked to you.</p>
      <form action={action} className="mt-4 grid max-w-sm gap-3">
        <Notice state={state} />
        <div className="grid gap-2"><Label htmlFor="confirm-delete">Type DELETE to confirm</Label><Input id="confirm-delete" name="confirm" required autoComplete="off" /></div>
        <Button type="submit" variant="destructive" disabled={pending} className="rounded-full">{pending ? <DotsLoader size="sm" label="Deleting" /> : "Delete Account"}</Button>
      </form>
    </details>
  );
}
