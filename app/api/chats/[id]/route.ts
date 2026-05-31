import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { data: chat, error } = await supabaseAdmin
    .from("chats")
    .select("id, title, connection_id, created_at, updated_at")
    .eq("id", id)
    .eq("team_id", auth!.teamId)   // team isolation
    .single()

  if (error || !chat) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: messages } = await supabaseAdmin
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("chat_id", id)
    .order("created_at", { ascending: true })

  return NextResponse.json({ ...chat, messages: messages ?? [] })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { title } = await req.json()

  const { data, error } = await supabaseAdmin
    .from("chats")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("team_id", auth!.teamId)
    .select("id, title, updated_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { error } = await supabaseAdmin
    .from("chats")
    .delete()
    .eq("id", id)
    .eq("team_id", auth!.teamId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
