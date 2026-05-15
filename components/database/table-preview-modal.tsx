"use client"

import type { ErpTable } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TableDetailView } from "@/components/database/table-detail-view"

export function TablePreviewModal({
  table,
  open,
  onOpenChange,
}: {
  table: ErpTable | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!table) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl p-0 sm:max-w-3xl">
        <DialogHeader className="border-border/60 border-b px-4 pt-4 pb-2">
          <DialogTitle className="sr-only">{table.name}</DialogTitle>
          <DialogDescription className="sr-only">{table.description}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[calc(90vh-4rem)] overflow-hidden">
          <TableDetailView table={table} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
