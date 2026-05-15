import { Button } from "@/components/ui/button"
import { Pencil, RefreshCw, Trash2 } from "lucide-react"

export function ConnectionDetailActions({ onSync }: { onSync?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="rounded-xl border-white/15 bg-white/[0.06] hover:bg-white/[0.1]">
        <Pencil className="mr-1.5 size-3.5" />
        Edit
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="rounded-xl border-white/15 bg-white/[0.06] hover:bg-white/[0.1]"
        onClick={onSync}
      >
        <RefreshCw className="mr-1.5 size-3.5" />
        Sync
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl"
      >
        <Trash2 className="mr-1.5 size-3.5" />
        Delete
      </Button>
    </div>
  )
}
