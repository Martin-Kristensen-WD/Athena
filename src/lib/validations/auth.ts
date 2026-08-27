import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Indtast en gyldig e-mailadresse"),
  password: z.string().min(1, "Adgangskode er påkrævet"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string().min(1, "Navn er påkrævet"),
  email: z.string().email("Indtast en gyldig e-mailadresse"),
  password: z.string().min(8, "Adgangskoden skal være mindst 8 tegn"),
});

export type SignupInput = z.infer<typeof signupSchema>;
