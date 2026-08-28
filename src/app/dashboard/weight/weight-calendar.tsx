import { cn } from "@/lib/utils";
import { dateKey } from "./date-utils";

function startOfGrid(year: number, monthIndex: number) {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const mondayIndex = (firstOfMonth.getDay() + 6) % 7;
  return new Date(year, monthIndex, 1 - mondayIndex);
}

export function WeightCalendar({
  year,
  monthIndex,
  trackedDays,
  todayKey,
}: {
  year: number;
  monthIndex: number;
  trackedDays: Set<string>;
  todayKey: string;
}) {
  const lastOfMonth = new Date(year, monthIndex + 1, 0);
  const days: Date[] = [];
  const cursor = startOfGrid(year, monthIndex);
  do {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  } while (days.length % 7 !== 0 || cursor <= lastOfMonth);

  const weekdayLabels = days
    .slice(0, 7)
    .map((day) => day.toLocaleDateString("da-DK", { weekday: "short" }));

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
        {weekdayLabels.map((label, index) => (
          <div key={index} className="text-xs text-muted-foreground capitalize">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const key = dateKey(day);
          const inMonth = day.getMonth() === monthIndex;
          const tracked = trackedDays.has(key);
          const isToday = key === todayKey;
          return (
            <div key={key} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border text-sm tabular-nums",
                  tracked
                    ? "border-primary text-foreground"
                    : "border-muted-foreground/25 text-muted-foreground",
                  !inMonth && "opacity-35"
                )}
              >
                {day.getDate()}
              </div>
              <span
                className={cn(
                  "size-1 rounded-full",
                  isToday ? "bg-foreground" : "bg-transparent"
                )}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border border-primary" />
          Registreret
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border border-muted-foreground/25" />
          Ikke registreret
        </div>
      </div>
    </div>
  );
}
