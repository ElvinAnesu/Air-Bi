"use client"

import { useState } from "react"
import type { SchemaTableSummary } from "@/types"
import { TableExplorer } from "@/components/database/table-explorer"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronLeft, PanelLeft } from "lucide-react"

export function SchemaExplorerSidebar({
  catalogName,
  tables,
  loading = false,
  schemaError,
  selectedTableId,
  onTableSelect,
  className,
  collapsible = false,
  defaultCollapsed = false,
}: {
  catalogName: string
  tables: SchemaTableSummary[]
  loading?: boolean
  schemaError?: string | null
  selectedTableId?: string | null
  onTableSelect: (table: SchemaTableSummary) => void
  className?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  return (
    <aside
      className={cn(
        "border-border/60 flex h-full shrink-0 flex-col border-r bg-black/25 backdrop-blur-xl transition-[width] duration-200 ease-in-out",
        collapsible && collapsed ? "w-12" : "w-72",
        className
      )}
    >
      {collapsible && collapsed ? (
        <div className="flex flex-col items-center gap-3 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-xl"
            onClick={() => setCollapsed(false)}
            aria-label="Expand schema explorer"
            title="Expand schema explorer"
          >
            <PanelLeft className="size-4" />
          </Button>
          <span
            className="text-muted-foreground [writing-mode:vertical-rl] rotate-180 text-[10px] font-semibold tracking-wide uppercase"
            aria-hidden
          >
            Schema
          </span>
        </div>
      ) : (
        <>
          <div className="border-border/60 flex shrink-0 items-start gap-1 border-b px-2 py-3">
            <div className="min-w-0 flex-1 px-1">
              <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                Schema explorer
              </p>
              <p className="mt-0.5 truncate text-xs font-medium">{catalogName}</p>
              {schemaError && (
                <p className="text-destructive mt-1 text-[10px] leading-snug">{schemaError}</p>
              )}
            </div>
            {collapsible && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 rounded-xl"
                onClick={() => setCollapsed(true)}
                aria-label="Collapse schema explorer"
                title="Collapse schema explorer"
              >
                <ChevronLeft className="size-4" />
              </Button>
            )}
          </div>
          <TableExplorer
            variant="sidebar"
            tables={tables}
            loading={loading}
            catalogName={catalogName}
            selectedTableId={selectedTableId}
            onTableClick={onTableSelect}
            className="min-h-0 flex-1"
          />
        </>
      )}
    </aside>
  )
}
