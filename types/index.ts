export type ErpColumn = {
  name: string
  type: string
  description?: string
}

export type SchemaTableSummary = {
  id: string
  name: string
  schema: string
  description: string
}

export type ErpTable = {
  id: string
  name: string
  description: string
  favorite?: boolean
  columns: ErpColumn[]
  sampleRows: Record<string, string | number | null>[]
  relationshipHints?: string[]
}

export type ConnectionStatus = "connected" | "disconnected" | "syncing" | "error"

export type ConnectionType = "mssql" | "smartsheet"

export type ErpConnection = {
  id: string
  name: string
  erpType: string
  connectionType: ConnectionType
  status: ConnectionStatus
  tableCount: number
  lastSync: string
  server?: string
  database?: string
  username?: string
}

export type DataSourceKind = "connection" | "excel"

export type DataSource = {
  id: string
  name: string
  description?: string
  sourceKind: DataSourceKind
  connectionId?: string
  connectionName?: string
  connectionType?: ConnectionType
  connectionStatus?: ConnectionStatus
  excelFileName?: string
  tableCount: number
  createdAt: string
  updatedAt: string
}

export type DataSourceTable = {
  id: string
  dataSourceId: string
  externalSchema: string
  externalName: string
  displayName?: string
  columns: ErpColumn[]
  sampleRows: Record<string, string | number | null>[]
  rowCount: number
  snapshotAt?: string
}

export type DashboardKpi = {
  id: string
  label: string
  value: string
  delta?: string
  trend?: "up" | "down" | "neutral"
  hint?: string
}

export type ActivityItem = {
  id: string
  title: string
  description: string
  time: string
  kind: "sync" | "query" | "alert" | "user"
}

export type AiInsight = {
  id: string
  title: string
  body: string
  confidence: "high" | "medium"
}

export type ChartPoint = {
  label: string
  value: number
}

export type ChatRole = "user" | "assistant"

export type ChatMessageModel = {
  id: string
  role: ChatRole
  content: string
  sql?: string
  summary?: string
  chart?: "line" | "bar" | "pie"
}
