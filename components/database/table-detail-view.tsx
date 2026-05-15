"use client"

import type { ErpTable } from "@/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SchemaViewer } from "@/components/database/column-list"
import { EmptyState } from "@/components/layout/empty-state"
import { Sparkles, Table2 } from "lucide-react"

export function TableDetailView({
  table,
  showActions = true,
}: {
  table: ErpTable | null
  showActions?: boolean
}) {
  if (!table) {
    return (
      <EmptyState
        icon={Table2}
        title="Select a table"
        description="Choose a table from the schema explorer to preview its schema and sample data."
        className="mx-auto max-w-md py-16"
      />
    )
  }

  const sampleKeys = table.columns.map((c) => c.name)

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-mono text-xl font-semibold tracking-tight">{table.name}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{table.description}</p>
          </div>
          {showActions && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-xl">
                <Sparkles className="mr-2 size-4" />
                Ask AI About This Table
              </Button>
              <Button className="rounded-xl">Generate Insights</Button>
            </div>
          )}
        </div>

        <SchemaViewer hints={table.relationshipHints} />

        <section className="space-y-2">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Table preview</p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <Table>
              <TableHeader>
                <TableRow>
                  {table.columns.map((col) => (
                    <TableHead key={col.name} className="align-top whitespace-nowrap">
                      <div className="space-y-0.5 py-1">
                        <p className="font-mono text-[11px] font-semibold">{col.name}</p>
                        {col.description && (
                          <p className="text-muted-foreground max-w-[12rem] text-[10px] leading-snug font-normal">
                            {col.description}
                          </p>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.sampleRows.map((row, idx) => (
                  <TableRow key={idx}>
                    {sampleKeys.map((k) => (
                      <TableCell key={k} className="font-mono text-xs whitespace-nowrap">
                        {String(row[k] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </ScrollArea>
  )
}
