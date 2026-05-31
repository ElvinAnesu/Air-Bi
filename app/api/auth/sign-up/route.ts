import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { setAuthCookies } from "@/lib/supabase/auth"

export async function POST(req: NextRequest) {
  const { email, password, fullName } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,          // skip email verification for now
    user_metadata: { full_name: fullName ?? email.split("@")[0] },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Sign in immediately to get a session
  const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError || !session.session) {
    return NextResponse.json(
      { error: "Account created but sign-in failed. Please sign in manually." },
      { status: 500 }
    )
  }

  const res = NextResponse.json({ ok: true, userId: data.user?.id })
  setAuthCookies(
    res,
    session.session.access_token,
    session.session.refresh_token,
    session.session.expires_in
  )
  return res
}
