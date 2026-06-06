"use client"

import { useCallback, useEffect, useState } from "react"
import type { SchemaTableSummary } from "@/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"

export type SelectedCatalogTable = {
  id: string
  schema: string
  name: string
  externalName: string
  displayName: string
}

type Props = {
  loadCatalog: (opts: { q: string; limit: number; offset: number }) => Promise<{
    tables: SchemaTableSummary[]
    total: number
  }>
  selected: SelectedCatalogTable[]
  onSelectionChange: (tables: SelectedCatalogTable[]) => void
  emptyHint?: string
}

const PAGE_SIZE = 50

function toSelected(t: SchemaTableSummary): SelectedCatalogTable {
  const externalName = t.schema === "smartsheet" ? t.id : t.name
  return {
    id: t.id,
    schema: t.schema,
    name: t.name,
    externalName,
    displayName: t.name,
  }
}

export function TableCatalogPicker({
  loadCatalog,
  selected,
  onSelectionChange,
  emptyHint,
}: Props) {
  const [q, setQ] = useState("")
  const [debouncedQ, setDebouncedQ] = useState("")
  const [tables, setTables] = useState<SchemaTableSummary[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => window.clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await loadCatalog({ q: debouncedQ, limit: PAGE_SIZE, offset })
      setTables(result.tables)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search tables")
      setTables([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [loadCatalog, debouncedQ, offset])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setOffset(0)
  }, [debouncedQ])

  const selectedKeys = new Set(selected.map((s) => `${s.schema}:${s.externalName}`))

  const toggle = (t: SchemaTableSummary, checked: boolean) => {
    const item = toSelected(t)
    const key = `${item.schema}:${item.externalName}`
    if (checked) {
      if (!selectedKeys.has(key)) onSelectionChange([...selected, item])
    } else {
      onSelectionChange(selected.filter((s) => `${s.schema}:${s.externalName}` !== key))
    }
  }

  const canPrev = offset > 0
  const canNext = offset + PAGE_SIZE < total

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tables or sheets&hellip;"
          className="rounded-xl border-white/12 bg-black/30 pl-9"
        />
      </div>

      {selected.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {selected.length} selected · {total} match{total === 1 ? "" : "es"}
        </p>
      )}

      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}

      <div className="border-border/60 max-h-64 overflow-y-auto rounded-xl border">
        {loading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Searching&hellip;
          </div>
        ) : tables.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            {emptyHint ?? "No tables found. Try a different search."}
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {tables.map((t) => {
              const item = toSelected(t)
              const key = `${item.schema}:${item.externalName}`
              const checked = selectedKeys.has(key)
              return (
                <li key={key}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-white/[0.04]",
                      checked && "bg-sky-500/[0.06]"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggle(t, e.target.checked)}
                      className="mt-1 size-4 rounded border-white/20"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.name}</p>
                      <p className="text-muted-foreground truncate text-xs">{t.description}</p>
                    </div>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {(canPrev || canNext) && (
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={!canPrev || loading}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-xs tabular-nums">
            {offset + 1}&ndash;{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={!canNext || loading}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
