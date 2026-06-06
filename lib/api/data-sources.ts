import type {
  ConnectionStatus,
  ConnectionType,
  DataSource,
  DataSourceRelationship,
  DataSourceTable,
  SchemaTableSummary,
  TableCleaningConfig,
} from "@/types"

export type DataSourceCreatePayload = {
  name: string
  description?: string
  sourceKind: "connection" | "excel"
  connectionId?: string
}

export type DataSourceUpdatePayload = {
  name?: string
  description?: string
  connectionId?: string | null
}

type ApiDataSourceRow = {
  id: string
  name: string
  description?: string
  sourceKind: "connection" | "excel"
  connectionId?: string
  connectionName?: string
  connectionType?: ConnectionType
  connectionStatus?: ConnectionStatus
  excelFileName?: string
  tableCount: number
  createdAt: string
  updatedAt: string
}

type ApiDataSourceTableRow = {
  id: string
  dataSourceId: string
  externalSchema: string
  externalName: string
  displayName?: string
  columns: Array<{ name: string; type: string; description?: string }>
  sampleRows: Record<string, string | number | null>[]
  rowCount: number
  snapshotAt?: string
  cleaning?: TableCleaningConfig | null
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`)
  }
  return data
}

function mapDataSource(row: ApiDataSourceRow): DataSource {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sourceKind: row.sourceKind,
    connectionId: row.connectionId,
    connectionName: row.connectionName,
    connectionType: row.connectionType,
    connectionStatus: row.connectionStatus,
    excelFileName: row.excelFileName,
    tableCount: row.tableCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function mapTable(row: ApiDataSourceTableRow): DataSourceTable {
  return {
    id: row.id,
    dataSourceId: row.dataSourceId,
    externalSchema: row.externalSchema,
    externalName: row.externalName,
    displayName: row.displayName,
    columns: row.columns,
    sampleRows: row.sampleRows,
    rowCount: row.rowCount,
    snapshotAt: row.snapshotAt,
    cleaning: row.cleaning ?? undefined,
  }
}

export async function fetchDataSources(): Promise<DataSource[]> {
  const res = await fetch("/api/data-sources", { cache: "no-store" })
  const data = await parseJson<ApiDataSourceRow[]>(res)
  return Array.isArray(data) ? data.map(mapDataSource) : []
}

export async function fetchDataSource(id: string): Promise<DataSource> {
  const res = await fetch(`/api/data-sources/${id}`, { cache: "no-store" })
  const data = await parseJson<ApiDataSourceRow>(res)
  return mapDataSource(data)
}

export async function createDataSource(payload: DataSourceCreatePayload): Promise<DataSource> {
  const res = await fetch("/api/data-sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await parseJson<ApiDataSourceRow>(res)
  return mapDataSource(data)
}

export async function updateDataSource(id: string, payload: DataSourceUpdatePayload): Promise<DataSource> {
  const res = await fetch(`/api/data-sources/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await parseJson<ApiDataSourceRow>(res)
  return mapDataSource(data)
}

export async function deleteDataSource(id: string): Promise<void> {
  const res = await fetch(`/api/data-sources/${id}`, { method: "DELETE" })
  await parseJson<{ ok: true }>(res)
}

export async function fetchDataSourceTables(dataSourceId: string): Promise<DataSourceTable[]> {
  const res = await fetch(`/api/data-sources/${dataSourceId}/tables`, { cache: "no-store" })
  const data = await parseJson<{ tables: ApiDataSourceTableRow[] }>(res)
  return (data.tables ?? []).map(mapTable)
}

export type CatalogSearchResponse = {
  tables: SchemaTableSummary[]
  total: number
  limit: number
  offset: number
  sessionId?: string
  fileName?: string
}

export async function fetchAvailableTables(
  dataSourceId: string,
  options?: { q?: string; limit?: number; offset?: number }
): Promise<CatalogSearchResponse> {
  const params = new URLSearchParams()
  if (options?.q) params.set("q", options.q)
  if (options?.limit != null) params.set("limit", String(options.limit))
  if (options?.offset != null) params.set("offset", String(options.offset))
  const qs = params.toString()
  const res = await fetch(
    `/api/data-sources/${dataSourceId}/available-tables${qs ? `?${qs}` : ""}`,
    { cache: "no-store" }
  )
  return parseJson<CatalogSearchResponse>(res)
}

export async function uploadWizardExcel(
  file: File,
  options?: { q?: string; limit?: number; offset?: number }
): Promise<CatalogSearchResponse & { sessionId: string; fileName: string }> {
  const form = new FormData()
  form.append("file", file)
  if (options?.q) form.append("q", options.q)
  if (options?.limit != null) form.append("limit", String(options.limit))
  if (options?.offset != null) form.append("offset", String(options.offset))
  const res = await fetch("/api/data-sources/wizard/excel-preview", { method: "POST", body: form })
  return parseJson(res)
}

export async function searchWizardExcelTables(
  sessionId: string,
  options?: { q?: string; limit?: number; offset?: number }
): Promise<CatalogSearchResponse> {
  const params = new URLSearchParams({ sessionId })
  if (options?.q) params.set("q", options.q)
  if (options?.limit != null) params.set("limit", String(options.limit))
  if (options?.offset != null) params.set("offset", String(options.offset))
  const res = await fetch(`/api/data-sources/wizard/excel-tables?${params}`, { cache: "no-store" })
  return parseJson(res)
}

export async function searchWizardConnectionTables(
  connectionId: string,
  options?: { q?: string; limit?: number; offset?: number; sessionId?: string }
): Promise<CatalogSearchResponse> {
  const params = new URLSearchParams({ connectionId })
  if (options?.q) params.set("q", options.q)
  if (options?.limit != null) params.set("limit", String(options.limit))
  if (options?.offset != null) params.set("offset", String(options.offset))
  if (options?.sessionId) params.set("sessionId", options.sessionId)
  const res = await fetch(`/api/data-sources/wizard/connection-tables?${params}`, { cache: "no-store" })
  return parseJson(res)
}

export type TableCleanPreview = {
  columns: Array<{ name: string; type: string }>
  rows: Record<string, string | number | null>[]
  sampleRows: Record<string, string | number | null>[]
  rowCount: number
}

export async function previewWizardClean(payload: {
  sourceKind: "connection" | "excel"
  sessionId?: string
  connectionId?: string
  externalSchema: string
  externalName: string
  cleaning?: TableCleaningConfig | null
}): Promise<TableCleanPreview> {
  const res = await fetch("/api/data-sources/wizard/preview-clean", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await parseJson<{ preview: TableCleanPreview }>(res)
  return data.preview
}

export async function finalizeWizardDataSource(payload: {
  name: string
  description?: string
  sourceKind: "connection" | "excel"
  connectionId?: string
  wizardSessionId?: string
  tables: Array<{
    externalSchema: string
    externalName: string
    displayName?: string
    cleaning?: TableCleaningConfig | null
    preparedColumns?: Array<{ name: string; type: string }>
    preparedRows?: Record<string, string | number | null>[]
  }>
}): Promise<{ source: DataSource; tables: DataSourceTable[] }> {
  const res = await fetch("/api/data-sources/wizard/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return parseJson(res)
}

export async function fetchDataSourceRelationships(
  dataSourceId: string
): Promise<DataSourceRelationship[]> {
  const res = await fetch(`/api/data-sources/${dataSourceId}/relationships`, { cache: "no-store" })
  const data = await parseJson<{ relationships: DataSourceRelationship[] }>(res)
  return data.relationships ?? []
}

export async function createDataSourceRelationship(
  dataSourceId: string,
  payload: {
    fromTableId: string
    fromColumn: string
    toTableId: string
    toColumn: string
    joinType?: "inner" | "left"
    label?: string
  }
): Promise<DataSourceRelationship> {
  const res = await fetch(`/api/data-sources/${dataSourceId}/relationships`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await parseJson<{ relationship: DataSourceRelationship }>(res)
  return data.relationship
}

export async function deleteDataSourceRelationship(
  dataSourceId: string,
  relationshipId: string
): Promise<void> {
  const params = new URLSearchParams({ relationshipId })
  const res = await fetch(`/api/data-sources/${dataSourceId}/relationships?${params}`, {
    method: "DELETE",
  })
  await parseJson<{ ok: true }>(res)
}

export type DataPrepAssistResult =
  | {
      type: "clean"
      message: string
      tableKey: string
      cleaning: TableCleaningConfig
    }
  | {
      type: "relationships"
      message: string
      suggestions: Array<{
        fromTableKey: string
        fromColumn: string
        toTableKey: string
        toColumn: string
        joinType: "inner" | "left"
        label?: string
      }>
    }
  | { type: "message"; message: string }

export async function runWizardAssist(payload: {
  task: "clean" | "suggest_relationships"
  instruction: string
  tableKey?: string
  tables: Array<{
    key: string
    name: string
    columns: Array<{ name: string; type: string }>
    sampleRows: Record<string, string | number | null>[]
  }>
}): Promise<DataPrepAssistResult> {
  const res = await fetch("/api/data-sources/wizard/assist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await parseJson<{ result: DataPrepAssistResult }>(res)
  return data.result
}

export async function runDataSourceAssist(
  dataSourceId: string,
  payload: { task: "clean" | "suggest_relationships"; instruction: string; tableKey?: string }
): Promise<DataPrepAssistResult> {
  const res = await fetch(`/api/data-sources/${dataSourceId}/assist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await parseJson<{ result: DataPrepAssistResult }>(res)
  return data.result
}

export async function addDataSourceTable(
  dataSourceId: string,
  payload: { externalSchema: string; externalName: string; displayName?: string }
): Promise<DataSourceTable> {
  const res = await fetch(`/api/data-sources/${dataSourceId}/tables`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await parseJson<{ table: ApiDataSourceTableRow }>(res)
  return mapTable(data.table)
}

export async function removeDataSourceTable(dataSourceId: string, tableId: string): Promise<void> {
  const res = await fetch(`/api/data-sources/${dataSourceId}/tables/${tableId}`, { method: "DELETE" })
  await parseJson<{ ok: true }>(res)
}

export async function refreshDataSourceTable(dataSourceId: string, tableId: string): Promise<DataSourceTable> {
  const res = await fetch(`/api/data-sources/${dataSourceId}/tables/${tableId}/refresh`, {
    method: "POST",
  })
  const data = await parseJson<{ table: ApiDataSourceTableRow }>(res)
  return mapTable(data.table)
}

export type DataSourceTablePreview = {
  id: string
  name: string
  description: string
  columns: Array<{ name: string; type: string; description?: string }>
  sampleRows: Record<string, string | number | null>[]
  rowCount: number
  previewRowCount: number
  isLive: boolean
  snapshotAt?: string | null
}

export async function fetchDataSourceTablePreview(
  dataSourceId: string,
  tableId: string,
  options?: { live?: boolean }
): Promise<DataSourceTablePreview> {
  const params = new URLSearchParams()
  if (options?.live) params.set("live", "true")
  const qs = params.toString()
  const res = await fetch(
    `/api/data-sources/${dataSourceId}/tables/${tableId}${qs ? `?${qs}` : ""}`,
    { cache: "no-store" }
  )
  const data = await parseJson<{ table: DataSourceTablePreview }>(res)
  return data.table
}

export async function uploadExcelToDataSource(dataSourceId: string, file: File): Promise<DataSource> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`/api/data-sources/${dataSourceId}/upload`, {
    method: "POST",
    body: form,
  })
  const data = await parseJson<ApiDataSourceRow>(res)
  return mapDataSource(data)
}
