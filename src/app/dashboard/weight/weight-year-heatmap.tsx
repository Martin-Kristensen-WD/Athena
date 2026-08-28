import { cn } from "@/lib/utils";
import { dateKey } from "./date-utils";

function monthDays(year: number, monthIndex: number) {
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: lastDate }, (_, i) => new Date(year, monthIndex, i + 1));
}

export function WeightYearHeatmap({
  year,
  trackedDays,
}: {
  year: number;
  trackedDays: Set<string>;
}) {
  const monthLabels = Array.from({ length: 12 }, (_, monthIndex) =>
    new Date(year, monthIndex, 1).toLocaleDateString("da-DK", { month: "short" })
  );

  return (
    <div className="flex flex-wrap gap-3">
      {monthLabels.map((label, monthIndex) => (
        <div key={monthIndex} className="flex flex-col items-center gap-1">
          <div className="grid grid-cols-5 gap-[3px]">
            {monthDays(year, monthIndex).map((day) => {
              const key = dateKey(day);
              const tracked = trackedDays.has(key);
              return (
                <span
                  key={key}
                  className={cn(
                    "size-1.5 rounded-[2px]",
                    tracked ? "bg-primary" : "bg-muted"
                  )}
                />
              );
            })}
          </div>
          <span className="text-[10px] text-muted-foreground capitalize">{label}</span>
        </div>
      ))}
    </div>
  );
}
