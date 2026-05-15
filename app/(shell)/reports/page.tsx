"use client"

import Link from "next/link"
import { ExecutiveOverview } from "@/components/views/executive-overview"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FileBarChart, LineChart } from "lucide-react"

const mockSavedReports = [
  { id: "r1", name: "Executive margin snapshot", updated: "2h ago", pinned: true },
  { id: "r2", name: "Regional revenue pack", updated: "Yesterday", pinned: false },
  { id: "r3", name: "Inventory risk digest", updated: "May 12", pinned: true },
]

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Saved report packs and the executive dashboard (mock).
          </p>
        </div>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "h-9 w-fit rounded-xl px-4")}>
          New chat
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-muted-foreground px-1 text-xs font-semibold tracking-wide uppercase">
          Saved reports
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mockSavedReports.map((r) => (
            <Card
              key={r.id}
              className="rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-2">
                    <div className="bg-muted/50 flex size-9 shrink-0 items-center justify-center rounded-xl">
                      <FileBarChart className="text-muted-foreground size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">{r.name}</CardTitle>
                      <CardDescription className="text-xs">Updated {r.updated}</CardDescription>
                    </div>
                  </div>
                  {r.pinned && (
                    <Badge variant="outline" className="text-[10px]">
                      <LineChart className="mr-1 size-3" />
                      Charts
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-muted-foreground text-xs">Open in full viewer (mock)</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-border/60 border-t pt-10">
        <ExecutiveOverview />
      </section>
    </div>
  )
}
