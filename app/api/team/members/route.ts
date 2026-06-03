import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { planLimitResponse } from "@/lib/server/billing/enforce"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  const { data, error } = await supabaseAdmin
    .from("team_members")
    .select("id, user_id, role, joined_at")
    .eq("team_id", auth!.teamId)
    .order("joined_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const userIds = rows.map((row) => row.user_id)
  const { data: profiles } = userIds.length
    ? await supabaseAdmin.from("profiles").select("id, email, full_name").in("id", userIds)
    : { data: [] as { id: string; email: string; full_name: string | null }[] }

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  const members = rows.map((row) => {
    const profile = profileById.get(row.user_id)
    return {
      id: row.id,
      userId: row.user_id,
      role: row.role,
      joinedAt: row.joined_at,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? null,
    }
  })

  return NextResponse.json({ members })
}

export async function POST(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  if (auth!.role !== "owner" && auth!.role !== "admin") {
    return NextResponse.json({ error: "Only team owners and admins can invite members." }, { status: 403 })
  }

  const limitResponse = await planLimitResponse(auth!, "team_members")
  if (limitResponse) return limitResponse

  const { email, role } = await req.json()
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 })
  }

  const memberRole = role === "admin" ? "admin" : "member"
  const normalizedEmail = email.trim().toLowerCase()

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name")
    .ilike("email", normalizedEmail)
    .maybeSingle()

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })
  if (!profile) {
    return NextResponse.json(
      { error: "No AirBI account found for that email. They must sign up first." },
      { status: 404 }
    )
  }

  if (profile.id === auth!.user.id) {
    return NextResponse.json({ error: "You are already a member of this team." }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from("team_members")
    .select("id")
    .eq("team_id", auth!.teamId)
    .eq("user_id", profile.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: "That user is already on your team." }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("team_members")
    .insert({
      team_id: auth!.teamId,
      user_id: profile.id,
      role: memberRole,
      invited_by: auth!.user.id,
    })
    .select("id, user_id, role, joined_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    {
      id: data.id,
      userId: data.user_id,
      role: data.role,
      joinedAt: data.joined_at,
      fullName: profile.full_name,
      email: profile.email,
    },
    { status: 201 }
  )
}
