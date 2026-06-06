"use client"

import { useCallback, useEffect, useState } from "react"
import type { DataSourceRelationship, DataSourceTable } from "@/types"
import {
  createDataSourceRelationship,
  deleteDataSourceRelationship,
  fetchDataSourceRelationships,
} from "@/lib/api/data-sources"
import { DataPrepAssistant } from "@/components/data-sources/data-prep-assistant"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, Trash2 } from "lucide-react"

export function DataSourceRelationshipsPanel({
  dataSourceId,
  tables,
}: {
  dataSourceId: string
  tables: DataSourceTable[]
}) {
  const [relationships, setRelationships] = useState<DataSourceRelationship[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    fromTableId: "",
    fromColumn: "",
    toTableId: "",
    toColumn: "",
    joinType: "inner" as "inner" | "left",
    label: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRelationships(await fetchDataSourceRelationships(dataSourceId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load relationships")
    } finally {
      setLoading(false)
    }
  }, [dataSourceId])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async () => {
    if (!form.fromTableId || !form.toTableId || !form.fromColumn || !form.toColumn) return
    setSaving(true)
    setError(null)
    try {
      await createDataSourceRelationship(dataSourceId, {
        fromTableId: form.fromTableId,
        fromColumn: form.fromColumn,
        toTableId: form.toTableId,
        toColumn: form.toColumn,
        joinType: form.joinType,
        label: form.label || undefined,
      })
      setForm({
        fromTableId: "",
        fromColumn: "",
        toTableId: "",
        toColumn: "",
        joinType: "inner",
        label: "",
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create relationship")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDataSourceRelationship(dataSourceId, id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  const tableOptions = tables.map((t) => ({
    id: t.id,
    label: t.displayName ?? t.externalName,
  }))

  if (tables.length < 2) {
    return (
      <p className="text-muted-foreground text-sm">
        Add at least two tables to define relationships between them.
      </p>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <DataPrepAssistant
        dataSourceId={dataSourceId}
        task="suggest_relationships"
        onApplyRelationships={(suggestions) => {
          const first = suggestions[0]
          if (!first) return
          const from = tables.find((t) => `${t.externalSchema}.${t.externalName}` === first.fromTableKey)
          const to = tables.find((t) => `${t.externalSchema}.${t.externalName}` === first.toTableKey)
          if (from && to) {
            setForm({
              fromTableId: from.id,
              fromColumn: first.fromColumn,
              toTableId: to.id,
              toColumn: first.toColumn,
              joinType: first.joinType,
              label: first.label ?? "",
            })
          }
        }}
      />

      <div className="space-y-3 rounded-xl border border-white/10 p-4">
        <p className="text-sm font-medium">New relationship</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">From table</Label>
            <select
              value={form.fromTableId}
              onChange={(e) => setForm((f) => ({ ...f, fromTableId: e.target.value }))}
              className="border-input bg-background h-9 w-full rounded-xl border px-2 text-sm"
            >
              <option value="">Select</option>
              {tableOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From column</Label>
            <Input
              value={form.fromColumn}
              onChange={(e) => setForm((f) => ({ ...f, fromColumn: e.target.value }))}
              className="rounded-xl border-white/12 bg-black/30 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To table</Label>
            <select
              value={form.toTableId}
              onChange={(e) => setForm((f) => ({ ...f, toTableId: e.target.value }))}
              className="border-input bg-background h-9 w-full rounded-xl border px-2 text-sm"
            >
              <option value="">Select</option>
              {tableOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To column</Label>
            <Input
              value={form.toColumn}
              onChange={(e) => setForm((f) => ({ ...f, toColumn: e.target.value }))}
              className="rounded-xl border-white/12 bg-black/30 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Join type</Label>
            <select
              value={form.joinType}
              onChange={(e) =>
                setForm((f) => ({ ...f, joinType: e.target.value as "inner" | "left" }))
              }
              className="border-input bg-background h-9 w-full rounded-xl border px-2 text-sm"
            >
              <option value="inner">Inner</option>
              <option value="left">Left</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Label (optional)</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              className="rounded-xl border-white/12 bg-black/30 text-sm"
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="rounded-xl"
          disabled={saving}
          onClick={() => void handleCreate()}
        >
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
          Add relationship
        </Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading&hellip;
        </div>
      ) : relationships.length === 0 ? (
        <p className="text-muted-foreground text-sm">No relationships defined yet.</p>
      ) : (
        <ul className="space-y-2">
          {relationships.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm"
            >
              <span>
                {r.fromTableName ?? r.fromTableId}.{r.fromColumn} &rarr;{" "}
                {r.toTableName ?? r.toTableId}.{r.toColumn}{" "}
                <span className="text-muted-foreground">({r.joinType})</span>
                {r.label ? ` · ${r.label}` : ""}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive shrink-0"
                onClick={() => void handleDelete(r.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
