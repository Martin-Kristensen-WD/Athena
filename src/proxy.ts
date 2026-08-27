import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const onboardingCompleted = req.auth?.user?.onboardingCompleted ?? false;
  const isAdmin = req.auth?.user?.role === "admin";

  const isAuthRoute =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/signup");
  const isOnboardingRoute = nextUrl.pathname.startsWith("/onboarding");
  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard");
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");

  if (!isLoggedIn && (isDashboardRoute || isOnboardingRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn && !onboardingCompleted && isDashboardRoute) {
    return NextResponse.redirect(new URL("/onboarding", nextUrl));
  }

  if (isLoggedIn && onboardingCompleted && isOnboardingRoute) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
  ],
};
