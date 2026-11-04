import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import WishlistButton from "@/components/account/WishlistButton";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { Badge } from "@/components/ui/badge";
import { SpotlightCard } from "@/components/velora/spotlight-card";
import { productColors, type ProductCard as Product } from "@/lib/catalog";
import { formatPrice, productImage, productUrl } from "@/lib/routes";

type Props = {
  product: Product;
  badge?: "discount" | "trending" | "new";
  sizes?: string;
  maxColors?: number;
  showCategory?: boolean;
  showRating?: boolean;
  showSold?: boolean;
};

const LOW_STOCK = 5;

function Rating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
      <Star className="size-3 fill-warning text-warning" aria-hidden="true" />
      <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
      {count > 0 && <span>({count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count})</span>}
    </div>
  );
}

export default function ProductCard({ product, badge = "discount", sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw", maxColors = 4, showCategory = true, showRating = true, showSold = false }: Props) {
  const price = Number(product.price);
  const compare = Number(product.compare_price ?? 0);
  const discount = compare > price ? Math.round(((compare - price) / compare) * 100) : 0;
  const rating = Number(product.avg_rating ?? 0);
  const reviews = product.review_count ?? 0;
  const colors = productColors(product);
  const soldOut = product.stock <= 0;
  const url = productUrl(product.slug);

  return (
    <SpotlightCard className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-muted/40">
        <Link href={url} tabIndex={-1} aria-hidden="true" className="absolute inset-0">
          {product.image && (
            <Image src={productImage(product.image)} alt="" fill sizes={sizes} className={`object-cover transition-transform duration-500 group-hover:scale-105 ${soldOut ? "opacity-50 grayscale" : ""}`} />
          )}
        </Link>
        <div className="pointer-events-none absolute top-2 left-2 flex flex-col items-start gap-1">
          {soldOut && <Badge variant="secondary">Sold out</Badge>}
          {!soldOut && badge === "discount" && discount > 0 && <Badge variant="destructive">{discount}% off</Badge>}
          {!soldOut && badge === "trending" && <Badge>Bestseller</Badge>}
          {!soldOut && badge === "new" && <Badge>New</Badge>}
        </div>
        <WishlistButton productId={product.id} className="absolute top-2 right-2 z-20" />
        <AddToCartButton productId={product.id} inStock={!soldOut} compact className="absolute right-2 bottom-2 z-20 size-9 shadow-md" />
      </div>
      <div className="flex flex-1 flex-col p-3">
        {showCategory && product.category_name && <p className="mb-0.5 truncate text-xs text-muted-foreground">{product.category_name}</p>}
        <h3 className="line-clamp-2 text-sm leading-snug font-medium">
          <Link href={url} className="after:absolute after:inset-x-0 after:bottom-0 after:h-1/3 hover:underline hover:underline-offset-2">{product.name}</Link>
        </h3>
        {showRating && rating > 0 && <Rating rating={rating} count={reviews} />}
        {colors.length > 1 && (
          <div className="mt-1.5 flex items-center gap-1">
            {colors.slice(0, maxColors).map((c) => (
              <span key={c.name} title={c.name} className="size-3.5 rounded-full border" style={{ backgroundColor: c.code }} />
            ))}
            {colors.length > maxColors && <span className="ml-0.5 text-[10px] text-muted-foreground">+{colors.length - maxColors}</span>}
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-baseline gap-x-1.5 pt-2">
          <span className="text-base font-semibold">{formatPrice(price)}</span>
          {discount > 0 && <span className="text-xs text-muted-foreground line-through">{formatPrice(compare)}</span>}
          {showSold && (product.total_sold ?? 0) > 0 && <span className="ml-auto text-xs text-muted-foreground">{product.total_sold} sold</span>}
        </div>
        {!soldOut && product.stock <= LOW_STOCK && <p className="mt-1 text-xs font-medium text-destructive">Only {product.stock} left</p>}
      </div>
    </SpotlightCard>
  );
}
