import { supabaseAdmin } from "@/lib/supabase/admin"
import type { MssqlConnectionConfig } from "@/lib/server/connections/types"
import type { ConnectionStatus, ErpConnection } from "@/types"

export type DbConnectionRow = {
  id: string
  name: string
  erp_type: string
  connection_type: string
  server: string | null
  port: number | null
  database_name: string | null
  username: string | null
  password_encrypted: string | null
  api_token_encrypted: string | null
  table_count: number
  connection_status: string
  last_sync_at: string | null
  created_at: string
  updated_at: string
}

export function formatLastSync(iso: string | null | undefined): string {
  if (!iso) return "Never"
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export function mapConnectionRow(row: DbConnectionRow): ErpConnection {
  const status = (["connected", "disconnected", "syncing", "error"].includes(row.connection_status)
    ? row.connection_status
    : "disconnected") as ConnectionStatus

  const connectionType = row.connection_type === "smartsheet" ? "smartsheet" : "mssql"

  return {
    id: row.id,
    name: row.name,
    erpType: row.erp_type,
    connectionType,
    server: row.server ?? undefined,
    database: row.database_name ?? undefined,
    username: row.username ?? undefined,
    status,
    tableCount: row.table_count ?? 0,
    lastSync: formatLastSync(row.last_sync_at ?? row.updated_at),
  }
}

export function toMssqlConfig(row: Pick<DbConnectionRow, "server" | "port" | "database_name" | "username" | "password_encrypted">): MssqlConnectionConfig {
  return {
    server: row.server ?? "",
    database: row.database_name ?? "",
    user: row.username ?? "",
    password: row.password_encrypted ?? "",
    port: row.port ?? undefined,
  }
}

export async function getTeamSmartsheetToken(teamId: string, connectionId: string): Promise<string | null> {
  const { data, error } = await getTeamConnectionRow(teamId, connectionId)
  if (error || !data) return null
  const row = data as DbConnectionRow
  if ((row.connection_type ?? "mssql") !== "smartsheet") return null
  return row.api_token_encrypted
}

export async function getTeamConnectionRow(teamId: string, connectionId: string) {
  return supabaseAdmin
    .from("connections")
    .select("*")
    .eq("id", connectionId)
    .eq("team_id", teamId)
    .single()
}

export async function getTeamMssqlConnection(teamId: string, connectionId: string): Promise<MssqlConnectionConfig | null> {
  const { data, error } = await getTeamConnectionRow(teamId, connectionId)
  if (error || !data) return null
  return toMssqlConfig(data as DbConnectionRow)
}
