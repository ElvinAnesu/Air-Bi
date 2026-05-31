import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id: chatId } = await params

  // Verify the chat belongs to this team
  const { data: chat } = await supabaseAdmin
    .from("chats")
    .select("id")
    .eq("id", chatId)
    .eq("team_id", auth!.teamId)
    .single()

  if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 })

  const { messages } = await req.json() as {
    messages: { role: "user" | "assistant"; content: string }[]
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array required" }, { status: 400 })
  }

  const rows = messages.map((m) => ({ chat_id: chatId, role: m.role, content: m.content }))

  const { data, error } = await supabaseAdmin
    .from("chat_messages")
    .insert(rows)
    .select("id, role, content, created_at")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Bump chat.updated_at
  await supabaseAdmin
    .from("chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chatId)

  return NextResponse.json(data, { status: 201 })
}
