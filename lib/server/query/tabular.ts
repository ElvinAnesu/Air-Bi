import {
  isEffectivelyZero,
  numericEquals,
  parseLocaleNumber,
} from "@/lib/server/query/numeric"

export type TabularFilterOp =
  | "eq"
  | "contains"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "numeric_eq"
  | "numeric_neq"
  | "numeric_zero"
  | "numeric_gt"
  | "numeric_gte"
  | "numeric_lt"
  | "numeric_lte"
  | "is_empty"
  | "is_not_empty"

export type TabularFilter = {
  column: string
  op: TabularFilterOp
  value?: string | number
}

export type TabularAggregation = {
  column: string
  fn: "sum" | "count" | "avg" | "min" | "max"
  alias?: string
}

export type TabularQuery = {
  sourceTable: string
  filters?: TabularFilter[]
  groupBy?: string[]
  aggregations?: TabularAggregation[]
  sortBy?: { column: string; direction: "asc" | "desc" }
  limit?: number
  select?: string[]
}

function compareNumeric(
  raw: string | number | null,
  cmp: string | number,
  op: "gt" | "lt" | "gte" | "lte"
): boolean {
  const a = parseLocaleNumber(raw)
  const b = parseLocaleNumber(cmp)
  if (a === null || b === null) return false
  switch (op) {
    case "gt":
      return a > b
    case "lt":
      return a < b
    case "gte":
      return a >= b
    case "lte":
      return a <= b
  }
}

function applyFilter(
  row: Record<string, string | number | null>,
  filter: TabularFilter
): boolean {
  const raw = row[filter.column]
  const isEmpty = raw === null || raw === undefined || String(raw).trim() === ""

  switch (filter.op) {
    case "is_empty":
      return isEmpty
    case "is_not_empty":
      return !isEmpty
    case "numeric_zero":
      return isEffectivelyZero(raw)
    case "numeric_eq":
      return filter.value !== undefined && numericEquals(raw, filter.value)
    case "numeric_neq":
      return filter.value !== undefined && !numericEquals(raw, filter.value)
    case "numeric_gt":
      return filter.value !== undefined && compareNumeric(raw, filter.value, "gt")
    case "numeric_gte":
      return filter.value !== undefined && compareNumeric(raw, filter.value, "gte")
    case "numeric_lt":
      return filter.value !== undefined && compareNumeric(raw, filter.value, "lt")
    case "numeric_lte":
      return filter.value !== undefined && compareNumeric(raw, filter.value, "lte")
    case "eq": {
      if (filter.value === undefined) return true
      const asNum = parseLocaleNumber(filter.value)
      const cellNum = parseLocaleNumber(raw)
      if (asNum !== null && cellNum !== null) return numericEquals(raw, filter.value)
      return String(raw ?? "").toLowerCase() === String(filter.value).toLowerCase()
    }
    case "contains":
      if (filter.value === undefined) return true
      return String(raw ?? "").toLowerCase().includes(String(filter.value).toLowerCase())
    case "gt":
      return filter.value !== undefined && compareNumeric(raw, filter.value, "gt")
    case "lt":
      return filter.value !== undefined && compareNumeric(raw, filter.value, "lt")
    case "gte":
      return filter.value !== undefined && compareNumeric(raw, filter.value, "gte")
    case "lte":
      return filter.value !== undefined && compareNumeric(raw, filter.value, "lte")
    default:
      return true
  }
}

function aggregateRows(
  rows: Record<string, string | number | null>[],
  groupBy: string[],
  aggregations: TabularAggregation[]
): Record<string, string | number | null>[] {
  const groups = new Map<string, Record<string, string | number | null>[]>()

  for (const row of rows) {
    const key = groupBy.map((col) => String(row[col] ?? "")).join("|||")
    const bucket = groups.get(key) ?? []
    bucket.push(row)
    groups.set(key, bucket)
  }

  const result: Record<string, string | number | null>[] = []
  for (const [, groupRows] of groups) {
    const out: Record<string, string | number | null> = {}
    for (const col of groupBy) {
      out[col] = groupRows[0]?.[col] ?? null
    }
    for (const agg of aggregations) {
      const alias = agg.alias ?? `${agg.fn}_${agg.column}`
      const values = groupRows
        .map((r) => r[agg.column])
        .filter((v) => v !== null && v !== undefined) as Array<string | number>

      if (agg.fn === "count") out[alias] = groupRows.length
      else if (agg.fn === "sum")
        out[alias] = values.reduce<number>((sum, value) => sum + (parseLocaleNumber(value) ?? 0), 0)
      else if (agg.fn === "avg") {
        const nums = values.map((v) => parseLocaleNumber(v)).filter((n): n is number => n !== null)
        out[alias] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
      } else if (agg.fn === "min") {
        const nums = values.map((v) => parseLocaleNumber(v)).filter((n): n is number => n !== null)
        out[alias] = nums.length ? Math.min(...nums) : null
      } else if (agg.fn === "max") {
        const nums = values.map((v) => parseLocaleNumber(v)).filter((n): n is number => n !== null)
        out[alias] = nums.length ? Math.max(...nums) : null
      }
    }
    result.push(out)
  }
  return result
}

export function executeTabularQuery(
  rows: Record<string, string | number | null>[],
  query: TabularQuery
): { columns: string[]; rows: Record<string, string | number | null>[] } {
  let working = [...rows]

  if (query.filters?.length) {
    working = working.filter((row) => query.filters!.every((f) => applyFilter(row, f)))
  }

  if (query.groupBy?.length && query.aggregations?.length) {
    working = aggregateRows(working, query.groupBy, query.aggregations)
  } else if (query.select?.length) {
    working = working.map((row) => {
      const picked: Record<string, string | number | null> = {}
      for (const col of query.select!) picked[col] = row[col] ?? null
      return picked
    })
  }

  if (query.sortBy) {
    const { column, direction } = query.sortBy
    working.sort((a, b) => {
      const av = a[column]
      const bv = b[column]
      const an = parseLocaleNumber(av)
      const bn = parseLocaleNumber(bv)
      const cmp =
        an !== null && bn !== null
          ? an - bn
          : String(av ?? "").localeCompare(String(bv ?? ""))
      return direction === "desc" ? -cmp : cmp
    })
  }

  const limit = query.limit ?? 500
  working = working.slice(0, limit)

  if (working.length === 0) return { columns: [], rows: [] }
  const columns = Object.keys(working[0])
  return { columns, rows: working }
}
