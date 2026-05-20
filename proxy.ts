import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js Edge Proxy — runs before every matching request.
 * Replaces the deprecated "middleware" convention in Next.js 16.
 *
 * Protected routes: /dashboard, /create-event, /tickets, /scan, /checkout, /admin
 *   → requires a valid access_token cookie (set by AuthContext after login)
 *   → unauthenticated users are redirected to /login?redirect=<path>
 *
 * Auth routes: /login, /signup
 *   → authenticated users are redirected to their respective dashboards based on role
 */

const PROTECTED_PATHS = ["/dashboard", "/create-event", "/tickets", "/scan", "/checkout", "/admin"];
const AUTH_PATHS = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;
  const isAuthenticated = Boolean(token);

  // ── Redirect logged-in users away from auth pages ─────────────────────────
  if (isAuthenticated && AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    const role = request.cookies.get("user_role")?.value;
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (role === "organizer") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // ── Protect private routes ────────────────────────────────────────────────
  if (!isAuthenticated && PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Access control: admin path only for admin role ────────────────────────
  if (isAuthenticated && pathname.startsWith("/admin")) {
    const role = request.cookies.get("user_role")?.value;
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route EXCEPT Next.js internals and static files
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
