import { PriceDetails } from "./CartLines";
import type { CartView } from "@/lib/cart";
import { formatPrice } from "@/lib/routes";

export default function OrderSummary({ cart }: { cart: CartView }) {
  return (
    <aside className="rounded-2xl border bg-card p-5 lg:sticky lg:top-24" aria-label="Order summary">
      <h2 className="mb-3 font-semibold">Order Summary ({cart.count} {cart.count === 1 ? "Item" : "Items"})</h2>
      <ul className="mb-4 grid gap-2 border-b pb-4 text-sm">
        {cart.lines.map((line) => (
          <li key={line.id} className="flex justify-between gap-3">
            <span className="min-w-0 text-muted-foreground">
              <span className="line-clamp-1">{line.quantity} × {line.name}</span>
              {(line.color || line.size) && <span className="block text-xs">{[line.color, line.size].filter(Boolean).join(" · ")}</span>}
            </span>
            <span className="shrink-0">{formatPrice(line.price * line.quantity)}</span>
          </li>
        ))}
      </ul>
      <PriceDetails cart={cart} />
    </aside>
  );
}
