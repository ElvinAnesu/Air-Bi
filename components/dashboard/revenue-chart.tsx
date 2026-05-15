"use client"

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ChartPoint } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function RevenueChart({
  data,
  loading,
}: {
  data?: ChartPoint[]
  loading?: boolean
}) {
  if (loading || !data) {
    return (
      <Card className="rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Revenue trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-56 w-full rounded-xl" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Revenue trend</CardTitle>
      </CardHeader>
      <CardContent className="h-56 pt-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <XAxis dataKey="label" stroke="oklch(0.708 0 0)" tickLine={false} axisLine={false} />
            <YAxis
              stroke="oklch(0.708 0 0)"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: "oklch(0.205 0 0)",
                border: "1px solid oklch(1 0 0 / 10%)",
                borderRadius: 12,
              }}
              labelStyle={{ color: "oklch(0.985 0 0)" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="oklch(0.72 0.15 250)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
