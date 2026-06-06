import Anthropic from "@anthropic-ai/sdk"
import type { ErpColumn } from "@/types"
import type { TableCleaningConfig, ColumnTransform } from "@/lib/server/data-sources/transforms"
import type { DataSourceRelationshipModel } from "@/lib/server/data-sources/relationships"

export type AssistTask = "clean" | "suggest_relationships"

export type AssistContext = {
  tables: Array<{
    key: string
    name: string
    columns: ErpColumn[]
    sampleRows: Record<string, string | number | null>[]
  }>
  relationships?: DataSourceRelationshipModel[]
  instruction: string
}

export type AssistCleanResult = {
  type: "clean"
  message: string
  tableKey: string
  cleaning: TableCleaningConfig
}

export type AssistRelationshipsResult = {
  type: "relationships"
  message: string
  suggestions: Array<{
    fromTableKey: string
    fromColumn: string
    toTableKey: string
    toColumn: string
    joinType: "inner" | "left"
    label?: string
  }>
}

export type AssistResult = AssistCleanResult | AssistRelationshipsResult | { type: "message"; message: string }

export async function runDataPrepAssist(
  task: AssistTask,
  context: AssistContext
): Promise<AssistResult> {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) throw new Error("Claude API key not configured")

  const tableSummaries = context.tables
    .map((t) => {
      const cols = t.columns.map((c) => `${c.name} (${c.type})`).join(", ")
      const sample = JSON.stringify(t.sampleRows.slice(0, 5))
      return `Table key: ${t.key}\nName: ${t.name}\nColumns: ${cols}\nSample rows: ${sample}`
    })
    .join("\n\n")

  const system =
    task === "clean"
      ? `You are a data preparation assistant. Suggest column cleaning transforms for ONE table.
Respond ONLY with JSON:
{
  "type": "clean",
  "message": "brief explanation",
  "tableKey": "exact table key from context",
  "cleaning": {
    "transforms": [
      { "op": "rename", "from": "Old", "to": "New" },
      { "op": "drop_column", "column": "Col" },
      { "op": "trim", "column": "Col" },
      { "op": "filter_empty_rows" },
      { "op": "filter", "column": "Col", "operator": "eq|neq|contains|not_empty", "value": "..." }
    ]
  }
}
Use only transforms needed for the user's instruction. Use exact column names.`
      : `You are a data modeling assistant. Suggest join relationships between curated tables.
Respond ONLY with JSON:
{
  "type": "relationships",
  "message": "brief explanation",
  "suggestions": [
    {
      "fromTableKey": "schema.name",
      "fromColumn": "Col",
      "toTableKey": "schema.name2",
      "toColumn": "Col2",
      "joinType": "inner",
      "label": "optional label"
    }
  ]
}
Use exact table keys and column names from context. joinType must be inner or left.`

  const anthropic = new Anthropic({ apiKey })
  const completion = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system,
    messages: [
      {
        role: "user",
        content: `Tables:\n${tableSummaries}\n\nUser instruction: ${context.instruction}`,
      },
    ],
  })

  const text = completion.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { type: "message", message: text.trim() || "No structured response" }
  }

  const parsed = JSON.parse(jsonMatch[0]) as AssistResult & { cleaning?: { transforms?: ColumnTransform[] } }

  if (parsed.type === "clean" && parsed.cleaning?.transforms) {
    return {
      type: "clean",
      message: parsed.message ?? "",
      tableKey: parsed.tableKey,
      cleaning: { transforms: parsed.cleaning.transforms },
    }
  }

  if (parsed.type === "relationships" && Array.isArray((parsed as AssistRelationshipsResult).suggestions)) {
    return parsed as AssistRelationshipsResult
  }

  return { type: "message", message: parsed.message ?? text }
}
