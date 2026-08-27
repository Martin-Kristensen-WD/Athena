"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export async function loginAction(values: LoginInput) {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Forkert e-mail eller adgangskode." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Forkert e-mail eller adgangskode." };
    }
    throw error;
  }
}
