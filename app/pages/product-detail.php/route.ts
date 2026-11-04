import { NextResponse, type NextRequest } from "next/server";
import { rows, sql } from "@/lib/db";
import { productUrl } from "@/lib/routes";

// Old product links: pages/product-detail.php?slug=x or ?id=12 → /product/x. The id needs a lookup, so it can't live in next.config.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const id = parseInt(params.get("id") ?? "", 10);
  const found = params.get("slug")
    ? await rows<{ slug: string }>(sql`SELECT slug FROM products WHERE slug = ${params.get("slug")!} AND status = 'active'`)
    : id > 0 && id < 2147483647
      ? await rows<{ slug: string }>(sql`SELECT slug FROM products WHERE id = ${id} AND status = 'active'`)
      : [];
  const target = new URL(found[0] ? productUrl(found[0].slug) : "/products", request.nextUrl.origin);
  return NextResponse.redirect(target, found[0] ? 308 : 307);
}
