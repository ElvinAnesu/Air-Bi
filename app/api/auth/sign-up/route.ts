import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAuthClient } from "@/lib/supabase/auth-client"
import { setAuthCookies } from "@/lib/supabase/auth"

export async function POST(req: NextRequest) {
  const { email, password, fullName } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  const supabaseAuth = createSupabaseAuthClient()
  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName ?? email.split("@")[0] },
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  let session = data.session

  if (!session) {
    const { data: signInData, error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !signInData.session) {
      return NextResponse.json(
        { error: "Account created but sign-in failed. Please sign in manually." },
        { status: 500 }
      )
    }

    session = signInData.session
  }

  const res = NextResponse.json({ ok: true, userId: data.user?.id })
  setAuthCookies(res, session.access_token, session.refresh_token, session.expires_in)
  return res
}
