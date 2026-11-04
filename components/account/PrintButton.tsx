"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrintButton() {
  return <Button className="rounded-full print:hidden" onClick={() => window.print()}><Printer aria-hidden="true" /> Print / Save as PDF</Button>;
}
