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
    .min(1, "Navn er påkrævet")
    .max(200, "Navnet er for langt"),
  muscleGroup: z.enum(muscleGroupEnum.enumValues, {
    error: "Vælg en muskelgruppe",
  }),
  equipment: z
    .string()
    .trim()
    .max(200, "Udstyr er for langt")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(2000, "Noter er for lange")
    .optional()
    .or(z.literal("")),
});

export type ExerciseFormInput = z.infer<typeof exerciseFormSchema>;
