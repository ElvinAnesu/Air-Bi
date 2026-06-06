"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import type { DataSource } from "@/types"
import { deleteDataSource, fetchDataSources } from "@/lib/api/data-sources"
import { useDataSourceWizard } from "@/lib/context/data-source-wizard-context"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, Database, FileSpreadsheet, Loader2, Plus, Trash2 } from "lucide-react"

export function DataSourcesView() {
  const { setSetupDialogOpen } = useDataSourceWizard()
  const [items, setItems] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DataSource | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const sources = await fetchDataSources()
      setItems(sources)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data sources")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteDataSource(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Data sources</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Curate the tables and sheets your team uses for reporting and chat.
          </p>
        </div>
        <Button type="button" className="rounded-xl" onClick={() => setSetupDialogOpen(true)}>
          <Plus className="mr-2 size-4" />
          New data source
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300/80">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No data sources yet"
          description="Create a data source from a connection or Excel file. Select tables, clean data, and define relationships in one guided flow."
          actionLabel="Create data source"
          onAction={() => setSetupDialogOpen(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((ds) => (
            <Card
              key={ds.id}
              className="overflow-hidden rounded-2xl border border-white/15 bg-zinc-900/90 ring-1 ring-white/[0.06]"
            >
              <Link href={`/data-sources/${ds.id}`} className="block transition hover:bg-white/[0.04]">
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{ds.name}</CardTitle>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {ds.sourceKind === "excel"
                        ? ds.excelFileName ?? "Excel — upload pending"
                        : ds.connectionName ?? "Linked connection"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-full text-[10px] capitalize">
                      {ds.sourceKind === "excel" ? (
                        <span className="flex items-center gap-1">
                          <FileSpreadsheet className="size-3" /> Excel
                        </span>
                      ) : (
                        ds.connectionType ?? "connection"
                      )}
                    </Badge>
                    <ChevronRight className="text-muted-foreground size-4" />
                  </div>
                </CardHeader>
                <CardContent className="pb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tables added</span>
                    <span className="font-medium tabular-nums">{ds.tableCount}</span>
                  </div>
                  {ds.connectionStatus && (
                    <div className="mt-2 flex justify-between">
                      <span className="text-muted-foreground">Connection</span>
                      <span className="capitalize">{ds.connectionStatus}</span>
                    </div>
                  )}
                </CardContent>
              </Link>
              <div className="border-t border-white/[0.08] px-4 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(ds)}
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="rounded-2xl border-white/15 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Delete data source?</DialogTitle>
            <DialogDescription>
              This removes &quot;{deleteTarget?.name}&quot; and all curated tables. Chats referencing it may break.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" className="rounded-xl" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-xl" disabled={deleting} onClick={handleDelete}>
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
