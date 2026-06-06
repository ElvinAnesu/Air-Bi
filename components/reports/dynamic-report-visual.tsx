"use client"

import type { ReactNode } from "react"
import {

  Area,

  AreaChart,

  Bar,

  BarChart,

  CartesianGrid,

  Cell,

  ComposedChart,

  Legend,

  Line,

  LineChart,

  Pie,

  PieChart,

  ResponsiveContainer,

  Tooltip,

  XAxis,

  YAxis,

} from "recharts"

import {

  Table,

  TableBody,

  TableCell,

  TableHead,

  TableHeader,

  TableRow,

} from "@/components/ui/table"

import { ScrollArea } from "@/components/ui/scroll-area"

import type { ReportViewBlock, ReportViewSpec } from "@/lib/reports/visualization"

import {

  inferNumericColumns,

  metricValue,

  toSeriesData,

} from "@/lib/reports/visualization"



const CHART_COLORS = ["#60a5fa", "#a78bfa", "#34d399", "#fbbf24", "#fb7185", "#38bdf8", "#f97316"]



const tooltipStyle = {

  background: "var(--chart-tooltip-bg)",

  border: "1px solid var(--chart-tooltip-border)",

  borderRadius: 12,

  fontSize: 12,

  color: "var(--chart-tooltip-text)",

}



type BlockProps = {

  block: ReportViewBlock

  columns: string[]

  rows: Record<string, string | number | null>[]

  pageRows: Record<string, string | number | null>[]

  chartHeight?: number

  metricCompact?: boolean

}



function ReportVisualBlock({

  block,

  columns,

  rows,

  pageRows,

  chartHeight,

  metricCompact,

}: BlockProps) {

  const numeric = inferNumericColumns(columns, rows)

  const series = toSeriesData(columns, rows, block)

  const valueKey = block.valueKey ?? block.yKeys?.[0] ?? numeric[0]

  const yKeys = block.yKeys?.length ? block.yKeys : valueKey ? [valueKey] : numeric.slice(0, 2)



  if (block.kind === "table") {

    return (

      <ScrollArea className="h-full flex-1">

        <Table>

          <TableHeader>

            <TableRow className="border-white/[0.06] hover:bg-transparent">

              {columns.map((col) => (

                <TableHead

                  key={col}

                  className="sticky top-0 bg-black/40 text-xs font-semibold text-muted-foreground backdrop-blur-sm"

                >

                  {col}

                </TableHead>

              ))}

            </TableRow>

          </TableHeader>

          <TableBody>

            {pageRows.map((row, idx) => (

              <TableRow key={idx} className="border-white/[0.04] hover:bg-white/[0.03]">

                {columns.map((col) => (

                  <TableCell key={col} className="text-xs">

                    {row[col] === null ? (

                      <span className="italic text-muted-foreground/50">null</span>

                    ) : (

                      String(row[col])

                    )}

                  </TableCell>

                ))}

              </TableRow>

            ))}

          </TableBody>

        </Table>

      </ScrollArea>

    )

  }



  if (block.kind === "metric") {

    const total = metricValue(rows, block)

    const formatted = Number.isInteger(total)

      ? total.toLocaleString()

      : total.toLocaleString(undefined, { maximumFractionDigits: 2 })

    return (

      <div

        className={

          metricCompact

            ? "flex flex-col items-center justify-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"

            : "flex h-full flex-col items-center justify-center gap-2 p-8"

        }

      >

        <p className="text-muted-foreground text-center text-sm">

          {block.description ?? block.label ?? "Metric"}

        </p>

        <p

          className={

            metricCompact

              ? "text-2xl font-semibold tracking-tight tabular-nums"

              : "text-4xl font-semibold tracking-tight tabular-nums md:text-5xl"

          }

        >

          {formatted}

        </p>

        {block.valueKey && block.aggregate !== "count" && (

          <p className="text-muted-foreground font-mono text-xs">{block.valueKey}</p>

        )}

      </div>

    )

  }



  if (series.length === 0 || yKeys.length === 0) {

    return (

      <p className="text-muted-foreground flex h-full items-center justify-center p-8 text-sm">

        Not enough numeric data for this view.

      </p>

    )

  }



  const chartWrap = (children: ReactNode) => (

    <div style={{ height: chartHeight ?? "100%", minHeight: chartHeight ?? 280 }} className="w-full">

      {children}

    </div>

  )



  if (block.kind === "pie" || block.kind === "donut") {

    const dataKey = yKeys[0]

    const pieData = series.map((s) => ({

      name: s.name,

      value: typeof s[dataKey] === "number" ? s[dataKey] : 0,

    }))

    return chartWrap(

      <ResponsiveContainer width="100%" height="100%">

        <PieChart>

          <Pie

            data={pieData}

            dataKey="value"

            nameKey="name"

            cx="50%"

            cy="50%"

            innerRadius={block.kind === "donut" ? "40%" : 0}

            outerRadius="65%"

            paddingAngle={2}

          >

            {pieData.map((_, i) => (

              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />

            ))}

          </Pie>

          <Tooltip contentStyle={tooltipStyle} />

          <Legend wrapperStyle={{ fontSize: 12 }} />

        </PieChart>

      </ResponsiveContainer>

    )

  }



  if (block.kind === "horizontal_bar") {

    return chartWrap(

      <ResponsiveContainer width="100%" height="100%">

        <BarChart data={series} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" horizontal={false} />

          <XAxis type="number" stroke="var(--chart-axis-stroke)" tick={{ fontSize: 11 }} />

          <YAxis

            type="category"

            dataKey="name"

            width={120}

            stroke="var(--chart-axis-stroke)"

            tick={{ fontSize: 10 }}

          />

          <Tooltip contentStyle={tooltipStyle} />

          {yKeys.map((key, i) => (

            <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[0, 4, 4, 0]} />

          ))}

        </BarChart>

      </ResponsiveContainer>

    )

  }



  if (block.kind === "line" || block.kind === "area") {

    const Chart = block.kind === "area" ? AreaChart : LineChart

    return chartWrap(

      <ResponsiveContainer width="100%" height="100%">

        <Chart data={series} margin={{ left: 0, right: 8, top: 8, bottom: 32 }}>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" vertical={false} />

          <XAxis

            dataKey="name"

            stroke="var(--chart-axis-stroke)"

            tick={{ fontSize: 11 }}

            angle={-25}

            textAnchor="end"

            height={56}

            interval="preserveStartEnd"

          />

          <YAxis stroke="var(--chart-axis-stroke)" tick={{ fontSize: 11 }} />

          <Tooltip contentStyle={tooltipStyle} />

          <Legend wrapperStyle={{ fontSize: 11 }} />

          {yKeys.map((key, i) =>

            block.kind === "area" ? (

              <Area

                key={key}

                type="monotone"

                dataKey={key}

                stroke={CHART_COLORS[i % CHART_COLORS.length]}

                fill={CHART_COLORS[i % CHART_COLORS.length]}

                fillOpacity={0.25}

              />

            ) : (

              <Line

                key={key}

                type="monotone"

                dataKey={key}

                stroke={CHART_COLORS[i % CHART_COLORS.length]}

                strokeWidth={2}

                dot={false}

              />

            )

          )}

        </Chart>

      </ResponsiveContainer>

    )

  }



  if (block.kind === "stacked_bar" || block.kind === "combo") {

    const Chart = block.kind === "combo" ? ComposedChart : BarChart

    return chartWrap(

      <ResponsiveContainer width="100%" height="100%">

        <Chart data={series} margin={{ left: 0, right: 8, top: 8, bottom: 32 }}>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" vertical={false} />

          <XAxis

            dataKey="name"

            stroke="var(--chart-axis-stroke)"

            tick={{ fontSize: 11 }}

            angle={-25}

            textAnchor="end"

            height={56}

          />

          <YAxis stroke="var(--chart-axis-stroke)" tick={{ fontSize: 11 }} />

          <Tooltip contentStyle={tooltipStyle} />

          <Legend wrapperStyle={{ fontSize: 11 }} />

          {yKeys.map((key, i) =>

            block.kind === "combo" && i === yKeys.length - 1 ? (

              <Line

                key={key}

                type="monotone"

                dataKey={key}

                stroke={CHART_COLORS[i % CHART_COLORS.length]}

                strokeWidth={2}

              />

            ) : (

              <Bar

                key={key}

                dataKey={key}

                stackId={block.kind === "stacked_bar" ? "a" : undefined}

                fill={CHART_COLORS[i % CHART_COLORS.length]}

                radius={i === yKeys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}

              />

            )

          )}

        </Chart>

      </ResponsiveContainer>

    )

  }



  return chartWrap(

    <ResponsiveContainer width="100%" height="100%">

      <BarChart data={series} margin={{ left: 0, right: 8, top: 8, bottom: 32 }}>

        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" vertical={false} />

        <XAxis

          dataKey="name"

          stroke="var(--chart-axis-stroke)"

          tick={{ fontSize: 11 }}

          angle={-25}

          textAnchor="end"

          height={56}

        />

        <YAxis stroke="var(--chart-axis-stroke)" tick={{ fontSize: 11 }} />

        <Tooltip contentStyle={tooltipStyle} />

        <Legend wrapperStyle={{ fontSize: 11 }} />

        {yKeys.map((key, i) => (

          <Bar

            key={key}

            dataKey={key}

            fill={CHART_COLORS[i % CHART_COLORS.length]}

            radius={[6, 6, 0, 0]}

          />

        ))}

      </BarChart>

    </ResponsiveContainer>

  )

}



type Props = {

  view: ReportViewSpec

  columns: string[]

  rows: Record<string, string | number | null>[]

  pageRows: Record<string, string | number | null>[]

}



export function DynamicReportVisual({ view, columns, rows, pageRows }: Props) {

  if (view.kind === "composite" && view.blocks?.length) {

    const isSummary = view.id === "summary"

    const metricBlocks = view.blocks.filter((b) => b.kind === "metric")

    const otherBlocks = view.blocks.filter((b) => b.kind !== "metric")



    if (isSummary && metricBlocks.length > 0 && otherBlocks.length === 0) {

      return (

        <div className="grid h-full gap-4 overflow-auto p-4 sm:grid-cols-2 lg:grid-cols-3">

          {metricBlocks.map((block, i) => (

            <ReportVisualBlock

              key={i}

              block={block}

              columns={columns}

              rows={rows}

              pageRows={pageRows}

              metricCompact

            />

          ))}

        </div>

      )

    }



    return (

      <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">

        {view.blocks.map((block, i) => (

          <div

            key={i}

            className={

              block.kind === "table"

                ? "min-h-0 flex-1 overflow-hidden"

                : block.kind === "metric"

                  ? "shrink-0"

                  : "shrink-0"

            }

          >

            {block.label && block.kind !== "table" && (

              <p className="text-muted-foreground mb-2 text-xs font-medium">{block.label}</p>

            )}

            <ReportVisualBlock

              block={block}

              columns={columns}

              rows={rows}

              pageRows={pageRows}

              chartHeight={block.kind === "table" ? undefined : 280}

            />

          </div>

        ))}

      </div>

    )

  }



  const block: ReportViewBlock = {

    kind: view.kind as ReportViewBlock["kind"],

    label: view.label,

    xKey: view.xKey,

    yKeys: view.yKeys,

    valueKey: view.valueKey,

    groupKey: view.groupKey,

    description: view.description,

  }



  return (

    <ReportVisualBlock

      block={block}

      columns={columns}

      rows={rows}

      pageRows={pageRows}

      metricCompact={view.id === "summary"}

    />

  )

}


