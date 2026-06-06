import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { getWizardSession } from "@/lib/server/data-sources/wizard"
import { searchExcelCatalog } from "@/lib/server/data-sources/catalog-search"

export async function GET(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  const sessionId = req.nextUrl.searchParams.get("sessionId")?.trim()
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50, 100)
  const offset = Math.max(Number(req.nextUrl.searchParams.get("offset") ?? 0) || 0, 0)

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
  }

  const session = await getWizardSession(auth!.teamId!, sessionId)
  if (!session?.excel_storage_path) {
    return NextResponse.json({ error: "Session not found or file missing" }, { status: 404 })
  }

  try {
    const catalog = await searchExcelCatalog(session.excel_storage_path, { q, limit, offset })
    return NextResponse.json({
      sessionId,
      fileName: session.excel_file_name,
      ...catalog,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list sheets"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
