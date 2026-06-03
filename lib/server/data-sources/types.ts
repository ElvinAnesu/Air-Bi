import type { ErpColumn } from "@/types"

export type DataSourceKind = "connection" | "excel"

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
  created_at: string
}

export type DataSourceTableSnapshot = {
  columns: ErpColumn[]
  sampleRows: Record<string, string | number | null>[]
  rows: Record<string, string | number | null>[]
  rowCount: number
}
