import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  captureAndCleanSnapshot,
  getDataSourceTableRow,
  getTeamDataSourceRow,
  mapDataSourceTableRow,
} from "@/lib/server/data-sources/repository"
import type { TableCleaningConfig } from "@/lib/server/data-sources/transforms"
import type { DbDataSourceRow, DbDataSourceTableRow } from "@/lib/server/data-sources/types"

type Params = { params: Promise<{ id: string; tableId: string }> }

const TABLE_SELECT =
  "id, data_source_id, external_schema, external_name, display_name, columns_json, sample_rows_json, rows_json, row_count, snapshot_at, cleaning_config_json, created_at"

export async function POST(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id, tableId } = await params

  const { data: ds } = await getTeamDataSourceRow(auth!.teamId!, id)
  if (!ds) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: tableRow, error: tableError } = await getDataSourceTableRow(id, tableId)
  if (tableError || !tableRow) return NextResponse.json({ error: "Table not found" }, { status: 404 })

  const table = tableRow as DbDataSourceTableRow
  const dataSource = ds as DbDataSourceRow

  try {
    const snapshot = await captureAndCleanSnapshot(
      auth!.teamId!,
      dataSource,
      table.external_schema,
      table.external_name,
      (table.cleaning_config_json as TableCleaningConfig | null) ?? null
    )
    const now = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from("data_source_tables")
      .update({
        columns_json: snapshot.columns,
        sample_rows_json: snapshot.sampleRows,
        rows_json: snapshot.rows,
        row_count: snapshot.rowCount,
        snapshot_at: now,
      })
      .eq("id", tableId)
      .eq("data_source_id", id)
      .select(TABLE_SELECT)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ table: mapDataSourceTableRow(data as DbDataSourceTableRow) })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to refresh table"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
