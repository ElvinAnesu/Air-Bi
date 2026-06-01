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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type AuthContext = {
  user: NonNullable<Awaited<ReturnType<typeof supabaseAdmin.auth.getUser>>["data"]["user"]>
  teamId: string
  teamName: string | null
  role: string | null
  subscription: { plan: string; status: string } | null
}

/**
 * Read the access token from request cookies.
 * Returns null if not present.
 */
export function getAccessToken(req: NextRequest | Request): string | null {
  if (req instanceof NextRequest) {
    return req.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null
  }
  const cookieHeader = req.headers.get("cookie") ?? ""
  const match = cookieHeader.match(new RegExp(`${ACCESS_TOKEN_COOKIE}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}

function isValidUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}

async function fetchTeamName(teamId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("teams")
    .select("name")
    .eq("id", teamId)
    .maybeSingle()

  return data?.name ?? null
}

async function resolveTeamForUser(userId: string) {
  const { data: membership, error } = await supabaseAdmin
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Failed to load team membership:", error.message)
    return null
  }

  if (!membership?.team_id || !isValidUuid(membership.team_id)) {
    return null
  }

  const teamName = await fetchTeamName(membership.team_id)

  return {
    teamId: membership.team_id,
    teamName,
    role: membership.role ?? null,
  }
}

/**
 * Validate the access token and return the authenticated user + their primary team.
 * Returns null if the token is missing or invalid.
 */
export async function getAuthUser(req: NextRequest | Request): Promise<AuthContext | null> {
  const token = getAccessToken(req)
  if (!token) return null

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return null

  const team = await resolveTeamForUser(data.user.id)
  if (!team) return null

  let subscription: AuthContext["subscription"] = null
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("plan, status")
    .eq("team_id", team.teamId)
    .maybeSingle()
  subscription = sub

  return {
    user: data.user,
    teamId: team.teamId,
    teamName: team.teamName,
    role: team.role,
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
 * Returns the auth context or a 401/403 NextResponse.
 */
export async function requireAuth(req: Request) {
  const auth = await getAuthUser(req as NextRequest)
  if (!auth) {
    return {
      auth: null,
      errorResponse: NextResponse.json(
        { error: "Unauthorized. Please sign in again." },
        { status: 401 }
      ),
    }
  }

  if (!isValidUuid(auth.teamId)) {
    return {
      auth: null,
      errorResponse: NextResponse.json(
        { error: "No workspace found for this account. Please sign out and sign in again." },
        { status: 403 }
      ),
    }
  }

  return { auth, errorResponse: null }
}
