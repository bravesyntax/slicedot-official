import { BadgeCheck, BarChart3, Building2, Type, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SubmitButton } from "@/components/admin/client";
import SeoShell from "@/components/admin/SeoShell";
import { inputCls, labelCls, primaryBtn } from "@/components/admin/ui";
import { rows, sql } from "@/lib/db";
import { DEFAULT_TITLE_SUFFIX } from "@/lib/settings";
import { saveSeoSettings } from "../actions";

export const metadata = { title: "SEO · Settings" };

function Field({ name, title, value, placeholder, hint, span }: { name: string; title: string; value: string; placeholder?: string; hint?: ReactNode; span?: boolean }) {
  return (
    <div className={span ? "md:col-span-2" : undefined}>
      <label htmlFor={name} className={labelCls}>{title}</label>
      <input id={name} name={name} defaultValue={value} placeholder={placeholder} className={inputCls} />
      {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Section({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 border-b py-8 first:pt-0 lg:grid-cols-[260px_1fr]">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Icon className="size-4" aria-hidden="true" />{title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

export default async function SeoSettingsPage() {
  // Read by name for the form: this table also holds old PHP options that nothing uses any more.
  const data = await rows<{ setting_key: string; setting_value: string | null }>(sql`SELECT setting_key, setting_value FROM seo_settings`);
  const s = Object.fromEntries(data.map((r) => [r.setting_key, r.setting_value ?? ""]));
  const v = (k: string, fallback = "") => s[k] || fallback;

  return (
    <SeoShell active="settings">
      <form action={saveSeoSettings} className="mx-auto max-w-5xl rounded-xl border bg-card p-5 lg:p-8">
        <Section icon={Type} title="Titles & descriptions" description="The home page's title and description, plus the defaults for every URL that doesn't have its own.">
          <Field name="site_meta_title" title="Home page title" value={v("site_meta_title")} span />
          <div className="md:col-span-2">
            <label htmlFor="site_meta_description" className={labelCls}>Home page and fallback description</label>
            <textarea id="site_meta_description" name="site_meta_description" rows={3} defaultValue={v("site_meta_description")} className={`${inputCls} resize-y`} />
            <p className="mt-1.5 text-[11px] text-muted-foreground">Also used when a page has no description of its own.</p>
          </div>
          <Field name="site_keywords" title="Home page keywords" value={v("site_keywords")} span />
          <Field name="seo_title_suffix" title="Title suffix" value={s.seo_title_suffix ?? DEFAULT_TITLE_SUFFIX} placeholder={DEFAULT_TITLE_SUFFIX} hint={`Added after generated titles, e.g. "About Us${DEFAULT_TITLE_SUFFIX}". Clear it to add nothing.`} />
          <Field name="default_og_image" title="Default social share image" value={v("default_og_image")} placeholder="https://… or /assets/…" hint="Used when a URL has no image of its own. 1200×630 works best." />
        </Section>

        <Section icon={BadgeCheck} title="Search engine verification" description="Proves to Google and Bing that you own the site, so you can use Search Console and Webmaster Tools.">
          <Field name="google_search_console" title="Google Search Console" value={v("google_search_console")} placeholder="Paste the meta tag or its content value" hint={<>Search Console → Add property → URL prefix → HTML tag. You can paste the whole <code className="font-mono">&lt;meta&gt;</code> tag.</>} />
          <Field name="bing_webmaster" title="Bing Webmaster Tools" value={v("bing_webmaster")} placeholder="Paste the msvalidate.01 tag or value" hint="Bing → Add site → HTML meta tag." />
        </Section>

        <Section icon={BarChart3} title="Analytics" description="Tracking tags on public pages. Admin, cart and account pages stay out of them.">
          <Field name="google_analytics_id" title="Google Analytics ID" value={v("google_analytics_id")} placeholder="G-XXXXXXX" />
          <Field name="google_tag_manager_id" title="Google Tag Manager ID" value={v("google_tag_manager_id")} placeholder="GTM-XXXXXX" />
        </Section>

        <Section icon={Building2} title="Business schema" description="Structured data on the home page telling Google who runs the store. Phone, email and social profiles come from Settings.">
          <Field name="organization_name" title="Business name" value={v("organization_name", "SliceDot")} />
          <div>
            <label htmlFor="organization_type" className={labelCls}>Type</label>
            <select id="organization_type" name="organization_type" defaultValue={v("organization_type", "OnlineStore")} className={inputCls}>
              {["OnlineStore", "Store", "Organization"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Field name="organization_logo" title="Logo" value={v("organization_logo")} placeholder="/assets/logo-black.png" span hint="Square or wide PNG, at least 112×112." />
          <Field name="business_address" title="Street address" value={v("business_address")} span />
          <Field name="business_city" title="City" value={v("business_city")} />
          <Field name="business_state" title="State" value={v("business_state")} />
          <Field name="business_postal" title="PIN code" value={v("business_postal")} />
          <Field name="business_country" title="Country" value={v("business_country")} />
        </Section>

        <div className="flex justify-end pt-6">
          <SubmitButton className={primaryBtn}>Save SEO settings</SubmitButton>
        </div>
      </form>
    </SeoShell>
  );
}
