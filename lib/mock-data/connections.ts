import type { ErpConnection } from "@/types"

export const mockConnections: ErpConnection[] = [
  {
    id: "sap-live",
    name: "SAP LIVE",
    erpType: "SAP B1 MSSQL",
    status: "connected",
    tableCount: 143,
    lastSync: "2 mins ago",
    server: "10.12.4.22",
  },
  {
    id: "sap-sbx",
    name: "SAP Sandbox",
    erpType: "SAP B1 MSSQL",
    status: "connected",
    tableCount: 118,
    lastSync: "1h ago",
    server: "10.12.4.40",
  },
  {
    id: "odoo-eu",
    name: "Odoo EU",
    erpType: "Odoo 17",
    status: "connected",
    tableCount: 86,
    lastSync: "15 mins ago",
    server: "odoo.eu.acme.internal",
  },
]
