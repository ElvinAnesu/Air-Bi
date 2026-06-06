import type { ErpColumn } from "@/types"
import type { TableCleaningConfig } from "@/lib/server/data-sources/transforms"

export type DataSourceKind = "connection" | "excel"

export type JoinType = "inner" | "left"

export type DbDataSourceRelationshipRow = {
  id: string
  data_source_id: string
  from_table_id: string
  from_column: string
  to_table_id: string
  to_column: string
  join_type: JoinType
  label: string | null
  created_at: string
}

export type DbWizardSessionRow = {
  id: string
  team_id: string
  created_by: string
  excel_file_name: string | null
  excel_storage_path: string | null
  connection_id: string | null
  expires_at: string
  created_at: string
}

export type DbDataSourceRow = {
  id: string
  team_id: string
  created_by: string
  name: string
  description: string | null
  source_kind: DataSourceKind
  connection_id: string | null
  excel_file_name: string | null
  excel_storage_path: string | null
  created_at: string
  updated_at: string
}

export type DbDataSourceTableRow = {
  id: string
  data_source_id: string
  external_schema: string
  external_name: string
  display_name: string | null
  columns_json: ErpColumn[]
  sample_rows_json: Record<string, string | number | null>[]
  rows_json: Record<string, string | number | null>[]
  row_count: number
  snapshot_at: string | null
  cleaning_config_json: TableCleaningConfig | null
  created_at: string
}

export type WizardTableInput = {
  externalSchema: string
  externalName: string
  displayName?: string
  cleaning?: TableCleaningConfig | null
  /** When set, import uses user-edited snapshot instead of re-fetching from source */
  preparedColumns?: Array<{ name: string; type: string }>
  preparedRows?: Record<string, string | number | null>[]
}

export type DataSourceTableSnapshot = {
  columns: ErpColumn[]
  sampleRows: Record<string, string | number | null>[]
  rows: Record<string, string | number | null>[]
  rowCount: number
}
