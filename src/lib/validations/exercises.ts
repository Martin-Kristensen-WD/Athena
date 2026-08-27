import { z } from "zod";
import { muscleGroupEnum } from "@/db/schema";

export const MUSCLE_GROUP_OPTIONS: { value: string; label: string }[] =
  muscleGroupEnum.enumValues.map((value) => ({
    value,
    label: value
      .split("_")
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(" "),
  }));

export const exerciseFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(200, "Name is too long"),
  muscleGroup: z.enum(muscleGroupEnum.enumValues, {
    error: "Select a muscle group",
  }),
  equipment: z
    .string()
    .trim()
    .max(200, "Equipment is too long")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes are too long")
    .optional()
    .or(z.literal("")),
});

export type ExerciseFormInput = z.infer<typeof exerciseFormSchema>;
