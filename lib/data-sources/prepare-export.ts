import type { TableDraft } from "@/lib/context/data-source-wizard-context"

export function exportPreparedTable(draft: TableDraft) {
  const preparedColumns = draft.preparedColumns ?? []
  const preparedRows = (draft.preparedRows ?? []).map((row) => {
    const out: Record<string, string | number | null> = {}
    for (const col of preparedColumns) {
      out[col.name] = row[col.name] ?? null
    }
    return out
  })

  return { preparedColumns, preparedRows }
}
