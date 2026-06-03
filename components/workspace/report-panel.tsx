"use client"

import { useState } from "react"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { SaveDialog } from "@/components/workspace/save-dialog"
import {
  BarChart2, Bookmark, BookmarkCheck, ChevronDown, ChevronUp,
  Code2, Download, FileText, PieChart as PieChartIcon,
  Sparkles, Table2, TrendingUp,
} from "lucide-react"

export type ReportData = {
  title: string
  explanation: string
  sql: string
  chartType: "bar" | "pie" | "line" | "table"
  columns: string[]
  rows: Record<string, string | number | null>[]
  rowCount: number
  connectionName?: string
}

const CHART_COLORS = ["#60a5fa", "#a78bfa", "#34d399", "#fbbf24", "#fb7185", "#38bdf8", "#f97316"]
const PAGE_SIZE = 50

function toChartData(columns: string[], rows: Record<string, string | number | null>[]) {
  if (columns.length < 2) return []
  const labelCol = columns[0]
  const valueCol = columns.find((c, i) => {
    if (i === 0) return false
    return rows.some((r) => typeof r[c] === "number")
  }) ?? columns[1]

  return rows.slice(0, 30).map((row) => ({
    name: String(row[labelCol] ?? ""),
    value: typeof row[valueCol] === "number"
      ? (row[valueCol] as number)
      : parseFloat(String(row[valueCol] ?? "0")) || 0,
  }))
}

function SqlBlock({ sql, onSaveQuery, querySaved, viewOnly }: {
  sql: string
  onSaveQuery?: () => void
  querySaved?: boolean
  viewOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/20">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground transition"
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
                {querySaved
                  ? <><BookmarkCheck className="size-3.5" />Query saved</>
                  : <><Bookmark className="size-3.5" />Save query</>
                }
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
  const [activeTab, setActiveTab] = useState("auto")

  // Save report dialog
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportSaved, setReportSaved] = useState(!!savedReportId)

  // Save query dialog
  const [queryDialogOpen, setQueryDialogOpen] = useState(false)
  const [querySaved, setQuerySaved] = useState(false)

  const chartData = report ? toChartData(report.columns, report.rows) : []
  const totalPages = report ? Math.max(1, Math.ceil(report.rows.length / PAGE_SIZE)) : 1
  const pageRows = report ? report.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : []
  const defaultTab = report?.chartType === "table" || chartData.length === 0 ? "table" : report?.chartType ?? "table"

  const handleConfirmSaveReport = async (name: string) => {
    if (!report) return
    try {
      const payload = {
        title: name,
        description: report.explanation,
        sql: report.sql,
        chartType: report.chartType,
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
    } catch { /* ignore */ }
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
    } catch { /* ignore */ }
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
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="relative flex size-16 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-sky-500/20" />
          <Sparkles className="size-7 animate-pulse text-sky-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Generating report&hellip;</p>
          <p className="mt-1 text-xs text-muted-foreground">Running query against your database</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.08]">
          <BarChart2 className="size-7 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-medium text-foreground">Your report will appear here</p>
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
          Select database tables from the input, ask a question, and AirBI will generate a live report from your data.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-6">
      {/* Save dialogs */}
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

      {/* Header */}
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-tight">{report.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{report.explanation}</p>
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
              {reportSaved
                ? <><BookmarkCheck className="mr-1.5 size-3.5" />Saved</>
                : <><Bookmark className="mr-1.5 size-3.5" />Save report</>
              }
            </Button>
          )}
        </div>
      </div>

      {/* SQL block */}
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

      {/* Results */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <Tabs
          value={activeTab === "auto" ? defaultTab : activeTab}
          onValueChange={setActiveTab}
          className="flex h-full flex-col"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-2">
            <TabsList className="h-8 gap-0.5 rounded-xl bg-white/[0.04] p-1">
              <TabsTrigger value="table" className="h-6 rounded-lg px-3 text-[11px] gap-1.5">
                <Table2 className="size-3" />Table
              </TabsTrigger>
              {chartData.length > 0 && (
                <>
                  <TabsTrigger value="bar" className="h-6 rounded-lg px-3 text-[11px] gap-1.5">
                    <BarChart2 className="size-3" />Bar
                  </TabsTrigger>
                  <TabsTrigger value="line" className="h-6 rounded-lg px-3 text-[11px] gap-1.5">
                    <TrendingUp className="size-3" />Line
                  </TabsTrigger>
                  <TabsTrigger value="pie" className="h-6 rounded-lg px-3 text-[11px] gap-1.5">
                    <PieChartIcon className="size-3" />Pie
                  </TabsTrigger>
                </>
              )}
            </TabsList>
            <span className="text-[11px] text-muted-foreground">
              <FileText className="mr-1 inline size-3" />
              {report.rowCount} {report.rowCount === 1 ? "row" : "rows"}
            </span>
          </div>

          {/* Table tab */}
          <TabsContent value="table" className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    {report.columns.map((col) => (
                      <TableHead key={col} className="sticky top-0 bg-black/40 text-xs font-semibold text-muted-foreground backdrop-blur-sm">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((row, idx) => (
                    <TableRow key={idx} className="border-white/[0.04] hover:bg-white/[0.03]">
                      {report.columns.map((col) => (
                        <TableCell key={col} className="text-xs">
                          {row[col] === null
                            ? <span className="italic text-muted-foreground/50">null</span>
                            : String(row[col])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            {totalPages > 1 && (
              <div className="flex shrink-0 items-center justify-between border-t border-white/[0.06] px-4 py-2">
                <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 rounded-lg text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" className="h-7 rounded-lg text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Chart tabs */}
          {chartData.length > 0 && (
            <>
              <TabsContent value="bar" className="m-0 flex-1 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--chart-axis-stroke)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis stroke="var(--chart-axis-stroke)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "var(--chart-tooltip-bg)", border: "1px solid var(--chart-tooltip-border)", borderRadius: 12, fontSize: 12, color: "var(--chart-tooltip-text)" }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="line" className="m-0 flex-1 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--chart-axis-stroke)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis stroke="var(--chart-axis-stroke)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "var(--chart-tooltip-bg)", border: "1px solid var(--chart-tooltip-border)", borderRadius: 12, fontSize: 12, color: "var(--chart-tooltip-text)" }} />
                    <Line type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="pie" className="m-0 flex-1 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="35%" outerRadius="60%" paddingAngle={3}>
                      {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--chart-tooltip-bg)", border: "1px solid var(--chart-tooltip-border)", borderRadius: 12, fontSize: 12, color: "var(--chart-tooltip-text)" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  )
}
