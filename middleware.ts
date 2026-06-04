import { NextRequest, NextResponse } from "next/server"
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/supabase/constants"
import { setAuthCookies } from "@/lib/supabase/cookies"
import { isAccessTokenExpired, refreshSessionWithToken } from "@/lib/supabase/session-refresh"

/** Routes that don&apos;t require authentication */
const PUBLIC_PATHS = ["/login", "/share", "/pricing", "/auth/reset-password"]

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/api/billing/pesepay/result") ||
    pathname === "/favicon.ico"
  )
}

function redirectToLogin(req: NextRequest): NextResponse {
  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = "/login"
  if (req.nextUrl.pathname !== "/") {
    loginUrl.searchParams.set("redirectTo", req.nextUrl.pathname)
  }
  return NextResponse.redirect(loginUrl)
}

async function tryAttachRefreshedSession(
  req: NextRequest,
  res: NextResponse
): Promise<NextResponse | null> {
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value
  if (!refreshToken) return null

  const accessToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  if (accessToken && !isAccessTokenExpired(accessToken)) {
    return res
  }

  const session = await refreshSessionWithToken(refreshToken)
  if (!session) return null

  setAuthCookies(res, session.access_token, session.refresh_token, session.expires_in)
  return res
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname === "/") {
    const accessToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value
    const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value
    if (accessToken || refreshToken) {
      const res = NextResponse.redirect(new URL("/workspace", req.url))
      const attached = await tryAttachRefreshedSession(req, res)
      return attached ?? res
    }
    return NextResponse.next()
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const accessToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value

  if (!accessToken && !refreshToken) {
    return redirectToLogin(req)
  }

  const res = NextResponse.next()
  const refreshed = await tryAttachRefreshedSession(req, res)
  if (refreshed) return refreshed

  if (!accessToken) {
    return redirectToLogin(req)
  }

  return res
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
