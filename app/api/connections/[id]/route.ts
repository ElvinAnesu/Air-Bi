import { NextResponse } from "next/server"
import { getConnection } from "@/lib/server/connections/store"
import { toPublicConnection } from "@/lib/server/connections/public"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const stored = getConnection(id)
  if (!stored) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 })
  }
  return NextResponse.json({ connection: toPublicConnection(stored) })
}
