import { z } from "zod";

export const shareProgrammeSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Angiv en e-mail")
    .email("Angiv en gyldig e-mail"),
});

export type ShareProgrammeInput = z.infer<typeof shareProgrammeSchema>;
