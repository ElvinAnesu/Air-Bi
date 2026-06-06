"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { ReportVisualization } from "@/lib/reports/visualization"
import { normalizeVisualization, viewHasTable } from "@/lib/reports/visualization"
import { DynamicReportVisual } from "@/components/reports/dynamic-report-visual"
import { SaveDialog } from "@/components/workspace/save-dialog"
import {
  BarChart2,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Code2,
  Download,
  FileText,
  Loader2,
} from "lucide-react"

export type ReportData = {
  title: string
  explanation: string
  sql: string
  columns: string[]
  rows: Record<string, string | number | null>[]
  rowCount: number
  connectionName?: string
  visualization?: ReportVisualization
  /** Legacy; derived from visualization when saving */
  chartType?: string
}

const PAGE_SIZE = 50

function SqlBlock({
  sql,
  onSaveQuery,
  querySaved,
  viewOnly,
}: {
  sql: string
  onSaveQuery?: () => void
  querySaved?: boolean
  viewOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between px-4 py-2.5 text-xs transition"
      >
        <span className="flex items-center gap-1.5 font-mono font-medium">
          <Code2 className="size-3.5" />
          Generated SQL
        </span>
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>
      {open && (
        <>
          <pre className="overflow-x-auto border-t border-white/[0.06] px-4 py-3 font-mono text-[0.75rem] leading-relaxed text-sky-300/90">
            {sql}
          </pre>
          {!viewOnly && onSaveQuery && (
            <div className="flex justify-end border-t border-white/[0.06] px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 gap-1.5 rounded-lg text-xs",
                  querySaved ? "text-emerald-400 hover:text-emerald-400" : "text-muted-foreground"
                )}
                onClick={onSaveQuery}
                disabled={querySaved}
              >
                {querySaved ? (
                  <>
                    <BookmarkCheck className="size-3.5" />
                    Query saved
                  </>
                ) : (
                  <>
                    <Bookmark className="size-3.5" />
                    Save query
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

type ReportPanelProps = {
  report: ReportData | null
  loading: boolean
  viewOnly?: boolean
  hideSql?: boolean
  chatId?: string | null
  connectionId?: string | null
  dataSourceId?: string | null
  savedReportId?: string | null
}

export function ReportPanel({
  report,
  loading,
  viewOnly = false,
  hideSql = false,
  chatId = null,
  connectionId = null,
  dataSourceId = null,
  savedReportId = null,
}: ReportPanelProps) {
  const [page, setPage] = useState(1)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportSaved, setReportSaved] = useState(!!savedReportId)
  const [queryDialogOpen, setQueryDialogOpen] = useState(false)
  const [querySaved, setQuerySaved] = useState(false)

  const visualization = useMemo(
    () =>
      report
        ? normalizeVisualization(
            report.visualization,
            report.columns,
            report.rows,
            report.chartType
          )
        : null,
    [report]
  )

  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const currentViewId = activeViewId ?? visualization?.defaultViewId ?? visualization?.views[0]?.id ?? "table"
  const activeView = visualization?.views.find((v) => v.id === currentViewId) ?? visualization?.views[0]

  const totalPages = report ? Math.max(1, Math.ceil(report.rows.length / PAGE_SIZE)) : 1
  const pageRows = report
    ? report.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : []

  const handleConfirmSaveReport = async (name: string) => {
    if (!report || !visualization) return
    try {
      const payload = {
        title: name,
        description: report.explanation,
        sql: report.sql,
        chartType: report.chartType ?? "table",
        visualization,
        columns: report.columns,
        rows: report.rows,
        rowCount: report.rowCount,
        connectionId: connectionId ?? null,
        dataSourceId: dataSourceId ?? null,
        chatId: chatId ?? null,
      }

      const res = savedReportId
        ? await fetch(`/api/reports/${savedReportId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

      if (res.ok) setReportSaved(true)
    } catch {
      /* ignore */
    }
  }

  const handleConfirmSaveQuery = async (name: string) => {
    if (!report) return
    try {
      const res = await fetch("/api/saved-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: report.explanation,
          sql: report.sql,
          rowCount: report.rowCount,
        }),
      })
      if (res.ok) setQuerySaved(true)
    } catch {
      /* ignore */
    }
  }

  const handleExportCsv = () => {
    if (!report) return
    const csv = [
      report.columns.join(","),
      ...report.rows.map((r) =>
        report.columns.map((c) => JSON.stringify(r[c] ?? "")).join(",")
      ),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${report.title.replace(/\s+/g, "-").toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="size-6 animate-spin" />
        <div>
          <p className="text-foreground text-sm font-medium">Generating report&hellip;</p>
          <p className="mt-1 text-xs">Choosing the best views for your data</p>
        </div>
      </div>
    )
  }

  if (!report || !visualization || !activeView) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.08]">
          <BarChart2 className="text-muted-foreground/60 size-7" />
        </div>
        <p className="text-foreground text-sm font-medium">Your report will appear here</p>
        <p className="text-muted-foreground max-w-xs text-xs leading-relaxed">
          Select tables, describe what you need, and AirBI will ask a few questions then build custom visuals for your data.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-6">
      {!viewOnly && (
        <>
          <SaveDialog
            open={reportDialogOpen}
            onOpenChange={setReportDialogOpen}
            type="report"
            defaultName={report.title}
            description={report.explanation}
            onSave={handleConfirmSaveReport}
          />
          <SaveDialog
            open={queryDialogOpen}
            onOpenChange={setQueryDialogOpen}
            type="query"
            defaultName={report.title}
            description={report.explanation}
            onSave={handleConfirmSaveQuery}
          />
        </>
      )}

      <div className="flex shrink-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-tight">{report.title}</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{report.explanation}</p>
          {visualization.rationale && (
            <p className="text-muted-foreground/80 mt-2 text-xs italic">{visualization.rationale}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs" onClick={handleExportCsv}>
            <Download className="mr-1.5 size-3.5" />
            Export CSV
          </Button>
          {!viewOnly && (
            <Button
              variant={reportSaved ? "outline" : "default"}
              size="sm"
              className={cn(
                "h-8 rounded-xl text-xs",
                reportSaved && "border-emerald-500/30 text-emerald-400 hover:text-emerald-400"
              )}
              onClick={() => !reportSaved && setReportDialogOpen(true)}
              disabled={reportSaved}
            >
              {reportSaved ? (
                <>
                  <BookmarkCheck className="mr-1.5 size-3.5" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="mr-1.5 size-3.5" />
                  Save report
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {!hideSql && (
        <div className="shrink-0">
          <SqlBlock
            sql={report.sql}
            onSaveQuery={() => setQueryDialogOpen(true)}
            querySaved={querySaved}
            viewOnly={viewOnly}
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <Tabs
          value={currentViewId}
          onValueChange={setActiveViewId}
          className="flex h-full flex-col"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-2">
            <TabsList className="h-8 max-w-full flex-wrap justify-start gap-0.5 rounded-xl bg-white/[0.04] p-1">
              {visualization.views.map((view) => (
                <TabsTrigger
                  key={view.id}
                  value={view.id}
                  className="h-6 max-w-[10rem] truncate rounded-lg px-3 text-[11px]"
                  title={view.label}
                >
                  {view.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <span className="text-muted-foreground shrink-0 text-[11px]">
              <FileText className="mr-1 inline size-3" />
              {report.rowCount} {report.rowCount === 1 ? "row" : "rows"}
            </span>
          </div>

          {visualization.views.map((view) => (
            <TabsContent
              key={view.id}
              value={view.id}
              className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              {viewHasTable(view) ? (
                <>
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <DynamicReportVisual
                      view={view}
                      columns={report.columns}
                      rows={report.rows}
                      pageRows={pageRows}
                    />
                  </div>
                  {totalPages > 1 && (
                    <div className="flex shrink-0 items-center justify-between border-t border-white/[0.06] px-4 py-2">
                      <span className="text-muted-foreground text-xs">
                        Page {page} of {totalPages}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 rounded-lg text-xs"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => p - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 rounded-lg text-xs"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="min-h-0 flex-1 p-4">
                  <DynamicReportVisual
                    view={view}
                    columns={report.columns}
                    rows={report.rows}
                    pageRows={pageRows}
                  />
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
