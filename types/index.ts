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
  sampleRows: Record<string, string | number>[]
  relationshipHints?: string[]
}

export type ConnectionStatus = "connected" | "disconnected" | "syncing" | "error"

export type ErpConnection = {
  id: string
  name: string
  erpType: string
  status: ConnectionStatus
  tableCount: number
  lastSync: string
  server?: string
  database?: string
  username?: string
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
