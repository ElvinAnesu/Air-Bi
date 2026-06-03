import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getTeamDataSource, getTeamDataSourceRow } from "@/lib/server/data-sources/repository"
import type { DbDataSourceRow } from "@/lib/server/data-sources/types"

type Params = { params: Promise<{ id: string }> }

const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { data: ds, error: dsError } = await getTeamDataSourceRow(auth!.teamId!, id)
  if (dsError || !ds) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const dataSource = ds as DbDataSourceRow
  if (dataSource.source_kind !== "excel") {
    return NextResponse.json({ error: "Upload is only supported for Excel data sources" }, { status: 400 })
  }

  const formData = await req.formData()
  const file = formData.get("file")
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

  const storagePath = `${auth!.teamId}/${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from("excel-uploads")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  if (dataSource.excel_storage_path) {
    await supabaseAdmin.storage.from("excel-uploads").remove([dataSource.excel_storage_path])
  }

  const { error: updateError } = await supabaseAdmin
    .from("data_sources")
    .update({
      excel_file_name: file.name,
      excel_storage_path: storagePath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("team_id", auth!.teamId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const source = await getTeamDataSource(auth!.teamId!, id)
  return NextResponse.json(source)
}
