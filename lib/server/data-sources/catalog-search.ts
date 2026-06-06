import type { SchemaTableSummary } from "@/types"
import { getTeamConnectionRow, getTeamMssqlConnection, type DbConnectionRow } from "@/lib/server/connections/repository"
import { searchMssqlTables } from "@/lib/server/mssql/client"
import { listSmartsheetSheets } from "@/lib/server/smartsheet/client"
import { listExcelSheets } from "@/lib/server/excel/parser"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type CatalogSearchResult = {
  tables: SchemaTableSummary[]
  total: number
  limit: number
  offset: number
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

function normalizeQuery(q: string | null | undefined): string {
  return typeof q === "string" ? q.trim().toLowerCase() : ""
}

function filterSummaries(
  items: SchemaTableSummary[],
  q: string,
  limit: number,
  offset: number
): CatalogSearchResult {
  const needle = normalizeQuery(q)
  const filtered = needle
    ? items.filter(
        (t) =>
          t.name.toLowerCase().includes(needle) ||
          t.schema.toLowerCase().includes(needle) ||
          t.description.toLowerCase().includes(needle) ||
          t.id.toLowerCase().includes(needle)
      )
    : items
  const total = filtered.length
  const tables = filtered.slice(offset, offset + limit)
  return { tables, total, limit, offset }
}

export async function searchConnectionCatalog(
  teamId: string,
  connectionId: string,
  options?: { q?: string; limit?: number; offset?: number }
): Promise<CatalogSearchResult> {
  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
  const offset = Math.max(options?.offset ?? 0, 0)
  const q = normalizeQuery(options?.q)

  const { data: conn } = await getTeamConnectionRow(teamId, connectionId)
  if (!conn) throw new Error("Connection not found")

  const connection = conn as DbConnectionRow
  const connectionType = connection.connection_type ?? "mssql"

  if (connectionType === "smartsheet") {
    const token = connection.api_token_encrypted
    if (!token) throw new Error("Smartsheet token missing")
    const all = await listSmartsheetSheets(token)
    return filterSummaries(all, q, limit, offset)
  }

  const config = await getTeamMssqlConnection(teamId, connectionId)
  if (!config) throw new Error("Connection not found")

  return searchMssqlTables(config, { q: options?.q ?? "", limit, offset })
}

export async function searchExcelCatalog(
  storagePath: string,
  options?: { q?: string; limit?: number; offset?: number }
): Promise<CatalogSearchResult> {
  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
  const offset = Math.max(options?.offset ?? 0, 0)
  const q = normalizeQuery(options?.q)

  const { data: fileData, error } = await supabaseAdmin.storage
    .from("excel-uploads")
    .download(storagePath)
  if (error || !fileData) throw new Error(error?.message ?? "Failed to load Excel file")

  const buffer = Buffer.from(await fileData.arrayBuffer())
  const all = listExcelSheets(buffer)
  return filterSummaries(all, q, limit, offset)
}
