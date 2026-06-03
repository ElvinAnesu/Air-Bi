import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import {
  getTeamConnectionRow,
  getTeamMssqlConnection,
  type DbConnectionRow,
} from "@/lib/server/connections/repository"
import { listMssqlTables } from "@/lib/server/mssql/client"
import { listSmartsheetSheets } from "@/lib/server/smartsheet/client"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { data: conn, error } = await getTeamConnectionRow(auth!.teamId!, id)
  if (error || !conn) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 })
  }

  const connection = conn as DbConnectionRow
  const connectionType = connection.connection_type ?? "mssql"

  try {
    if (connectionType === "smartsheet") {
      const token = connection.api_token_encrypted
      if (!token) return NextResponse.json({ error: "Smartsheet token missing" }, { status: 400 })
      const tables = await listSmartsheetSheets(token)
      return NextResponse.json({ tables })
    }

    const config = await getTeamMssqlConnection(auth!.teamId!, id)
    if (!config) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }
    const tables = await listMssqlTables(config)
    return NextResponse.json({ tables })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load schema"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
