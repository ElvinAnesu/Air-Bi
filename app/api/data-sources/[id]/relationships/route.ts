import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { getTeamDataSourceRow } from "@/lib/server/data-sources/repository"
import {
  createDataSourceRelationship,
  deleteDataSourceRelationship,
  listDataSourceRelationships,
} from "@/lib/server/data-sources/relationships"
import type { JoinType } from "@/lib/server/data-sources/types"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { data: ds } = await getTeamDataSourceRow(auth!.teamId!, id)
  if (!ds) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    const relationships = await listDataSourceRelationships(id)
    return NextResponse.json({ relationships })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load relationships"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { data: ds } = await getTeamDataSourceRow(auth!.teamId!, id)
  if (!ds) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const fromTableId = typeof body.fromTableId === "string" ? body.fromTableId : ""
  const fromColumn = typeof body.fromColumn === "string" ? body.fromColumn.trim() : ""
  const toTableId = typeof body.toTableId === "string" ? body.toTableId : ""
  const toColumn = typeof body.toColumn === "string" ? body.toColumn.trim() : ""
  const joinType: JoinType = body.joinType === "left" ? "left" : "inner"
  const label = typeof body.label === "string" ? body.label.trim() : null

  if (!fromTableId || !fromColumn || !toTableId || !toColumn) {
    return NextResponse.json({ error: "All relationship fields are required" }, { status: 400 })
  }

  try {
    const relationship = await createDataSourceRelationship(id, {
      fromTableId,
      fromColumn,
      toTableId,
      toColumn,
      joinType,
      label,
    })
    return NextResponse.json({ relationship }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create relationship"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse
  const { id } = await params

  const { data: ds } = await getTeamDataSourceRow(auth!.teamId!, id)
  if (!ds) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const relationshipId = req.nextUrl.searchParams.get("relationshipId")?.trim()
  if (!relationshipId) {
    return NextResponse.json({ error: "relationshipId is required" }, { status: 400 })
  }

  try {
    await deleteDataSourceRelationship(id, relationshipId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete relationship"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
