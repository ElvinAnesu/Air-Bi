import type { StoredConnection } from "@/lib/server/connections/types"

const globalStore = globalThis as unknown as {
  __airbiConnections?: Map<string, StoredConnection>
}

function getStore() {
  if (!globalStore.__airbiConnections) {
    globalStore.__airbiConnections = new Map()
  }
  return globalStore.__airbiConnections
}

export function listConnections(): StoredConnection[] {
  return Array.from(getStore().values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function getConnection(id: string): StoredConnection | undefined {
  return getStore().get(id)
}

export function saveConnection(connection: StoredConnection): StoredConnection {
  getStore().set(connection.id, connection)
  return connection
}

export function deleteConnection(id: string): boolean {
  return getStore().delete(id)
}
