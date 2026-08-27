"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Scale, Footprints, Flame, Moon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_ADD_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard/weight", label: "Vægt", icon: Scale },
  { href: "/dashboard/steps", label: "Skridt", icon: Footprints },
  { href: "/dashboard/food", label: "Kalorier", icon: Flame },
  { href: "/dashboard/sleep", label: "Søvn", icon: Moon },
];

export function QuickAddFab() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Luk hurtig-tilføj"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 cursor-default"
        />
      )}

      <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3">
        {QUICK_ADD_ITEMS.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              tabIndex={open ? 0 : -1}
              className={cn(
                "flex items-center gap-3 transition-all duration-200 ease-out",
                open
                  ? "translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none translate-y-2 scale-75 opacity-0"
              )}
              style={{
                transitionDelay: open ? `${(QUICK_ADD_ITEMS.length - index - 1) * 40}ms` : "0ms",
              }}
            >
              <span className="rounded-lg bg-card px-3 py-1.5 text-sm font-medium whitespace-nowrap text-foreground shadow-sm ring-1 ring-border">
                {item.label}
              </span>
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md ring-1 ring-border transition-transform hover:scale-105">
                <Icon className="size-5" />
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          aria-label={open ? "Luk hurtig-tilføj" : "Hurtig-tilføj"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Plus className={cn("size-6 transition-transform duration-200", open && "rotate-45")} />
        </button>
      </div>
    </>
  );
}
