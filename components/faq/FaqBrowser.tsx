"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type FaqGroup = { id: string; label: string; items: [string, string][] };

export default function FaqBrowser({ groups }: { groups: FaqGroup[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("all");
  const q = query.trim().toLowerCase();

  const visible = groups
    .filter((g) => active === "all" || g.id === active)
    .map((g) => ({ ...g, items: g.items.filter(([question, answer]) => !q || `${question} ${answer}`.toLowerCase().includes(q)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative">
        <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search FAQs…" aria-label="Search FAQs" className="h-11 rounded-full pl-10" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
        {[{ id: "all", label: "All Questions" }, ...groups].map((g) => (
          <button
            key={g.id}
            type="button"
            aria-pressed={active === g.id}
            onClick={() => setActive(g.id)}
            className={cn("rounded-full border px-4 py-2 text-sm transition-colors", active === g.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary hover:text-primary")}
          >
            {g.label}
          </button>
        ))}
      </div>
      {visible.map((g) => (
        <div key={g.id} className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">{g.label}</h2>
          <Accordion type="single" collapsible className="mt-2">
            {g.items.map(([question, answer]) => (
              <AccordionItem key={question} value={question}>
                <AccordionTrigger className="text-left">{question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
      {visible.length === 0 && <p className="mt-10 text-center text-muted-foreground" role="status">No FAQs match your search. Try different keywords.</p>}
    </div>
  );
}
