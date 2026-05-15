import { NextResponse } from "next/server"
import { getConnection } from "@/lib/server/connections/store"
import { getMssqlTablePreview } from "@/lib/server/mssql/client"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const stored = getConnection(id)
  if (!stored) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const schema = searchParams.get("schema")?.trim() || "dbo"
  const table = searchParams.get("table")?.trim() || ""

  if (!table) {
    return NextResponse.json({ error: "Table name is required." }, { status: 400 })
  }

  try {
    const preview = await getMssqlTablePreview(stored, schema, table)
    return NextResponse.json({ table: preview })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load table"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
