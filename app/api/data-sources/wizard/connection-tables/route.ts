import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { searchConnectionCatalog } from "@/lib/server/data-sources/catalog-search"
import { bindWizardConnection } from "@/lib/server/data-sources/wizard"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  const connectionId = req.nextUrl.searchParams.get("connectionId")?.trim()
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50, 100)
  const offset = Math.max(Number(req.nextUrl.searchParams.get("offset") ?? 0) || 0, 0)
  const sessionId = req.nextUrl.searchParams.get("sessionId")?.trim()

  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 })
  }

  try {
    let sid = sessionId
    if (!sid) {
      sid = crypto.randomUUID()
      const { error } = await supabaseAdmin.from("data_source_wizard_sessions").insert({
        id: sid,
        team_id: auth!.teamId,
        created_by: auth!.user.id,
        connection_id: connectionId,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      await bindWizardConnection(auth!.teamId!, sid, connectionId)
    }

    const catalog = await searchConnectionCatalog(auth!.teamId!, connectionId, { q, limit, offset })
    return NextResponse.json({ sessionId: sid, ...catalog })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load tables"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
