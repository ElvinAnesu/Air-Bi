import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { runDataPrepAssist } from "@/lib/server/data-sources/assist"
import type { ErpColumn } from "@/types"

export async function POST(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  const body = await req.json()
  const task = body.task === "suggest_relationships" ? "suggest_relationships" : "clean"
  const instruction = typeof body.instruction === "string" ? body.instruction.trim() : ""
  const tableKey = typeof body.tableKey === "string" ? body.tableKey.trim() : ""
  const rawTables = Array.isArray(body.tables) ? body.tables : []

  if (!instruction) {
    return NextResponse.json({ error: "instruction is required" }, { status: 400 })
  }

  type AssistTable = {
    key: string
    name: string
    columns: ErpColumn[]
    sampleRows: Record<string, string | number | null>[]
  }

  const tables: AssistTable[] = rawTables
    .map((t: Record<string, unknown>) => ({
      key: typeof t.key === "string" ? t.key : "",
      name: typeof t.name === "string" ? t.name : "",
      columns: Array.isArray(t.columns) ? (t.columns as ErpColumn[]) : [],
      sampleRows: Array.isArray(t.sampleRows)
        ? (t.sampleRows as Record<string, string | number | null>[])
        : [],
    }))
    .filter((t: AssistTable) => t.key)

  try {
    const filtered =
      task === "clean" && tableKey ? tables.filter((t) => t.key === tableKey) : tables

    const result = await runDataPrepAssist(task, {
      tables: filtered.length ? filtered : tables,
      instruction,
    })
    return NextResponse.json({ result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Assist failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
