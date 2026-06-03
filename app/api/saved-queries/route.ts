import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { planLimitResponse } from "@/lib/server/billing/enforce"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  const { data, error } = await supabaseAdmin
    .from("saved_queries")
    .select("id, name, description, sql, row_count, created_at, updated_at, created_by")
    .eq("team_id", auth!.teamId)       // team isolation
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  const { name, description, sql, rowCount } = await req.json()

  if (!name || !sql) {
    return NextResponse.json({ error: "name and sql are required" }, { status: 400 })
  }

  const limitResponse = await planLimitResponse(auth!, "saved_queries")
  if (limitResponse) return limitResponse

  const { data, error } = await supabaseAdmin
    .from("saved_queries")
    .insert({
      team_id: auth!.teamId,
      created_by: auth!.user.id,
      name,
      description: description ?? null,
      sql,
      row_count: rowCount ?? null,
    })
    .select("id, name, description, sql, row_count, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
