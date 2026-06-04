import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAuthClient } from "@/lib/supabase/auth-client"
import { clearAuthCookies, getAccessToken } from "@/lib/supabase/cookies"
import { REFRESH_TOKEN_COOKIE } from "@/lib/supabase/constants"

export async function POST(req: NextRequest) {
  const accessToken = getAccessToken(req)
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value

  if (accessToken && refreshToken) {
    const supabaseAuth = createSupabaseAuthClient()
    await supabaseAuth.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    await supabaseAuth.auth.signOut()
  }

  const res = NextResponse.json({ ok: true })
  clearAuthCookies(res)
  return res
}
