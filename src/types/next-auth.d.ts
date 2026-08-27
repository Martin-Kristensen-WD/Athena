import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    onboardingCompleted: boolean;
    role: "user" | "admin";
  }

  interface Session {
    user: {
      id: string;
      onboardingCompleted: boolean;
      role: "user" | "admin";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    onboardingCompleted?: boolean;
    role?: "user" | "admin";
  }
}
