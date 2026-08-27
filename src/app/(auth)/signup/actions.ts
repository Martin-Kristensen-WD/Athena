"use server";

import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { signIn } from "@/auth";

export async function signupAction(values: SignupInput) {
  const parsed = signupSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Invalid signup details" };
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const db = getDb();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(users).values({
    name,
    email: normalizedEmail,
    passwordHash,
  });

  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirectTo: "/onboarding",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Please log in." };
    }
    throw error;
  }
}
