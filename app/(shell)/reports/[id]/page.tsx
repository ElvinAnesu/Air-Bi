"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ReportPanel, type ReportData } from "@/components/workspace/report-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Check, Copy, Globe, Loader2, Pencil, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

type ApiReport = {
  id: string
  title: string
  description: string | null
  sql: string
  chart_type: string
  columns: string[]
  rows: Record<string, string | number | null>[]
  row_count: number
  is_published: boolean
  public_slug: string | null
}

export default function ReportViewerPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === "string" ? params.id : ""

  const [report, setReport] = useState<ApiReport | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/reports/${id}`)
      .then((r) => {
        if (!r.ok) return null
        return r.json()
      })
      .then((data) => setReport(data))
      .catch(() => setReport(null))
      .finally(() => setLoaded(true))
  }, [id])

  const handlePublish = async (publish: boolean) => {
    if (!id) return
    setPublishing(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/reports/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActionError(data.error ?? "Failed to update publish status")
        return
      }
      setReport((prev) =>
        prev
          ? {
              ...prev,
              is_published: data.isPublished,
              public_slug: data.publicSlug,
            }
          : prev
      )
    } catch {
      setActionError("Failed to update publish status")
    } finally {
      setPublishing(false)
    }
  }

  const handleCopyLink = async () => {
    if (!report?.public_slug) return
    const url = `${window.location.origin}/share/${report.public_slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setActionError("Could not copy link")
    }
  }

  if (!loaded) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading report&hellip;
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-medium">Report not found</p>
        <p className="text-muted-foreground text-xs">It may have been deleted or the link is invalid.</p>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => router.push("/reports")}>
          <ArrowLeft className="mr-1.5 size-3.5" />
          Back to reports
        </Button>
      </div>
    )
  }

  const reportData: ReportData = {
    title: report.title,
    explanation: report.description ?? "",
    sql: report.sql,
    chartType: report.chart_type as ReportData["chartType"],
    columns: report.columns,
    rows: report.rows,
    rowCount: report.row_count,
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/[0.06] bg-black/10 px-4 py-2.5">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-8 gap-1.5 rounded-xl text-xs"
          onClick={() => router.push("/reports")}
        >
          <ArrowLeft className="size-3.5" />
          Reports
        </Button>
        <span className="text-white/20">/</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{report.title}</span>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Link href={`/reports/${report.id}/edit`}>
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-xl text-xs">
              <Pencil className="mr-1.5 size-3.5" />
              Edit
            </Button>
          </Link>
          {report.is_published && (
            <Badge variant="outline" className="rounded-full border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <Globe className="mr-1 size-3" />
              Published
            </Badge>
          )}
          {report.is_published ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs"
                onClick={() => void handleCopyLink()}
                disabled={!report.public_slug}
              >
                {copied ? (
                  <>
                    <Check className="mr-1.5 size-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 size-3.5" />
                    Copy link
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-8 rounded-xl text-xs"
                onClick={() => void handlePublish(false)}
                disabled={publishing}
              >
                {publishing ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
                Unpublish
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              className={cn("h-8 rounded-xl text-xs")}
              onClick={() => void handlePublish(true)}
              disabled={publishing}
            >
              {publishing ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Share2 className="mr-1.5 size-3.5" />
              )}
              Publish
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <p className="text-destructive border-b border-white/[0.06] px-4 py-2 text-sm">{actionError}</p>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        <ReportPanel report={reportData} loading={false} viewOnly />
      </div>
    </div>
  )
}
