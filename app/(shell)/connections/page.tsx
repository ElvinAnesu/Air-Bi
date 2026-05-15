"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchConnections } from "@/lib/api/connections"
import type { ErpConnection } from "@/types"
import { ConnectionForm } from "@/components/connection/connection-form"
import { ConnectionCard } from "@/components/dashboard/connection-card"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import { Database, Loader2, Plus } from "lucide-react"

export default function ConnectionsPage() {
  const [items, setItems] = useState<ErpConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [addNewOpen, setAddNewOpen] = useState(false)

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

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            Connect SAP B1 MSSQL databases. Connections are stored in server memory until the app restarts.
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
              <ConnectionCard key={c.id} connection={c} href={`/connections/${c.id}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
