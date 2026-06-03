import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { canManageBilling } from "@/lib/server/billing/enforce"
import { getBillingOverview } from "@/lib/server/billing/service"

export async function GET(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  try {
    const billing = await getBillingOverview(auth!.teamId)
    return NextResponse.json({
      ...billing,
      canManageBilling: canManageBilling(auth!.role),
      role: auth!.role,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load billing"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
