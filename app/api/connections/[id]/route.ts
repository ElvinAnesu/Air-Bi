import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getTeamConnectionRow, mapConnectionRow, type DbConnectionRow } from "@/lib/server/connections/repository"

type Params = { params: Promise<{ id: string }> }

const CONNECTION_SELECT =
  "id, name, erp_type, server, port, database_name, username, table_count, connection_status, last_sync_at, created_at, updated_at"

export async function GET(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { data, error } = await getTeamConnectionRow(auth!.teamId!, id)
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(mapConnectionRow(data as DbConnectionRow))
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { data: existing } = await getTeamConnectionRow(auth!.teamId!, id)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name) updates.name = body.name
  if (body.erpType) updates.erp_type = body.erpType
  if (body.server) updates.server = body.server
  if (body.port !== undefined) updates.port = body.port
  if (body.database) updates.database_name = body.database
  if (body.username ?? body.user) updates.username = body.username ?? body.user
  if (body.password) updates.password_encrypted = body.password

  const { data, error } = await supabaseAdmin
    .from("connections")
    .update(updates)
    .eq("id", id)
    .eq("team_id", auth!.teamId)
    .select(CONNECTION_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(mapConnectionRow(data as DbConnectionRow))
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { error } = await supabaseAdmin
    .from("connections")
    .delete()
    .eq("id", id)
    .eq("team_id", auth!.teamId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
