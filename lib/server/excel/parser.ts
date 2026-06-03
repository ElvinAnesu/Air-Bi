import * as XLSX from "xlsx"

export type ExcelSheetSummary = {
  id: string
  name: string
  schema: string
  description: string
}

export type ExcelSheetData = {
  name: string
  columns: Array<{ name: string; type: string }>
  rows: Record<string, string | number | null>[]
}

const MAX_ROWS = 5000

function inferType(values: unknown[]): string {
  const sample = values.find((v) => v !== null && v !== undefined && v !== "")
  if (sample === undefined) return "TEXT"
  if (typeof sample === "number") return "NUMBER"
  if (sample instanceof Date) return "DATE"
  return "TEXT"
}

function normalizeCell(value: unknown): string | number | null {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "number") return value
  if (value instanceof Date) return value.toISOString().split("T")[0]
  return String(value)
}

export function listExcelSheets(buffer: Buffer): ExcelSheetSummary[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true })
  return workbook.SheetNames.map((name) => ({
    id: name,
    name,
    schema: "excel",
    description: `Excel sheet: ${name}`,
  }))
}

export function parseExcelSheet(buffer: Buffer, sheetName: string): ExcelSheetData {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true })
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found`)

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false,
  })

  const limited = rawRows.slice(0, MAX_ROWS)
  const columnNames = new Set<string>()
  for (const row of limited) {
    for (const key of Object.keys(row)) columnNames.add(key)
  }

  const columns = Array.from(columnNames).map((name) => {
    const values = limited.map((row) => row[name])
    return { name, type: inferType(values) }
  })

  const rows = limited.map((row) => {
    const record: Record<string, string | number | null> = {}
    for (const col of columns) {
      record[col.name] = normalizeCell(row[col.name])
    }
    return record
  })

  return { name: sheetName, columns, rows }
}

export function parseAllExcelSheets(buffer: Buffer): ExcelSheetData[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true })
  return workbook.SheetNames.map((name) => parseExcelSheet(buffer, name))
}
