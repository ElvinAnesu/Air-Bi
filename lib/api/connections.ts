import type { ErpConnection, ErpTable } from "@/types"
import type { SchemaTableSummary } from "@/types"

export type ConnectionCreatePayload = {
  name: string
  server: string
  database: string
  user: string
  password: string
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`)
  }
  return data
}

export async function fetchConnections(): Promise<ErpConnection[]> {
  const res = await fetch("/api/connections", { cache: "no-store" })
  const data = await parseJson<{ connections: ErpConnection[] }>(res)
  return data.connections
}

export async function fetchConnection(id: string): Promise<ErpConnection> {
  const res = await fetch(`/api/connections/${id}`, { cache: "no-store" })
  const data = await parseJson<{ connection: ErpConnection }>(res)
  return data.connection
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
  const data = await parseJson<{ connection: ErpConnection }>(res)
  return data.connection
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
