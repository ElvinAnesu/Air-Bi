import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { planLimitResponse } from "@/lib/server/billing/enforce"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  getTeamDataSource,
  listTeamDataSources,
  mapDataSourceRow,
} from "@/lib/server/data-sources/repository"
import type { DbDataSourceRow } from "@/lib/server/data-sources/types"

export async function GET(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  try {
    const sources = await listTeamDataSources(auth!.teamId!)
    return NextResponse.json(sources)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load data sources"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  const body = await req.json()
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const description = typeof body.description === "string" ? body.description.trim() : null
  const sourceKind = body.sourceKind === "excel" ? "excel" : "connection"
  const connectionId = typeof body.connectionId === "string" ? body.connectionId : null

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  if (sourceKind === "connection" && !connectionId) {
    return NextResponse.json({ error: "Connection is required for connection-based data sources" }, { status: 400 })
  }

  const limitResponse = await planLimitResponse(auth!, "data_sources")
  if (limitResponse) return limitResponse

  if (sourceKind === "connection" && connectionId) {
    const { data: conn } = await supabaseAdmin
      .from("connections")
      .select("id")
      .eq("id", connectionId)
      .eq("team_id", auth!.teamId)
      .single()
    if (!conn) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }
  }

  const { data, error } = await supabaseAdmin
    .from("data_sources")
    .insert({
      team_id: auth!.teamId,
      created_by: auth!.user.id,
      name,
      description,
      source_kind: sourceKind,
      connection_id: sourceKind === "connection" ? connectionId : null,
    })
    .select("id, team_id, created_by, name, description, source_kind, connection_id, excel_file_name, excel_storage_path, created_at, updated_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const source = await getTeamDataSource(auth!.teamId!, (data as DbDataSourceRow).id)
  return NextResponse.json(source ?? mapDataSourceRow(data as DbDataSourceRow), { status: 201 })
}
