export type SavedQueryItem = {
  id: string
  name: string
  description: string
  lastRun: string
  rows: number
}

export const mockSavedQueriesList: SavedQueryItem[] = [
  {
    id: "q1",
    name: "Daily cash receipts",
    description: "ORCT totals by DocDate (last 30 days)",
    lastRun: "12m ago",
    rows: 30,
  },
  {
    id: "q2",
    name: "Open A/R by customer",
    description: "OINV open documents with CardName join",
    lastRun: "1h ago",
    rows: 128,
  },
  {
    id: "q3",
    name: "Slow-moving SKUs",
    description: "OITM OnHand vs rolling demand (mock)",
    lastRun: "Yesterday",
    rows: 42,
  },
]
