import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { getTeamMssqlConnection } from "@/lib/server/connections/repository"
import { listMssqlTables } from "@/lib/server/mssql/client"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const config = await getTeamMssqlConnection(auth!.teamId!, id)
  if (!config) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 })
  }

  try {
    const tables = await listMssqlTables(config)
    return NextResponse.json({ tables })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load schema"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
