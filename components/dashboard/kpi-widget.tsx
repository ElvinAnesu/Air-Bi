import { cn } from "@/lib/utils"
import type { DashboardKpi } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

export function KPIWidget({
  kpi,
  loading,
  className,
}: {
  kpi?: DashboardKpi
  loading?: boolean
  className?: string
}) {
  if (loading || !kpi) {
    return (
      <Card className={cn("rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-40" />
        </CardContent>
      </Card>
    )
  }

  const TrendIcon =
    kpi.trend === "up" ? ArrowUpRight : kpi.trend === "down" ? ArrowDownRight : Minus

  return (
    <Card
      className={cn(
        "rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md transition hover:border-white/15",
        className
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {kpi.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight">{kpi.value}</span>
          {kpi.trend && (
            <TrendIcon
              className={cn(
                "size-4",
                kpi.trend === "up" && "text-emerald-400",
                kpi.trend === "down" && "text-amber-400",
                kpi.trend === "neutral" && "text-muted-foreground"
              )}
            />
          )}
        </div>
        {kpi.delta && <p className="text-muted-foreground text-xs">{kpi.delta}</p>}
        {kpi.hint && <p className="text-muted-foreground text-xs">{kpi.hint}</p>}
      </CardContent>
    </Card>
  )
}
