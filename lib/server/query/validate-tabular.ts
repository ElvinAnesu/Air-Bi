import type { ColumnProfile } from "@/lib/server/data-sources/table-profile"
import { isEffectivelyZero, numericEquals, parseLocaleNumber } from "@/lib/server/query/numeric"
import type { TabularFilter, TabularQuery } from "@/lib/server/query/tabular"

const MAX_VIOLATION_SAMPLES = 3

function columnIsNumeric(name: string, profiles: ColumnProfile[]): boolean {
  const p = profiles.find((c) => c.name === name)
  return p?.valueKind === "number" || p?.valueKind === "mixed"
}

function violationSamples(
  rows: Record<string, string | number | null>[],
  column: string,
  predicate: (value: string | number | null) => boolean
): string[] {
  const bad: string[] = []
  for (const row of rows) {
    const v = row[column] ?? null
    if (!predicate(v)) {
      bad.push(`row with ${column}=${JSON.stringify(v)}`)
      if (bad.length >= MAX_VIOLATION_SAMPLES) break
    }
  }
  return bad
}

function validateFilter(
  filter: TabularFilter,
  rows: Record<string, string | number | null>[],
  profiles: ColumnProfile[]
): string[] {
  const errors: string[] = []
  const col = filter.column

  if (rows.length === 0) return errors

  switch (filter.op) {
    case "numeric_zero": {
      const bad = violationSamples(rows, col, (v) => isEffectivelyZero(v))
      if (bad.length) errors.push(`numeric_zero on "${col}" failed: ${bad.join("; ")}`)
      break
    }
    case "numeric_eq": {
      if (filter.value === undefined) break
      const eqValue = filter.value
      const bad = violationSamples(rows, col, (v) => numericEquals(v, eqValue))
      if (bad.length) errors.push(`numeric_eq(${eqValue}) on "${col}" failed: ${bad.join("; ")}`)
      break
    }
    case "numeric_neq": {
      if (filter.value === undefined) break
      const neqValue = filter.value
      const bad = violationSamples(rows, col, (v) => !numericEquals(v, neqValue))
      if (bad.length) errors.push(`numeric_neq(${neqValue}) on "${col}" failed: ${bad.join("; ")}`)
      break
    }
    case "eq": {
      if (
        filter.value !== undefined &&
        columnIsNumeric(col, profiles) &&
        parseLocaleNumber(filter.value) !== null
      ) {
        const eqValue = filter.value
        const bad = violationSamples(rows, col, (v) => numericEquals(v, eqValue))
        if (bad.length) {
          errors.push(
            `eq("${filter.value}") on numeric column "${col}" failed (use numeric_eq or numeric_zero): ${bad.join("; ")}`
          )
        }
      }
      break
    }
    case "contains": {
      if (columnIsNumeric(col, profiles)) {
        errors.push(
          `contains is not allowed on numeric column "${col}" — use numeric_eq / numeric_zero / numeric_gt etc.`
        )
      }
      break
    }
    default:
      break
  }

  return errors
}

export function validateTabularQueryResults(
  query: TabularQuery,
  rows: Record<string, string | number | null>[],
  profiles: ColumnProfile[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const filter of query.filters ?? []) {
    errors.push(...validateFilter(filter, rows, profiles))
  }

  return { valid: errors.length === 0, errors }
}
