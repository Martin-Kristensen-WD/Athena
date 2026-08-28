import type { MeasurementType, ProgressPhotoView } from "@/db/schema";

export const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  chest: "Bryst",
  waist: "Talje",
  hips: "Hofter",
  shoulders: "Skuldre",
  biceps: "Overarm",
  thigh: "Lår",
  calf: "Læg",
  neck: "Hals",
};

export const PHOTO_VIEW_LABELS: Record<ProgressPhotoView, string> = {
  front: "Forfra",
  side: "Fra siden",
  back: "Bagfra",
};

export const MEASUREMENT_UNIT = "cm";
