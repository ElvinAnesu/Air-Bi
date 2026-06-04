"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { fetchDataSourceTables } from "@/lib/api/data-sources"
import type { DataSourceTable } from "@/types"
import { Database, Loader2, Plus, SendHorizonal, X } from "lucide-react"

export type SelectedTable = {
  schema: string
  name: string
  id: string
}

type ChatInputProps = {
  onSend: (text: string, selectedTables: SelectedTable[]) => void
  disabled?: boolean
  variant?: "default" | "prominent"
  connectionId?: string
  dataSourceId?: string
}

export function ChatInput({ onSend, disabled, variant = "default", connectionId, dataSourceId }: ChatInputProps) {
  const [value, setValue] = useState("")
  const [selectedTables, setSelectedTables] = useState<SelectedTable[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [availableTables, setAvailableTables] = useState<DataSourceTable[]>([])
  const [loadingTables, setLoadingTables] = useState(false)
  const [tableSearch, setTableSearch] = useState("")
  const pickerRef = useRef<HTMLDivElement>(null)

  const prominent = variant === "prominent"

  const submit = () => {
    const t = value.trim()
    if (!t) return
    onSend(t, selectedTables)
    setValue("")
  }

  useEffect(() => {
    setAvailableTables([])
    setSelectedTables([])
  }, [dataSourceId, connectionId])

  useEffect(() => {
    const sourceId = dataSourceId ?? connectionId
    if (!pickerOpen || !sourceId) return
    if (availableTables.length > 0) return
    setLoadingTables(true)
    fetchDataSourceTables(sourceId)
      .then(setAvailableTables)
      .catch(() => setAvailableTables([]))
      .finally(() => setLoadingTables(false))
  }, [pickerOpen, dataSourceId, connectionId, availableTables.length])

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [pickerOpen])

  const filteredTables = availableTables.filter((t) =>
    `${t.externalSchema}.${t.externalName}`.toLowerCase().includes(tableSearch.toLowerCase())
  )

  const toggleTable = (table: DataSourceTable) => {
    setSelectedTables((prev) => {
      const exists = prev.find((t) => t.id === table.id)
      if (exists) return prev.filter((t) => t.id !== table.id)
      return [
        ...prev,
        { schema: table.externalSchema, name: table.externalName, id: table.id },
      ]
    })
  }

  const removeTable = (id: string) => setSelectedTables((prev) => prev.filter((t) => t.id !== id))

  return (
    <div className="relative" ref={pickerRef}>
      {/* Table picker popover */}
      {pickerOpen && (
        <div className="absolute bottom-full left-0 z-50 mb-2 flex max-h-72 w-72 flex-col overflow-hidden rounded-2xl border border-white/[0.12] bg-zinc-900/95 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
          <div className="border-b border-white/[0.08] px-3 py-2.5">
            <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-1.5">
              <Database className="size-3.5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search tables&hellip;"
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
          <ScrollArea className="max-h-44">
            {loadingTables ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Loading tables&hellip;
              </div>
            ) : !(dataSourceId ?? connectionId) ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No data source selected</p>
            ) : filteredTables.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No tables in this data source. Add tables from the Data sources page.</p>
            ) : (
              <div className="p-1.5 space-y-0.5">
                {filteredTables.map((table) => {
                  const selected = selectedTables.some((t) => t.id === table.id)
                  return (
                    <button
                      key={table.id}
                      onClick={() => toggleTable(table)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs transition",
                        selected
                          ? "bg-sky-500/15 text-foreground ring-1 ring-sky-500/25"
                          : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                      )}
                    >
                      <Database className="size-3.5 shrink-0 text-sky-400/70" />
                      <span className="min-w-0">
                        <span className="text-muted-foreground/70">{table.externalSchema}.</span>
                        <span className="font-medium">{table.externalName}</span>
                      </span>
                      {selected && (
                        <span className="ml-auto shrink-0 rounded-md bg-sky-500/20 px-1.5 py-0.5 text-[10px] text-sky-300">
                          added
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
          {selectedTables.length > 0 && (
            <div className="border-t border-white/[0.08] px-3 py-2 text-[11px] text-muted-foreground">
              {selectedTables.length} table{selectedTables.length > 1 ? "s" : ""} selected
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "border-border bg-card text-foreground border p-2 shadow-sm",
          prominent ? "rounded-[1.35rem]" : "rounded-2xl"
        )}
      >
        {/* Selected table chips */}
        {selectedTables.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-2 pb-1">
            {selectedTables.map((t) => (
              <span
                key={t.id}
                className="flex items-center gap-1.5 rounded-lg bg-sky-500/15 px-2 py-1 text-[11px] text-sky-800 ring-1 ring-sky-500/25 dark:text-sky-200"
              >
                <Database className="size-3 shrink-0" />
                <span className="font-medium">{t.name}</span>
                <button
                  onClick={() => removeTable(t.id)}
                  className="rounded-sm opacity-60 transition hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <Textarea
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={prominent ? "Ask anything about your data&hellip;" : "Ask AirBI anything about your ERP data..."}
          className={cn(
            "text-foreground placeholder:text-muted-foreground resize-none border-0 bg-transparent px-3 py-3 text-[0.9375rem] leading-relaxed shadow-none focus-visible:ring-0",
            prominent ? "min-h-[80px] md:min-h-[100px]" : "min-h-[52px] px-2 py-2 text-sm"
          )}
        />
        <div className="flex items-center justify-between px-1 pb-1 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground",
              pickerOpen && "bg-white/[0.06] text-foreground",
              !dataSourceId && !connectionId && "opacity-40 cursor-not-allowed"
            )}
            onClick={() => (dataSourceId ?? connectionId) && setPickerOpen((o) => !o)}
            title={dataSourceId ?? connectionId ? "Add tables as context" : "Select a data source first"}
          >
            <Plus className="size-3.5" />
            <span>Add tables</span>
            {selectedTables.length > 0 && (
              <span className="rounded-md bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-medium text-sky-800 dark:text-sky-200">
                {selectedTables.length}
              </span>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            className={cn("rounded-xl", prominent && "h-9 px-4")}
            onClick={submit}
            disabled={disabled || !value.trim()}
          >
            <SendHorizonal className="mr-1.5 size-4" />
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
