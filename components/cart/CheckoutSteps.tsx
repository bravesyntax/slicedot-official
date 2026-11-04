import { Check } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

const STEPS = ["Bag", "Address", "Payment"];

export default function CheckoutSteps({ current }: { current: number }) {
  return (
    <ol className="flex items-center justify-center gap-2 text-sm" aria-label="Checkout steps">
      {STEPS.map((step, i) => (
        <Fragment key={step}>
          {i > 0 && <li aria-hidden="true" className="h-px w-6 bg-border sm:w-12" />}
          <li aria-current={i === current ? "step" : undefined} className={cn("flex items-center gap-1.5", i === current ? "font-medium" : "text-muted-foreground")}>
            <span className={cn("grid size-6 place-items-center rounded-full border text-xs", i <= current && "border-primary bg-primary text-primary-foreground")}>
              {i < current ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
            </span>
            {step}
          </li>
        </Fragment>
      ))}
    </ol>
  );
}
