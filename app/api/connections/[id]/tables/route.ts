import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { getTeamMssqlConnection } from "@/lib/server/connections/repository"
import { getMssqlTablePreview } from "@/lib/server/mssql/client"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const config = await getTeamMssqlConnection(auth!.teamId!, id)
  if (!config) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const schema = searchParams.get("schema")?.trim() || "dbo"
  const table = searchParams.get("table")?.trim() || ""

  if (!table) {
    return NextResponse.json({ error: "Table name is required." }, { status: 400 })
  }

  try {
    const preview = await getMssqlTablePreview(config, schema, table)
    return NextResponse.json({ table: preview })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load table"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
