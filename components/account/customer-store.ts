"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { CartView } from "@/lib/cart";

// The signed-in customer and the bag in the browser, shared by the header, cart and wishlist buttons from one /api/me
// request. Store pages are cached for everyone, so none of this can come with them.
export type CustomerState = { loaded: boolean; customer: { name: string; email: string } | null; wishlist: number[]; cart: CartView | null; cartOpen: boolean };

const INITIAL: CustomerState = { loaded: false, customer: null, wishlist: [], cart: null, cartOpen: false };
let state = INITIAL;
let started = false;
const listeners = new Set<() => void>();

function publish(next: CustomerState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function load() {
  if (started) return;
  started = true;
  fetch("/api/me")
    .then((r) => (r.ok ? r.json() : { customer: null, wishlist: [], cart: null }))
    .then((data) => publish({ ...state, loaded: true, customer: data.customer, wishlist: data.wishlist, cart: data.cart }))
    .catch(() => publish({ ...state, loaded: true }));
}

export function setWishlist(wishlist: number[]) {
  publish({ ...state, wishlist });
}

export function setCart(cart: CartView) {
  publish({ ...state, cart });
}

export function setCartOpen(cartOpen: boolean) {
  publish({ ...state, cartOpen });
}

export function useCustomer() {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => INITIAL,
  );
  useEffect(load, []);
  return current;
}
