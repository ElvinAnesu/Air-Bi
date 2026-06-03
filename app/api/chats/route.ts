import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { planLimitResponse } from "@/lib/server/billing/enforce"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  const { data, error } = await supabaseAdmin
    .from("chats")
    .select("id, title, connection_id, data_source_id, created_at, updated_at, created_by")
    .eq("team_id", auth!.teamId)       // team isolation
    .order("updated_at", { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  const { title, connectionId, dataSourceId } = await req.json()

  const limitResponse = await planLimitResponse(auth!, "chats")
  if (limitResponse) return limitResponse

  const { data, error } = await supabaseAdmin
    .from("chats")
    .insert({
      team_id: auth!.teamId,
      created_by: auth!.user.id,
      title: title ?? "New chat",
      connection_id: connectionId ?? null,
      data_source_id: dataSourceId ?? null,
    })
    .select("id, title, connection_id, data_source_id, created_at, updated_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
