import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAuthClient } from "@/lib/supabase/auth-client"
import { setAuthCookies } from "@/lib/supabase/cookies"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body.email === "string" ? body.email.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""

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
  } catch (err) {
    console.error("[auth/sign-in]", err)
    const message = err instanceof Error ? err.message : "Sign-in failed"
    const isConfig = message.includes("Missing Supabase environment")
    return NextResponse.json(
      {
        error: isConfig
          ? "Authentication is not configured on the server. Contact your administrator."
          : "Sign-in failed. Please try again.",
      },
      { status: isConfig ? 503 : 500 }
    )
  }
}
