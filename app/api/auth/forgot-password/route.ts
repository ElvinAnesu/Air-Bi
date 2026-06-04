import { NextRequest, NextResponse } from "next/server"
import { getAppBaseUrl } from "@/lib/server/billing/config"
import { createSupabaseAuthClient } from "@/lib/supabase/auth-client"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body.email === "string" ? body.email.trim() : ""

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabaseAuth = createSupabaseAuthClient()
    const redirectTo = `${getAppBaseUrl()}/auth/reset-password`

    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, { redirectTo })

    if (error) {
      console.error("[auth/forgot-password]", error.message)
    }

    return NextResponse.json({
      ok: true,
      message:
        "If an account exists for that email, we sent a password reset link. Check your inbox.",
    })
  } catch (err) {
    console.error("[auth/forgot-password]", err)
    return NextResponse.json({ error: "Could not send reset email. Please try again." }, { status: 500 })
  }
}
