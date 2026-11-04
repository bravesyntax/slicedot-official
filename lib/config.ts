export const SITE_NAME = "SliceDot";
export const SITE_TAGLINE = "Everything You Need, All in One Place";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://slicedot.in").replace(/\/$/, "");

/** Search engines stay out until this is set on the real domain at go-live. Previews and local runs are never indexed. */
export const SITE_LIVE = process.env.NEXT_PUBLIC_SITE_LIVE === "1";
