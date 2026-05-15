import type { ErpTable } from "@/types"

export const mockErpTables: ErpTable[] = [
  {
    id: "oinv",
    name: "OINV",
    description: "A/R Invoice Header",
    favorite: true,
    columns: [
      { name: "DocEntry", type: "int", description: "Primary key" },
      { name: "CardCode", type: "nvarchar(15)", description: "Customer code" },
      { name: "DocTotal", type: "money", description: "Document total" },
      { name: "DocDate", type: "datetime", description: "Posting date" },
      { name: "DocStatus", type: "char(1)", description: "Open / Closed" },
    ],
    sampleRows: [
      { DocEntry: 19204, CardCode: "C000142", DocTotal: 12480, DocDate: "2026-05-15", DocStatus: "O" },
      { DocEntry: 19201, CardCode: "C000088", DocTotal: 8420, DocDate: "2026-05-14", DocStatus: "C" },
      { DocEntry: 19188, CardCode: "C000201", DocTotal: 3260.5, DocDate: "2026-05-14", DocStatus: "O" },
    ],
    relationshipHints: ["ORDR (base document)", "RCT2 (incoming payments)", "INV1 (lines)"],
  },
  {
    id: "orct",
    name: "ORCT",
    description: "Incoming Payments",
    favorite: true,
    columns: [
      { name: "DocEntry", type: "int" },
      { name: "CardCode", type: "nvarchar(15)" },
      { name: "CashSum", type: "money" },
      { name: "TrsfrSum", type: "money" },
      { name: "CheckSum", type: "money" },
      { name: "DocDate", type: "datetime" },
    ],
    sampleRows: [
      { DocEntry: 44021, CardCode: "C000142", CashSum: 6200, TrsfrSum: 0, CheckSum: 0, DocDate: "2026-05-15" },
      { DocEntry: 44018, CardCode: "C000088", CashSum: 0, TrsfrSum: 8420, CheckSum: 0, DocDate: "2026-05-14" },
    ],
    relationshipHints: ["RCT1 (means of payment)", "RCT2 (invoice allocation)"],
  },
  {
    id: "ocrd",
    name: "OCRD",
    description: "Business Partners",
    favorite: false,
    columns: [
      { name: "CardCode", type: "nvarchar(15)" },
      { name: "CardName", type: "nvarchar(100)" },
      { name: "Balance", type: "money" },
      { name: "Currency", type: "nvarchar(3)" },
    ],
    sampleRows: [
      { CardCode: "C000142", CardName: "Northwind Logistics", Balance: 18420, Currency: "USD" },
      { CardCode: "C000088", CardName: "Atlas Manufacturing", Balance: 0, Currency: "USD" },
    ],
  },
  {
    id: "oitm",
    name: "OITM",
    description: "Items Master",
    favorite: false,
    columns: [
      { name: "ItemCode", type: "nvarchar(20)" },
      { name: "ItemName", type: "nvarchar(100)" },
      { name: "OnHand", type: "decimal(19,6)" },
      { name: "AvgPrice", type: "money" },
    ],
    sampleRows: [
      { ItemCode: "SKU-8841", ItemName: "Industrial Sensor Kit", OnHand: 128, AvgPrice: 412 },
      { ItemCode: "SKU-7720", ItemName: "Control Module v3", OnHand: 14, AvgPrice: 980 },
    ],
  },
  {
    id: "ordr",
    name: "ORDR",
    description: "Sales Order Header",
    columns: [
      { name: "DocEntry", type: "int" },
      { name: "CardCode", type: "nvarchar(15)" },
      { name: "DocTotal", type: "money" },
      { name: "DocDate", type: "datetime" },
    ],
    sampleRows: [
      { DocEntry: 88412, CardCode: "C000201", DocTotal: 15240, DocDate: "2026-05-13" },
    ],
  },
  {
    id: "opch",
    name: "OPCH",
    description: "A/P Invoice Header",
    columns: [
      { name: "DocEntry", type: "int" },
      { name: "CardCode", type: "nvarchar(15)" },
      { name: "DocTotal", type: "money" },
      { name: "DocDate", type: "datetime" },
    ],
    sampleRows: [
      { DocEntry: 12044, CardCode: "V000014", DocTotal: 6420, DocDate: "2026-05-12" },
    ],
  },
]

export function getTableById(id: string): ErpTable | undefined {
  return mockErpTables.find((t) => t.id === id)
}
