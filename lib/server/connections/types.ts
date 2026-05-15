import type { SchemaTableSummary } from "@/types"

export type { SchemaTableSummary }

export type MssqlConnectionConfig = {
  server: string
  database: string
  user: string
  password: string
  port?: number
}

export type StoredConnection = MssqlConnectionConfig & {
  id: string
  name: string
  erpType: "SAP B1 MSSQL"
  createdAt: string
  tableCount: number
}

export type ConnectionCreateInput = MssqlConnectionConfig & {
  name: string
}
