"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice, productImage, productUrl } from "@/lib/routes";

// "Recently viewed": kept in this browser only, never sent anywhere. Prices are refreshed on each visit to the product.
type Seen = { id: number; slug: string; name: string; price: string; image: string | null };
const KEY = "sd_recent";
const MAX = 12;

function read(): Seen[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((p) => p && typeof p.id === "number" && typeof p.slug === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/** Records a product view. Renders nothing. */
export function TrackView({ product }: { product: Seen }) {
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify([product, ...read().filter((p) => p.id !== product.id)].slice(0, MAX)));
    } catch {
      // Private browsing or storage turned off: nothing to remember.
    }
  }, [product]);
  return null;
}

export function RecentlyViewed({ excludeId, className = "" }: { excludeId?: number; className?: string }) {
  const [items, setItems] = useState<Seen[]>([]);
  useEffect(() => setItems(read().filter((p) => p.id !== excludeId).slice(0, 8)), [excludeId]);
  if (items.length < 2) return null;

  return (
    <section aria-label="Recently viewed" className={className}>
      <h2 className="mb-4 text-xl font-semibold tracking-tight">Recently viewed</h2>
      <ul className="scrollbar-hide -mx-5 flex gap-3 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        {items.map((p) => (
          <li key={p.id} className="w-32 shrink-0 sm:w-36">
            <Link href={productUrl(p.slug)} className="group block">
              <span className="relative block aspect-square overflow-hidden rounded-xl border bg-muted/40">
                {p.image && <Image src={productImage(p.image)} alt="" fill sizes="144px" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
              </span>
              <span className="mt-2 line-clamp-2 block text-xs leading-snug">{p.name}</span>
              <span className="mt-0.5 block text-sm font-semibold">{formatPrice(p.price)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
