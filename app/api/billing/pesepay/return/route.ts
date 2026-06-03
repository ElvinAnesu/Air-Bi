import { NextRequest, NextResponse } from "next/server"
import { getAccessToken, getAuthUser } from "@/lib/supabase/auth"
import { getAppBaseUrl } from "@/lib/server/billing/config"
import { completeTransactionFromReturn } from "@/lib/server/billing/service"

export async function GET(req: NextRequest) {
  const transactionId = req.nextUrl.searchParams.get("transactionId")
  const baseUrl = getAppBaseUrl()

  if (!transactionId) {
    return NextResponse.redirect(`${baseUrl}/billing?payment=error`)
  }

  const token = getAccessToken(req)
  const auth = token ? await getAuthUser(req) : null
  const userId = auth?.user.id

  if (!userId) {
    return NextResponse.redirect(`${baseUrl}/login?redirectTo=${encodeURIComponent(`/billing?transactionId=${transactionId}`)}`)
  }

  const redirectParams = {
    transactionStatus:
      req.nextUrl.searchParams.get("transactionStatus") ??
      req.nextUrl.searchParams.get("status") ??
      req.nextUrl.searchParams.get("paymentStatus"),
    referenceNumber: req.nextUrl.searchParams.get("referenceNumber"),
  }

  console.log("[Pesepay] return query params", Object.fromEntries(req.nextUrl.searchParams.entries()))

  try {
    const result = await completeTransactionFromReturn(transactionId, userId, redirectParams)

    console.log("[Pesepay] return callback result", {
      transactionId,
      status: result.status,
    })

    if (result.status === "paid") {
      return NextResponse.redirect(`${baseUrl}/billing?payment=success`)
    }

    if (result.status === "failed") {
      return NextResponse.redirect(`${baseUrl}/billing?payment=failed`)
    }

    return NextResponse.redirect(`${baseUrl}/billing?payment=pending&transactionId=${transactionId}`)
  } catch {
    return NextResponse.redirect(`${baseUrl}/billing?payment=error&transactionId=${transactionId}`)
  }
}
