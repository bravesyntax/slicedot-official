"use client";

import { Banknote, Lock, Minus, Plus, RefreshCw, Truck, X, ZoomIn } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import WishlistButton from "@/components/account/WishlistButton";
import AddToCartButton from "@/components/cart/AddToCartButton";
import NotifyMe from "./NotifyMe";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, productImage } from "@/lib/routes";
import { cn } from "@/lib/utils";

type Props = {
  productId: number;
  name: string;
  price: string;
  comparePrice: string | null;
  quantity: number;
  images: { path: string; alt: string; color: string | null }[];
  colors: { name: string; code: string }[];
  sizes: string[];
  children?: React.ReactNode;
};

const TRUST = [
  { icon: Truck, title: "Free shipping", text: "On ₹499 and above" },
  { icon: RefreshCw, title: "7-day returns", text: "Easy and simple" },
  { icon: Banknote, title: "COD available", text: "Pay on delivery" },
  { icon: Lock, title: "Secure checkout", text: "UPI, cards and more" },
];

export default function ProductView({ productId, name, price, comparePrice, quantity, images, colors, sizes, children }: Props) {
  const [color, setColor] = useState(colors[0]?.name ?? "");
  const [size, setSize] = useState(sizes[0] ?? "");
  const [count, setCount] = useState(1);
  const [selected, setSelected] = useState(0);
  const lightbox = useRef<HTMLDialogElement>(null);

  // Images tagged with the chosen color come first; no tagged images means every color shows all of them.
  const tagged = images.filter((img) => img.color === color);
  const shown = tagged.length ? tagged : images;
  const current = shown[Math.min(selected, shown.length - 1)];

  const priceNum = Number(price);
  const compare = Number(comparePrice ?? 0);
  const discount = compare > priceNum ? Math.round(((compare - priceNum) / compare) * 100) : 0;
  const inStock = quantity > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <button type="button" onClick={() => lightbox.current?.showModal()} aria-label="Zoom image" className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-3xl border bg-white">
          {current && <Image src={productImage(current.path)} alt={current.alt} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain" />}
          <span className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full border bg-background/80 text-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"><ZoomIn className="size-4" aria-hidden="true" /></span>
        </button>
        {shown.length > 1 && (
          <div className="scrollbar-hide mt-3 flex gap-2 overflow-x-auto pb-1">
            {shown.map((img, i) => (
              <button
                key={img.path}
                type="button"
                onClick={() => setSelected(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={img === current}
                className={cn("relative size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-colors sm:size-20", img === current ? "border-primary" : "border-transparent hover:border-border")}
              >
                <Image src={productImage(img.path)} alt="" fill sizes="80px" className="object-contain p-1" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{name}</h1>
        <div className="mt-4 border-b pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl font-semibold">{formatPrice(priceNum)}</span>
            {discount > 0 && (
              <>
                <span className="text-lg text-muted-foreground line-through">{formatPrice(compare)}</span>
                <Badge variant="destructive">{discount}% off</Badge>
              </>
            )}
          </div>
          {discount > 0 && <p className="mt-1 text-sm font-medium text-success">You save {formatPrice(compare - priceNum)}</p>}
          <p className={cn("mt-3 text-sm font-medium", !inStock || quantity <= 5 ? "text-destructive" : "text-success")} role="status">
            {!inStock ? "Out of stock" : quantity <= 5 ? `Hurry, only ${quantity} left` : "In stock, ready to ship"}
          </p>
        </div>

        {colors.length > 0 && (
          <div className="mt-6">
            <p className="flex justify-between text-sm"><span className="font-medium">Color</span> <span className="text-muted-foreground">{color}</span></p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  aria-label={c.name}
                  aria-pressed={c.name === color}
                  title={c.name}
                  onClick={() => {
                    setColor(c.name);
                    setSelected(0);
                  }}
                  style={{ backgroundColor: c.code }}
                  className={cn("size-9 rounded-full border transition-transform hover:scale-110", c.name === color && "ring-2 ring-primary ring-offset-2 ring-offset-background")}
                />
              ))}
            </div>
          </div>
        )}

        {sizes.length > 0 && (
          <div className="mt-6">
            <p className="flex justify-between text-sm"><span className="font-medium">Size</span> <span className="text-muted-foreground">{size}</span></p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={s === size}
                  onClick={() => setSize(s)}
                  className={cn("min-w-12 rounded-lg border px-4 py-2 text-sm transition-colors", s === size ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary")}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <p className="text-sm font-medium">Quantity</p>
          <div className="mt-3 inline-flex items-center rounded-full border">
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Decrease quantity" disabled={count <= 1} onClick={() => setCount(count - 1)}><Minus aria-hidden="true" /></Button>
            <span className="w-10 text-center text-sm tabular-nums" aria-live="polite">{count}</span>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Increase quantity" disabled={count >= Math.max(1, quantity)} onClick={() => setCount(count + 1)}><Plus aria-hidden="true" /></Button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <AddToCartButton productId={productId} inStock={inStock} quantity={count} color={color} size={size} />
          <WishlistButton productId={productId} color={color} size={size} labelled />
        </div>
        {!inStock && <NotifyMe productId={productId} />}

        <ul className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border">
          {TRUST.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-2.5 bg-card p-3">
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0"><span className="block text-xs font-medium">{title}</span><span className="block text-xs text-muted-foreground">{text}</span></span>
            </li>
          ))}
        </ul>

        {children}
      </div>

      <div data-sticky-buy className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="shrink-0">
          <p className="font-semibold">{formatPrice(priceNum)}</p>
          {discount > 0 && <p className="text-xs text-success">{discount}% off</p>}
        </div>
        <AddToCartButton productId={productId} inStock={inStock} quantity={count} color={color} size={size} />
      </div>

      <dialog ref={lightbox} onClick={(e) => e.target === lightbox.current && lightbox.current?.close()} className="m-auto max-h-[92vh] w-[92vw] max-w-4xl rounded-2xl bg-white p-0 backdrop:bg-black/80">
        <button type="button" onClick={() => lightbox.current?.close()} aria-label="Close" className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full border bg-white text-black"><X className="size-4" aria-hidden="true" /></button>
        {current && (
          <div className="relative aspect-square max-h-[92vh] w-full">
            <Image src={productImage(current.path)} alt={current.alt} fill sizes="92vw" className="object-contain p-4" />
          </div>
        )}
      </dialog>
    </div>
  );
}
