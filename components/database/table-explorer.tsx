"use client"

import { useMemo, useState } from "react"
import type { SchemaTableSummary } from "@/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight, Loader2, Search, Star } from "lucide-react"

export function TableExplorer({
  tables,
  loading = false,
  onTableClick,
  catalogName = "SAP B1 LIVE",
  variant = "card",
  selectedTableId,
  className,
}: {
  tables: SchemaTableSummary[]
  loading?: boolean
  onTableClick: (table: SchemaTableSummary) => void
  catalogName?: string
  variant?: "card" | "sidebar"
  selectedTableId?: string | null
  className?: string
}) {
  const [open, setOpen] = useState(true)
  const [query, setQuery] = useState("")
  const [favorites, setFavorites] = useState<Record<string, boolean>>({})

  const isSidebar = variant === "sidebar"

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tables
    return tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.schema.toLowerCase().includes(q)
    )
  }, [query, tables])

  const list = (
    <div className={cn("space-y-2", isSidebar ? "flex min-h-0 flex-1 flex-col px-2 py-2" : "pt-1")}>
      <div className={cn("relative", isSidebar ? "px-0" : "px-1")}>
        <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-3 size-4" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tables"
          className="h-9 rounded-xl border-white/10 bg-black/20 pl-9 text-xs"
        />
      </div>
      {!isSidebar && (
        <div className="text-muted-foreground px-2 pb-1 text-[11px] font-semibold tracking-wide uppercase">
          {catalogName}
        </div>
      )}
      <ScrollArea className={cn(isSidebar ? "min-h-0 flex-1" : "h-48 pr-1")}>
        {loading ? (
          <p className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-xs">
            <Loader2 className="size-4 animate-spin" />
            Loading tables…
          </p>
        ) : (
          <ul className="space-y-0.5 pb-2">
            {filtered.map((table) => {
              const selected = selectedTableId === table.id
              return (
                <li key={table.id}>
                  <div className="group flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 flex-1 justify-start rounded-xl px-2 text-xs font-normal",
                        selected && "bg-white/[0.08] text-foreground ring-1 ring-white/10"
                      )}
                      onClick={() => onTableClick(table)}
                    >
                      <span className="font-mono text-[11px]">{table.name}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-lg opacity-60 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFavorites((prev) => ({ ...prev, [table.id]: !prev[table.id] }))
                      }}
                      aria-label="Toggle favorite"
                    >
                      <Star
                        className={cn(
                          "size-3.5",
                          favorites[table.id] && "fill-amber-400 text-amber-400"
                        )}
                      />
                    </Button>
                  </div>
                  <p className="text-muted-foreground line-clamp-2 px-2 pb-1 text-[10px] leading-snug">
                    {table.description}
                  </p>
                </li>
              )
            })}
            {!loading && filtered.length === 0 && (
              <li className="text-muted-foreground px-2 py-6 text-center text-xs">
                {tables.length === 0 ? "No tables found." : "No tables match your search."}
              </li>
            )}
          </ul>
        )}
      </ScrollArea>
    </div>
  )

  if (isSidebar) {
    return <div className={cn("flex min-h-0 flex-col", className)}>{list}</div>
  }

  return (
    <div className={cn("border-border/60 mt-4 rounded-2xl border bg-white/[0.02] p-2", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-muted/40 flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-xs font-medium"
      >
        <span className="text-muted-foreground tracking-wide uppercase">ERP Tables Explorer</span>
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </button>
      {open && list}
    </div>
  )
}
