import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { planLimitResponse } from "@/lib/server/billing/enforce"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("id, title, description, chart_type, row_count, connection_id, created_at, updated_at, created_by")
    .eq("team_id", auth!.teamId)       // team isolation
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  const body = await req.json()
  const { title, description, sql, chartType, columns, rows, rowCount, connectionId, dataSourceId, chatId } = body

  if (!title || !sql) {
    return NextResponse.json({ error: "title and sql are required" }, { status: 400 })
  }

  const limitResponse = await planLimitResponse(auth!, "reports")
  if (limitResponse) return limitResponse

  const { data, error } = await supabaseAdmin
    .from("reports")
    .insert({
      team_id: auth!.teamId,
      created_by: auth!.user.id,
      title,
      description: description ?? null,
      sql,
      chart_type: chartType ?? "table",
      columns: columns ?? [],
      rows: rows ?? [],
      row_count: rowCount ?? 0,
      connection_id: connectionId ?? null,
      data_source_id: dataSourceId ?? null,
      chat_id: chatId ?? null,
    })
    .select("id, title, description, chart_type, row_count, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
