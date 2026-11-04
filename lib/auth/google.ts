import type { NextRequest } from "next/server";

export const GOOGLE_STATE_COOKIE = "sd_google_state";

/** Must match an "Authorized redirect URI" in the Google Cloud console exactly. */
export const googleRedirectUri = (request: NextRequest) =>
  `${(process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, "")}/api/auth/google/callback`;
