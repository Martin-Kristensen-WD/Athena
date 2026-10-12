"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { MuscleVolumeChart } from "./strength-queries";

// Stable colour per muscle group so the stack reads the same across ranges.
const MUSCLE_COLORS: Record<string, string> = {
  chest: "#ef5a30",
  back: "#6b8afd",
  quad: "#34d399",
  hamstring: "#10b981",
  shoulders: "#f59e0b",
  biceps: "#a78bfa",
  triceps: "#22d3ee",
  glutes: "#f472b6",
  calves: "#6ee7b7",
  core: "#e8c15f",
  cardio: "#94a3b8",
  full_body: "#4ade80",
  other: "#cbd5e1",
};

const compact = new Intl.NumberFormat("da-DK", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function VolumeChart({ data }: { data: MuscleVolumeChart }) {
  if (data.buckets.length === 0 || data.groups.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Ingen registreret træningsvolumen i den valgte periode.
      </p>
    );
  }

  const config: ChartConfig = Object.fromEntries(
    data.groups.map((group) => [
      group.muscleGroup,
      {
        label: group.label,
        color: MUSCLE_COLORS[group.muscleGroup] ?? "var(--color-chart-1)",
      },
    ])
  );

  const rows = data.buckets.map((bucket, index) => {
    const row: Record<string, string | number> = { bucket: bucket.label };
    for (const group of data.groups) {
      row[group.muscleGroup] = group.values[index];
    }
    return row;
  });

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart data={rows} margin={{ left: 8, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="bucket"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(value: number) => compact.format(value)}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {data.groups.map((group) => (
          <Bar
            key={group.muscleGroup}
            dataKey={group.muscleGroup}
            stackId="volume"
            fill={`var(--color-${group.muscleGroup})`}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
