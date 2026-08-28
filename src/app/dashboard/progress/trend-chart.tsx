"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
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
} satisfies ChartConfig;

export function TrendChart({
  data,
  emptyMessage = "Registrer mindst to målinger på forskellige dage for at se en graf.",
}: {
  data: { date: string; value: number }[];
  emptyMessage?: string;
}) {
  if (data.length < 2) {
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
      <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
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
        <YAxis tickLine={false} axisLine={false} width={40} domain={["auto", "auto"]} />
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
