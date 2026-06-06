import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  getTeamConnectionRow,
  getTeamMssqlConnection,
  toMssqlConfig,
  type DbConnectionRow,
} from "@/lib/server/connections/repository"
import { getMssqlTablePreview } from "@/lib/server/mssql/client"
import { getSmartsheetSheetData } from "@/lib/server/smartsheet/client"
import { parseExcelSheet } from "@/lib/server/excel/parser"
import type { ErpColumn, ConnectionStatus } from "@/types"
import { applyCleaningTransforms, type TableCleaningConfig } from "@/lib/server/data-sources/transforms"
import type {
  DataSourceKind,
  DataSourceTableSnapshot,
  DbDataSourceRow,
  DbDataSourceTableRow,
} from "@/lib/server/data-sources/types"

export type DataSourceModel = {
  id: string
  name: string
  description?: string
  sourceKind: DataSourceKind
  connectionId?: string
  connectionName?: string
  connectionType?: string
  connectionStatus?: ConnectionStatus
  excelFileName?: string
  tableCount: number
  createdAt: string
  updatedAt: string
}

export type DataSourceTableModel = {
  id: string
  dataSourceId: string
  externalSchema: string
  externalName: string
  displayName?: string
  columns: ErpColumn[]
  sampleRows: Record<string, string | number | null>[]
  rowCount: number
  snapshotAt?: string
  cleaning?: TableCleaningConfig | null
}

const DATA_SOURCE_SELECT =
  "id, team_id, created_by, name, description, source_kind, connection_id, excel_file_name, excel_storage_path, created_at, updated_at"

const TABLE_SELECT =
  "id, data_source_id, external_schema, external_name, display_name, columns_json, sample_rows_json, rows_json, row_count, snapshot_at, cleaning_config_json, created_at"

export function mapDataSourceRow(
  row: DbDataSourceRow,
  extras?: {
    connectionName?: string
    connectionType?: string
    connectionStatus?: ConnectionStatus
    tableCount?: number
  }
): DataSourceModel {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    sourceKind: row.source_kind,
    connectionId: row.connection_id ?? undefined,
    connectionName: extras?.connectionName,
    connectionType: extras?.connectionType,
    connectionStatus: extras?.connectionStatus,
    excelFileName: row.excel_file_name ?? undefined,
    tableCount: extras?.tableCount ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapDataSourceTableRow(row: DbDataSourceTableRow): DataSourceTableModel {
  return {
    id: row.id,
    dataSourceId: row.data_source_id,
    externalSchema: row.external_schema,
    externalName: row.external_name,
    displayName: row.display_name ?? undefined,
    columns: Array.isArray(row.columns_json) ? row.columns_json : [],
    sampleRows: Array.isArray(row.sample_rows_json) ? row.sample_rows_json : [],
    rowCount: row.row_count ?? 0,
    snapshotAt: row.snapshot_at ?? undefined,
    cleaning: row.cleaning_config_json ?? undefined,
  }
}

export async function captureAndCleanSnapshot(
  teamId: string,
  dataSource: DbDataSourceRow,
  externalSchema: string,
  externalName: string,
  cleaning?: TableCleaningConfig | null
): Promise<DataSourceTableSnapshot> {
  const snapshot = await captureTableSnapshot(teamId, dataSource, externalSchema, externalName)
  const cleaned = applyCleaningTransforms(snapshot.columns, snapshot.rows, cleaning)
  return {
    columns: cleaned.columns,
    sampleRows: cleaned.rows.slice(0, 10),
    rows: cleaned.rows,
    rowCount: cleaned.rows.length,
  }
}

export async function getTeamDataSourceRow(teamId: string, dataSourceId: string) {
  return supabaseAdmin
    .from("data_sources")
    .select(DATA_SOURCE_SELECT)
    .eq("id", dataSourceId)
    .eq("team_id", teamId)
    .single()
}

export async function listTeamDataSources(teamId: string): Promise<DataSourceModel[]> {
  const { data, error } = await supabaseAdmin
    .from("data_sources")
    .select(DATA_SOURCE_SELECT)
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as DbDataSourceRow[]
  const result: DataSourceModel[] = []

  for (const row of rows) {
    let connectionName: string | undefined
    let connectionType: string | undefined
    let connectionStatus: ConnectionStatus | undefined

    if (row.connection_id) {
      const { data: conn } = await getTeamConnectionRow(teamId, row.connection_id)
      if (conn) {
        const c = conn as DbConnectionRow
        connectionName = c.name
        connectionType = c.connection_type ?? "mssql"
        connectionStatus = (c.connection_status as ConnectionStatus) ?? "disconnected"
      }
    }

    const { count } = await supabaseAdmin
      .from("data_source_tables")
      .select("id", { count: "exact", head: true })
      .eq("data_source_id", row.id)

    result.push(
      mapDataSourceRow(row, {
        connectionName,
        connectionType,
        connectionStatus,
        tableCount: count ?? 0,
      })
    )
  }

  return result
}

export async function getTeamDataSource(teamId: string, dataSourceId: string): Promise<DataSourceModel | null> {
  const { data, error } = await getTeamDataSourceRow(teamId, dataSourceId)
  if (error || !data) return null

  const row = data as DbDataSourceRow
  let connectionName: string | undefined
  let connectionType: string | undefined
  let connectionStatus: ConnectionStatus | undefined

  if (row.connection_id) {
    const { data: conn } = await getTeamConnectionRow(teamId, row.connection_id)
    if (conn) {
      const c = conn as DbConnectionRow
      connectionName = c.name
      connectionType = c.connection_type ?? "mssql"
      connectionStatus = (c.connection_status as ConnectionStatus) ?? "disconnected"
    }
  }

  const { count } = await supabaseAdmin
    .from("data_source_tables")
    .select("id", { count: "exact", head: true })
    .eq("data_source_id", row.id)

  return mapDataSourceRow(row, {
    connectionName,
    connectionType,
    connectionStatus,
    tableCount: count ?? 0,
  })
}

export async function listDataSourceTables(dataSourceId: string): Promise<DataSourceTableModel[]> {
  const { data, error } = await supabaseAdmin
    .from("data_source_tables")
    .select(TABLE_SELECT)
    .eq("data_source_id", dataSourceId)
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)
  return ((data ?? []) as DbDataSourceTableRow[]).map(mapDataSourceTableRow)
}

export async function getDataSourceTableRow(dataSourceId: string, tableId: string) {
  return supabaseAdmin
    .from("data_source_tables")
    .select(TABLE_SELECT)
    .eq("id", tableId)
    .eq("data_source_id", dataSourceId)
    .single()
}

export async function captureTableSnapshot(
  teamId: string,
  dataSource: DbDataSourceRow,
  externalSchema: string,
  externalName: string
): Promise<DataSourceTableSnapshot> {
  if (dataSource.source_kind === "excel") {
    if (!dataSource.excel_storage_path) {
      throw new Error("Excel file not uploaded")
    }
    const { data: fileData, error } = await supabaseAdmin.storage
      .from("excel-uploads")
      .download(dataSource.excel_storage_path)
    if (error || !fileData) throw new Error(error?.message ?? "Failed to load Excel file")
    const buffer = Buffer.from(await fileData.arrayBuffer())
    const parsed = parseExcelSheet(buffer, externalName)
    const columns: ErpColumn[] = parsed.columns.map((c) => ({
      name: c.name,
      type: c.type,
    }))
    return {
      columns,
      sampleRows: parsed.rows.slice(0, 10),
      rows: parsed.rows,
      rowCount: parsed.rows.length,
    }
  }

  if (!dataSource.connection_id) {
    throw new Error("Data source has no linked connection")
  }

  const { data: conn } = await getTeamConnectionRow(teamId, dataSource.connection_id)
  if (!conn) throw new Error("Connection not found")

  const connection = conn as DbConnectionRow
  const connectionType = connection.connection_type ?? "mssql"

  if (connectionType === "smartsheet") {
    const token = connection.api_token_encrypted
    if (!token) throw new Error("Smartsheet token missing")
    const sheet = await getSmartsheetSheetData(token, externalName)
    const columns: ErpColumn[] = sheet.columns.map((c) => ({
      name: c.name,
      type: c.type,
    }))
    return {
      columns,
      sampleRows: sheet.rows.slice(0, 10),
      rows: sheet.rows,
      rowCount: sheet.rows.length,
    }
  }

  const mssql = await getTeamMssqlConnection(teamId, dataSource.connection_id)
  if (!mssql) throw new Error("MSSQL connection not found")

  const preview = await getMssqlTablePreview(mssql, externalSchema, externalName)
  const columns: ErpColumn[] = preview.columns.map((c) => ({
    name: c.name,
    type: c.type,
    description: c.description,
  }))

  const rows = preview.sampleRows.map((row) => {
    const normalized: Record<string, string | number | null> = {}
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined) normalized[key] = null
      else if (typeof value === "number") normalized[key] = value
      else normalized[key] = String(value)
    }
    return normalized
  })

  return {
    columns,
    sampleRows: rows.slice(0, 10),
    rows,
    rowCount: rows.length,
  }
}

export async function fetchLiveTableRows(
  teamId: string,
  dataSource: DbDataSourceRow,
  externalSchema: string,
  externalName: string
): Promise<Record<string, string | number | null>[]> {
  const snapshot = await captureTableSnapshot(teamId, dataSource, externalSchema, externalName)
  return snapshot.rows
}

export function isLiveConnection(
  dataSource: DbDataSourceRow,
  connection?: DbConnectionRow | null
): boolean {
  if (dataSource.source_kind === "excel") return false
  if (!connection) return false
  return connection.connection_status === "connected"
}

export { toMssqlConfig }
