"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import type { DataSource, DataSourceTable } from "@/types"
import {
  addDataSourceTable,
  fetchAvailableTables,
  fetchDataSource,
  fetchDataSourceTables,
  refreshDataSourceTable,
  removeDataSourceTable,
  uploadExcelToDataSource,
} from "@/lib/api/data-sources"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  FileSpreadsheet,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react"
import type { SchemaTableSummary } from "@/types"

export function DataSourceDetailView({ dataSourceId }: { dataSourceId: string }) {
  const [source, setSource] = useState<DataSource | null>(null)
  const [tables, setTables] = useState<DataSourceTable[]>([])
  const [available, setAvailable] = useState<SchemaTableSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
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

  const handleAdd = async (table: SchemaTableSummary) => {
    setAdding(table.id)
    try {
      await addDataSourceTable(dataSourceId, {
        externalSchema: table.schema,
        externalName: table.schema === "smartsheet" ? table.id : table.name,
        displayName: table.name,
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add table")
    } finally {
      setAdding(null)
    }
  }

  const handleRemove = async (tableId: string) => {
    try {
      await removeDataSourceTable(dataSourceId, tableId)
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  if (!source) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Data source not found.</p>
        <Link href="/data-sources" className="text-primary mt-4 inline-block text-sm">
          Back to data sources
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-start gap-4">
        <Link href="/data-sources">
          <Button variant="ghost" size="sm" className="rounded-xl">
            <ArrowLeft className="mr-1.5 size-4" />
            Back
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{source.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {source.sourceKind === "excel"
              ? source.excelFileName
                ? `Excel file: ${source.excelFileName}`
                : "Upload an Excel file, then add sheets as tables."
              : `Linked to ${source.connectionName ?? "connection"} — ${source.connectionStatus ?? "unknown"}`}
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
              className="rounded-xl"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Upload className="mr-2 size-4" />
              )}
              {source.excelFileName ? "Replace Excel file" : "Upload Excel file"}
            </Button>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300/80">
          {error}
        </div>
      )}

      <Card className="rounded-2xl border-white/15 bg-zinc-900/90">
        <CardHeader>
          <CardTitle className="text-base">Curated tables ({tables.length})</CardTitle>
          <p className="text-muted-foreground text-xs">
            Only these tables are available in chat. Live connections use real-time data when connected; otherwise snapshots are used.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {tables.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tables added yet. Add tables from the list below.</p>
          ) : (
            tables.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">{t.displayName ?? t.externalName}</p>
                  <p className="text-muted-foreground text-xs">
                    {t.externalSchema}.{t.externalName} · {t.rowCount} rows
                    {t.snapshotAt && ` · snapshot ${new Date(t.snapshotAt).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {source.sourceKind === "connection" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-white/15"
                      disabled={refreshing === t.id}
                      onClick={() => void handleRefresh(t.id)}
                    >
                      {refreshing === t.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="size-3.5" />
                      )}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => void handleRemove(t.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-white/15 bg-zinc-900/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4" />
            Add tables
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            Browse available tables from the connection or Excel file and add them to this data source.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {source.sourceKind === "excel" && !source.excelFileName && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-200/80">
              <FileSpreadsheet className="size-4 shrink-0" />
              Upload an Excel file first to see available sheets.
            </div>
          )}
          {available.length === 0 && source.excelFileName && (
            <p className="text-muted-foreground text-sm">All sheets have been added.</p>
          )}
          {available.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-muted-foreground text-xs">{t.description}</p>
              </div>
              <Button
                type="button"
                size="sm"
                className="rounded-xl"
                disabled={adding === t.id}
                onClick={() => void handleAdd(t)}
              >
                {adding === t.id ? <Loader2 className="size-3.5 animate-spin" /> : "Add"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {source.connectionStatus && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Connection status:</span>
          <Badge variant="outline" className="rounded-full capitalize">
            {source.connectionStatus}
          </Badge>
          {source.connectionStatus === "connected" && (
            <span className="text-muted-foreground text-xs">Chat queries use live data</span>
          )}
          {source.connectionStatus !== "connected" && source.sourceKind === "connection" && (
            <span className="text-muted-foreground text-xs">Chat uses cached snapshots</span>
          )}
        </div>
      )}
    </div>
  )
}
