"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { MeasurementType } from "@/db/schema";
import { MEASUREMENT_LABELS, MEASUREMENT_UNIT } from "@/app/dashboard/measurements/constants";
import { DeltaBadge } from "./delta-badge";
import { TrendChart } from "./trend-chart";

export function MeasurementsChart({
  seriesByType,
}: {
  seriesByType: Partial<Record<MeasurementType, { date: string; value: number }[]>>;
}) {
  const availableTypes = (Object.keys(seriesByType) as MeasurementType[]).filter(
    (type) => (seriesByType[type]?.length ?? 0) > 0
  );
  const [selected, setSelected] = useState<MeasurementType | null>(null);

  if (availableTypes.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Ingen kropsmål registreret endnu.
      </p>
    );
  }

  const activeType = selected && availableTypes.includes(selected) ? selected : availableTypes[0];
  const series = seriesByType[activeType] ?? [];
  const first = series[0];
  const latest = series[series.length - 1];
  const delta = series.length >= 2 ? latest.value - first.value : null;

  return (
    <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
      <div className="flex gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
        {availableTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelected(type)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
              type === activeType
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {MEASUREMENT_LABELS[type]}
          </button>
        ))}
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">{MEASUREMENT_LABELS[activeType]}</span>{" "}
            {latest && (
              <span className="text-muted-foreground text-sm tabular-nums">
                {latest.value.toLocaleString("da-DK")} {MEASUREMENT_UNIT}
              </span>
            )}
          </div>
          {delta !== null && <DeltaBadge delta={delta} unit={MEASUREMENT_UNIT} />}
        </div>
        <TrendChart
          data={series}
          emptyMessage="Registrer denne måling på mindst to forskellige dage for at se en graf."
        />
      </div>
    </div>
  );
}
