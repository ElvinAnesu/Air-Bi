const SMARTSHEET_BASE = "https://api.smartsheet.com/2.0"

export type SmartsheetColumn = {
  id: number
  title: string
  type: string
  primary?: boolean
}

export type SmartsheetSheetSummary = {
  id: string
  name: string
  schema: string
  description: string
}

export type SmartsheetSheetData = {
  id: string
  name: string
  columns: Array<{ name: string; type: string }>
  rows: Record<string, string | number | null>[]
}

async function smartsheetFetch<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${SMARTSHEET_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `Smartsheet API error (${res.status})`)
  }
  return res.json() as Promise<T>
}

export async function testSmartsheetConnection(token: string): Promise<void> {
  await smartsheetFetch<{ email: string }>(token, "/users/me")
}

export async function listSmartsheetSheets(token: string): Promise<SmartsheetSheetSummary[]> {
  const me = await smartsheetFetch<{ id: number; email: string }>(token, "/users/me")
  const result = await smartsheetFetch<{ data: Array<{ id: number; name: string }> }>(
    token,
    `/users/${me.id}/sheets`
  )
  return (result.data ?? []).map((sheet) => ({
    id: String(sheet.id),
    name: sheet.name,
    schema: "smartsheet",
    description: `Smartsheet: ${sheet.name}`,
  }))
}

export async function getSmartsheetSheetData(
  token: string,
  sheetId: string,
  rowLimit = 5000
): Promise<SmartsheetSheetData> {
  const sheet = await smartsheetFetch<{
    id: number
    name: string
    columns: SmartsheetColumn[]
    rows: Array<{ cells: Array<{ columnId: number; value: unknown }> }>
  }>(token, `/sheets/${sheetId}`)

  const colMap = new Map<number, SmartsheetColumn>()
  for (const col of sheet.columns ?? []) {
    colMap.set(col.id, col)
  }

  const columns = (sheet.columns ?? []).map((col) => ({
    name: col.title,
    type: col.type ?? "TEXT",
  }))

  const rows: Record<string, string | number | null>[] = []
  for (const row of (sheet.rows ?? []).slice(0, rowLimit)) {
    const record: Record<string, string | number | null> = {}
    for (const cell of row.cells ?? []) {
      const col = colMap.get(cell.columnId)
      if (!col) continue
      const value = cell.value
      if (value === null || value === undefined) record[col.title] = null
      else if (typeof value === "number") record[col.title] = value
      else record[col.title] = String(value)
    }
    rows.push(record)
  }

  return {
    id: String(sheet.id),
    name: sheet.name,
    columns,
    rows,
  }
}

export async function countSmartsheetSheets(token: string): Promise<number> {
  const sheets = await listSmartsheetSheets(token)
  return sheets.length
}
