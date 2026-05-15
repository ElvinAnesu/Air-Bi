"use client"

import Link from "next/link"
import { mockSavedQueriesList } from "@/lib/mock-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Play, Table2 } from "lucide-react"

export default function SavedQueriesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Saved queries</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Reusable SQL snippets and pinned explorations (mock).
          </p>
        </div>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "h-9 w-fit rounded-xl px-4")}>
          New chat
        </Link>
      </div>

      <div className="space-y-2">
        {mockSavedQueriesList.map((q) => (
          <Card
            key={q.id}
            className="rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div className="flex gap-2">
                <div className="bg-muted/50 flex size-9 shrink-0 items-center justify-center rounded-xl">
                  <Table2 className="text-muted-foreground size-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">{q.name}</CardTitle>
                  <p className="text-muted-foreground mt-1 text-xs">{q.description}</p>
                </div>
              </div>
              <Button type="button" size="sm" variant="secondary" className="shrink-0 rounded-xl text-xs">
                <Play className="mr-1 size-3.5" />
                Run (mock)
              </Button>
            </CardHeader>
            <CardContent className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
              <span>Last run {q.lastRun}</span>
              <span>·</span>
              <span>{q.rows} rows</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
