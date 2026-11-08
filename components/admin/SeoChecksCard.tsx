import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import type { SeoCheck } from "@/lib/seo-checks";

// The score and the list of SEO checks for one URL, shown wherever SEO is edited.
export default function SeoChecksCard({ checks, score, className = "" }: { checks: SeoCheck[]; score: number; className?: string }) {
  const scoreTone = score >= 80 ? "text-emerald-700 dark:text-emerald-400" : score >= 50 ? "text-amber-700 dark:text-amber-400" : "text-red-700 dark:text-red-400";
  return (
    <section className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">SEO checks</h3>
        <span className={`font-display text-2xl font-bold ${scoreTone}`}>{score}</span>
      </div>
      <ul className="mt-4 space-y-2.5">
        {checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2 text-xs">
            {c.ok === true ? (
              <CheckCircle2 className="mt-px h-4 w-4 flex-shrink-0 text-emerald-700 dark:text-emerald-400" aria-label="Pass" />
            ) : c.ok === false ? (
              <AlertTriangle className="mt-px h-4 w-4 flex-shrink-0 text-amber-700 dark:text-amber-400" aria-label="Needs work" />
            ) : (
              <Circle className="mt-px h-4 w-4 flex-shrink-0 text-muted-foreground" aria-label="Not checked yet" />
            )}
            <span className={c.ok === null ? "text-muted-foreground" : "text-foreground"}>{c.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
