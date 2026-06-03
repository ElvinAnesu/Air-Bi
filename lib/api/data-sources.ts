import type { ConnectionStatus, ConnectionType, DataSource, DataSourceTable } from "@/types"

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

export async function fetchAvailableTables(dataSourceId: string) {
  const res = await fetch(`/api/data-sources/${dataSourceId}/available-tables`, { cache: "no-store" })
  const data = await parseJson<{
    tables: Array<{ id: string; name: string; schema: string; description: string }>
  }>(res)
  return data.tables ?? []
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
