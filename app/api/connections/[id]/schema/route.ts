import { NextResponse } from "next/server"
import { getConnection } from "@/lib/server/connections/store"
import { listMssqlTables } from "@/lib/server/mssql/client"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const stored = getConnection(id)
  if (!stored) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 })
  }

  try {
    const tables = await listMssqlTables(stored)
    return NextResponse.json({ tables })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load schema"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
