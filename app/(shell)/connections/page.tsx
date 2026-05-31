"use client"

import { useCallback, useEffect, useState } from "react"
import {
  deleteConnection,
  fetchConnections,
  syncConnection,
} from "@/lib/api/connections"
import type { ErpConnection } from "@/types"
import { ConnectionForm } from "@/components/connection/connection-form"
import { ConnectionCard } from "@/components/dashboard/connection-card"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Database, Loader2, Plus } from "lucide-react"

export default function ConnectionsPage() {
  const [items, setItems] = useState<ErpConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [addNewOpen, setAddNewOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ErpConnection | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ErpConnection | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadConnections = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const connections = await fetchConnections()
      setItems(connections)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load connections")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadConnections()
  }, [loadConnections])

  const handleSync = async (id: string) => {
    setSyncingId(id)
    setActionError(null)
    try {
      const updated = await syncConnection(id)
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    setActionError(null)
    try {
      await deleteConnection(deleteTarget.id)
      setDeleteTarget(null)
      await loadConnections()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="h-full overflow-auto p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
            <p className="text-muted-foreground mt-1 max-w-xl text-sm">
              Connect SAP B1 MSSQL databases. Connections are saved securely to your team workspace.
            </p>
          </div>
          <Button
            type="button"
            variant={addNewOpen ? "outline" : "default"}
            className="h-10 shrink-0 gap-2 rounded-xl px-4 sm:self-start"
            onClick={() => setAddNewOpen((v) => !v)}
          >
            {addNewOpen ? (
              "Close"
            ) : (
              <>
                <Plus className="size-4" />
                Add new
              </>
            )}
          </Button>
        </div>

        {actionError && <p className="text-destructive text-sm">{actionError}</p>}

        {addNewOpen && (
          <ConnectionForm
            onCancel={() => setAddNewOpen(false)}
            onSaved={() => {
              setAddNewOpen(false)
              void loadConnections()
            }}
          />
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-medium tracking-tight">Existing connections</h2>
          {loading ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading connections…
            </p>
          ) : loadError ? (
            <p className="text-destructive text-sm">{loadError}</p>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No connections yet"
              description="Use Add new to connect to a SAP B1 MSSQL database."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((c) => (
                <ConnectionCard
                  key={c.id}
                  connection={c}
                  href={`/connections/${c.id}`}
                  onEdit={(id) => setEditTarget(items.find((item) => item.id === id) ?? null)}
                  onSync={handleSync}
                  onDelete={(id) => setDeleteTarget(items.find((item) => item.id === id) ?? null)}
                  syncing={syncingId === c.id}
                  deleting={deletingId === c.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-2xl border-white/10 bg-zinc-950 p-0">
          {editTarget && (
            <ConnectionForm
              mode="edit"
              connectionId={editTarget.id}
              initialValues={{
                name: editTarget.name,
                server: editTarget.server ?? "",
                database: editTarget.database ?? "",
                user: editTarget.username ?? "",
              }}
              onCancel={() => setEditTarget(null)}
              onSaved={() => {
                setEditTarget(null)
                void loadConnections()
              }}
              className="border-0 bg-transparent ring-0"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete connection?</DialogTitle>
            <DialogDescription>
              This will permanently remove &quot;{deleteTarget?.name}&quot; from your team workspace. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={!!deletingId}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={!!deletingId}>
              {deletingId ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
