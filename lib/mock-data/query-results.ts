export const mockQueryColumns = ["Region", "Invoices", "Revenue", "Share"]

export const mockQueryRows: Record<string, string | number>[] = [
  { Region: "North America", Invoices: 128, Revenue: 842000, Share: "41%" },
  { Region: "EMEA", Invoices: 96, Revenue: 512000, Share: "25%" },
  { Region: "APAC", Invoices: 74, Revenue: 388000, Share: "19%" },
  { Region: "LATAM", Invoices: 42, Revenue: 214000, Share: "15%" },
]

export const mockBarChart = [
  { name: "OINV", value: 420 },
  { name: "ORCT", value: 360 },
  { name: "OCRD", value: 280 },
  { name: "OITM", value: 190 },
]

export const mockPieChart = [
  { name: "Product", value: 44 },
  { name: "Services", value: 32 },
  { name: "Maintenance", value: 24 },
]
