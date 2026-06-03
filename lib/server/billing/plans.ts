import type { DbSubscriptionPlan, PlanLimits } from "@/lib/server/billing/types"

export const PLAN_PRICES_CENTS: Record<DbSubscriptionPlan, number> = {
  free: 0,
  pro: 2500,
  enterprise: 9500,
}

export const PLAN_LABELS: Record<DbSubscriptionPlan, string> = {
  free: "Basic",
  pro: "Pro",
  enterprise: "Enterprise",
}

export const PLAN_LIMITS: Record<DbSubscriptionPlan, PlanLimits> = {
  free: {
    connections: 1,
    dataSources: 5,
    teamMembers: 1,
    savedChats: 10,
    savedReports: 10,
    savedQueries: 10,
    publishedReports: 1,
  },
  pro: {
    connections: 3,
    dataSources: 15,
    teamMembers: 5,
    savedChats: null,
    savedReports: null,
    savedQueries: null,
    publishedReports: null,
  },
  enterprise: {
    connections: null,
    dataSources: 25,
    teamMembers: 25,
    savedChats: null,
    savedReports: null,
    savedQueries: null,
    publishedReports: null,
  },
}

export function normalizePlan(plan: string | null | undefined): DbSubscriptionPlan {
  if (plan === "pro" || plan === "enterprise") return plan
  return "free"
}

export function resolveEffectivePlan(
  plan: string | null | undefined,
  status: string | null | undefined
): DbSubscriptionPlan {
  const normalized = normalizePlan(plan)
  if (normalized === "free") return "free"
  if (status === "active" || status === "trialing") return normalized
  return "free"
}

export function isPaidPlan(plan: DbSubscriptionPlan): boolean {
  return plan === "pro" || plan === "enterprise"
}

export function formatPlanPrice(plan: DbSubscriptionPlan): string {
  const cents = PLAN_PRICES_CENTS[plan]
  if (cents === 0) return "Free"
  return `$${(cents / 100).toFixed(0)}/mo`
}

export function limitLabel(value: number | null): string {
  return value === null ? "Unlimited" : String(value)
}
