import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_STATE_COOKIE, googleRedirectUri } from "@/lib/auth/google";
import { findOrCreateCustomer, safeReturnPath, sameHash, setCustomerSession } from "@/lib/auth/session";
import { mergeGuestCart } from "@/lib/cart";
import { rows, sql } from "@/lib/db";

type GoogleUser = { sub?: string; email?: string; email_verified?: boolean; given_name?: string; family_name?: string };

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const origin = request.nextUrl.origin;
  const failed = (reason: string) => {
    const response = NextResponse.redirect(new URL(`/auth?error=${reason}`, origin));
    response.cookies.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/auth/google" });
    return response;
  };

  let saved: { state?: string; to?: string } = {};
  try {
    saved = JSON.parse(request.cookies.get(GOOGLE_STATE_COOKIE)?.value ?? "{}");
  } catch {
    // A damaged cookie fails the state check below.
  }
  const state = params.get("state") ?? "";
  if (!saved.state || !state || !sameHash(saved.state, state)) return failed("google");
  if (params.get("error")) return failed("google_cancelled");
  const code = params.get("code");
  if (!code || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return failed("google");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: googleRedirectUri(request),
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const token = (await tokenResponse.json()) as { access_token?: string };
    if (!token.access_token) throw new Error(`token request failed with status ${tokenResponse.status}`);

    const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    const user = (await userResponse.json()) as GoogleUser;
    // An unverified Google email could belong to someone else's store account.
    if (!user.email || !user.email_verified || !user.sub) throw new Error("no verified email from Google");

    const customerId = await findOrCreateCustomer(user.email, { firstName: user.given_name?.slice(0, 100), lastName: user.family_name?.slice(0, 100), googleId: user.sub });
    if (!customerId) return failed("inactive");
    await setCustomerSession(customerId);
    await mergeGuestCart(customerId);

    const to = safeReturnPath(saved.to);
    const [row] = await rows<{ first_name: string; phone: string | null }>(sql`SELECT first_name, phone FROM customers WHERE id = ${customerId}`);
    const target = row.first_name && row.phone ? to : `/auth?complete=1&redirect=${encodeURIComponent(to)}`;
    const response = NextResponse.redirect(new URL(target, origin));
    response.cookies.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/auth/google" });
    return response;
  } catch (err) {
    console.error("[google callback]", err);
    return failed("google");
  }
}
