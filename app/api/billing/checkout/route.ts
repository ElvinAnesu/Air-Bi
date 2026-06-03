import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { canManageBilling } from "@/lib/server/billing/enforce"
import { resolveEffectivePlan } from "@/lib/server/billing/plans"
import { startCheckout } from "@/lib/server/billing/service"
import type { DbSubscriptionPlan } from "@/lib/server/billing/types"

function parsePlan(value: unknown): DbSubscriptionPlan | null {
  if (value === "pro" || value === "enterprise") return value
  return null
}

export async function POST(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  if (!canManageBilling(auth!.role)) {
    return NextResponse.json({ error: "Only team owners and admins can manage billing." }, { status: 403 })
  }

  const body = await req.json()
  const plan = parsePlan(body.plan)
  if (!plan) {
    return NextResponse.json({ error: "plan must be pro or enterprise" }, { status: 400 })
  }

  const currentPlan = resolveEffectivePlan(auth!.subscription?.plan, auth!.subscription?.status)
  if (currentPlan === plan) {
    return NextResponse.json({ error: `You are already on the ${plan} plan.` }, { status: 400 })
  }

  try {
    const checkout = await startCheckout(auth!.teamId, auth!.user.id, plan, {
      email: auth!.user.email,
      fullName:
        (auth!.user.user_metadata?.full_name as string | undefined) ??
        auth!.user.email?.split("@")[0] ??
        null,
      phoneNumber: (auth!.user.user_metadata?.phone as string | undefined) ?? null,
    })
    return NextResponse.json(checkout)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start checkout"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
