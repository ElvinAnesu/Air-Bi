"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp, Code2, ScrollText, Trash2 } from "lucide-react"

type ApiQuery = {
  id: string
  name: string
  description: string | null
  sql: string
  row_count: number | null
  created_at: string
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

function QueryCard({ query, onDelete }: { query: ApiQuery; onDelete: () => void }) {
  const [sqlOpen, setSqlOpen] = useState(false)
  return (
    <Card className="rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div className="flex min-w-0 gap-2">
          <div className="bg-muted/50 flex size-9 shrink-0 items-center justify-center rounded-xl">
            <Code2 className="text-muted-foreground size-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-sm font-medium">{query.name}</CardTitle>
            {query.description && (
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{query.description}</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 rounded-lg text-muted-foreground hover:text-red-400"
          onClick={onDelete}
          aria-label="Delete query"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span>Saved {relativeTime(query.created_at)}</span>
          {query.row_count != null && query.row_count > 0 && (
            <>
              <span>&middot;</span>
              <span>{query.row_count} rows</span>
            </>
          )}
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-black/20">
          <button
            onClick={() => setSqlOpen((o) => !o)}
            className="flex w-full items-center justify-between px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <span className="flex items-center gap-1.5 font-mono font-medium">
              <Code2 className="size-3" />
              View SQL
            </span>
            {sqlOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
          {sqlOpen && (
            <pre className="overflow-x-auto border-t border-white/[0.06] px-3 py-2.5 font-mono text-[0.7rem] leading-relaxed text-sky-300/90">
              {query.sql}
            </pre>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function SavedQueriesPage() {
  const [queries, setQueries] = useState<ApiQuery[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch("/api/saved-queries")
      .then((r) => r.json())
      .then((data) => setQueries(Array.isArray(data) ? data : []))
      .catch(() => setQueries([]))
      .finally(() => setLoaded(true))
  }, [])

  const handleDelete = async (id: string) => {
    setQueries((prev) => prev.filter((q) => q.id !== id))
    await fetch(`/api/saved-queries/${id}`, { method: "DELETE" }).catch(() => {})
  }

  return (
    <div className="h-full overflow-auto p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Saved queries</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              SQL queries saved by your workspace team.
            </p>
          </div>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "h-9 w-fit rounded-xl px-4")}>
            New chat
          </Link>
        </div>

        {loaded && queries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.08]">
              <ScrollText className="size-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium">No saved queries yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              When the AI generates a report, open the SQL block and click &quot;Save query&quot; &mdash; it will appear here.
            </p>
            <Link
              href="/"
              className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium transition hover:bg-white/[0.08]"
            >
              Start a chat
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {queries.map((query) => (
              <QueryCard key={query.id} query={query} onDelete={() => handleDelete(query.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
