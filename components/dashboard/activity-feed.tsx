import type { ActivityItem } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Activity, AlertTriangle, Database, Sparkles } from "lucide-react"

const kindStyles: Record<ActivityItem["kind"], { label: string; icon: typeof Activity }> = {
  sync: { label: "Sync", icon: Database },
  query: { label: "AI", icon: Sparkles },
  alert: { label: "Alert", icon: AlertTriangle },
  user: { label: "Team", icon: Activity },
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => {
          const meta = kindStyles[item.kind]
          const Icon = meta.icon
          return (
            <div key={item.id} className="flex gap-3">
              <div
                className={cn(
                  "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]"
                )}
              >
                <Icon className="text-muted-foreground size-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {meta.label}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">{item.description}</p>
                <p className="text-muted-foreground text-[11px]">{item.time}</p>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
