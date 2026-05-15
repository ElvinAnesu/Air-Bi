import type { ErpColumn } from "@/types"

export function ColumnList({ columns }: { columns: ErpColumn[] }) {
  return (
    <ul className="divide-border/60 divide-y rounded-xl border border-white/10">
      {columns.map((col) => (
        <li key={col.name} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs font-medium">{col.name}</p>
            {col.description && (
              <p className="text-muted-foreground text-[11px]">{col.description}</p>
            )}
          </div>
          <span className="text-muted-foreground font-mono text-[11px]">{col.type}</span>
        </li>
      ))}
    </ul>
  )
}

export function SchemaViewer({ hints }: { hints?: string[] }) {
  if (!hints?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
        Relationship hints
      </p>
      <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs">
        {hints.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
    </div>
  )
}
