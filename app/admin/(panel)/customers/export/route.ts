import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin/auth";
import { rows, sql } from "@/lib/db";

// A leading = + - @ would run as a formula when the file is opened in a spreadsheet.
const cell = (value: unknown) => {
  const text = value == null ? "" : value instanceof Date ? value.toISOString() : String(value);
  return `"${(/^[=+\-@\t\r]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
};

export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const data = await rows<Record<string, unknown>>(sql`SELECT id, first_name, last_name, email, phone, status, created_at, last_login FROM customers ORDER BY id`);
  const columns = ["id", "first_name", "last_name", "email", "phone", "status", "created_at", "last_login"];
  const csv = [columns.join(","), ...data.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\r\n");
  return new NextResponse(`﻿${csv}`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="slicedot-customers.csv"', "Cache-Control": "no-store" },
  });
}
