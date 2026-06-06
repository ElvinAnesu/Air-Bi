import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  captureAndCleanSnapshot,
  getTeamDataSourceRow,
  listDataSourceTables,
  mapDataSourceTableRow,
} from "@/lib/server/data-sources/repository"
import type { TableCleaningConfig } from "@/lib/server/data-sources/transforms"
import type { DbDataSourceRow, DbDataSourceTableRow } from "@/lib/server/data-sources/types"

type Params = { params: Promise<{ id: string }> }

const TABLE_SELECT =
  "id, data_source_id, external_schema, external_name, display_name, columns_json, sample_rows_json, rows_json, row_count, snapshot_at, cleaning_config_json, created_at"

export async function GET(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { data: ds } = await getTeamDataSourceRow(auth!.teamId!, id)
  if (!ds) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const tables = await listDataSourceTables(id)
  return NextResponse.json({ tables })
}

export async function POST(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { data: ds, error: dsError } = await getTeamDataSourceRow(auth!.teamId!, id)
  if (dsError || !ds) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const externalSchema = typeof body.externalSchema === "string" ? body.externalSchema.trim() : "default"
  const externalName = typeof body.externalName === "string" ? body.externalName.trim() : ""
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : null
  const cleaning = (body.cleaning as TableCleaningConfig | null) ?? null

  if (!externalName) {
    return NextResponse.json({ error: "externalName is required" }, { status: 400 })
  }

  const dataSource = ds as DbDataSourceRow

  try {
    const snapshot = await captureAndCleanSnapshot(
      auth!.teamId!,
      dataSource,
      externalSchema,
      externalName,
      cleaning
    )
    const now = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from("data_source_tables")
      .insert({
        data_source_id: id,
        external_schema: externalSchema,
        external_name: externalName,
        display_name: displayName ?? externalName,
        columns_json: snapshot.columns,
        sample_rows_json: snapshot.sampleRows,
        rows_json: snapshot.rows,
        row_count: snapshot.rowCount,
        snapshot_at: now,
        cleaning_config_json: cleaning,
      })
      .select(TABLE_SELECT)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ table: mapDataSourceTableRow(data as DbDataSourceTableRow) }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add table"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
