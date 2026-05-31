import { Button } from "@/components/ui/button"
import { Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react"

export function ConnectionDetailActions({
  onEdit,
  onSync,
  onDelete,
  syncing = false,
  deleting = false,
}: {
  onEdit?: () => void
  onSync?: () => void
  onDelete?: () => void
  syncing?: boolean
  deleting?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl border-white/15 bg-white/[0.06] hover:bg-white/[0.1]"
        onClick={onEdit}
        disabled={syncing || deleting}
      >
        <Pencil className="mr-1.5 size-3.5" />
        Edit
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl border-white/15 bg-white/[0.06] hover:bg-white/[0.1]"
        onClick={onSync}
        disabled={syncing || deleting}
      >
        {syncing ? (
          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
        ) : (
          <RefreshCw className="mr-1.5 size-3.5" />
        )}
        Sync
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl"
        onClick={onDelete}
        disabled={syncing || deleting}
      >
        {deleting ? (
          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
        ) : (
          <Trash2 className="mr-1.5 size-3.5" />
        )}
        Delete
      </Button>
    </div>
  )
}
