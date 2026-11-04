import { Mail, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Logo from "@/components/Logo";
import { AuroraBackground } from "@/components/velora/aurora-background";
import { DotPattern } from "@/components/velora/grid-pattern";

export const metadata: Metadata = {
  title: { absolute: "Under Maintenance | SliceDot" },
  description: "SliceDot is getting a few upgrades and will be back soon.",
  robots: { index: false, follow: false },
};

// Needs nothing from the database, so it stays up whatever else is happening.
export default function MaintenancePage() {
  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden px-5 py-14 text-center">
      <AuroraBackground intensity="subtle" />
      <DotPattern aria-hidden className="absolute inset-0 -z-10 size-full fill-foreground/10 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="max-w-xl">
        <div className="flex justify-center"><Logo className="h-14" priority /></div>
        <span className="mt-8 inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-sm text-muted-foreground backdrop-blur">
          <Wrench className="size-4" aria-hidden="true" /> Under maintenance
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">We&apos;ll be back soon</h1>
        <p className="mt-4 text-pretty text-muted-foreground">We&apos;re making SliceDot better and will reopen shortly. Thank you for your patience.</p>
        <a href="mailto:info@slicedot.in" className="mt-6 inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline">
          <Mail className="size-4" aria-hidden="true" /> info@slicedot.in
        </a>
      </div>
    </main>
  );
}
