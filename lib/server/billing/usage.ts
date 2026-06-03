import { supabaseAdmin } from "@/lib/supabase/admin"
import type { TeamUsage } from "@/lib/server/billing/types"

export async function getTeamUsage(teamId: string): Promise<TeamUsage> {
  const [
    connections,
    dataSources,
    chats,
    reports,
    savedQueries,
    publishedReports,
    teamMembers,
  ] = await Promise.all([
    supabaseAdmin.from("connections").select("id", { count: "exact", head: true }).eq("team_id", teamId),
    supabaseAdmin.from("data_sources").select("id", { count: "exact", head: true }).eq("team_id", teamId),
    supabaseAdmin.from("chats").select("id", { count: "exact", head: true }).eq("team_id", teamId),
    supabaseAdmin.from("reports").select("id", { count: "exact", head: true }).eq("team_id", teamId),
    supabaseAdmin.from("saved_queries").select("id", { count: "exact", head: true }).eq("team_id", teamId),
    supabaseAdmin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("is_published", true),
    supabaseAdmin.from("team_members").select("id", { count: "exact", head: true }).eq("team_id", teamId),
  ])

  return {
    connections: connections.count ?? 0,
    dataSources: dataSources.count ?? 0,
    chats: chats.count ?? 0,
    reports: reports.count ?? 0,
    savedQueries: savedQueries.count ?? 0,
    publishedReports: publishedReports.count ?? 0,
    teamMembers: teamMembers.count ?? 0,
  }
}
