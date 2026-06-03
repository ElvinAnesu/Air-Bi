import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { canManageBilling } from "@/lib/server/billing/enforce"
import { cancelSubscription } from "@/lib/server/billing/service"

export async function POST(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  if (!canManageBilling(auth!.role)) {
    return NextResponse.json({ error: "Only team owners and admins can manage billing." }, { status: 403 })
  }

  try {
    const billing = await cancelSubscription(auth!.teamId, auth!.user.id)
    return NextResponse.json({ ok: true, billing })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel subscription"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
