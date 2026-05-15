import type { ChatMessageModel } from "@/types"

export const mockConversationMessages: ChatMessageModel[] = [
  {
    id: "m1",
    role: "user",
    content: "How much revenue did we recognize today?",
  },
  {
    id: "m2",
    role: "assistant",
    content:
      "Based on incoming payments posted today, **cash and transfers total $24,320** across ORCT. This is **+12%** vs the same weekday last week.",
    summary: "Received today: **$24,320**",
    sql: `SELECT SUM(CashSum + TrsfrSum + CheckSum) AS ReceivedToday
FROM ORCT
WHERE DocDate = CAST(GETDATE() AS DATE);`,
    chart: "line",
  },
]

export const suggestedPrompts = [
  "How much revenue today?",
  "Show overdue invoices",
  "Top customers this month",
  "Inventory discrepancies",
]
