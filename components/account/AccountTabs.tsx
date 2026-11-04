"use client";

import { Heart, MapPin, Package, User } from "lucide-react";
import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { value: "profile", label: "Profile", icon: User },
  { value: "orders", label: "Orders", icon: Package },
  { value: "addresses", label: "Addresses", icon: MapPin },
  { value: "wishlist", label: "Wishlist", icon: Heart },
] as const;

export default function AccountTabs({ initial, panels }: { initial: string; panels: Record<(typeof TABS)[number]["value"], ReactNode> }) {
  return (
    <Tabs
      defaultValue={TABS.some((t) => t.value === initial) ? initial : "profile"}
      // Keeps the tab across reloads and sign-in redirects without a server round trip.
      onValueChange={(tab) => window.history.replaceState(null, "", `/account?tab=${tab}`)}
    >
      <TabsList className="scrollbar-hide h-auto w-full justify-start overflow-x-auto sm:w-fit">
        {TABS.map(({ value, label, icon: Icon }) => (
          <TabsTrigger key={value} value={value} className="gap-1.5 px-3 py-1.5"><Icon aria-hidden="true" /> {label}</TabsTrigger>
        ))}
      </TabsList>
      {TABS.map(({ value }) => (
        <TabsContent key={value} value={value} className="mt-6">{panels[value]}</TabsContent>
      ))}
    </Tabs>
  );
}
