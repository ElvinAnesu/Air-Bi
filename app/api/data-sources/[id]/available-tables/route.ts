import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { getTeamConnectionRow, getTeamMssqlConnection, type DbConnectionRow } from "@/lib/server/connections/repository"
import { listMssqlTables } from "@/lib/server/mssql/client"
import { listSmartsheetSheets } from "@/lib/server/smartsheet/client"
import { listExcelSheets } from "@/lib/server/excel/parser"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  getTeamDataSourceRow,
  listDataSourceTables,
} from "@/lib/server/data-sources/repository"
import type { DbDataSourceRow } from "@/lib/server/data-sources/types"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { data: ds, error } = await getTeamDataSourceRow(auth!.teamId!, id)
  if (error || !ds) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const dataSource = ds as DbDataSourceRow
  const added = await listDataSourceTables(id)
  const addedKeys = new Set(added.map((t) => `${t.externalSchema}.${t.externalName}`))

  try {
    let available: Array<{ id: string; name: string; schema: string; description: string }> = []

    if (dataSource.source_kind === "excel") {
      if (!dataSource.excel_storage_path) {
        return NextResponse.json({ tables: [] })
      }
      const { data: fileData, error: dlError } = await supabaseAdmin.storage
        .from("excel-uploads")
        .download(dataSource.excel_storage_path)
      if (dlError || !fileData) {
        return NextResponse.json({ error: dlError?.message ?? "Failed to load Excel file" }, { status: 502 })
      }
      const buffer = Buffer.from(await fileData.arrayBuffer())
      available = listExcelSheets(buffer)
    } else if (dataSource.connection_id) {
      const { data: conn } = await getTeamConnectionRow(auth!.teamId!, dataSource.connection_id)
      if (!conn) return NextResponse.json({ error: "Connection not found" }, { status: 404 })

      const connection = conn as DbConnectionRow
      const connectionType = connection.connection_type ?? "mssql"

      if (connectionType === "smartsheet") {
        const token = connection.api_token_encrypted
        if (!token) return NextResponse.json({ error: "Smartsheet token missing" }, { status: 400 })
        available = await listSmartsheetSheets(token)
      } else {
        const config = await getTeamMssqlConnection(auth!.teamId!, dataSource.connection_id)
        if (!config) return NextResponse.json({ error: "Connection not found" }, { status: 404 })
        available = await listMssqlTables(config)
      }
    }

    const filtered = available.filter((t) => !addedKeys.has(`${t.schema}.${t.name}`))
    return NextResponse.json({ tables: filtered })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load available tables"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
