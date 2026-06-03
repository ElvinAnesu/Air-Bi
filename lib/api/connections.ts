import type { ConnectionType, ConnectionStatus, ErpConnection, ErpTable } from "@/types"
import type { SchemaTableSummary } from "@/types"

export type ConnectionCreatePayload = {
  name: string
  connectionType?: ConnectionType
  server?: string
  database?: string
  user?: string
  password?: string
  apiToken?: string
}

export type ConnectionUpdatePayload = {
  name?: string
  server?: string
  database?: string
  user?: string
  password?: string
  apiToken?: string
}

type ApiConnectionRow = {
  id: string
  name: string
  erpType: string
  connectionType?: ConnectionType
  server?: string
  database?: string
  username?: string
  status: ConnectionStatus
  tableCount: number
  lastSync: string
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`)
  }
  return data
}

export function mapApiConnection(row: ApiConnectionRow): ErpConnection {
  return {
    id: row.id,
    name: row.name,
    erpType: row.erpType,
    connectionType: row.connectionType ?? "mssql",
    server: row.server,
    database: row.database,
    username: row.username,
    status: row.status,
    tableCount: row.tableCount,
    lastSync: row.lastSync,
  }
}

export async function fetchConnections(): Promise<ErpConnection[]> {
  const res = await fetch("/api/connections", { cache: "no-store" })
  const data = await parseJson<ApiConnectionRow[]>(res)
  return Array.isArray(data) ? data.map(mapApiConnection) : []
}

export async function fetchConnection(id: string): Promise<ErpConnection> {
  const res = await fetch(`/api/connections/${id}`, { cache: "no-store" })
  const data = await parseJson<ApiConnectionRow>(res)
  return mapApiConnection(data)
}

export async function testConnection(payload: ConnectionCreatePayload): Promise<void> {
  const res = await fetch("/api/connections/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  await parseJson<{ ok: true }>(res)
}

export async function createConnection(payload: ConnectionCreatePayload): Promise<ErpConnection> {
  const res = await fetch("/api/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await parseJson<ApiConnectionRow>(res)
  return mapApiConnection(data)
}

export async function updateConnection(id: string, payload: ConnectionUpdatePayload): Promise<ErpConnection> {
  const res = await fetch(`/api/connections/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await parseJson<ApiConnectionRow>(res)
  return mapApiConnection(data)
}

export async function deleteConnection(id: string): Promise<void> {
  const res = await fetch(`/api/connections/${id}`, { method: "DELETE" })
  await parseJson<{ ok: true }>(res)
}

export async function syncConnection(id: string): Promise<ErpConnection> {
  const res = await fetch(`/api/connections/${id}/sync`, { method: "POST" })
  const data = await parseJson<ApiConnectionRow>(res)
  return mapApiConnection(data)
}

export async function fetchConnectionSchema(id: string): Promise<SchemaTableSummary[]> {
  const res = await fetch(`/api/connections/${id}/schema`, { cache: "no-store" })
  const data = await parseJson<{ tables: SchemaTableSummary[] }>(res)
  return data.tables
}

export async function fetchTablePreview(
  connectionId: string,
  schema: string,
  tableName: string
): Promise<ErpTable> {
  const params = new URLSearchParams({ schema, table: tableName })
  const res = await fetch(`/api/connections/${connectionId}/tables?${params}`, {
    cache: "no-store",
  })
  const data = await parseJson<{ table: ErpTable }>(res)
  return data.table
}
