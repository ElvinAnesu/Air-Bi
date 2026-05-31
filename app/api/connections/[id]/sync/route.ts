import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  getTeamConnectionRow,
  getTeamMssqlConnection,
  mapConnectionRow,
  type DbConnectionRow,
} from "@/lib/server/connections/repository"
import { countMssqlTables, testMssqlConnection } from "@/lib/server/mssql/client"

type Params = { params: Promise<{ id: string }> }

const CONNECTION_SELECT =
  "id, name, erp_type, server, port, database_name, username, table_count, connection_status, last_sync_at, created_at, updated_at"

export async function POST(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { data: existing } = await getTeamConnectionRow(auth!.teamId!, id)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const config = await getTeamMssqlConnection(auth!.teamId!, id)
  if (!config) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await supabaseAdmin
    .from("connections")
    .update({ connection_status: "syncing", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("team_id", auth!.teamId)

  try {
    await testMssqlConnection(config)
    const tableCount = await countMssqlTables(config)
    const now = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from("connections")
      .update({
        connection_status: "connected",
        table_count: tableCount,
        last_sync_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .eq("team_id", auth!.teamId)
      .select(CONNECTION_SELECT)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(mapConnectionRow(data as DbConnectionRow))
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed"
    await supabaseAdmin
      .from("connections")
      .update({ connection_status: "error", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("team_id", auth!.teamId)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
