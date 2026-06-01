"use client"

import { useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { cn } from "@/lib/utils"
import { BarChart2, Loader2, Sparkles, Table2 } from "lucide-react"

const USER_PROMPT = "Show top customers by revenue this quarter"
const ASSISTANT_REPLY = "Here is your revenue breakdown by customer for Q2."

const CHART_DATA = [
  { name: "Acme Corp", value: 842000 },
  { name: "Globex", value: 691000 },
  { name: "Initech", value: 524000 },
  { name: "Umbrella", value: 418000 },
  { name: "Stark Ind.", value: 376000 },
]

const TABLE_ROWS = [
  ["Acme Corp", "$842,000"],
  ["Globex", "$691,000"],
  ["Initech", "$524,000"],
]

type DemoPhase = "typing" | "thinking" | "report"

export function LandingHeroDemo() {
  const [phase, setPhase] = useState<DemoPhase>("typing")
  const [typedText, setTypedText] = useState("")
  const [reportTab, setReportTab] = useState<"chart" | "table">("chart")

  useEffect(() => {
    if (phase !== "typing") return

    if (typedText.length >= USER_PROMPT.length) {
      const timer = window.setTimeout(() => setPhase("thinking"), 500)
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => {
      setTypedText(USER_PROMPT.slice(0, typedText.length + 1))
    }, 28)

    return () => window.clearTimeout(timer)
  }, [phase, typedText])

  useEffect(() => {
    if (phase !== "thinking") return

    const timer = window.setTimeout(() => {
      setPhase("report")
      setReportTab("chart")
    }, 1400)

    return () => window.clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== "report") return

    const chartTimer = window.setTimeout(() => setReportTab("table"), 2600)
    const resetTimer = window.setTimeout(() => {
      setTypedText("")
      setPhase("typing")
    }, 6800)

    return () => {
      window.clearTimeout(chartTimer)
      window.clearTimeout(resetTimer)
    }
  }, [phase])

  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <div className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-primary/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#121214] shadow-2xl shadow-black/40 ring-1 ring-white/5">
        <div className="flex items-center gap-2 border-b border-white/8 bg-black/30 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
          </div>
          <span className="text-muted-foreground ml-2 text-[11px]">AirBI workspace</span>
        </div>

        <div className="grid min-h-[420px] md:grid-cols-[38%_1fr]">
          {/* Chat panel */}
          <div className="flex flex-col border-b border-white/8 md:border-b-0 md:border-r md:border-white/8">
            <div className="flex-1 space-y-4 p-4">
              <div
                className={cn(
                  "ml-auto max-w-[95%] rounded-2xl rounded-tr-md bg-primary/20 px-3 py-2.5 text-[11px] leading-relaxed text-white transition-opacity duration-300",
                  phase === "typing" && typedText.length === 0 && "opacity-70"
                )}
              >
                {typedText}
                {phase === "typing" && (
                  <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-white/80 align-middle" />
                )}
              </div>

              {(phase === "thinking" || phase === "report") && (
                <div className="max-w-[95%] animate-in fade-in slide-in-from-bottom-2 rounded-2xl rounded-tl-md border border-white/8 bg-white/[0.04] px-3 py-2.5 duration-500">
                  {phase === "thinking" ? (
                    <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
                      <Loader2 className="size-3.5 animate-spin text-primary" />
                      Generating SQL and running query&hellip;
                    </div>
                  ) : (
                    <p className="text-[11px] leading-relaxed text-white/85">{ASSISTANT_REPLY}</p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-white/8 p-3">
              <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[10px] text-white/35">
                Ask a follow-up or refine this report&hellip;
              </div>
            </div>
          </div>

          {/* Report panel */}
          <div className="relative flex flex-col bg-white/[0.02] p-4">
            {phase !== "report" ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03]">
                  <Sparkles className="size-6 text-white/25" />
                </div>
                <p className="text-sm font-medium text-white/40">Your report appears here</p>
                <p className="max-w-[220px] text-[11px] leading-relaxed text-white/25">
                  Charts, tables, and SQL — generated from your ERP data in seconds.
                </p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 flex min-h-0 flex-1 flex-col duration-700">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-white">Top customers by revenue</p>
                  <p className="text-[11px] text-white/45">Q2 performance across active accounts</p>
                </div>

                <div className="mb-3 flex gap-1 rounded-lg bg-white/[0.04] p-1">
                  <button
                    type="button"
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] transition",
                      reportTab === "chart"
                        ? "bg-white/10 text-white"
                        : "text-white/40"
                    )}
                  >
                    <BarChart2 className="size-3" />
                    Chart
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] transition",
                      reportTab === "table"
                        ? "bg-white/10 text-white"
                        : "text-white/40"
                    )}
                  >
                    <Table2 className="size-3" />
                    Table
                  </button>
                </div>

                <div className="min-h-0 flex-1 rounded-xl border border-white/8 bg-black/20 p-2">
                  {reportTab === "chart" ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={CHART_DATA} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.04)" }}
                          contentStyle={{
                            background: "#18181b",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 12,
                            fontSize: 11,
                            color: "#fff",
                          }}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                        />
                        <Bar dataKey="value" fill="oklch(0.59 0.13 193)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="animate-in fade-in duration-500">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-white/8 text-white/45">
                            <th className="pb-2 font-medium">Customer</th>
                            <th className="pb-2 text-right font-medium">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {TABLE_ROWS.map(([customer, revenue]) => (
                            <tr key={customer} className="border-b border-white/5 text-white/80">
                              <td className="py-2">{customer}</td>
                              <td className="py-2 text-right tabular-nums">{revenue}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
