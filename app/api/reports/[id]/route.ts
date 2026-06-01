import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("*")
    .eq("id", id)
    .eq("team_id", auth!.teamId)   // team isolation
    .single()

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { data: existing } = await supabaseAdmin
    .from("reports")
    .select("id")
    .eq("id", id)
    .eq("team_id", auth!.teamId)
    .single()

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.sql !== undefined) updates.sql = body.sql
  if (body.chartType !== undefined) updates.chart_type = body.chartType
  if (body.columns !== undefined) updates.columns = body.columns
  if (body.rows !== undefined) updates.rows = body.rows
  if (body.rowCount !== undefined) updates.row_count = body.rowCount
  if (body.connectionId !== undefined) updates.connection_id = body.connectionId
  if (body.chatId !== undefined) updates.chat_id = body.chatId

  const { data, error } = await supabaseAdmin
    .from("reports")
    .update(updates)
    .eq("id", id)
    .eq("team_id", auth!.teamId)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { error } = await supabaseAdmin
    .from("reports")
    .delete()
    .eq("id", id)
    .eq("team_id", auth!.teamId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
