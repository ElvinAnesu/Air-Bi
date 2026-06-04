import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getTeamConnectionRow, type DbConnectionRow } from "@/lib/server/connections/repository"
import {
  fetchLiveTableRows,
  getDataSourceTableRow,
  getTeamDataSourceRow,
  isLiveConnection,
} from "@/lib/server/data-sources/repository"
import type { DbDataSourceRow, DbDataSourceTableRow } from "@/lib/server/data-sources/types"
import type { ErpColumn } from "@/types"

type Params = { params: Promise<{ id: string; tableId: string }> }

const PREVIEW_ROW_LIMIT = 500

export async function GET(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id, tableId } = await params

  const { data: ds } = await getTeamDataSourceRow(auth!.teamId!, id)
  if (!ds) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: tableRow, error: tableError } = await getDataSourceTableRow(id, tableId)
  if (tableError || !tableRow) return NextResponse.json({ error: "Table not found" }, { status: 404 })

  const table = tableRow as DbDataSourceTableRow
  const dataSource = ds as DbDataSourceRow
  const useLive = req.nextUrl.searchParams.get("live") === "true"

  let connection: DbConnectionRow | null = null
  if (dataSource.connection_id) {
    const { data: conn } = await getTeamConnectionRow(auth!.teamId!, dataSource.connection_id)
    connection = (conn as DbConnectionRow) ?? null
  }

  const canUseLive = useLive && isLiveConnection(dataSource, connection)
  let rows: Record<string, string | number | null>[] = Array.isArray(table.rows_json)
    ? table.rows_json
    : []
  let isLive = false

  if (canUseLive) {
    try {
      rows = await fetchLiveTableRows(
        auth!.teamId!,
        dataSource,
        table.external_schema,
        table.external_name
      )
      isLive = true
    } catch {
      rows = Array.isArray(table.rows_json) ? table.rows_json : []
    }
  }

  const totalRows = rows.length
  const previewRows = rows.slice(0, PREVIEW_ROW_LIMIT)
  const columns: ErpColumn[] = Array.isArray(table.columns_json) ? table.columns_json : []

  const displayName = table.display_name ?? table.external_name
  const description = [
    `${table.external_schema}.${table.external_name}`,
    `${totalRows} row${totalRows === 1 ? "" : "s"}`,
    isLive ? "live data" : table.snapshot_at ? `snapshot ${new Date(table.snapshot_at).toLocaleString()}` : "snapshot",
  ].join(" · ")

  return NextResponse.json({
    table: {
      id: table.id,
      name: displayName,
      description,
      columns,
      sampleRows: previewRows,
      rowCount: totalRows,
      previewRowCount: previewRows.length,
      isLive,
      snapshotAt: table.snapshot_at,
    },
  })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id, tableId } = await params

  const { data: ds } = await getTeamDataSourceRow(auth!.teamId!, id)
  if (!ds) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { error } = await supabaseAdmin
    .from("data_source_tables")
    .delete()
    .eq("id", tableId)
    .eq("data_source_id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
