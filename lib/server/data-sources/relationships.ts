import { supabaseAdmin } from "@/lib/supabase/admin"
import type { DbDataSourceRelationshipRow, JoinType } from "@/lib/server/data-sources/types"

export type DataSourceRelationshipModel = {
  id: string
  dataSourceId: string
  fromTableId: string
  fromTableName?: string
  fromColumn: string
  toTableId: string
  toTableName?: string
  toColumn: string
  joinType: JoinType
  label?: string
  createdAt: string
}

const SELECT =
  "id, data_source_id, from_table_id, from_column, to_table_id, to_column, join_type, label, created_at"

function mapRow(
  row: DbDataSourceRelationshipRow,
  names?: { from?: string; to?: string }
): DataSourceRelationshipModel {
  return {
    id: row.id,
    dataSourceId: row.data_source_id,
    fromTableId: row.from_table_id,
    fromTableName: names?.from,
    fromColumn: row.from_column,
    toTableId: row.to_table_id,
    toTableName: names?.to,
    toColumn: row.to_column,
    joinType: row.join_type,
    label: row.label ?? undefined,
    createdAt: row.created_at,
  }
}

export async function listDataSourceRelationships(
  dataSourceId: string
): Promise<DataSourceRelationshipModel[]> {
  const { data, error } = await supabaseAdmin
    .from("data_source_relationships")
    .select(SELECT)
    .eq("data_source_id", dataSourceId)
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as DbDataSourceRelationshipRow[]
  if (rows.length === 0) return []

  const tableIds = [...new Set(rows.flatMap((r) => [r.from_table_id, r.to_table_id]))]
  const { data: tables } = await supabaseAdmin
    .from("data_source_tables")
    .select("id, display_name, external_name")
    .in("id", tableIds)

  const nameById = new Map(
    (tables ?? []).map((t) => [
      t.id as string,
      (t.display_name as string) || (t.external_name as string),
    ])
  )

  return rows.map((r) =>
    mapRow(r, {
      from: nameById.get(r.from_table_id),
      to: nameById.get(r.to_table_id),
    })
  )
}

export async function createDataSourceRelationship(
  dataSourceId: string,
  payload: {
    fromTableId: string
    fromColumn: string
    toTableId: string
    toColumn: string
    joinType?: JoinType
    label?: string | null
  }
): Promise<DataSourceRelationshipModel> {
  const { data, error } = await supabaseAdmin
    .from("data_source_relationships")
    .insert({
      data_source_id: dataSourceId,
      from_table_id: payload.fromTableId,
      from_column: payload.fromColumn.trim(),
      to_table_id: payload.toTableId,
      to_column: payload.toColumn.trim(),
      join_type: payload.joinType ?? "inner",
      label: payload.label?.trim() || null,
    })
    .select(SELECT)
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data as DbDataSourceRelationshipRow)
}

export async function deleteDataSourceRelationship(
  dataSourceId: string,
  relationshipId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("data_source_relationships")
    .delete()
    .eq("id", relationshipId)
    .eq("data_source_id", dataSourceId)
  if (error) throw new Error(error.message)
}

export function formatRelationshipsForSchema(
  relationships: DataSourceRelationshipModel[]
): string {
  if (!relationships.length) return ""
  return relationships
    .map((r) => {
      const from = r.fromTableName ?? r.fromTableId
      const to = r.toTableName ?? r.toTableId
      const label = r.label ? ` (${r.label})` : ""
      return `- ${from}.${r.fromColumn} → ${to}.${r.toColumn} [${r.joinType} join]${label}`
    })
    .join("\n")
}
