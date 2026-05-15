export type ChatHistoryItem = {
  id: string
  title: string
  preview: string
  updatedAt: string
  hasChart?: boolean
}

export const mockChatHistory: ChatHistoryItem[] = [
  {
    id: "1",
    title: "Revenue vs last week",
    preview: "Incoming payments are pacing ahead of plan…",
    updatedAt: "Today",
    hasChart: true,
  },
  {
    id: "2",
    title: "Overdue A/R by region",
    preview: "There are 14 overdue invoices totaling…",
    updatedAt: "Yesterday",
    hasChart: true,
  },
  {
    id: "3",
    title: "Inventory safety stock",
    preview: "OITM shows 5 SKUs below reorder point…",
    updatedAt: "May 12",
  },
  {
    id: "4",
    title: "Top customers this month",
    preview: "Northwind Logistics leads with $842k…",
    updatedAt: "May 10",
    hasChart: true,
  },
]
