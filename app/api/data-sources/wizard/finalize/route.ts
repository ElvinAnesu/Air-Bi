import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/supabase/auth"
import { planLimitResponse } from "@/lib/server/billing/enforce"
import { finalizeWizardDataSource } from "@/lib/server/data-sources/wizard"
import type { WizardTableInput } from "@/lib/server/data-sources/types"
import type { TableCleaningConfig } from "@/lib/server/data-sources/transforms"

export async function POST(req: NextRequest) {
  const { auth, errorResponse } = await requireAuth(req)
  if (errorResponse) return errorResponse

  const limitResponse = await planLimitResponse(auth!, "data_sources")
  if (limitResponse) return limitResponse

  const body = await req.json()
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const description = typeof body.description === "string" ? body.description.trim() : null
  const sourceKind = body.sourceKind === "excel" ? "excel" : "connection"
  const connectionId = typeof body.connectionId === "string" ? body.connectionId : null
  const wizardSessionId = typeof body.wizardSessionId === "string" ? body.wizardSessionId : null
  const rawTables = Array.isArray(body.tables) ? body.tables : []

  const tables: WizardTableInput[] = rawTables
    .map((t: Record<string, unknown>) => {
      const preparedRows = Array.isArray(t.preparedRows) ? t.preparedRows : undefined
      const preparedColumns = Array.isArray(t.preparedColumns) ? t.preparedColumns : undefined
      return {
        externalSchema: typeof t.externalSchema === "string" ? t.externalSchema.trim() : "excel",
        externalName: typeof t.externalName === "string" ? t.externalName.trim() : "",
        displayName: typeof t.displayName === "string" ? t.displayName.trim() : undefined,
        cleaning: (t.cleaning as TableCleaningConfig | null) ?? null,
        preparedColumns: preparedColumns as WizardTableInput["preparedColumns"],
        preparedRows: preparedRows as WizardTableInput["preparedRows"],
      }
    })
    .filter((t: WizardTableInput) => t.externalName)

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }
  if (!tables.length) {
    return NextResponse.json({ error: "Select at least one table" }, { status: 400 })
  }

  try {
    const result = await finalizeWizardDataSource(auth!, {
      name,
      description,
      sourceKind,
      connectionId,
      wizardSessionId,
      tables,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create data source"
    if (message.includes("Plan limit")) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
