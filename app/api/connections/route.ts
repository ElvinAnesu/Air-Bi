import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { mapConnectionRow, type DbConnectionRow } from "@/lib/server/connections/repository"

const CONNECTION_SELECT =
  "id, name, erp_type, server, port, database_name, username, table_count, connection_status, last_sync_at, created_at, updated_at"

export async function GET(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  const { data, error } = await supabaseAdmin
    .from("connections")
    .select(CONNECTION_SELECT)
    .eq("team_id", auth.teamId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data ?? []) as DbConnectionRow[]
  return NextResponse.json(rows.map(mapConnectionRow))
}

export async function POST(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  const body = await req.json()
  const name = body.name
  const erpType = body.erpType ?? body.erp_type ?? "SAP B1 MSSQL"
  const server = body.server
  const port = body.port ?? null
  const database = body.database ?? body.database_name
  const username = body.username ?? body.user
  const password = body.password

  if (!name || !server || !database || !username || !password) {
    return NextResponse.json({ error: "All connection fields are required" }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("connections")
    .insert({
      team_id: auth.teamId,
      created_by: auth.user.id,
      name,
      erp_type: erpType,
      server,
      port,
      database_name: database,
      username,
      password_encrypted: password,
      connection_status: "disconnected",
      table_count: 0,
    })
    .select(CONNECTION_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(mapConnectionRow(data as DbConnectionRow), { status: 201 })
}
