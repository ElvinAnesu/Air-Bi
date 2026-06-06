import {
  isEffectivelyZero,
  looksNumericColumn,
  parseLocaleNumber,
} from "@/lib/server/query/numeric"

export type ColumnValueKind = "number" | "text" | "date" | "boolean" | "mixed"

export type ColumnProfile = {
  name: string
  declaredType?: string
  valueKind: ColumnValueKind
  nullable: boolean
  sampleValues: string[]
  distinctCount: number
  numericMin?: number
  numericMax?: number
  zeroLikeCount?: number
  nonZeroNumericCount?: number
  notes: string[]
}

export type TableProfile = {
  schema: string
  name: string
  rowCount: number
  columns: ColumnProfile[]
}

function truncateSample(value: string, max = 48): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`
}

function inferValueKind(
  values: Array<string | number | null>,
  declaredType?: string
): ColumnValueKind {
  if (looksNumericColumn(values)) return "number"
  const upper = (declaredType ?? "").toUpperCase()
  if (upper.includes("DATE") || upper.includes("TIME")) return "date"
  if (upper.includes("BOOL")) return "boolean"

  const nonEmpty = values.filter((v) => v !== null && v !== undefined && v !== "")
  if (nonEmpty.length === 0) return "text"

  const asNumber = nonEmpty.filter((v) => parseLocaleNumber(v) !== null).length
  if (asNumber > 0 && asNumber < nonEmpty.length * 0.85) return "mixed"
  return "text"
}

export function profileTableColumns(
  rows: Record<string, string | number | null>[],
  declaredColumns?: Array<{ name: string; type?: string }>
): ColumnProfile[] {
  const columnNames =
    declaredColumns?.map((c) => c.name) ??
    (rows.length > 0 ? Object.keys(rows[0]) : [])

  return columnNames.map((name) => {
    const declared = declaredColumns?.find((c) => c.name === name)
    const values = rows.map((r) => r[name] ?? null)
    const nonNull = values.filter((v) => v !== null && v !== undefined && v !== "")
    const distinct = new Set(nonNull.map((v) => String(v)))
    const valueKind = inferValueKind(values, declared?.type)

    const profile: ColumnProfile = {
      name,
      declaredType: declared?.type,
      valueKind,
      nullable: values.some((v) => v === null || v === undefined || v === ""),
      sampleValues: [...distinct].slice(0, 6).map((v) => truncateSample(v)),
      distinctCount: distinct.size,
      notes: [],
    }

    if (valueKind === "number" || valueKind === "mixed") {
      const parsed = values
        .map((v) => parseLocaleNumber(v))
        .filter((n): n is number => n !== null)
      if (parsed.length > 0) {
        profile.numericMin = Math.min(...parsed)
        profile.numericMax = Math.max(...parsed)
        profile.zeroLikeCount = values.filter((v) => isEffectivelyZero(v)).length
        profile.nonZeroNumericCount = parsed.filter((n) => Math.abs(n) > 1e-9).length
      }
      if (valueKind === "mixed") {
        profile.notes.push("Mixed storage: compare/filter using numeric ops, not string contains")
      }
      if (typeof nonNull[0] === "string" && /,/.test(String(nonNull[0]))) {
        profile.notes.push("Values are stored as formatted text with commas — use numeric_* filter ops")
      }
    }

    return profile
  })
}

export function profileTable(
  schema: string,
  name: string,
  rows: Record<string, string | number | null>[],
  declaredColumns?: Array<{ name: string; type?: string }>
): TableProfile {
  return {
    schema,
    name,
    rowCount: rows.length,
    columns: profileTableColumns(rows, declaredColumns),
  }
}

export function formatColumnProfile(col: ColumnProfile): string {
  const parts = [
    `  - ${col.name}`,
    `kind=${col.valueKind}`,
    col.declaredType ? `declared=${col.declaredType}` : null,
    `distinct=${col.distinctCount}`,
    col.nullable ? "nullable" : null,
    col.sampleValues.length ? `samples=[${col.sampleValues.join(" | ")}]` : null,
    col.numericMin != null && col.numericMax != null
      ? `numeric_range=${col.numericMin}..${col.numericMax}`
      : null,
    col.zeroLikeCount != null ? `zero_like_rows=${col.zeroLikeCount}` : null,
    col.nonZeroNumericCount != null ? `non_zero_rows=${col.nonZeroNumericCount}` : null,
    col.notes.length ? `notes=${col.notes.join("; ")}` : null,
  ].filter(Boolean)
  return parts.join(" · ")
}

function formatSampleRows(
  rows: Record<string, string | number | null>[],
  columns: string[],
  maxRows = 6
): string {
  const sample = rows.slice(0, maxRows).map((row) => {
    const out: Record<string, string | number | null> = {}
    for (const col of columns) {
      const v = row[col]
      if (v === null || v === undefined) out[col] = null
      else if (typeof v === "string" && v.length > 60) out[col] = `${v.slice(0, 60)}…`
      else out[col] = v
    }
    return out
  })
  return JSON.stringify(sample, null, 2)
}

export function formatTableContextBlock(
  profile: TableProfile,
  rows: Record<string, string | number | null>[]
): string {
  const fullName = `${profile.schema}.${profile.name}`
  const columnBlock = profile.columns.map(formatColumnProfile).join("\n")
  const columnNames = profile.columns.map((c) => c.name)
  const sampleBlock = formatSampleRows(rows, columnNames)

  return `Table: ${fullName} (${profile.rowCount} rows loaded)
COLUMN PROFILES (ground truth from actual cell values — trust these over declared types):
${columnBlock}

SAMPLE ROWS (actual data from this table):
${sampleBlock}`
}

export function buildProfilesMap(
  tables: Array<{
    table: { external_schema: string; external_name: string; columns_json?: unknown }
    rows: Record<string, string | number | null>[]
  }>
): Map<string, ColumnProfile[]> {
  const map = new Map<string, ColumnProfile[]>()
  for (const { table, rows } of tables) {
    const key = `${table.external_schema}.${table.external_name}`
    const declared = Array.isArray(table.columns_json)
      ? (table.columns_json as Array<{ name: string; type?: string }>)
      : undefined
    map.set(key, profileTableColumns(rows, declared))
  }
  return map
}
