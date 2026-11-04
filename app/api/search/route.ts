import { NextResponse, type NextRequest } from "next/server";
import { searchSuggestions } from "@/lib/catalog";

// Search box suggestions.
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ products: [], categories: [] });
  return NextResponse.json(await searchSuggestions(q));
}
