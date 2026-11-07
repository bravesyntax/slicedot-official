import { NextResponse, type NextRequest } from "next/server";
import { clearAbandonedCheckouts, lowStockDigest, notifyBackInStock, remindAbandonedBags } from "@/lib/automation";
import { sameHash } from "@/lib/auth/session";

// Daily store chores, run by Vercel Cron (vercel.json). Vercel sends CRON_SECRET as a bearer token; anything else is refused.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 16 || !sameHash(given, `Bearer ${secret}`)) return NextResponse.json({ error: "Not allowed." }, { status: 401 });

  const result: Record<string, number | string> = {};
  for (const [name, job] of [
    ["clearedCheckouts", clearAbandonedCheckouts],
    ["backInStockEmails", notifyBackInStock],
    ["bagReminders", remindAbandonedBags],
    ["lowStockProducts", lowStockDigest],
  ] as const) {
    try {
      result[name] = await job();
    } catch (err) {
      console.error(`[cron] ${name}`, err);
      result[name] = "failed";
    }
  }
  return NextResponse.json(result);
}
