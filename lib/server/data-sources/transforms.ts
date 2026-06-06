import type { ErpColumn } from "@/types"

export type ColumnTransform =
  | { op: "rename"; from: string; to: string }
  | { op: "drop_column"; column: string }
  | { op: "trim"; column: string }
  | { op: "filter_empty_rows" }
  | {
      op: "filter"
      column: string
      operator: "eq" | "neq" | "contains" | "not_empty"
      value?: string
    }

export type TableCleaningConfig = {
  transforms: ColumnTransform[]
}

export function applyCleaningTransforms(
  columns: ErpColumn[],
  rows: Record<string, string | number | null>[],
  config?: TableCleaningConfig | null
): { columns: ErpColumn[]; rows: Record<string, string | number | null>[] } {
  if (!config?.transforms?.length) {
    return { columns, rows }
  }

  let cols = [...columns]
  let data = rows.map((r) => ({ ...r }))

  for (const t of config.transforms) {
    if (t.op === "rename") {
      const from = t.from.trim()
      const to = t.to.trim()
      if (!from || !to || from === to) continue
      cols = cols.map((c) => (c.name === from ? { ...c, name: to } : c))
      data = data.map((row) => {
        if (!(from in row)) return row
        const next = { ...row }
        next[to] = next[from]
        delete next[from]
        return next
      })
    } else if (t.op === "drop_column") {
      const col = t.column.trim()
      if (!col) continue
      cols = cols.filter((c) => c.name !== col)
      data = data.map((row) => {
        const next = { ...row }
        delete next[col]
        return next
      })
    } else if (t.op === "trim") {
      const col = t.column.trim()
      if (!col) continue
      data = data.map((row) => {
        const v = row[col]
        if (typeof v === "string") return { ...row, [col]: v.trim() }
        return row
      })
    } else if (t.op === "filter_empty_rows") {
      data = data.filter((row) =>
        Object.values(row).some((v) => v !== null && v !== undefined && String(v).trim() !== "")
      )
    } else if (t.op === "filter") {
      const col = t.column.trim()
      if (!col) continue
      data = data.filter((row) => {
        const v = row[col]
        const s = v === null || v === undefined ? "" : String(v)
        switch (t.operator) {
          case "not_empty":
            return s.trim() !== ""
          case "eq":
            return s === (t.value ?? "")
          case "neq":
            return s !== (t.value ?? "")
          case "contains":
            return s.toLowerCase().includes((t.value ?? "").toLowerCase())
          default:
            return true
        }
      })
    }
  }

  const colNames = new Set(cols.map((c) => c.name))
  data = data.map((row) => {
    const next: Record<string, string | number | null> = {}
    for (const c of cols) {
      if (c.name in row) next[c.name] = row[c.name] ?? null
    }
    for (const key of Object.keys(row)) {
      if (colNames.has(key) && !(key in next)) next[key] = row[key] ?? null
    }
    return next
  })

  return { columns: cols, rows: data }
}
