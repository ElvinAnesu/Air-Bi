import { NextRequest, NextResponse } from "next/server"
import { applyRefreshedSessionCookies } from "@/lib/supabase/cookies"
import { getRefreshToken, resolveAuth } from "@/lib/supabase/auth"

/**
 * Silently renews the access token using the refresh cookie.
 * Call on app load so persisted sessions survive browser restarts.
 */
export async function POST(req: NextRequest) {
  const refreshToken = getRefreshToken(req)
  if (!refreshToken) {
    return NextResponse.json({ error: "No session" }, { status: 401 })
  }

  const resolved = await resolveAuth(req)
  if (!resolved) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  if (resolved.refreshed && resolved.session) {
    applyRefreshedSessionCookies(res, resolved.session)
  }
  return res
}
