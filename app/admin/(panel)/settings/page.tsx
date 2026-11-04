import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { SubmitButton } from "@/components/admin/client";
import { AdminPage, Card, inputCls, labelCls, primaryBtn, secondaryBtn, Toggle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { finish, refreshPublicSite } from "@/lib/admin/common";
import { passwordFingerprint, SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/admin/session";
import { rows, sql } from "@/lib/db";
import { COD_FEE, FREE_SHIPPING_FROM, SHIPPING_FEE } from "@/lib/pricing";
import { field, isValidEmail } from "@/lib/validation";

export const metadata = { title: "Settings" };

const BACK = "/admin/settings";
// Only these keys are read or written here. Payment keys and other secrets live in environment variables, never in this table.
const TEXT_KEYS = ["store_name", "store_email", "store_phone", "store_address", "gstin", "instagram", "facebook", "twitter", "pinterest", "youtube", "review_min_length"];
const SWITCH_KEYS = ["reviews_enabled", "review_auto_approve", "review_require_purchase"];

async function saveSettings(fd: FormData) {
  "use server";
  await requireAdmin();
  const email = field(fd, "store_email");
  if (email && !isValidEmail(email)) await finish("error", "Enter a valid store email.", BACK);
  const keys = [...TEXT_KEYS, ...SWITCH_KEYS];
  const values = [...TEXT_KEYS.map((k) => field(fd, k).slice(0, 500)), ...SWITCH_KEYS.map((k) => (fd.get(k) ? "1" : "0"))];
  await sql`
    INSERT INTO settings (setting_key, setting_value) SELECT * FROM unnest(${keys}::text[], ${values}::text[])
    ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = LOCALTIMESTAMP
  `;
  refreshPublicSite();
  await finish("success", "Settings saved.", BACK);
}

async function saveAccount(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const [user] = await rows<{ password: string }>(sql`SELECT password FROM admin_users WHERE id = ${admin.id}`);
  const current = String(fd.get("current_password") ?? "");
  if (!(await bcrypt.compare(current, user.password))) await finish("error", "Your current password isn't right.", BACK);

  const email = field(fd, "email");
  const name = field(fd, "full_name").slice(0, 100);
  if (!isValidEmail(email)) await finish("error", "Enter a valid email; sign-in codes go there.", BACK);
  const next = String(fd.get("new_password") ?? "");
  if (next && next.length < 10) await finish("error", "The new password must be at least 10 characters.", BACK);
  if (next && next !== String(fd.get("confirm_password") ?? "")) await finish("error", "The new passwords don't match.", BACK);

  const hash = next ? await bcrypt.hash(next, 12) : user.password;
  await sql`UPDATE admin_users SET email = ${email}, full_name = ${name}, password = ${hash}, updated_at = LOCALTIMESTAMP WHERE id = ${admin.id}`;
  // A new password ends every other session; this browser gets a fresh one.
  if (next) (await cookies()).set(SESSION_COOKIE, await signSession({ uid: admin.id, u: admin.username, pv: await passwordFingerprint(hash) }), sessionCookieOptions);
  await finish("success", next ? "Account saved and password changed. Other devices are signed out." : "Account saved.", BACK);
}

function Field({ name, label, value, type = "text", hint }: { name: string; label: string; value: string; type?: string; hint?: string }) {
  return (
    <div>
      <label htmlFor={name} className={labelCls}>{label}</label>
      <input id={name} name={name} type={type} defaultValue={value} className={inputCls} />
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const keys = [...TEXT_KEYS, ...SWITCH_KEYS];
  const [data, [account]] = await Promise.all([
    rows<{ setting_key: string; setting_value: string | null }>(sql`SELECT setting_key, setting_value FROM settings WHERE setting_key IN ${sql(keys)}`),
    rows<{ username: string; email: string; full_name: string }>(sql`SELECT username, email, full_name FROM admin_users WHERE id = ${admin.id}`),
  ]);
  const v = (k: string) => data.find((r) => r.setting_key === k)?.setting_value ?? "";

  return (
    <AdminPage title="Settings">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form action={saveSettings} className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold">Store details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field name="store_name" label="Store name" value={v("store_name")} />
              <Field name="store_email" label="Public email" value={v("store_email")} type="email" />
              <Field name="store_phone" label="Public phone" value={v("store_phone")} />
              <Field name="gstin" label="GSTIN" value={v("gstin")} hint="Printed on invoices." />
              <div className="md:col-span-2"><label htmlFor="store_address" className={labelCls}>Address</label><textarea id="store_address" name="store_address" rows={2} defaultValue={v("store_address")} className={inputCls} /></div>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold">Social links</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {["instagram", "facebook", "twitter", "pinterest", "youtube"].map((k) => <Field key={k} name={k} label={`${k[0].toUpperCase()}${k.slice(1)}`} value={v(k)} type="url" />)}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold">Reviews</h2>
            <div className="space-y-4">
              <Toggle name="reviews_enabled" label="Customers can write reviews" defaultChecked={v("reviews_enabled") !== "0"} />
              <Toggle name="review_auto_approve" label="Publish signed-in customers' reviews without approval" defaultChecked={v("review_auto_approve") === "1"} />
              <Toggle name="review_require_purchase" label="Only customers who bought the product can review it" defaultChecked={v("review_require_purchase") === "1"} />
              <div className="max-w-40"><Field name="review_min_length" label="Minimum length" value={v("review_min_length") || "50"} type="number" /></div>
            </div>
          </Card>
          <SubmitButton className={primaryBtn}>Save settings</SubmitButton>
        </form>

        <aside className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold">Your admin account</h2>
            <p className="mb-4 text-xs text-muted-foreground">Signed in as {account.username}. Your current password is needed for any change here.</p>
            <form action={saveAccount} className="space-y-4">
              <Field name="full_name" label="Name" value={account.full_name} />
              <Field name="email" label="Email for sign-in codes" value={account.email} type="email" />
              <div><label htmlFor="new_password" className={labelCls}>New password <span className="opacity-70">(optional)</span></label><input id="new_password" name="new_password" type="password" minLength={10} autoComplete="new-password" className={inputCls} /></div>
              <div><label htmlFor="confirm_password" className={labelCls}>Repeat new password</label><input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" className={inputCls} /></div>
              <div><label htmlFor="current_password" className={labelCls}>Current password</label><input id="current_password" name="current_password" type="password" required autoComplete="current-password" className={inputCls} /></div>
              <SubmitButton className={secondaryBtn}>Save account</SubmitButton>
            </form>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Charges</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>₹{SHIPPING_FEE}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Free shipping from</dt><dd>₹{FREE_SHIPPING_FROM}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">COD fee</dt><dd>₹{COD_FEE}</dd></div>
            </dl>
            <p className="mt-3 text-[11px] text-muted-foreground">These are fixed in the code, so checkout totals can&apos;t change by accident.</p>
          </Card>
        </aside>
      </div>
    </AdminPage>
  );
}
