import Link from "next/link";
import { cn } from "@/lib/utils";

const VIEWS = [
  { key: "main", href: "/dashboard", label: "Dashboard" },
  { key: "progress", href: "/dashboard/progress", label: "Fremgang" },
] as const;

export function DashboardViewToggle({
  active,
}: {
  active: (typeof VIEWS)[number]["key"];
}) {
  const activeIndex = VIEWS.findIndex((view) => view.key === active);

  return (
    <div className="relative inline-flex rounded-full border border-border bg-muted p-1">
      <div
        className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-full bg-background shadow-sm transition-transform duration-200"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
        aria-hidden
      />
      {VIEWS.map((view) => (
        <Link
          key={view.key}
          href={view.href}
          className={cn(
            "relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            view.key === active
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {view.label}
        </Link>
      ))}
    </div>
  );
}
