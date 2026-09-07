"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  value: {
    label: "Værdi",
    color: "var(--color-primary)",
  },
  average: {
    label: "Gennemsnit",
    color: "var(--color-muted-foreground)",
  },
} satisfies ChartConfig;

export type TrendReferenceLine = { value: number; label: string };

function withMovingAverage(
  data: { date: string; value: number }[],
  window: number
) {
  return data.map((point, index) => {
    const start = Math.max(0, index - window + 1);
    const slice = data.slice(start, index + 1);
    const average =
      slice.reduce((sum, item) => sum + item.value, 0) / slice.length;
    return { ...point, average };
  });
}

export function TrendChart({
  data,
  emptyMessage = "Registrer mindst to målinger på forskellige dage for at se en graf.",
  referenceLines,
  movingAverageWindow,
}: {
  data: { date: string; value: number }[];
  emptyMessage?: string;
  referenceLines?: TrendReferenceLine[];
  movingAverageWindow?: number;
}) {
  if (data.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center">
        <p className="text-muted-foreground text-center text-sm">{emptyMessage}</p>
      </div>
    );
  }

  const chartData =
    movingAverageWindow && movingAverageWindow > 1
      ? withMovingAverage(data, movingAverageWindow)
      : data;

  const refValues = (referenceLines ?? []).map((line) => line.value);
  const allValues = [...data.map((point) => point.value), ...refValues];
  const lo = Math.min(...allValues);
  const hi = Math.max(...allValues);
  const pad = (hi - lo) * 0.08 || 1;
  const domain: [number, number] = [
    Math.floor(lo - pad),
    Math.ceil(hi + pad),
  ];

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
      <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value: string) =>
            new Date(`${value}T00:00:00`).toLocaleDateString("da-DK", {
              day: "numeric",
              month: "short",
            })
          }
        />
        <YAxis tickLine={false} axisLine={false} width={40} domain={domain} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) =>
                new Date(`${value}T00:00:00`).toLocaleDateString("da-DK", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              }
            />
          }
        />
        {(referenceLines ?? []).map((line) => (
          <ReferenceLine
            key={line.label}
            y={line.value}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="6 4"
            strokeOpacity={0.7}
            label={{
              value: line.label,
              position: "insideTopRight",
              fontSize: 11,
              fill: "var(--color-muted-foreground)",
            }}
          />
        ))}
        {movingAverageWindow && movingAverageWindow > 1 && (
          <Line
            dataKey="average"
            type="monotone"
            stroke="var(--color-average)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
        )}
        <Line
          dataKey="value"
          type="monotone"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
