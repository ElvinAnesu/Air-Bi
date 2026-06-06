/** Parse numbers from ERP/Excel cells (commas, currency symbols, whitespace). */
export function parseLocaleNumber(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null

  const trimmed = String(raw).trim()
  if (!trimmed) return null

  const negative = trimmed.startsWith("(") && trimmed.endsWith(")")
  const cleaned = trimmed
    .replace(/^\(|\)$/g, "")
    .replace(/[,$\s]/g, "")
    .replace(/[^0-9.\-+eE]/g, "")

  if (!cleaned || cleaned === "-" || cleaned === ".") return null

  const n = Number(cleaned)
  if (!Number.isFinite(n)) return null
  return negative ? -n : n
}

export function isEffectivelyZero(raw: string | number | null | undefined, epsilon = 1e-9): boolean {
  const n = parseLocaleNumber(raw)
  return n !== null && Math.abs(n) <= epsilon
}

export function numericEquals(
  raw: string | number | null | undefined,
  target: string | number
): boolean {
  const a = parseLocaleNumber(raw)
  const b = parseLocaleNumber(target)
  if (a === null || b === null) return false
  return Math.abs(a - b) < 1e-9
}

export function looksNumericColumn(values: Array<string | number | null>): boolean {
  let numeric = 0
  let nonEmpty = 0
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue
    nonEmpty++
    if (parseLocaleNumber(v) !== null) numeric++
  }
  return nonEmpty > 0 && numeric / nonEmpty >= 0.85
}
