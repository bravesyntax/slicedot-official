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
  showCompare?: boolean;
  showRating?: boolean;
  showSold?: boolean;
};

function Rating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="mb-2 flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`size-3 ${i <= Math.round(rating) ? "fill-warning text-warning" : "fill-muted text-muted"}`} aria-hidden="true" />
      ))}
      {count > 0 && <span className="ml-1 text-xs text-muted-foreground">({count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count})</span>}
    </div>
  );
}

export default function ProductCard({
  product,
  badge = "discount",
  sizes = "(max-width: 640px) 50vw, 25vw",
  maxColors = 4,
  showCategory = true,
  showCompare = true,
  showRating = true,
  showSold = false,
}: Props) {
  const price = Number(product.price);
  const compare = Number(product.compare_price ?? 0);
  const discount = compare > price ? Math.round(((compare - price) / compare) * 100) : 0;
  const rating = Number(product.avg_rating ?? 0);
  const reviews = product.review_count ?? 0;
  const colors = productColors(product);

  return (
    <SpotlightCard className="group h-full overflow-hidden rounded-2xl border bg-card text-card-foreground transition-shadow duration-300 hover:shadow-lg">
      <WishlistButton productId={product.id} className="absolute top-2 right-2 z-20" />
      <AddToCartButton productId={product.id} inStock={product.stock > 0} compact className="absolute right-3 bottom-3 z-20" />
      <Link href={productUrl(product.slug)} className="block h-full">
        <div className="relative aspect-square overflow-hidden bg-white">
          {product.image && (
            <Image src={productImage(product.image)} alt={product.name} fill sizes={sizes} className="object-contain p-3 transition-transform duration-500 group-hover:scale-105" />
          )}
          <div className="absolute top-2 left-2">
            {badge === "discount" && discount > 0 && <Badge variant="destructive">-{discount}%</Badge>}
            {badge === "trending" && <Badge>Trending</Badge>}
            {badge === "new" && <Badge>New</Badge>}
          </div>
        </div>
        <div className="p-3 sm:p-4">
          {showCategory && product.category_name && <p className="mb-1 truncate text-xs text-muted-foreground">{product.category_name}</p>}
          <h3 className="mb-2 line-clamp-2 min-h-10 text-sm leading-tight font-medium">{product.name}</h3>
          {colors.length > 0 && (
            <div className="mb-2 flex items-center gap-1">
              {colors.slice(0, maxColors).map((c) => (
                <span key={c.name} title={c.name} className="size-4 rounded-full border" style={{ backgroundColor: c.code }} />
              ))}
              {colors.length > maxColors && <span className="ml-0.5 text-[10px] text-muted-foreground">+{colors.length - maxColors}</span>}
            </div>
          )}
          {showRating && (rating > 0 || reviews > 0) && <Rating rating={rating} count={reviews} />}
          <div className="flex flex-wrap items-center gap-2 pr-9">
            <span className="text-base font-semibold sm:text-lg">{formatPrice(price)}</span>
            {showCompare && discount > 0 && <span className="text-xs text-muted-foreground line-through">{formatPrice(compare)}</span>}
            {showSold && <span className="ml-auto text-xs text-muted-foreground">{(product.total_sold ?? 0).toLocaleString("en-US")} sold</span>}
          </div>
        </div>
      </Link>
    </SpotlightCard>
  );
}
