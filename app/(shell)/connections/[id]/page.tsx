"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import type { ErpConnection, ErpTable, SchemaTableSummary } from "@/types"
import {
  fetchConnection,
  fetchConnectionSchema,
  fetchTablePreview,
} from "@/lib/api/connections"
import { ConnectionStatusBadge } from "@/components/connection/connection-status-badge"
import { ConnectionDetailActions } from "@/components/connection/connection-detail-actions"
import { SchemaExplorerSidebar } from "@/components/database/schema-explorer-sidebar"
import { TableDetailView } from "@/components/database/table-detail-view"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { ArrowLeft, Loader2, PanelLeft } from "lucide-react"

export default function ConnectionDetailPage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""

  const [connection, setConnection] = useState<ErpConnection | null>(null)
  const [connectionLoading, setConnectionLoading] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const [tables, setTables] = useState<SchemaTableSummary[]>([])
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [schemaError, setSchemaError] = useState<string | null>(null)

  const [selectedTable, setSelectedTable] = useState<ErpTable | null>(null)
  const [tableLoading, setTableLoading] = useState(false)
  const [tableError, setTableError] = useState<string | null>(null)

  const [schemaDrawerOpen, setSchemaDrawerOpen] = useState(false)

  const catalogName = connection ? `${connection.name} · ${connection.erpType}` : ""

  const loadConnection = useCallback(async () => {
    if (!id) return
    setConnectionLoading(true)
    setConnectionError(null)
    try {
      const data = await fetchConnection(id)
      setConnection(data)
    } catch (err) {
      setConnection(null)
      setConnectionError(err instanceof Error ? err.message : "Connection not found")
    } finally {
      setConnectionLoading(false)
    }
  }, [id])

  const loadSchema = useCallback(async () => {
    if (!id || !connection) return
    setSchemaLoading(true)
    setSchemaError(null)
    try {
      const data = await fetchConnectionSchema(id)
      setTables(data)
    } catch (err) {
      setTables([])
      setSchemaError(err instanceof Error ? err.message : "Failed to load schema")
    } finally {
      setSchemaLoading(false)
    }
  }, [id, connection])

  useEffect(() => {
    void loadConnection()
  }, [loadConnection])

  useEffect(() => {
    if (connection) void loadSchema()
  }, [connection, loadSchema])

  const handleTableSelect = async (summary: SchemaTableSummary) => {
    setSchemaDrawerOpen(false)
    setTableLoading(true)
    setTableError(null)
    setSelectedTable(null)
    try {
      const table = await fetchTablePreview(id, summary.schema, summary.name)
      setSelectedTable(table)
    } catch (err) {
      setTableError(err instanceof Error ? err.message : "Failed to load table")
    } finally {
      setTableLoading(false)
    }
  }

  if (connectionLoading) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 px-4 py-8 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading connection…
      </p>
    )
  }

  if (!connection) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href="/connections"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition"
        >
          <ArrowLeft className="size-4" />
          Back to connections
        </Link>
        <p className="text-destructive text-sm">{connectionError ?? "Connection not found."}</p>
      </div>
    )
  }

  const sidebarProps = {
    catalogName,
    tables,
    loading: schemaLoading,
    schemaError,
    selectedTableId: selectedTable?.id,
    onTableSelect: (table: SchemaTableSummary) => void handleTableSelect(table),
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem-2rem)] flex-col md:min-h-[calc(100dvh-3.5rem-3rem)] -mx-4 -mb-4 md:-mx-6 md:-mb-6">
      <header className="border-border/60 flex shrink-0 flex-wrap items-center gap-3 border-b bg-black/10 px-4 py-3">
        <Link
          href="/connections"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition"
          aria-label="Back to connections"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <ConnectionStatusBadge status={connection.status} />
        <ConnectionDetailActions />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto rounded-xl lg:hidden"
          onClick={() => setSchemaDrawerOpen(true)}
        >
          <PanelLeft className="mr-1.5 size-3.5" />
          Schema
        </Button>
        <div className="hidden min-w-0 lg:ml-auto lg:block lg:text-right">
          <h1 className="truncate text-lg font-semibold tracking-tight">{connection.name}</h1>
          <p className="text-muted-foreground truncate text-xs">{connection.erpType}</p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <SchemaExplorerSidebar className="hidden lg:flex" collapsible {...sidebarProps} />

        <Sheet open={schemaDrawerOpen} onOpenChange={setSchemaDrawerOpen}>
          <SheetContent side="left" className="w-72 p-0" showCloseButton>
            <SchemaExplorerSidebar className="h-full w-full border-r-0" {...sidebarProps} />
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="border-border/60 flex items-center gap-2 border-b px-4 py-2 lg:hidden">
            <h1 className="truncate text-sm font-semibold">{connection.name}</h1>
            <span className="text-muted-foreground text-xs">· {connection.erpType}</span>
          </div>
          {tableError && (
            <p className="text-destructive border-border/60 border-b px-4 py-2 text-sm">{tableError}</p>
          )}
          {tableLoading ? (
            <p className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading table…
            </p>
          ) : (
            <TableDetailView table={selectedTable} />
          )}
        </div>
      </div>
    </div>
  )
}
