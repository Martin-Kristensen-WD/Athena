"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Recharts is heavy; defer each chart into its own chunk and show a skeleton
// while it loads.
export const TrendChart = dynamic(
  () => import("./trend-chart").then((m) => m.TrendChart),
  { loading: () => <Skeleton className="h-56 w-full" /> }
);

export const MeasurementsChart = dynamic(
  () => import("./measurements-chart").then((m) => m.MeasurementsChart),
  { loading: () => <Skeleton className="h-56 w-full" /> }
);

export const VolumeChart = dynamic(
  () => import("./volume-chart").then((m) => m.VolumeChart),
  { loading: () => <Skeleton className="h-64 w-full" /> }
);

export const ExerciseStrength = dynamic(
  () => import("./exercise-strength").then((m) => m.ExerciseStrength),
  { loading: () => <Skeleton className="h-72 w-full" /> }
);
