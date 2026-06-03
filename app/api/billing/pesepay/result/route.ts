import { NextRequest, NextResponse } from "next/server"
import { handlePesepayResultCallback } from "@/lib/server/billing/service"

function readReference(body: Record<string, unknown>) {
  if (typeof body.referenceNumber === "string") return body.referenceNumber
  if (typeof body.reference === "string") return body.reference
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

    console.log("[Pesepay] result webhook raw body", body)

    const encryptedPayload = typeof body.payload === "string" ? body.payload : null
    const referenceNumber = readReference(body)
    const merchantReference =
      typeof body.merchantReference === "string" ? body.merchantReference : null
    const transactionStatus =
      typeof body.transactionStatus === "string" ? body.transactionStatus : null

    const result = await handlePesepayResultCallback({
      referenceNumber,
      merchantReference,
      encryptedPayload,
      transactionStatus,
    })

    console.log("[Pesepay] result webhook processed", {
      referenceNumber,
      merchantReference,
      hasEncryptedPayload: Boolean(encryptedPayload),
      status: result.status,
    })

    return NextResponse.json({ ok: true, status: result.status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pesepay callback failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  const referenceNumber = req.nextUrl.searchParams.get("referenceNumber")
  const merchantReference = req.nextUrl.searchParams.get("merchantReference")
  const transactionStatus = req.nextUrl.searchParams.get("transactionStatus")

  try {
    console.log("[Pesepay] result webhook query params", {
      referenceNumber,
      merchantReference,
      transactionStatus,
    })

    const result = await handlePesepayResultCallback({
      referenceNumber,
      merchantReference,
      transactionStatus,
    })

    console.log("[Pesepay] result webhook processed", {
      referenceNumber,
      merchantReference,
      status: result.status,
    })

    return NextResponse.json({ ok: true, status: result.status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pesepay callback failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
