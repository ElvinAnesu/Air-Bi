import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { PLAN_LABELS, normalizePlan } from "@/lib/server/billing/plans"

export async function GET(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  const { data: memberships, error } = await supabaseAdmin
    .from("team_members")
    .select("team_id, role, joined_at")
    .eq("user_id", auth!.user.id)
    .order("joined_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = memberships ?? []
  const teamIds = rows.map((row) => row.team_id)

  if (teamIds.length === 0) {
    return NextResponse.json({ activeTeamId: auth!.teamId, teams: [] })
  }

  const [{ data: teams }, { data: subscriptions }, memberCounts] = await Promise.all([
    supabaseAdmin.from("teams").select("id, name, slug, created_at").in("id", teamIds),
    supabaseAdmin.from("subscriptions").select("team_id, plan, status").in("team_id", teamIds),
    Promise.all(
      teamIds.map(async (teamId) => {
        const { count } = await supabaseAdmin
          .from("team_members")
          .select("id", { count: "exact", head: true })
          .eq("team_id", teamId)
        return [teamId, count ?? 0] as const
      })
    ),
  ])

  const subscriptionByTeam = new Map((subscriptions ?? []).map((sub) => [sub.team_id, sub]))
  const memberCountByTeam = new Map(memberCounts)
  const membershipByTeam = new Map(rows.map((row) => [row.team_id, row]))

  const teamsList = (teams ?? [])
    .map((team) => {
      const membership = membershipByTeam.get(team.id)
      const subscription = subscriptionByTeam.get(team.id)
      const plan = normalizePlan(subscription?.plan)
      return {
        id: team.id,
        name: team.name,
        slug: team.slug,
        role: membership?.role ?? "member",
        joinedAt: membership?.joined_at ?? null,
        memberCount: memberCountByTeam.get(team.id) ?? 0,
        plan,
        planLabel: PLAN_LABELS[plan],
        subscriptionStatus: subscription?.status ?? "active",
        isActive: team.id === auth!.teamId,
      }
    })
    .sort((a, b) => Number(b.isActive) - Number(a.isActive))

  return NextResponse.json({
    activeTeamId: auth!.teamId,
    teams: teamsList,
  })
}
