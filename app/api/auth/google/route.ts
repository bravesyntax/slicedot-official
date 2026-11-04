import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { safeReturnPath } from "@/lib/auth/session";
import { GOOGLE_STATE_COOKIE, googleRedirectUri } from "@/lib/auth/google";

// Sends the visitor to Google. The state value, checked in the callback, stops another site from signing someone
// in to an account of its choosing.
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) return NextResponse.redirect(new URL("/auth?error=google", request.nextUrl.origin));

  const state = randomBytes(24).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();

  const response = NextResponse.redirect(url);
  response.cookies.set(GOOGLE_STATE_COOKIE, JSON.stringify({ state, to: safeReturnPath(request.nextUrl.searchParams.get("redirect")) }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return response;
}
