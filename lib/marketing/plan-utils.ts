import type { PricingPlanId } from "@/lib/marketing/pricing-plans"

type DbSubscriptionPlan = "free" | "pro" | "enterprise"

export function pricingPlanToDbPlan(planId: PricingPlanId): DbSubscriptionPlan {
  if (planId === "pro") return "pro"
  if (planId === "enterprise") return "enterprise"
  return "free"
}

export function resolveEffectivePlanClient(
  plan: string | null | undefined,
  status: string | null | undefined
): DbSubscriptionPlan {
  if (plan === "pro" || plan === "enterprise") {
    if (status === "active" || status === "trialing") return plan
  }
  return "free"
}

export function canManageBillingClient(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin"
}
