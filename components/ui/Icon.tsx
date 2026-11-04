// Outline (stroke) SVG icon from one or more 24×24 path strings.
export default function Icon({
  d,
  className,
  strokeWidth = 1.8,
}: {
  d: string | string[];
  className: string;
  strokeWidth?: number;
}) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      {(Array.isArray(d) ? d : [d]).map((p) => (
        <path key={p} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d={p} />
      ))}
    </svg>
  );
}

export const ICONS = {
  check: "M5 13l4 4L19 7",
  arrowRight: "M13 7l5 5m0 0l-5 5m5-5H6",
  chevronDown: "M19 9l-7 7-7-7",
  mail: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  pin: [
    "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z",
    "M15 11a3 3 0 11-6 0 3 3 0 016 0z",
  ],
};

/** Animated "live" dot used in hero badges. */
export function PingDot() {
  return (
    <span className="relative flex h-2 w-2" aria-hidden="true">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  );
}

/** Small green pill label above section headings. */
export function SectionBadge({ children, className = "mb-5" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
      <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">{children}</span>
    </div>
  );
}
