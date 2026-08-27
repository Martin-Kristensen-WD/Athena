import { z } from "zod";

export const settingsSchema = z.object({
  trackedMetricKeys: z.array(z.string()),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
