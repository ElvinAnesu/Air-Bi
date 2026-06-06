import { supabaseAdmin } from "@/lib/supabase/admin"
import { parseExcelSheet } from "@/lib/server/excel/parser"
import {
  captureTableSnapshot,
  getTeamDataSource,
  mapDataSourceTableRow,
} from "@/lib/server/data-sources/repository"
import { applyCleaningTransforms, type TableCleaningConfig } from "@/lib/server/data-sources/transforms"
import type {
  DbDataSourceRow,
  DbWizardSessionRow,
  WizardTableInput,
} from "@/lib/server/data-sources/types"
import type { AuthContext } from "@/lib/supabase/auth"

const TABLE_SELECT =
  "id, data_source_id, external_schema, external_name, display_name, columns_json, sample_rows_json, rows_json, row_count, snapshot_at, cleaning_config_json, created_at"

export async function createWizardExcelSession(
  teamId: string,
  userId: string,
  file: File
): Promise<{ sessionId: string; fileName: string }> {
  const sessionId = crypto.randomUUID()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const storagePath = `${teamId}/wizard/${sessionId}/${safeName}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from("excel-uploads")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: true,
    })
  if (uploadError) throw new Error(uploadError.message)

  const { error } = await supabaseAdmin.from("data_source_wizard_sessions").insert({
    id: sessionId,
    team_id: teamId,
    created_by: userId,
    excel_file_name: file.name,
    excel_storage_path: storagePath,
  })
  if (error) throw new Error(error.message)

  return { sessionId, fileName: file.name }
}

export async function getWizardSession(
  teamId: string,
  sessionId: string
): Promise<DbWizardSessionRow | null> {
  const { data, error } = await supabaseAdmin
    .from("data_source_wizard_sessions")
    .select("id, team_id, created_by, excel_file_name, excel_storage_path, connection_id, expires_at, created_at")
    .eq("id", sessionId)
    .eq("team_id", teamId)
    .single()
  if (error || !data) return null
  return data as DbWizardSessionRow
}

export async function bindWizardConnection(
  teamId: string,
  sessionId: string,
  connectionId: string
): Promise<void> {
  const { data: conn } = await supabaseAdmin
    .from("connections")
    .select("id")
    .eq("id", connectionId)
    .eq("team_id", teamId)
    .single()
  if (!conn) throw new Error("Connection not found")

  const { error } = await supabaseAdmin
    .from("data_source_wizard_sessions")
    .update({ connection_id: connectionId })
    .eq("id", sessionId)
    .eq("team_id", teamId)
  if (error) throw new Error(error.message)
}

export async function previewWizardTable(
  teamId: string,
  sourceKind: "excel" | "connection",
  opts: {
    excelStoragePath?: string | null
    connectionId?: string | null
    externalSchema: string
    externalName: string
    cleaning?: TableCleaningConfig | null
  }
) {
  if (sourceKind === "excel") {
    if (!opts.excelStoragePath) throw new Error("Excel file not uploaded")
    const { data: fileData, error } = await supabaseAdmin.storage
      .from("excel-uploads")
      .download(opts.excelStoragePath)
    if (error || !fileData) throw new Error(error?.message ?? "Failed to load Excel file")
    const buffer = Buffer.from(await fileData.arrayBuffer())
    const parsed = parseExcelSheet(buffer, opts.externalName)
    const columns = parsed.columns.map((c) => ({ name: c.name, type: c.type }))
    const cleaned = applyCleaningTransforms(columns, parsed.rows, opts.cleaning)
    return {
      columns: cleaned.columns,
      rows: cleaned.rows,
      sampleRows: cleaned.rows.slice(0, 20),
      rowCount: cleaned.rows.length,
    }
  }

  if (!opts.connectionId) throw new Error("Connection is required")
  const draftSource: DbDataSourceRow = {
    id: "wizard",
    team_id: teamId,
    created_by: "",
    name: "",
    description: null,
    source_kind: "connection",
    connection_id: opts.connectionId,
    excel_file_name: null,
    excel_storage_path: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const snapshot = await captureTableSnapshot(
    teamId,
    draftSource,
    opts.externalSchema,
    opts.externalName
  )
  const cleaned = applyCleaningTransforms(snapshot.columns, snapshot.rows, opts.cleaning)
  return {
    columns: cleaned.columns,
    rows: cleaned.rows,
    sampleRows: cleaned.rows.slice(0, 20),
    rowCount: cleaned.rows.length,
  }
}

export async function finalizeWizardDataSource(
  auth: AuthContext,
  payload: {
    name: string
    description?: string | null
    sourceKind: "excel" | "connection"
    connectionId?: string | null
    wizardSessionId?: string | null
    tables: WizardTableInput[]
  }
) {
  const name = payload.name.trim()
  if (!name) throw new Error("Name is required")
  if (!payload.tables.length) throw new Error("Select at least one table")

  let excelFileName: string | null = null
  let excelStoragePath: string | null = null
  let connectionId: string | null = null

  if (payload.sourceKind === "excel") {
    if (!payload.wizardSessionId) throw new Error("Wizard session is required for Excel")
    const session = await getWizardSession(auth.teamId!, payload.wizardSessionId)
    if (!session?.excel_storage_path) throw new Error("Excel upload session expired")
    excelFileName = session.excel_file_name
    excelStoragePath = session.excel_storage_path
  } else {
    connectionId = payload.connectionId ?? null
    if (!connectionId) throw new Error("Connection is required")
    const { data: conn } = await supabaseAdmin
      .from("connections")
      .select("id")
      .eq("id", connectionId)
      .eq("team_id", auth.teamId)
      .single()
    if (!conn) throw new Error("Connection not found")
  }

  const { data: dsRow, error: dsError } = await supabaseAdmin
    .from("data_sources")
    .insert({
      team_id: auth.teamId,
      created_by: auth.user.id,
      name,
      description: payload.description ?? null,
      source_kind: payload.sourceKind,
      connection_id: payload.sourceKind === "connection" ? connectionId : null,
      excel_file_name: excelFileName,
      excel_storage_path: excelStoragePath,
    })
    .select("id, team_id, created_by, name, description, source_kind, connection_id, excel_file_name, excel_storage_path, created_at, updated_at")
    .single()

  if (dsError || !dsRow) throw new Error(dsError?.message ?? "Failed to create data source")

  const dataSource = dsRow as DbDataSourceRow
  const now = new Date().toISOString()

  for (const table of payload.tables) {
    let columns: import("@/types").ErpColumn[]
    let rows: Record<string, string | number | null>[]

    if (table.preparedRows && table.preparedColumns?.length) {
      columns = table.preparedColumns.map((c) => ({ name: c.name, type: c.type }))
      rows = table.preparedRows
    } else {
      const snapshot = await captureTableSnapshot(
        auth.teamId!,
        dataSource,
        table.externalSchema,
        table.externalName
      )
      const cleaned = applyCleaningTransforms(snapshot.columns, snapshot.rows, table.cleaning)
      columns = cleaned.columns
      rows = cleaned.rows
    }

    const { error: tableError } = await supabaseAdmin.from("data_source_tables").insert({
      data_source_id: dataSource.id,
      external_schema: table.externalSchema,
      external_name: table.externalName,
      display_name: table.displayName?.trim() || table.externalName,
      columns_json: columns,
      sample_rows_json: rows.slice(0, 10),
      rows_json: rows,
      row_count: rows.length,
      snapshot_at: now,
      cleaning_config_json: table.cleaning ?? null,
    })
    if (tableError) throw new Error(tableError.message)
  }

  if (payload.wizardSessionId) {
    await supabaseAdmin
      .from("data_source_wizard_sessions")
      .delete()
      .eq("id", payload.wizardSessionId)
      .eq("team_id", auth.teamId)
  }

  const source = await getTeamDataSource(auth.teamId!, dataSource.id)
  const { data: insertedTables } = await supabaseAdmin
    .from("data_source_tables")
    .select(TABLE_SELECT)
    .eq("data_source_id", dataSource.id)

  return {
    source,
    tables: ((insertedTables ?? []) as import("@/lib/server/data-sources/types").DbDataSourceTableRow[]).map(
      mapDataSourceTableRow
    ),
  }
}
