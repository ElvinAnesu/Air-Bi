"use client"

import type { SelectedTable } from "@/components/chat/chat-input"
import { Database, X } from "lucide-react"

type Props = {
  tables: SelectedTable[]
  onRemove: (id: string) => void
  onClear?: () => void
}

export function ChatContextTables({ tables, onRemove, onClear }: Props) {
  if (tables.length === 0) return null

  return (
    <div className="shrink-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
          Tables in context
        </p>
        {onClear && tables.length > 1 && (
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground text-[10px] transition"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tables.map((t) => (
          <span
            key={t.id}
            className="flex max-w-full items-center gap-1.5 rounded-lg bg-sky-500/15 px-2 py-1 text-[11px] text-sky-800 ring-1 ring-sky-500/25 dark:text-sky-200"
          >
            <Database className="size-3 shrink-0" />
            <span className="truncate font-medium" title={`${t.schema}.${t.name}`}>
              {t.name}
            </span>
            <button
              type="button"
              onClick={() => onRemove(t.id)}
              className="shrink-0 rounded-sm opacity-60 transition hover:opacity-100"
              aria-label={`Remove ${t.name} from context`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
