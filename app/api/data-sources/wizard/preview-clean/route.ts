import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { getWizardSession, previewWizardTable } from "@/lib/server/data-sources/wizard"
import type { TableCleaningConfig } from "@/lib/server/data-sources/transforms"

export async function POST(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  const body = await req.json()
  const sourceKind = body.sourceKind === "excel" ? "excel" : "connection"
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : null
  const connectionId = typeof body.connectionId === "string" ? body.connectionId : null
  const externalSchema = typeof body.externalSchema === "string" ? body.externalSchema.trim() : ""
  const externalName = typeof body.externalName === "string" ? body.externalName.trim() : ""
  const cleaning = body.cleaning as TableCleaningConfig | null | undefined

  if (!externalName) {
    return NextResponse.json({ error: "externalName is required" }, { status: 400 })
  }

  try {
    let excelStoragePath: string | null = null
    let connId = connectionId

    if (sessionId) {
      const session = await getWizardSession(auth!.teamId!, sessionId)
      if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })
      excelStoragePath = session.excel_storage_path
      if (!connId && session.connection_id) connId = session.connection_id
    }

    const preview = await previewWizardTable(auth!.teamId!, sourceKind, {
      excelStoragePath,
      connectionId: connId,
      externalSchema: externalSchema || (sourceKind === "excel" ? "excel" : "dbo"),
      externalName,
      cleaning: cleaning ?? null,
    })

    return NextResponse.json({ preview })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Preview failed"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
