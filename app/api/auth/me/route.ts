import { NextRequest, NextResponse } from "next/server"
import { resolveAuth } from "@/lib/supabase/auth"
import { applyRefreshedSessionCookies } from "@/lib/supabase/cookies"
import { canManageBilling } from "@/lib/server/billing/enforce"
import { resolveEffectivePlan } from "@/lib/server/billing/plans"

export async function GET(req: NextRequest) {
  try {
    const resolved = await resolveAuth(req)
    if (!resolved) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { auth } = resolved
    const effectivePlan = resolveEffectivePlan(auth.subscription?.plan, auth.subscription?.status)

    const res = NextResponse.json({
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

    if (resolved.refreshed && resolved.session) {
      applyRefreshedSessionCookies(res, resolved.session)
    }

    return res
  } catch (err) {
    console.error("[auth/me]", err)
    const message = err instanceof Error ? err.message : "Session check failed"
    const isConfig = message.includes("Missing Supabase environment")
    return NextResponse.json(
      {
        error: isConfig
          ? "Authentication is not configured on the server."
          : "Failed to load session.",
      },
      { status: isConfig ? 503 : 500 }
    )
  }
}
