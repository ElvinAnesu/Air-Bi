import { NextRequest, NextResponse } from "next/server"
import { requireAuth, setActiveTeamCookie } from "@/lib/supabase/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  const { teamId } = await req.json()
  if (!teamId || typeof teamId !== "string") {
    return NextResponse.json({ error: "teamId is required" }, { status: 400 })
  }

  const { data: membership, error } = await supabaseAdmin
    .from("team_members")
    .select("team_id, role")
    .eq("team_id", teamId)
    .eq("user_id", auth!.user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!membership) {
    return NextResponse.json({ error: "You are not a member of that team." }, { status: 403 })
  }

  const res = NextResponse.json({ ok: true, teamId })
  setActiveTeamCookie(res, teamId)
  return res
}
