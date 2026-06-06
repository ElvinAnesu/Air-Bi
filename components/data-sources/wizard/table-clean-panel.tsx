"use client"

import { useCallback, useEffect, useState } from "react"
import type { SelectedCatalogTable } from "@/components/data-sources/wizard/table-catalog-picker"
import type { TableCleaningConfig } from "@/types"
import { previewWizardClean, type TableCleanPreview } from "@/lib/api/data-sources"
import { Loader2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type Props = {
  sourceKind: "connection" | "excel"
  sessionId?: string
  connectionId?: string
  table: SelectedCatalogTable
  cleaning: TableCleaningConfig
  onCleaningChange?: (config: TableCleaningConfig) => void
  layout?: "stacked" | "workspace"
}

function CleanPreview({
  preview,
  loading,
  fullPage,
}: {
  preview: TableCleanPreview | null
  loading: boolean
  fullPage?: boolean
}) {
  return (
    <div
      className={cn(
        "border-border/60 overflow-auto rounded-xl border bg-black/10",
        fullPage ? "min-h-[280px] flex-1 lg:min-h-0" : "max-h-72"
      )}
    >
      {loading ? (
        <div className="text-muted-foreground flex h-48 items-center justify-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Updating preview&hellip;
        </div>
      ) : preview ? (
        <>
          <p className="text-muted-foreground sticky top-0 z-10 border-b border-white/[0.06] bg-zinc-950/95 px-4 py-2 text-xs backdrop-blur">
            Preview · {preview.rowCount} rows · showing up to {Math.min(preview.sampleRows.length, 50)}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                {preview.columns.map((c) => (
                  <TableHead key={c.name} className="font-mono text-xs whitespace-nowrap">
                    {c.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.sampleRows.slice(0, fullPage ? 50 : 8).map((row, idx) => (
                <TableRow key={idx}>
                  {preview.columns.map((c) => (
                    <TableCell key={c.name} className="font-mono text-xs whitespace-nowrap">
                      {String(row[c.name] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : (
        <p className="text-muted-foreground px-4 py-12 text-sm">No preview available.</p>
      )}
    </div>
  )
}

export function TableCleanPanel({
  sourceKind,
  sessionId,
  connectionId,
  table,
  cleaning,
  layout = "stacked",
}: Props) {
  const [preview, setPreview] = useState<TableCleanPreview | null>(null)
  const [loading, setLoading] = useState(false)

  const loadPreview = useCallback(async () => {
    setLoading(true)
    try {
      const data = await previewWizardClean({
        sourceKind,
        sessionId,
        connectionId,
        externalSchema: table.schema,
        externalName: table.externalName,
        cleaning,
      })
      setPreview(data)
    } catch {
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }, [sourceKind, sessionId, connectionId, table, cleaning])

  useEffect(() => {
    const t = window.setTimeout(() => void loadPreview(), 400)
    return () => window.clearTimeout(t)
  }, [loadPreview])

  return (
    <CleanPreview
      preview={preview}
      loading={loading}
      fullPage={layout === "workspace"}
    />
  )
}
