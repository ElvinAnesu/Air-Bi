import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAuthClient } from "@/lib/supabase/auth-client"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const tokenHash = typeof body.tokenHash === "string" ? body.tokenHash.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!tokenHash) {
      return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 })
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const supabaseAuth = createSupabaseAuthClient()

    const { error: verifyError } = await supabaseAuth.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    })

    if (verifyError) {
      return NextResponse.json(
        { error: verifyError.message ?? "Invalid or expired reset link." },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabaseAuth.auth.updateUser({ password })
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      message: "Password updated. You can sign in with your new password.",
    })
  } catch (err) {
    console.error("[auth/reset-password]", err)
    return NextResponse.json({ error: "Could not reset password. Please try again." }, { status: 500 })
  }
}
