import type { StoredConnection } from "@/lib/server/connections/types"
import type { ErpConnection } from "@/types"

export function toPublicConnection(stored: StoredConnection): ErpConnection {
  return {
    id: stored.id,
    name: stored.name,
    erpType: stored.erpType,
    connectionType: "mssql",
    status: "connected",
    tableCount: stored.tableCount,
    lastSync: "just now",
    server: stored.server,
  }
}
