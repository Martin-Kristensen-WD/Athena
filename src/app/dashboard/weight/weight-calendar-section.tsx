"use client";

import { useMemo, useState } from "react";
import { TrackingCalendar } from "@/components/tracking-calendar";
import { EditWeightDayDialog } from "./edit-weight-day-dialog";

export function WeightCalendarSection({
  year,
  monthIndex,
  trackedDays,
  todayKey,
  weightUnit,
  dailyValues,
}: {
  year: number;
  monthIndex: number;
  /** Date keys (YYYY-MM-DD) with a registration, as an array — a Set can't
   * cross the server/client boundary as a prop. */
  trackedDays: string[];
  todayKey: string;
  weightUnit: string;
  /** Latest weight reading per day (YYYY-MM-DD), for pre-filling the edit dialog. */
  dailyValues: Record<string, number>;
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
      <EditWeightDayDialog
        date={selectedDate}
        onOpenChange={(open) => !open && setSelectedDate(null)}
        initialWeight={selectedDate ? (dailyValues[selectedDate] ?? null) : null}
        weightUnit={weightUnit}
      />
    </>
  );
}
