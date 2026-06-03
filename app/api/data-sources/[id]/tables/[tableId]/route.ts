import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getTeamDataSourceRow } from "@/lib/server/data-sources/repository"

type Params = { params: Promise<{ id: string; tableId: string }> }

export async function DELETE(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id, tableId } = await params

  const { data: ds } = await getTeamDataSourceRow(auth!.teamId!, id)
  if (!ds) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { error } = await supabaseAdmin
    .from("data_source_tables")
    .delete()
    .eq("id", tableId)
    .eq("data_source_id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
