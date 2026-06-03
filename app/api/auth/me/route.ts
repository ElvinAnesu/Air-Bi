import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/supabase/auth"
import { canManageBilling } from "@/lib/server/billing/enforce"
import { resolveEffectivePlan } from "@/lib/server/billing/plans"

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req)
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const effectivePlan = resolveEffectivePlan(auth.subscription?.plan, auth.subscription?.status)

  return NextResponse.json({
    user: {
      id: auth.user.id,
      email: auth.user.email,
      fullName: auth.user.user_metadata?.full_name ?? auth.user.email?.split("@")[0],
    },
    teamId: auth.teamId,
    teamName: auth.teamName,
    role: auth.role,
    subscription: auth.subscription,
    effectivePlan,
    canManageBilling: canManageBilling(auth.role),
  })
}
