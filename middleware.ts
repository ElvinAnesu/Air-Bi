import { NextRequest, NextResponse } from "next/server"
import { ACCESS_TOKEN_COOKIE } from "@/lib/supabase/auth"

/** Routes that don&apos;t require authentication */
const PUBLIC_PATHS = ["/login"]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths and Next.js internals through
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  // Check for access token cookie
  const token = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  if (!token) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image
     * - favicon.ico
     * - /api/auth/* (auth endpoints are always public)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
