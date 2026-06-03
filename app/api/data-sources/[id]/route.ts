import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  getTeamDataSource,
  getTeamDataSourceRow,
} from "@/lib/server/data-sources/repository"
import type { DbDataSourceRow } from "@/lib/server/data-sources/types"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const source = await getTeamDataSource(auth!.teamId!, id)
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(source)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { data: existing } = await getTeamDataSourceRow(auth!.teamId!, id)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim()
  if (body.description !== undefined) {
    updates.description = typeof body.description === "string" ? body.description.trim() : null
  }
  if (body.connectionId !== undefined) {
    updates.connection_id = body.connectionId || null
  }

  const { error } = await supabaseAdmin
    .from("data_sources")
    .update(updates)
    .eq("id", id)
    .eq("team_id", auth!.teamId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const source = await getTeamDataSource(auth!.teamId!, id)
  return NextResponse.json(source)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { data: existing } = await getTeamDataSourceRow(auth!.teamId!, id)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const row = existing as DbDataSourceRow
  if (row.excel_storage_path) {
    await supabaseAdmin.storage.from("excel-uploads").remove([row.excel_storage_path])
  }

  const { error } = await supabaseAdmin
    .from("data_sources")
    .delete()
    .eq("id", id)
    .eq("team_id", auth!.teamId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
