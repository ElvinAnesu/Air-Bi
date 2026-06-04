"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import type { DataSource, DataSourceTable, ErpTable, SchemaTableSummary } from "@/types"
import {
  addDataSourceTable,
  fetchAvailableTables,
  fetchDataSource,
  fetchDataSourceTablePreview,
  fetchDataSourceTables,
  refreshDataSourceTable,
  removeDataSourceTable,
  uploadExcelToDataSource,
} from "@/lib/api/data-sources"
import { TableDetailView } from "@/components/database/table-detail-view"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  FileSpreadsheet,
  Loader2,
  PanelLeft,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react"

export function DataSourceDetailView({ dataSourceId }: { dataSourceId: string }) {
  const [source, setSource] = useState<DataSource | null>(null)
  const [tables, setTables] = useState<DataSourceTable[]>([])
  const [available, setAvailable] = useState<SchemaTableSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [tablesDrawerOpen, setTablesDrawerOpen] = useState(false)

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [preview, setPreview] = useState<ErpTable | null>(null)
  const [previewMeta, setPreviewMeta] = useState<{
    rowCount: number
    previewRowCount: number
    isLive: boolean
  } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLive, setPreviewLive] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ds, tbls, avail] = await Promise.all([
        fetchDataSource(dataSourceId),
        fetchDataSourceTables(dataSourceId),
        fetchAvailableTables(dataSourceId).catch(() => []),
      ])
      setSource(ds)
      setTables(tbls)
      setAvailable(avail)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data source")
    } finally {
      setLoading(false)
    }
  }, [dataSourceId])

  useEffect(() => {
    void load()
  }, [load])

  const loadPreview = useCallback(
    async (tableId: string, options?: { live?: boolean }) => {
      setPreviewLoading(true)
      setPreviewError(null)
      setSelectedTableId(tableId)
      try {
        const useLive =
          options?.live ??
          (previewLive && source?.connectionStatus === "connected" && source.sourceKind === "connection")
        const data = await fetchDataSourceTablePreview(dataSourceId, tableId, { live: useLive })
        setPreview({
          id: data.id,
          name: data.name,
          description: data.description,
          columns: data.columns,
          sampleRows: data.sampleRows,
        })
        setPreviewMeta({
          rowCount: data.rowCount,
          previewRowCount: data.previewRowCount,
          isLive: data.isLive,
        })
      } catch (err) {
        setPreview(null)
        setPreviewMeta(null)
        setPreviewError(err instanceof Error ? err.message : "Failed to load table preview")
      } finally {
        setPreviewLoading(false)
      }
    },
    [dataSourceId, previewLive, source?.connectionStatus, source?.sourceKind]
  )

  useEffect(() => {
    if (tables.length > 0 && !selectedTableId) {
      void loadPreview(tables[0].id)
    }
  }, [tables, selectedTableId, loadPreview])

  const handleAdd = async (table: SchemaTableSummary) => {
    setAdding(table.id)
    try {
      await addDataSourceTable(dataSourceId, {
        externalSchema: table.schema,
        externalName: table.schema === "smartsheet" ? table.id : table.name,
        displayName: table.name,
      })
      await load()
      setAddSheetOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add table")
    } finally {
      setAdding(null)
    }
  }

  const handleRemove = async (tableId: string) => {
    try {
      await removeDataSourceTable(dataSourceId, tableId)
      if (selectedTableId === tableId) {
        setSelectedTableId(null)
        setPreview(null)
        setPreviewMeta(null)
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove table")
    }
  }

  const handleRefresh = async (tableId: string) => {
    setRefreshing(tableId)
    try {
      await refreshDataSourceTable(dataSourceId, tableId)
      await load()
      if (selectedTableId === tableId) {
        await loadPreview(tableId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh snapshot")
    } finally {
      setRefreshing(null)
    }
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const updated = await uploadExcelToDataSource(dataSourceId, file)
      setSource(updated)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const canPreviewLive =
    source?.sourceKind === "connection" && source.connectionStatus === "connected"

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  if (!source) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">Data source not found.</p>
        <Link href="/data-sources" className="text-primary mt-4 inline-block text-sm">
          Back to data sources
        </Link>
      </div>
    )
  }

  const catalogName = source.name

  const tablesSidebar = (
    <aside className="border-border/60 flex h-full w-72 shrink-0 flex-col border-r bg-black/25">
      <div className="border-border/60 border-b px-4 py-3">
        <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
          Curated tables
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">{tables.length} in this data source</p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {tables.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-sm">
            No tables yet. Use Add tables to include sheets or tables for chat.
          </p>
        ) : (
          <ul className="space-y-0.5 p-2">
            {tables.map((t) => {
              const active = selectedTableId === t.id
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => void loadPreview(t.id)}
                    className={cn(
                      "flex w-full flex-col items-start rounded-xl px-3 py-2.5 text-left text-sm transition",
                      active
                        ? "bg-sky-500/15 text-foreground ring-1 ring-sky-500/25"
                        : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                    )}
                  >
                    <span className="font-medium">{t.displayName ?? t.externalName}</span>
                    <span className="text-[11px] opacity-80">
                      {t.externalSchema}.{t.externalName} · {t.rowCount} rows
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </ScrollArea>
      <div className="border-border/60 border-t p-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full rounded-xl border-white/15"
          onClick={() => setAddSheetOpen(true)}
        >
          <Plus className="mr-1.5 size-3.5" />
          Add tables
        </Button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-border/60 flex shrink-0 flex-wrap items-center gap-3 border-b bg-black/10 px-4 py-3">
        <Link
          href="/data-sources"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight">{source.name}</h1>
          <p className="text-muted-foreground truncate text-xs">
            {source.sourceKind === "excel"
              ? source.excelFileName ?? "Excel upload"
              : `${source.connectionName ?? "Connection"} · ${source.connectionStatus ?? "unknown"}`}
          </p>
        </div>
        {source.sourceKind === "excel" && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleUpload(file)
                e.target.value = ""
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl border-white/15"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 size-3.5" />
              )}
              Upload Excel
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl border-white/15 lg:hidden"
          onClick={() => setTablesDrawerOpen(true)}
        >
          <PanelLeft className="mr-1.5 size-3.5" />
          Tables
        </Button>
      </header>

      {error && (
        <p className="text-destructive border-border/60 shrink-0 border-b px-4 py-2 text-sm">{error}</p>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="hidden lg:flex">{tablesSidebar}</div>

        <Sheet open={tablesDrawerOpen} onOpenChange={setTablesDrawerOpen}>
          <SheetContent side="left" className="w-72 p-0" showCloseButton>
            {tablesSidebar}
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {selectedTableId && (
            <div className="border-border/60 flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
              {previewMeta?.isLive && (
                <Badge variant="outline" className="rounded-full border-emerald-500/30 text-emerald-400">
                  Live data
                </Badge>
              )}
              {previewMeta && !previewMeta.isLive && (
                <Badge variant="outline" className="rounded-full text-xs">
                  Snapshot
                </Badge>
              )}
              {previewMeta && previewMeta.previewRowCount < previewMeta.rowCount && (
                <span className="text-muted-foreground text-xs">
                  Showing {previewMeta.previewRowCount} of {previewMeta.rowCount} rows
                </span>
              )}
              <div className="ml-auto flex flex-wrap gap-2">
                {canPreviewLive && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "rounded-xl border-white/15 text-xs",
                      previewLive && "bg-sky-500/10 ring-1 ring-sky-500/25"
                    )}
                    onClick={() => {
                      const next = !previewLive
                      setPreviewLive(next)
                      if (selectedTableId) void loadPreview(selectedTableId, { live: next })
                    }}
                  >
                    {previewLive ? "Using live data" : "Use live data"}
                  </Button>
                )}
                {source.sourceKind === "connection" && selectedTableId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-white/15"
                    disabled={refreshing === selectedTableId}
                    onClick={() => void handleRefresh(selectedTableId)}
                  >
                    {refreshing === selectedTableId ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 size-3.5" />
                    )}
                    Refresh snapshot
                  </Button>
                )}
                {selectedTableId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive rounded-xl"
                    onClick={() => void handleRemove(selectedTableId)}
                  >
                    <Trash2 className="mr-1.5 size-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          )}

          {previewError && (
            <p className="text-destructive border-border/60 shrink-0 border-b px-4 py-2 text-sm">
              {previewError}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-hidden">
            {previewLoading ? (
              <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Loading table preview&hellip;
              </div>
            ) : tables.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                <FileSpreadsheet className="text-muted-foreground size-10 opacity-50" />
                <div>
                  <p className="text-sm font-medium">No tables to review</p>
                  <p className="text-muted-foreground mt-1 max-w-sm text-xs">
                    Add tables from your connection or Excel file to preview columns and data here.
                  </p>
                </div>
                <Button type="button" className="rounded-xl" onClick={() => setAddSheetOpen(true)}>
                  <Plus className="mr-2 size-4" />
                  Add tables
                </Button>
              </div>
            ) : (
              <TableDetailView table={preview} showActions={false} />
            )}
          </div>
        </div>
      </div>

      <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add tables</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            <p className="text-muted-foreground text-xs">
              Browse available tables from {catalogName} and add them to this data source.
            </p>
            {source.sourceKind === "excel" && !source.excelFileName && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-200/80">
                <FileSpreadsheet className="size-4 shrink-0" />
                Upload an Excel file first.
              </div>
            )}
            {available.length === 0 && source.excelFileName && (
              <p className="text-muted-foreground text-sm">All available tables have been added.</p>
            )}
            {available.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="text-muted-foreground truncate text-xs">{t.description}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0 rounded-xl"
                  disabled={adding === t.id}
                  onClick={() => void handleAdd(t)}
                >
                  {adding === t.id ? <Loader2 className="size-3.5 animate-spin" /> : "Add"}
                </Button>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
