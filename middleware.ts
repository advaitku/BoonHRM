import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Optimistic auth gate: redirects to /login when no session cookie is present.
// Role checks (admin-only areas) are enforced server-side in the page/action —
// never trust the cookie alone.
export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/job-openings/:path*",
    "/candidates/:path*",
    "/admin/:path*",
    "/inbox/:path*",
  ],
};
