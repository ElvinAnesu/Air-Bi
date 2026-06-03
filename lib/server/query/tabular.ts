export type TabularFilter = {
  column: string
  op: "eq" | "contains" | "gt" | "lt" | "gte" | "lte"
  value: string | number
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

function applyFilter(
  row: Record<string, string | number | null>,
  filter: TabularFilter
): boolean {
  const raw = row[filter.column]
  const value = raw === null || raw === undefined ? "" : raw
  const cmp = filter.value

  switch (filter.op) {
    case "eq":
      return String(value).toLowerCase() === String(cmp).toLowerCase()
    case "contains":
      return String(value).toLowerCase().includes(String(cmp).toLowerCase())
    case "gt":
      return Number(value) > Number(cmp)
    case "lt":
      return Number(value) < Number(cmp)
    case "gte":
      return Number(value) >= Number(cmp)
    case "lte":
      return Number(value) <= Number(cmp)
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
        out[alias] = values.reduce<number>((sum, value) => sum + Number(value), 0)
      else if (agg.fn === "avg")
        out[alias] = values.length
          ? values.reduce<number>((sum, value) => sum + Number(value), 0) / values.length
          : 0
      else if (agg.fn === "min")
        out[alias] = values.length ? Math.min(...values.map(Number)) : null
      else if (agg.fn === "max")
        out[alias] = values.length ? Math.max(...values.map(Number)) : null
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
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
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
