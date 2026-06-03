import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { canManageBilling } from "@/lib/server/billing/enforce"
import { pollAndCompleteTransaction } from "@/lib/server/billing/service"

export async function POST(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  if (!canManageBilling(auth!.role)) {
    return NextResponse.json({ error: "Only team owners and admins can manage billing." }, { status: 403 })
  }

  const { transactionId } = await req.json()
  if (!transactionId || typeof transactionId !== "string") {
    return NextResponse.json({ error: "transactionId is required" }, { status: 400 })
  }

  try {
    const result = await pollAndCompleteTransaction(transactionId, auth!.user.id)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to poll payment"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
