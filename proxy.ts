import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import postgres from "postgres";
import { matchRedirect, type RedirectRule } from "@/lib/redirects";

// Maintenance mode. A production deploy shows the maintenance page unless MAINTENANCE_MODE is "off", so a missing
// setting can never open the store by accident. The owner gets in once with /?preview=<MAINTENANCE_BYPASS_TOKEN>.
const PREVIEW_COOKIE = "sd_preview";
const ALWAYS_OPEN = /^\/(maintenance|robots\.txt|google[0-9a-f]+\.html)$/;

const maintenanceOn = () => process.env.NODE_ENV === "production" && process.env.MAINTENANCE_MODE !== "off";

const fingerprint = (token: string) => createHash("sha256").update(`preview:${token}`).digest("hex");

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function maintenanceGate(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (ALWAYS_OPEN.test(pathname)) return null;

  const token = process.env.MAINTENANCE_BYPASS_TOKEN;
  if (token && token.length >= 24) {
    const given = searchParams.get("preview");
    if (given && same(given, token)) {
      const clean = new URL(request.nextUrl);
      clean.searchParams.delete("preview");
      const response = NextResponse.redirect(clean);
      response.cookies.set(PREVIEW_COOKIE, fingerprint(token), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60 });
      return response;
    }
    const cookie = request.cookies.get(PREVIEW_COOKIE)?.value;
    if (cookie && same(cookie, fingerprint(token))) return null;
  }

  const headers = { "Retry-After": "86400", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "The store is under maintenance." }, { status: 503, headers });
  return NextResponse.rewrite(new URL("/maintenance", request.url), { status: 503, headers });
}

// Redirects from the seo_redirects table (edited in the admin from step 8). Rules change rarely, so they're kept in
// memory for a minute instead of querying on every request. A database problem must never take the store down.
const TTL_MS = 60 * 1000;
let cache: { rules: RedirectRule[]; expires: number } | null = null;
let client: ReturnType<typeof postgres> | null = null;

const db = () => (client ??= postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, idle_timeout: 20 }));

async function loadRules(): Promise<RedirectRule[]> {
  if (cache && cache.expires > Date.now()) return cache.rules;
  try {
    const rules = (await db()`SELECT id, old_url, new_url, redirect_type FROM seo_redirects WHERE status = 'active'`) as unknown as RedirectRule[];
    cache = { rules, expires: Date.now() + TTL_MS };
    return rules;
  } catch (err) {
    console.error("[proxy] redirect lookup failed", err);
    return cache?.rules ?? [];
  }
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (maintenanceOn()) {
    const gate = maintenanceGate(request);
    if (gate) return gate;
  }
  if (/^\/(api|admin)(\/|$)/.test(request.nextUrl.pathname)) return NextResponse.next();

  const hit = matchRedirect(await loadRules(), request.nextUrl.pathname);
  if (!hit) return NextResponse.next();
  event.waitUntil(
    Promise.resolve(db()`UPDATE seo_redirects SET hits = COALESCE(hits, 0) + 1, last_hit_at = LOCALTIMESTAMP WHERE id = ${hit.rule.id}`)
      .then(() => undefined)
      .catch((err) => console.error("[proxy] redirect hit", err)),
  );
  if (hit.status === 410) return new NextResponse("This page has been removed.", { status: 410, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return NextResponse.redirect(new URL(hit.location, request.url), hit.status);
}

export const config = { matcher: ["/((?!_next/|uploads/|assets/|favicon.ico).*)"] };
