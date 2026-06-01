import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

type Params = { params: Promise<{ slug: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params

  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("title, description, chart_type, columns, rows, row_count, published_at")
    .eq("public_slug", slug)
    .eq("is_published", true)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 })
  }

  return NextResponse.json({
    title: data.title,
    description: data.description,
    chartType: data.chart_type,
    columns: data.columns,
    rows: data.rows,
    rowCount: data.row_count,
    publishedAt: data.published_at,
  })
}
