"use client";

// An admin screen failed: the sidebar stays, so the rest of the panel is still reachable.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">This screen couldn&apos;t load</h1>
      <p className="max-w-md text-sm text-muted-foreground">Nothing was changed. Try again, or open another section from the menu.</p>
      <button onClick={reset} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Try again</button>
    </div>
  );
}
