"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BarChart2, ExternalLink, LayoutDashboard, Pencil, PieChart, Table2, Trash2, TrendingUp } from "lucide-react"

type ApiReport = {
  id: string
  title: string
  description: string | null
  chart_type: string
  row_count: number
  created_at: string
}

const CHART_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  bar: BarChart2,
  line: TrendingUp,
  pie: PieChart,
  table: Table2,
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ApiReport[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]))
      .finally(() => setLoaded(true))
  }, [])

  const handleDelete = async (id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id))
    await fetch(`/api/reports/${id}`, { method: "DELETE" }).catch(() => {})
  }

  return (
    <div className="h-full overflow-auto p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Reports saved by your workspace team.
            </p>
          </div>
          <Link href="/workspace" className={cn(buttonVariants({ variant: "outline" }), "h-9 w-fit rounded-xl px-4")}>
            New chat
          </Link>
        </div>

        {loaded && reports.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.08]">
              <LayoutDashboard className="size-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium">No saved reports yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Generate a report from a chat, then click &quot;Save report&quot; &mdash; it will appear here.
            </p>
            <Link
              href="/workspace"
              className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium transition hover:bg-white/[0.08]"
            >
              Start a chat
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => {
              const ChartIcon = CHART_ICONS[report.chart_type] ?? BarChart2
              return (
                <Card
                  key={report.id}
                  className="rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 gap-2">
                        <div className="bg-muted/50 flex size-9 shrink-0 items-center justify-center rounded-xl">
                          <ChartIcon className="text-muted-foreground size-4" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="truncate text-sm font-medium">{report.title}</CardTitle>
                          <p className="text-muted-foreground mt-0.5 text-[11px]">
                            Saved {relativeTime(report.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {report.chart_type === "table" ? "Custom views" : report.chart_type.replace(/_/g, " ")}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-lg text-muted-foreground hover:text-red-400"
                          onClick={() => handleDelete(report.id)}
                          aria-label="Delete report"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {report.description && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{report.description}</p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">{report.row_count} rows</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Link
                          href={`/reports/${report.id}/edit`}
                          className={cn(
                            buttonVariants({ variant: "default", size: "sm" }),
                            "h-7 rounded-lg px-2.5 text-[11px]"
                          )}
                        >
                          <Pencil className="mr-1 size-3" />
                          Edit
                        </Link>
                        <Link
                          href={`/reports/${report.id}`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "h-7 shrink-0 rounded-lg px-2.5 text-[11px]"
                          )}
                        >
                          <ExternalLink className="mr-1 size-3" />
                          Open
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
