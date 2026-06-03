import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAuthClient } from "@/lib/supabase/auth-client"
import { setAuthCookies } from "@/lib/supabase/auth"

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
  }

  const supabaseAuth = createSupabaseAuthClient()
  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    return NextResponse.json(
      { error: error?.message ?? "Invalid credentials" },
      { status: 401 }
    )
  }

  const res = NextResponse.json({ ok: true })
  setAuthCookies(
    res,
    data.session.access_token,
    data.session.refresh_token,
    data.session.expires_in
  )
  return res
}
