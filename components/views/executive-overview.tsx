"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { mockActivity, mockAiInsights, mockConnections, mockKpis, mockRevenueSeries } from "@/lib/mock-data"
import { KPIWidget } from "@/components/dashboard/kpi-widget"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { ConnectionCard } from "@/components/dashboard/connection-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export function ExecutiveOverview() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 650)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Executive overview</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Live blend of finance, operations, and AI signals (mock).
          </p>
        </div>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "h-9 rounded-xl px-4")}>
          New chat
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {mockKpis.map((k) => (
          <KPIWidget key={k.id} kpi={k} loading={loading} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <RevenueChart data={mockRevenueSeries} loading={loading} />
          <Card className="rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Data sources</CardTitle>
              <Link
                href="/connections"
                className={cn(buttonVariants({ variant: "link" }), "h-auto p-0 text-xs")}
              >
                Manage
              </Link>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {mockConnections.map((c) => (
                <ConnectionCard key={c.id} connection={c} />
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <ActivityFeed items={mockActivity} />
          <Card className="rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Recent AI insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockAiInsights.map((ins) => (
                <div key={ins.id} className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-medium">{ins.title}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {ins.confidence}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{ins.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
