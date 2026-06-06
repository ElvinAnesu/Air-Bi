import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import {
  getTeamDataSourceRow,
  listDataSourceTables,
} from "@/lib/server/data-sources/repository"
import { searchConnectionCatalog, searchExcelCatalog } from "@/lib/server/data-sources/catalog-search"
import type { DbDataSourceRow } from "@/lib/server/data-sources/types"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50, 100)
  const offset = Math.max(Number(req.nextUrl.searchParams.get("offset") ?? 0) || 0, 0)

  const { data: ds, error } = await getTeamDataSourceRow(auth!.teamId!, id)
  if (error || !ds) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const dataSource = ds as DbDataSourceRow
  const added = await listDataSourceTables(id)
  const addedKeys = new Set(
    added.map((t) => `${t.externalSchema}.${t.externalName}`)
  )

  try {
    let catalog: { tables: Array<{ id: string; name: string; schema: string; description: string }>; total: number }

    if (dataSource.source_kind === "excel") {
      if (!dataSource.excel_storage_path) {
        return NextResponse.json({ tables: [], total: 0, limit, offset })
      }
      catalog = await searchExcelCatalog(dataSource.excel_storage_path, { q, limit, offset })
    } else if (dataSource.connection_id) {
      catalog = await searchConnectionCatalog(auth!.teamId!, dataSource.connection_id, {
        q,
        limit,
        offset,
      })
    } else {
      return NextResponse.json({ tables: [], total: 0, limit, offset })
    }

    const filtered = catalog.tables.filter((t) => {
      const key =
        t.schema === "smartsheet" ? `${t.schema}.${t.id}` : `${t.schema}.${t.name}`
      return !addedKeys.has(key) && !addedKeys.has(`${t.schema}.${t.name}`)
    })
    return NextResponse.json({
      tables: filtered,
      total: catalog.total,
      limit,
      offset,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load available tables"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
