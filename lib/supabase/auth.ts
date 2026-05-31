import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "./admin"

export const ACCESS_TOKEN_COOKIE = "sb-access-token"
export const REFRESH_TOKEN_COOKIE = "sb-refresh-token"

/** Cookie options shared between sign-in and sign-out */
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
}

/**
 * Read the access token from request cookies.
 * Returns null if not present.
 */
export function getAccessToken(req: NextRequest | Request): string | null {
  if (req instanceof NextRequest) {
    return req.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null
  }
  // Plain Request (API route) — parse cookie header manually
  const cookieHeader = req.headers.get("cookie") ?? ""
  const match = cookieHeader.match(new RegExp(`${ACCESS_TOKEN_COOKIE}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Validate the access token and return the authenticated user + their primary team.
 * Returns null if the token is missing or invalid.
 */
export async function getAuthUser(req: NextRequest | Request) {
  const token = getAccessToken(req)
  if (!token) return null

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return null

  // Fetch the user&apos;s primary team (the team they own / first membership)
  const { data: membership } = await supabaseAdmin
    .from("team_members")
    .select("team_id, role, teams(id, name, slug)")
    .eq("user_id", data.user.id)
    .order("joined_at", { ascending: true })
    .limit(1)
    .single()

  // Fetch subscription for the team
  const teamId = membership?.team_id ?? null
  let subscription = null
  if (teamId) {
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, status")
      .eq("team_id", teamId)
      .single()
    subscription = sub
  }

  const team = membership?.teams
  const teamRecord = Array.isArray(team) ? team[0] : team
  const teamName = teamRecord && typeof teamRecord === "object" && "name" in teamRecord
    ? String(teamRecord.name)
    : null

  return {
    user: data.user,
    teamId,
    teamName,
    role: membership?.role ?? null,
    subscription,
  }
}

/**
 * Set auth cookies on a NextResponse.
 */
export function setAuthCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  const maxAge = expiresIn ?? 3600
  res.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, { ...COOKIE_OPTS, maxAge })
  res.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, { ...COOKIE_OPTS, maxAge: 60 * 60 * 24 * 30 })
}

/**
 * Clear auth cookies on a NextResponse.
 */
export function clearAuthCookies(res: NextResponse) {
  res.cookies.set(ACCESS_TOKEN_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 })
  res.cookies.set(REFRESH_TOKEN_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 })
}

/**
 * Helper used inside protected API route handlers.
 * Returns the auth context or a 401 NextResponse.
 */
export async function requireAuth(req: Request) {
  const auth = await getAuthUser(req as NextRequest)
  if (!auth) {
    return {
      auth: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }
  return { auth, errorResponse: null }
}
