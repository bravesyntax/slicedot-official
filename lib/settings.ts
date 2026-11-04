import "server-only";
import { cache } from "react";
import { rows, sql } from "./db";

// Only the keys the public site reads: the settings table also holds private values.
const PUBLIC_KEYS = ["store_name", "store_email", "store_phone", "store_address", "facebook", "instagram", "twitter", "pinterest", "youtube"];

export const getStoreSettings = cache(async () => {
  const data = await rows<{ setting_key: string; setting_value: string | null }>(
    sql`SELECT setting_key, setting_value FROM settings WHERE setting_key IN ${sql(PUBLIC_KEYS)}`,
  );
  const get = (key: string) => data.find((r) => r.setting_key === key)?.setting_value || "";
  return {
    name: get("store_name") || "SliceDot",
    email: get("store_email") || "info@slicedot.in",
    phone: get("store_phone"),
    address: get("store_address"),
    socials: {
      instagram: get("instagram"),
      facebook: get("facebook"),
      twitter: get("twitter"),
      pinterest: get("pinterest"),
      youtube: get("youtube"),
    },
  };
});

export const getInvoiceDetails = cache(async () => {
  const data = await rows<{ setting_value: string | null }>(sql`SELECT setting_value FROM settings WHERE setting_key = 'gstin'`);
  return { gstin: data[0]?.setting_value || "" };
});

export const getReviewSettings = cache(async () => {
  const data = await rows<{ setting_key: string; setting_value: string | null }>(
    sql`SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('reviews_enabled', 'review_min_length', 'review_auto_approve', 'review_require_purchase')`,
  );
  const get = (key: string) => data.find((r) => r.setting_key === key)?.setting_value;
  return {
    enabled: get("reviews_enabled") !== "0",
    minLength: Number(get("review_min_length")) || 50,
    autoApprove: get("review_auto_approve") === "1",
    requirePurchase: get("review_require_purchase") === "1",
  };
});

// Named keys only: contact_email in this table is the admin's private address, not for public pages.
const SEO_KEYS = ["seo_title_suffix", "default_og_image", "organization_name", "organization_type", "organization_logo", "site_meta_title", "site_meta_description", "site_keywords", "google_search_console", "bing_webmaster", "google_analytics_id", "google_tag_manager_id", "business_address", "business_city", "business_state", "business_postal", "business_country"];

export const DEFAULT_TITLE_SUFFIX = " | SliceDot";
const DEFAULT_SHARE_IMAGE = "/assets/logo-black.png";

export type SeoSettings = Awaited<ReturnType<typeof getSeoSettings>>;

export const getSeoSettings = cache(async () => {
  const data = await rows<{ setting_key: string; setting_value: string | null }>(sql`SELECT setting_key, setting_value FROM seo_settings WHERE setting_key IN ${sql(SEO_KEYS)}`);
  const get = (key: string) => data.find((r) => r.setting_key === key)?.setting_value?.trim() || "";
  const suffix = data.find((r) => r.setting_key === "seo_title_suffix")?.setting_value;
  return {
    titleSuffix: suffix ?? DEFAULT_TITLE_SUFFIX,
    defaultDescription: get("site_meta_description") || "Shop quality products at SliceDot, with free shipping above ₹499, easy returns and Cash on Delivery across India.",
    defaultImage: get("default_og_image") || DEFAULT_SHARE_IMAGE,
    orgName: get("organization_name") || "SliceDot",
    orgType: get("organization_type") || "OnlineStore",
    orgLogo: get("organization_logo"),
    title: get("site_meta_title"),
    description: get("site_meta_description"),
    keywords: get("site_keywords"),
    googleVerification: get("google_search_console"),
    bingVerification: get("bing_webmaster"),
    analyticsId: get("google_analytics_id"),
    tagManagerId: get("google_tag_manager_id"),
    address: { street: get("business_address"), city: get("business_city"), state: get("business_state"), postal: get("business_postal"), country: get("business_country") },
  };
});
