"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

const VIEWS = [
  { key: "main", href: "/dashboard", label: "Dashboard" },
  { key: "progress", href: "/dashboard/progress", label: "Fremgang" },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

export function DashboardViewToggle({ active }: { active: ViewKey }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticActive, setOptimisticActive] = useState<ViewKey>(active);

  const displayedActive = isPending ? optimisticActive : active;
  const activeIndex = VIEWS.findIndex((view) => view.key === displayedActive);

  function handleSelect(view: (typeof VIEWS)[number]) {
    if (view.key === active) return;
    setOptimisticActive(view.key);
    startTransition(() => {
      router.push(view.href);
    });
  }

  return (
    <div className="relative inline-flex rounded-full border border-border bg-muted p-1">
      <div
        className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-full bg-background shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
        aria-hidden
      />
      {VIEWS.map((view) => (
        <button
          key={view.key}
          type="button"
          onClick={() => handleSelect(view)}
          className={cn(
            "relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-[color,transform] duration-150 active:scale-95",
            view.key === displayedActive
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
