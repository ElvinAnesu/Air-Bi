import type { ConnectionStatus } from "@/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function connectionStatusClass(status: ConnectionStatus) {
  if (status === "connected") {
    return "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
  }
  if (status === "syncing") {
    return "border-amber-500/45 bg-amber-500/10 text-amber-200"
  }
  return "border-red-500/35 bg-red-500/10 text-red-300"
}

export function ConnectionStatusBadge({ status }: { status: ConnectionStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs capitalize", connectionStatusClass(status))}
    >
      {status}
    </Badge>
  )
}
