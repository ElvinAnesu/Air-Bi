import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { requireAuth } from "@/lib/supabase/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const body = (await req.json()) as { publish?: boolean }
  const publish = body.publish !== false

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("reports")
    .select("id, public_slug, is_published")
    .eq("id", id)
    .eq("team_id", auth!.teamId)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const now = new Date().toISOString()
  const publicSlug = publish ? (existing.public_slug ?? randomUUID()) : existing.public_slug

  const { data, error } = await supabaseAdmin
    .from("reports")
    .update({
      is_published: publish,
      public_slug: publicSlug,
      published_at: publish ? now : null,
      updated_at: now,
    })
    .eq("id", id)
    .eq("team_id", auth!.teamId)
    .select("id, is_published, public_slug, published_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    id: data.id,
    isPublished: data.is_published,
    publicSlug: data.public_slug,
    publishedAt: data.published_at,
  })
}
