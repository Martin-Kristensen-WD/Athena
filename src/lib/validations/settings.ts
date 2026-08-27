import { z } from "zod";

export const settingsSchema = z.object({
  goalType: z.enum(["lose_weight", "gain_muscle", "maintain"]),
  trackedMetricKeys: z
    .array(z.string())
    .min(1, "Pick at least one metric to track"),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
