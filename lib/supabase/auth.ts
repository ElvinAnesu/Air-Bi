import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "./admin"
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACTIVE_TEAM_COOKIE,
} from "./constants"
import {
  applyRefreshedSessionCookies,
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
  setActiveTeamCookie,
  setAuthCookies,
} from "./cookies"
import { isAccessTokenExpired, refreshSessionWithToken } from "./session-refresh"

export {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACTIVE_TEAM_COOKIE,
  getAccessToken,
  getRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  setActiveTeamCookie,
  applyRefreshedSessionCookies,
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

async function resolveTeamForUser(userId: string, req?: NextRequest | Request) {
  const { data: memberships, error } = await supabaseAdmin
    .from("team_members")
    .select("team_id, role, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })

  if (error) {
    console.error("Failed to load team membership:", error.message)
    return null
  }

  if (!memberships?.length) return null

  const preferredTeamId =
    req instanceof NextRequest
      ? req.cookies.get(ACTIVE_TEAM_COOKIE)?.value
      : req
        ? (() => {
            const cookieHeader = req.headers.get("cookie") ?? ""
            const match = cookieHeader.match(new RegExp(`${ACTIVE_TEAM_COOKIE}=([^;]+)`))
            return match ? decodeURIComponent(match[1]) : null
          })()
        : null

  const membership =
    (preferredTeamId &&
      isValidUuid(preferredTeamId) &&
      memberships.find((row) => row.team_id === preferredTeamId)) ||
    memberships[0]

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

async function buildAuthContextFromAccessToken(
  accessToken: string,
  req: NextRequest | Request
): Promise<AuthContext | null> {
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken)
  if (error || !data.user) return null

  const team = await resolveTeamForUser(data.user.id, req)
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

export type AuthResolution = {
  auth: AuthContext
  /** Set to true when tokens were renewed via refresh cookie — attach cookies on the response. */
  refreshed: boolean
  session?: {
    access_token: string
    refresh_token: string
    expires_in: number
  }
}

/**
 * Resolve the current user from cookies, refreshing the session when the access token expired.
 */
export async function resolveAuth(req: NextRequest | Request): Promise<AuthResolution | null> {
  const accessToken = getAccessToken(req)
  const refreshToken = getRefreshToken(req)

  if (accessToken && !isAccessTokenExpired(accessToken)) {
    const auth = await buildAuthContextFromAccessToken(accessToken, req)
    if (auth) return { auth, refreshed: false }
  }

  if (!refreshToken) return null

  const session = await refreshSessionWithToken(refreshToken)
  if (!session) return null

  const auth = await buildAuthContextFromAccessToken(session.access_token, req)
  if (!auth) return null

  return {
    auth,
    refreshed: true,
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
    },
  }
}

/**
 * Validate the access token and return the authenticated user + their primary team.
 * Refreshes automatically when the access token is expired but the refresh token is valid.
 */
export async function getAuthUser(req: NextRequest | Request): Promise<AuthContext | null> {
  const result = await resolveAuth(req)
  return result?.auth ?? null
}

/**
 * Helper used inside protected API route handlers.
 * Returns the auth context or a 401/403 NextResponse.
 */
export async function requireAuth(req: Request) {
  const resolved = await resolveAuth(req as NextRequest)
  if (!resolved) {
    return {
      auth: null,
      errorResponse: NextResponse.json(
        { error: "Unauthorized. Please sign in again." },
        { status: 401 }
      ),
    }
  }

  const { auth } = resolved

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
