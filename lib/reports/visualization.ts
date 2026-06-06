export type ChartViewKind =

  | "bar"

  | "horizontal_bar"

  | "line"

  | "area"

  | "pie"

  | "donut"

  | "stacked_bar"

  | "combo"



export type BlockViewKind = "table" | "metric" | ChartViewKind



export type ReportViewKind = BlockViewKind | "composite"



export type ReportViewBlock = {

  kind: BlockViewKind

  label?: string

  xKey?: string

  yKeys?: string[]

  valueKey?: string

  groupKey?: string

  description?: string

  /** For metrics: "count" totals rows; "sum" totals valueKey (default). */

  aggregate?: "sum" | "count"

}



export type ReportViewSpec = {

  id: string

  label: string

  kind: ReportViewKind

  blocks?: ReportViewBlock[]

  xKey?: string

  yKeys?: string[]

  valueKey?: string

  groupKey?: string

  description?: string

}



export type ReportVisualization = {

  defaultViewId: string

  views: ReportViewSpec[]

  rationale?: string

}



export type LegacyChartType = "bar" | "pie" | "line" | "table"



export {

  requiresClarification,

  userSkippedQuestions,

  conversationHadClarification,

} from "@/lib/reports/clarify"



const CHART_KINDS = new Set<string>([

  "bar",

  "horizontal_bar",

  "line",

  "area",

  "pie",

  "donut",

  "stacked_bar",

  "combo",

])



function isChartKind(kind: string): boolean {

  return CHART_KINDS.has(kind)

}



function viewToBlock(view: ReportViewSpec): ReportViewBlock {

  if (view.kind === "composite" && view.blocks?.length) {

    return view.blocks[0]

  }

  return {

    kind: view.kind as BlockViewKind,

    label: view.label,

    xKey: view.xKey,

    yKeys: view.yKeys,

    valueKey: view.valueKey,

    groupKey: view.groupKey,

    description: view.description,

  }

}



function buildSummaryMetrics(

  columns: string[],

  rows: Record<string, string | number | null>[]

): ReportViewBlock[] {

  const numeric = inferNumericColumns(columns, rows)

  const blocks: ReportViewBlock[] = [

    {

      kind: "metric",

      description: "Row count",

      aggregate: "count",

    },

  ]

  for (const col of numeric.slice(0, 3)) {

    blocks.push({

      kind: "metric",

      valueKey: col,

      description: `Total ${col}`,

      aggregate: "sum",

    })

  }

  return blocks

}



function buildSummaryView(

  columns: string[],

  rows: Record<string, string | number | null>[]

): ReportViewSpec {

  return {

    id: "summary",

    label: "Summary",

    kind: "composite",

    blocks: buildSummaryMetrics(columns, rows),

  }

}



function ensureMainView(

  views: ReportViewSpec[],

  columns: string[],

  rows: Record<string, string | number | null>[]

): ReportViewSpec {

  const mainCandidate =

    views.find((v) => v.id === "main") ??

    views.find((v) => v.id !== "summary" && !/summary/i.test(v.label))



  const extraViews = views.filter(

    (v) => v !== mainCandidate && v.id !== "summary" && !/summary/i.test(v.label)

  )



  if (!mainCandidate) {

    return {

      id: "main",

      label: "Report",

      kind: "table",

    }

  }



  if (mainCandidate.kind === "composite") {

    const blocks = [...(mainCandidate.blocks ?? [])]

    for (const extra of extraViews) {

      if (extra.kind === "composite" && extra.blocks) {

        blocks.push(...extra.blocks.filter((b) => b.kind !== "metric"))

      } else if (extra.kind !== "metric") {

        blocks.push(viewToBlock(extra))

      }

    }

    return { ...mainCandidate, id: "main", label: mainCandidate.label || "Report", blocks }

  }



  if (extraViews.length === 0) {

    return { ...mainCandidate, id: "main", label: mainCandidate.label || "Report" }

  }



  const blocks: ReportViewBlock[] = []

  if (mainCandidate.kind !== "metric") {

    blocks.push(viewToBlock(mainCandidate))

  }

  for (const extra of extraViews) {

    if (extra.kind === "composite" && extra.blocks) {

      blocks.push(...extra.blocks.filter((b) => b.kind !== "metric"))

    } else if (extra.kind !== "metric") {

      blocks.push(viewToBlock(extra))

    }

  }



  if (blocks.length === 1) {

    const only = blocks[0]

    return {

      id: "main",

      label: mainCandidate.label || "Report",

      kind: only.kind,

      xKey: only.xKey,

      yKeys: only.yKeys,

      valueKey: only.valueKey,

      groupKey: only.groupKey,

      description: only.description,

    }

  }



  return {

    id: "main",

    label: mainCandidate.label || "Report",

    kind: "composite",

    blocks,

  }

}



function ensureSummaryView(

  views: ReportViewSpec[],

  columns: string[],

  rows: Record<string, string | number | null>[]

): ReportViewSpec {

  const summaryCandidate =

    views.find((v) => v.id === "summary" || /summary/i.test(v.label))



  if (!summaryCandidate) {

    return buildSummaryView(columns, rows)

  }



  let metricBlocks: ReportViewBlock[] = []



  if (summaryCandidate.kind === "composite" && summaryCandidate.blocks?.length) {

    metricBlocks = summaryCandidate.blocks.filter((b) => b.kind === "metric")

  } else if (summaryCandidate.kind === "metric") {

    metricBlocks = [viewToBlock(summaryCandidate)]

  }



  for (const v of views) {

    if (v === summaryCandidate) continue

    if (v.kind === "metric") {

      metricBlocks.push(viewToBlock(v))

    } else if (v.kind === "composite") {

      metricBlocks.push(...(v.blocks?.filter((b) => b.kind === "metric") ?? []))

    }

  }



  if (metricBlocks.length === 0) {

    metricBlocks = buildSummaryMetrics(columns, rows)

  }



  return {

    id: "summary",

    label: "Summary",

    kind: "composite",

    blocks: metricBlocks,

  }

}



export function inferNumericColumns(

  columns: string[],

  rows: Record<string, string | number | null>[]

): string[] {

  return columns.filter((col) =>

    rows.some((r) => typeof r[col] === "number" || (r[col] != null && !Number.isNaN(Number(r[col]))))

  )

}



export function inferLabelColumn(

  columns: string[],

  numericCols: string[]

): string {

  const nonNumeric = columns.filter((c) => !numericCols.includes(c))

  return nonNumeric[0] ?? columns[0] ?? "name"

}



export function buildDefaultVisualization(

  columns: string[],

  rows: Record<string, string | number | null>[]

): ReportVisualization {

  return {

    defaultViewId: "main",

    views: [

      {

        id: "main",

        label: "Report",

        kind: "table",

      },

      buildSummaryView(columns, rows),

    ],

    rationale: "Default report layout.",

  }

}



export function chartTypeFromVisualization(v: ReportVisualization): LegacyChartType {

  const primary = v.views.find((x) => x.id === v.defaultViewId) ?? v.views[0]

  if (!primary) return "table"



  const kind =

    primary.kind === "composite"

      ? primary.blocks?.find((b) => isChartKind(b.kind))?.kind ?? primary.blocks?.[0]?.kind

      : primary.kind



  switch (kind) {

    case "pie":

    case "donut":

      return "pie"

    case "line":

    case "area":

      return "line"

    case "bar":

    case "horizontal_bar":

    case "stacked_bar":

    case "combo":

    case "metric":

      return "bar"

    default:

      return "table"

  }

}



export function normalizeVisualization(

  raw: unknown,

  columns: string[],

  rows: Record<string, string | number | null>[],

  legacyChartType?: string

): ReportVisualization {

  if (raw && typeof raw === "object" && "views" in raw) {

    const v = raw as ReportVisualization

    if (Array.isArray(v.views) && v.views.length > 0) {

      const main = ensureMainView(v.views, columns, rows)

      const summary = ensureSummaryView(v.views, columns, rows)

      const defaultViewId =

        v.defaultViewId === "summary" ? "summary" : "main"

      return {

        ...v,

        defaultViewId,

        views: [main, summary],

      }

    }

  }



  const fallback = buildDefaultVisualization(columns, rows)

  if (legacyChartType && legacyChartType !== "table") {

    const label = inferLabelColumn(columns, inferNumericColumns(columns, rows))

    const value = inferNumericColumns(columns, rows)[0]

    if (value) {

      const kind =

        legacyChartType === "pie"

          ? "pie"

          : legacyChartType === "line"

            ? "line"

            : "bar"

      fallback.views[0] = {

        id: "main",

        label: "Report",

        kind: kind as ChartViewKind,

        xKey: label,

        yKeys: [value],

        valueKey: value,

      }

    }

  }

  return fallback

}



export function viewHasTable(view: ReportViewSpec): boolean {

  if (view.kind === "table") return true

  if (view.kind === "composite") {

    return view.blocks?.some((b) => b.kind === "table") ?? false

  }

  return false

}



export function toSeriesData(

  columns: string[],

  rows: Record<string, string | number | null>[],

  spec: Pick<ReportViewSpec, "xKey" | "yKeys" | "valueKey">,

  maxPoints = 40

): Record<string, string | number>[] {

  const labelCol = spec.xKey ?? columns[0]

  const valueCols =

    spec.yKeys?.length

      ? spec.yKeys

      : spec.valueKey

        ? [spec.valueKey]

        : inferNumericColumns(columns, rows).slice(0, 1)



  return rows.slice(0, maxPoints).map((row) => {

    const point: Record<string, string | number> = {

      name: String(row[labelCol] ?? ""),

    }

    for (const col of valueCols) {

      const v = row[col]

      point[col] =

        typeof v === "number" ? v : parseFloat(String(v ?? "0")) || 0

    }

    return point

  })

}



export function metricValue(

  rows: Record<string, string | number | null>[],

  block: Pick<ReportViewBlock, "valueKey" | "aggregate">

): number {

  if (block.aggregate === "count") {

    return rows.length

  }

  const valueKey = block.valueKey

  if (!valueKey) return rows.length

  return rows.reduce((sum, row) => {

    const v = row[valueKey]

    const n = typeof v === "number" ? v : parseFloat(String(v ?? "0")) || 0

    return sum + n

  }, 0)

}



export function metricTotal(

  rows: Record<string, string | number | null>[],

  valueKey: string

): number {

  return metricValue(rows, { valueKey, aggregate: "sum" })

}


