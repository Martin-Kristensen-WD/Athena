import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.onboardingCompleted = user.onboardingCompleted;
        token.role = user.role;
      }
      if (trigger === "update" && session) {
        if (typeof session.onboardingCompleted === "boolean") {
          token.onboardingCompleted = session.onboardingCompleted;
        }
        if (session.role) {
          token.role = session.role;
        }
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.onboardingCompleted = token.onboardingCompleted as boolean;
      session.user.role = token.role as "user" | "admin";
      return session;
    },
  },
} satisfies NextAuthConfig;
