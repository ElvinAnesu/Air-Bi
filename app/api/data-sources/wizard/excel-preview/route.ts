import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { createWizardExcelSession } from "@/lib/server/data-sources/wizard"
import { searchExcelCatalog } from "@/lib/server/data-sources/catalog-search"

const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  const formData = await req.formData()
  const file = formData.get("file")
  const qRaw = formData.get("q")
  const q = typeof qRaw === "string" ? qRaw : ""
  const limit = Math.min(Number(formData.get("limit") ?? 50) || 50, 100)
  const offset = Math.max(Number(formData.get("offset") ?? 0) || 0, 0)

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 })
  }
  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext !== "xlsx" && ext !== "xls") {
    return NextResponse.json({ error: "Only .xlsx and .xls files are supported" }, { status: 400 })
  }

  try {
    const { sessionId, fileName } = await createWizardExcelSession(
      auth!.teamId!,
      auth!.user.id,
      file
    )
    const session = await import("@/lib/server/data-sources/wizard").then((m) =>
      m.getWizardSession(auth!.teamId!, sessionId)
    )
    if (!session?.excel_storage_path) {
      return NextResponse.json({ error: "Failed to store upload" }, { status: 500 })
    }
    const catalog = await searchExcelCatalog(session.excel_storage_path, { q: q ?? "", limit, offset })
    return NextResponse.json({
      sessionId,
      fileName,
      ...catalog,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
