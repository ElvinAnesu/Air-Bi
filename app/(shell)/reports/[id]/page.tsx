"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ReportPanel, type ReportData } from "@/components/workspace/report-panel"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"

type ApiReport = {
  id: string
  title: string
  description: string | null
  sql: string
  chart_type: string
  columns: string[]
  rows: Record<string, string | number | null>[]
  row_count: number
}

export default function ReportViewerPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === "string" ? params.id : ""

  const [report, setReport] = useState<ApiReport | null>(null)
  const [loaded, setLoaded] = useState(false)

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

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading report&hellip;
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-medium">Report not found</p>
        <p className="text-xs text-muted-foreground">It may have been deleted or the link is invalid.</p>
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
      <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] bg-black/10 px-4 py-2.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/reports")}
        >
          <ArrowLeft className="size-3.5" />
          Reports
        </Button>
        <span className="text-white/20">/</span>
        <span className="truncate text-sm font-medium">{report.title}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <ReportPanel report={reportData} loading={false} viewOnly />
      </div>
    </div>
  )
}
