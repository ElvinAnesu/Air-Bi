import Link from "next/link"
import type { ErpConnection } from "@/types"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ChevronRight, Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react"

export function ConnectionCard({
  connection,
  href,
  onEdit,
  onSync,
  onDelete,
  syncing = false,
  deleting = false,
}: {
  connection: ErpConnection
  href?: string
  onEdit?: (id: string) => void
  onSync?: (id: string) => void
  onDelete?: (id: string) => void
  syncing?: boolean
  deleting?: boolean
}) {
  const statusColor =
    connection.status === "connected"
      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
      : connection.status === "syncing"
        ? "border-amber-500/45 bg-amber-500/10 text-amber-200"
        : "border-red-500/35 bg-red-500/10 text-red-300"

  const body = (
    <>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base font-semibold tracking-tight">{connection.name}</CardTitle>
          <p className="text-muted-foreground text-xs">{connection.erpType}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-xs capitalize", statusColor)}>
            {connection.status}
          </Badge>
          {href && <ChevronRight className="text-muted-foreground size-4 opacity-60" />}
        </div>
      </CardHeader>
      <CardContent className="grid gap-2.5 pb-4 text-sm">
        <div className="flex items-baseline justify-between gap-6">
          <span className="text-muted-foreground">Tables</span>
          <span className="text-foreground font-medium tabular-nums">{connection.tableCount}</span>
        </div>
        <div className="flex items-baseline justify-between gap-6">
          <span className="text-muted-foreground">Last sync</span>
          <span className="text-foreground tabular-nums">{connection.lastSync}</span>
        </div>
        {connection.server && (
          <div className="flex items-baseline justify-between gap-6">
            <span className="text-muted-foreground">Server</span>
            <span className="text-foreground font-mono text-xs tracking-tight">{connection.server}</span>
          </div>
        )}
      </CardContent>
    </>
  )

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-2xl border border-white/15 bg-zinc-900/90 shadow-none ring-1 ring-white/[0.06] backdrop-blur-md transition-shadow",
        href && "hover:ring-white/20"
      )}
    >
      {href ? (
        <Link href={href} className="block transition hover:bg-white/[0.06]">
          {body}
        </Link>
      ) : (
        body
      )}
      <CardFooter
        className="flex flex-wrap items-center gap-2 border-t border-white/[0.08] bg-black/20 px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl border-white/15 bg-white/[0.06] hover:bg-white/[0.1]"
          onClick={() => onEdit?.(connection.id)}
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
          onClick={() => onSync?.(connection.id)}
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
          className="text-destructive hover:bg-destructive/10 hover:text-destructive ml-auto sm:ml-0"
          onClick={() => onDelete?.(connection.id)}
          disabled={syncing || deleting}
        >
          {deleting ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <Trash2 className="mr-1.5 size-3.5" />
          )}
          Delete
        </Button>
      </CardFooter>
    </Card>
  )
}
