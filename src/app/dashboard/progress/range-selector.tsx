import Link from "next/link";
import { cn } from "@/lib/utils";
import { RANGE_LABELS, RANGE_OPTIONS, type RangeOption } from "./range";

export function RangeSelector({ active }: { active: RangeOption }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full border border-border bg-muted p-1">
      {RANGE_OPTIONS.map((range) => (
        <Link
          key={range}
          href={`/dashboard/progress?range=${range}`}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium transition-colors",
            range === active
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {RANGE_LABELS[range]}
        </Link>
      ))}
    </div>
  );
}
