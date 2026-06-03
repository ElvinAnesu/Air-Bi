import { NextResponse } from "next/server"
import type { AuthContext } from "@/lib/supabase/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { PLAN_LABELS, PLAN_LIMITS, resolveEffectivePlan } from "@/lib/server/billing/plans"
import { getTeamUsage } from "@/lib/server/billing/usage"
import type { BillingResource } from "@/lib/server/billing/types"

const RESOURCE_TO_USAGE: Record<
  BillingResource,
  keyof Awaited<ReturnType<typeof getTeamUsage>>
> = {
  connections: "connections",
  data_sources: "dataSources",
  chats: "chats",
  reports: "reports",
  saved_queries: "savedQueries",
  published_reports: "publishedReports",
  team_members: "teamMembers",
}

const RESOURCE_TO_LIMIT: Record<BillingResource, keyof typeof PLAN_LIMITS.free> = {
  connections: "connections",
  data_sources: "dataSources",
  chats: "savedChats",
  reports: "savedReports",
  saved_queries: "savedQueries",
  published_reports: "publishedReports",
  team_members: "teamMembers",
}

export type PlanLimitError = {
  code: "PLAN_LIMIT_REACHED"
  resource: BillingResource
  plan: string
  limit: number
  current: number
  message: string
}

export async function checkPlanLimit(
  auth: AuthContext,
  resource: BillingResource,
  options?: { excludeReportId?: string }
): Promise<PlanLimitError | null> {
  const plan = resolveEffectivePlan(auth.subscription?.plan, auth.subscription?.status)
  const limits = PLAN_LIMITS[plan]
  const limitKey = RESOURCE_TO_LIMIT[resource]
  const limit = limits[limitKey]

  if (limit === null) return null

  const usage = await getTeamUsage(auth.teamId)
  let current = usage[RESOURCE_TO_USAGE[resource]]

  if (resource === "published_reports" && options?.excludeReportId) {
    const { count } = await supabaseAdmin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("team_id", auth.teamId)
      .eq("is_published", true)
      .neq("id", options.excludeReportId)

    current = count ?? 0
  }

  if (current < limit) return null

  const planLabel = PLAN_LABELS[plan]
  const resourceLabel = resource.replace(/_/g, " ")

  return {
    code: "PLAN_LIMIT_REACHED",
    resource,
    plan: planLabel,
    limit,
    current,
    message: `${planLabel} plan allows up to ${limit} ${resourceLabel}. Upgrade to add more.`,
  }
}

export async function planLimitResponse(
  auth: AuthContext,
  resource: BillingResource,
  options?: { excludeReportId?: string }
): Promise<NextResponse | null> {
  const error = await checkPlanLimit(auth, resource, options)
  if (!error) return null

  return NextResponse.json(error, { status: 403 })
}

export function canManageBilling(role: string | null): boolean {
  return role === "owner" || role === "admin"
}
