"use client";

import { useMemo, useState } from "react";
import { TrackingCalendar } from "@/components/tracking-calendar";
import { EditFoodDayDialog } from "./edit-food-day-dialog";
import type { FoodDayRow } from "./food-log-list";

export function FoodCalendarSection({
  year,
  monthIndex,
  trackedDays,
  todayKey,
  dailyValues,
}: {
  year: number;
  monthIndex: number;
  /** Date keys (YYYY-MM-DD) with a registration, as an array — a Set can't
   * cross the server/client boundary as a prop. */
  trackedDays: string[];
  todayKey: string;
  /** Kcal/protein/carbs/fat totals per day (YYYY-MM-DD), for pre-filling the edit dialog. */
  dailyValues: Record<string, FoodDayRow>;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const trackedDaySet = useMemo(() => new Set(trackedDays), [trackedDays]);

  return (
    <>
      <TrackingCalendar
        year={year}
        monthIndex={monthIndex}
        trackedDays={trackedDaySet}
        todayKey={todayKey}
        onSelectDay={setSelectedDate}
      />
      <EditFoodDayDialog
        date={selectedDate}
        onOpenChange={(open) => !open && setSelectedDate(null)}
        initialValues={selectedDate ? (dailyValues[selectedDate] ?? null) : null}
      />
    </>
  );
}
