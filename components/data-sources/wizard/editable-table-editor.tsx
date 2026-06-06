"use client"

import { useCallback, useEffect, useState } from "react"
import type { PreparedRow, TableDraft } from "@/lib/context/data-source-wizard-context"
import { previewWizardClean } from "@/lib/api/data-sources"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Loader2, Trash2 } from "lucide-react"

type Props = {
  sourceKind: "connection" | "excel"
  sessionId?: string
  connectionId?: string
  draft: TableDraft
  onDraftChange: (draft: TableDraft) => void
}

function withRowIdsPreserving(
  rows: Record<string, string | number | null>[],
  existing?: PreparedRow[]
): PreparedRow[] {
  return rows.map((row, i) => {
    const prev = existing?.[i]
    const id = prev?._rowId ?? crypto.randomUUID()
    return { ...row, _rowId: id }
  })
}

export function EditableTableEditor({
  sourceKind,
  sessionId,
  connectionId,
  draft,
  onDraftChange,
}: Props) {
  const [loading, setLoading] = useState(draft.preparedRows === undefined)
  const [error, setError] = useState<string | null>(null)

  const tableId = `${draft.schema}:${draft.externalName}`

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await previewWizardClean({
        sourceKind,
        sessionId,
        connectionId,
        externalSchema: draft.schema,
        externalName: draft.externalName,
        cleaning: draft.cleaning,
      })
      const sourceRows = data.rows ?? data.sampleRows
      const rows = withRowIdsPreserving(sourceRows, draft.preparedRows)
      onDraftChange({
        ...draft,
        preparedRows: rows,
        preparedColumns: data.columns,
        selectedRowIds: [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load table")
    } finally {
      setLoading(false)
    }
  }, [sourceKind, sessionId, connectionId, draft.schema, draft.externalName, draft.cleaning, onDraftChange, draft])

  useEffect(() => {
    if (draft.preparedRows !== undefined) return
    void load()
  }, [tableId, draft.preparedRows, load])

  const columns = draft.preparedColumns ?? []
  const rows = draft.preparedRows ?? []
  const selectedIds = new Set(draft.selectedRowIds ?? [])
  const displayRows = rows

  const toggleRow = (rowId: string, checked: boolean) => {
    const next = new Set(draft.selectedRowIds ?? [])
    if (checked) next.add(rowId)
    else next.delete(rowId)
    onDraftChange({ ...draft, selectedRowIds: [...next] })
  }

  const toggleAllRows = (checked: boolean) => {
    onDraftChange({
      ...draft,
      selectedRowIds: checked ? rows.map((r) => r._rowId) : [],
    })
  }

  const deleteSelected = () => {
    const remove = new Set(draft.selectedRowIds ?? [])
    if (!remove.size) return
    onDraftChange({
      ...draft,
      preparedRows: rows.filter((r) => !remove.has(r._rowId)),
      selectedRowIds: [],
    })
  }

  const deleteRow = (rowId: string) => {
    onDraftChange({
      ...draft,
      preparedRows: rows.filter((r) => r._rowId !== rowId),
      selectedRowIds: (draft.selectedRowIds ?? []).filter((id) => id !== rowId),
    })
  }

  const allRowsSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r._rowId))

  if (loading) {
    return (
      <div className="text-muted-foreground flex h-48 items-center justify-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading table&hellip;
      </div>
    )
  }

  if (error) {
    return <p className="text-destructive text-sm">{error}</p>
  }

  return (
    <div className="border-border/60 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-black/10 lg:min-h-0">
      <div className="border-border/60 z-20 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-zinc-950/95 px-4 py-2 backdrop-blur">
        <p className="text-muted-foreground text-xs">
          Preview · {rows.length} rows · showing up to {displayRows.length}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 rounded-xl border-white/15"
          disabled={!selectedIds.size}
          onClick={deleteSelected}
        >
          <Trash2 className="mr-1.5 size-3.5" />
          Delete selected ({selectedIds.size})
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b border-white/[0.06]">
              <th className="sticky top-0 z-10 w-10 bg-zinc-950/95 px-2 py-2 text-left align-middle backdrop-blur">
                <input
                  type="checkbox"
                  checked={allRowsSelected}
                  onChange={(e) => toggleAllRows(e.target.checked)}
                  className="size-4 rounded border-white/20"
                  aria-label="Select all rows"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.name}
                  className="sticky top-0 z-10 bg-zinc-950/95 px-2 py-2 text-left align-middle font-mono text-xs whitespace-nowrap backdrop-blur"
                >
                  {col.name}
                </th>
              ))}
              <th className="sticky top-0 z-10 w-10 bg-zinc-950/95 px-2 py-2 backdrop-blur" />
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {displayRows.map((row) => (
              <tr
                key={row._rowId}
                className={cn(
                  "border-b border-white/[0.06] transition-colors hover:bg-muted/50",
                  selectedIds.has(row._rowId) && "bg-sky-500/[0.06]"
                )}
              >
                <td className="p-2 align-middle">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row._rowId)}
                    onChange={(e) => toggleRow(row._rowId, e.target.checked)}
                    className="size-4 rounded border-white/20"
                  />
                </td>
                {columns.map((col) => (
                  <td key={col.name} className="p-2 align-middle font-mono text-xs whitespace-nowrap">
                    {String(row[col.name] ?? "")}
                  </td>
                ))}
                <td className="p-2 align-middle">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive size-8"
                    onClick={() => deleteRow(row._rowId)}
                    aria-label="Delete row"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
