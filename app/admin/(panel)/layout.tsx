import type { Metadata } from "next";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { requireAdmin } from "@/lib/admin/auth";
import { SITE_NAME } from "@/lib/config";
import { rows, sql } from "@/lib/db";

export const metadata: Metadata = {
  title: { template: `%s | Admin - ${SITE_NAME}`, default: `Admin - ${SITE_NAME}` },
  robots: { index: false, follow: false },
};

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [badges] = await rows<{ orders: number; reviews: number; messages: number }>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM orders WHERE order_status = 'pending') AS orders,
      (SELECT COUNT(*)::int FROM product_reviews WHERE status = 'pending') AS reviews,
      (SELECT COUNT(*)::int FROM contact_messages WHERE is_read = 0) AS messages
  `);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground lg:flex-row">
      <AdminSidebar badges={badges} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
