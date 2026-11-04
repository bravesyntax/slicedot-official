import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/db";

// Counts clicks on the popular-searches tags, for the SEO admin.
export async function POST(request: NextRequest) {
  const id = parseInt(request.nextUrl.searchParams.get("id") ?? "", 10);
  if (id > 0 && id < 2147483647) await sql`UPDATE seo_tags SET click_count = COALESCE(click_count, 0) + 1 WHERE id = ${id}`;
  return new NextResponse(null, { status: 204 });
}
