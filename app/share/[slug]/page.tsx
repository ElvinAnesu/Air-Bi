"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ReportPanel, type ReportData } from "@/components/workspace/report-panel"
import { AirbiLogo } from "@/components/brand/airbi-logo"
import { Loader2 } from "lucide-react"

type PublicReport = {
  title: string
  description: string | null
  chartType: string
  columns: string[]
  rows: Record<string, string | number | null>[]
  rowCount: number
  publishedAt: string | null
}

export default function PublicReportPage() {
  const params = useParams()
  const slug = typeof params.slug === "string" ? params.slug : ""

  const [report, setReport] = useState<PublicReport | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/public/reports/${slug}`)
      .then((r) => {
        if (!r.ok) return null
        return r.json()
      })
      .then((data) => setReport(data))
      .catch(() => setReport(null))
      .finally(() => setLoaded(true))
  }, [slug])

  if (!loaded) {
    return (
      <div className="bg-background flex min-h-dvh items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading report&hellip;
      </div>
    )
  }

  if (!report) {
    return (
      <div className="bg-background flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm font-medium">Report not found</p>
        <p className="text-muted-foreground max-w-sm text-xs">
          This report may have been unpublished or the link is invalid.
        </p>
      </div>
    )
  }

  const reportData: ReportData = {
    title: report.title,
    explanation: report.description ?? "",
    sql: "",
    chartType: report.chartType as ReportData["chartType"],
    columns: report.columns,
    rows: report.rows,
    rowCount: report.rowCount,
  }

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <header className="border-border flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <AirbiLogo className="size-9 shrink-0 p-1.5" />
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">AirBI shared report</p>
          <h1 className="truncate text-sm font-semibold">{report.title}</h1>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <ReportPanel report={reportData} loading={false} viewOnly hideSql />
      </div>
    </div>
  )
}
