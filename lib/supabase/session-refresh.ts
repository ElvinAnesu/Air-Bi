import type { Session } from "@supabase/supabase-js"
import { createSupabaseAuthClient } from "@/lib/supabase/auth-client"

/** Refresh token cookie lifetime — user stays signed in until sign-out or this elapses. */
export const REFRESH_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365

/**
 * Returns true if the JWT is missing, malformed, or expires within bufferSec.
 */
function decodeJwtPayload(accessToken: string): { exp?: number } | null {
  try {
    const segment = accessToken.split(".")[1]
    if (!segment) return null
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8")
    return JSON.parse(json) as { exp?: number }
  } catch {
    return null
  }
}

export function isAccessTokenExpired(accessToken: string, bufferSec = 60): boolean {
  try {
    const payload = decodeJwtPayload(accessToken)
    if (!payload || typeof payload.exp !== "number") return true
    return payload.exp * 1000 <= Date.now() + bufferSec * 1000
  } catch {
    return true
  }
}

export async function refreshSessionWithToken(
  refreshToken: string
): Promise<Session | null> {
  const supabaseAuth = createSupabaseAuthClient()
  const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token: refreshToken })

  if (error || !data.session) {
    console.error("[auth] refresh failed:", error?.message ?? "no session")
    return null
  }

  return data.session
}
