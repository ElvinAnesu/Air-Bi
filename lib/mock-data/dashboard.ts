import type { ActivityItem, AiInsight, ChartPoint, DashboardKpi } from "@/types"

export const mockKpis: DashboardKpi[] = [
  {
    id: "rev",
    label: "Revenue Today",
    value: "$24,320",
    delta: "+12% from yesterday",
    trend: "up",
  },
  {
    id: "inv",
    label: "Outstanding Invoices",
    value: "38",
    delta: "6 due this week",
    trend: "neutral",
    hint: "A/R exposure stable",
  },
  {
    id: "stock",
    label: "Inventory Alerts",
    value: "5",
    delta: "2 critical",
    trend: "down",
  },
  {
    id: "erps",
    label: "Connected ERPs",
    value: "2",
    delta: "SAP B1 LIVE + Sandbox",
    trend: "neutral",
  },
  {
    id: "ai",
    label: "AI Conversations",
    value: "142",
    delta: "+18 vs last week",
    trend: "up",
  },
  {
    id: "reports",
    label: "Saved Reports",
    value: "27",
    delta: "Last edited 2h ago",
    trend: "neutral",
  },
]

export const mockRevenueSeries: ChartPoint[] = [
  { label: "Mon", value: 18200 },
  { label: "Tue", value: 19840 },
  { label: "Wed", value: 17620 },
  { label: "Thu", value: 21440 },
  { label: "Fri", value: 24320 },
  { label: "Sat", value: 8840 },
  { label: "Sun", value: 6420 },
]

export const mockActivity: ActivityItem[] = [
  {
    id: "1",
    title: "SAP B1 LIVE sync completed",
    description: "143 tables refreshed · 1.2M rows scanned",
    time: "2m ago",
    kind: "sync",
  },
  {
    id: "2",
    title: "AI query: revenue by region",
    description: "Generated SQL validated · results exported to CSV",
    time: "18m ago",
    kind: "query",
  },
  {
    id: "3",
    title: "Inventory threshold breach",
    description: "SKU-7720 below safety stock in WH-01",
    time: "42m ago",
    kind: "alert",
  },
  {
    id: "4",
    title: "Jordan Lee saved a report",
    description: "Executive margin snapshot",
    time: "1h ago",
    kind: "user",
  },
]

export const mockAiInsights: AiInsight[] = [
  {
    id: "i1",
    title: "Cash collection velocity",
    body: "Incoming payments are pacing 8% ahead of last month with ORCT concentration on Tuesdays.",
    confidence: "high",
  },
  {
    id: "i2",
    title: "Customer concentration",
    body: "Top 5 customers represent 41% of open A/R on OINV; consider exposure caps for C000142.",
    confidence: "medium",
  },
]
