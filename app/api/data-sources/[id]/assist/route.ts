import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import {
  getTeamDataSourceRow,
  listDataSourceTables,
} from "@/lib/server/data-sources/repository"
import { listDataSourceRelationships } from "@/lib/server/data-sources/relationships"
import { runDataPrepAssist, type AssistTask } from "@/lib/server/data-sources/assist"
import type { ErpColumn } from "@/types"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { data: ds } = await getTeamDataSourceRow(auth!.teamId!, id)
  if (!ds) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const task: AssistTask = body.task === "suggest_relationships" ? "suggest_relationships" : "clean"
  const instruction = typeof body.instruction === "string" ? body.instruction.trim() : ""
  const tableKey = typeof body.tableKey === "string" ? body.tableKey.trim() : ""

  if (!instruction) {
    return NextResponse.json({ error: "instruction is required" }, { status: 400 })
  }

  try {
    const tables = await listDataSourceTables(id)
    const relationships = await listDataSourceRelationships(id)

    const contextTables = tables.map((t) => ({
      key: `${t.externalSchema}.${t.externalName}`,
      name: t.displayName ?? t.externalName,
      columns: t.columns as ErpColumn[],
      sampleRows: t.sampleRows,
    }))

    const filtered =
      task === "clean" && tableKey
        ? contextTables.filter((t) => t.key === tableKey)
        : contextTables

    if (task === "clean" && tableKey && filtered.length === 0) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 })
    }

    const result = await runDataPrepAssist(task, {
      tables: filtered.length ? filtered : contextTables,
      relationships: task === "suggest_relationships" ? relationships : undefined,
      instruction,
    })

    return NextResponse.json({ result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Assist failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
