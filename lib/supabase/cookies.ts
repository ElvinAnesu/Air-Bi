import { NextRequest, NextResponse } from "next/server"
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACTIVE_TEAM_COOKIE,
} from "./constants"
import { REFRESH_COOKIE_MAX_AGE_SEC } from "./session-refresh"

/** Cookie options shared between sign-in and sign-out */
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
}

function readCookie(req: NextRequest | Request, name: string): string | null {
  if (req instanceof NextRequest) {
    return req.cookies.get(name)?.value ?? null
  }
  const cookieHeader = req.headers.get("cookie") ?? ""
  const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function getAccessToken(req: NextRequest | Request): string | null {
  return readCookie(req, ACCESS_TOKEN_COOKIE)
}

export function getRefreshToken(req: NextRequest | Request): string | null {
  return readCookie(req, REFRESH_TOKEN_COOKIE)
}

export function setAuthCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  const accessMaxAge = Math.max(expiresIn ?? 3600, 60)
  res.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, { ...COOKIE_OPTS, maxAge: accessMaxAge })
  res.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...COOKIE_OPTS,
    maxAge: REFRESH_COOKIE_MAX_AGE_SEC,
  })
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.set(ACCESS_TOKEN_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 })
  res.cookies.set(REFRESH_TOKEN_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 })
  res.cookies.set(ACTIVE_TEAM_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 })
}

export function setActiveTeamCookie(res: NextResponse, teamId: string) {
  res.cookies.set(ACTIVE_TEAM_COOKIE, teamId, {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 24 * 365,
  })
}

export function applyRefreshedSessionCookies(
  res: NextResponse,
  session: { access_token: string; refresh_token: string; expires_in: number }
) {
  setAuthCookies(res, session.access_token, session.refresh_token, session.expires_in)
}
