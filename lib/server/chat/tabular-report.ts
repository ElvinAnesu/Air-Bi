import Anthropic from "@anthropic-ai/sdk"
import { formatColumnProfile, type ColumnProfile } from "@/lib/server/data-sources/table-profile"
import { executeTabularQuery, type TabularQuery } from "@/lib/server/query/tabular"
import { validateTabularQueryResults } from "@/lib/server/query/validate-tabular"
import type { ReportVisualization } from "@/lib/reports/visualization"

export type TabularReportPlan = {
  title: string
  explanation: string
  query: TabularQuery
  visualization?: ReportVisualization
  chartType?: string
}

function formatProfilesForRepair(profiles: ColumnProfile[]): string {
  return profiles.map(formatColumnProfile).join("\n")
}

function detectTaxColumn(profiles: ColumnProfile[]): string | null {
  const ranked = profiles
    .filter((p) => p.valueKind === "number" || p.valueKind === "mixed")
    .map((p) => {
      let score = 0
      if (/vat|tax/i.test(p.name)) score += 10
      if (p.zeroLikeCount && p.zeroLikeCount > 0) score += 3
      if (p.nonZeroNumericCount && p.nonZeroNumericCount > 0) score += 1
      return { name: p.name, score }
    })
    .sort((a, b) => b.score - a.score)
  return ranked[0]?.score >= 10 ? ranked[0].name : null
}

function buildZeroTaxFallbackQuery(
  sourceTable: string,
  profiles: ColumnProfile[]
): TabularQuery | null {
  const taxColumn = detectTaxColumn(profiles)
  if (!taxColumn) return null
  const dateColumn = profiles.find((p) => /date/i.test(p.name))?.name
  return {
    sourceTable,
    filters: [{ column: taxColumn, op: "numeric_zero" }],
    sortBy: dateColumn ? { column: dateColumn, direction: "desc" } : undefined,
    limit: 500,
  }
}

async function repairTabularQuery(
  anthropic: Anthropic,
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  plan: TabularReportPlan,
  profiles: ColumnProfile[],
  validationErrors: string[]
): Promise<TabularReportPlan | null> {
  const repairUser = [
    "Your tabular query produced invalid results. Fix the query JSON only.",
    "",
    "Errors:",
    ...validationErrors.map((e) => `- ${e}`),
    "",
    "Previous query:",
    JSON.stringify(plan.query, null, 2),
    "",
    "Column profiles:",
    formatProfilesForRepair(profiles),
    "",
    'Respond with ONLY valid JSON shaped like: {"type":"report","mode":"tabular","query":{},"explanation":"...","title":"..."}',
    "Use numeric_zero for zero tax/VAT. Never use contains on numeric columns.",
  ].join("\n")

  try {
    const completion = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [...messages, { role: "user", content: repairUser }],
    })
    const rawText = completion.content[0].type === "text" ? completion.content[0].text : ""
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0]) as TabularReportPlan & { type?: string; mode?: string }
    if (!parsed.query) return null
    return {
      title: parsed.title ?? plan.title,
      explanation: parsed.explanation ?? plan.explanation,
      query: parsed.query,
      visualization: parsed.visualization ?? plan.visualization,
      chartType: parsed.chartType,
    }
  } catch {
    return null
  }
}

export async function runTabularReport(
  anthropic: Anthropic,
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  plan: TabularReportPlan,
  rows: Record<string, string | number | null>[],
  profiles: ColumnProfile[],
  userMessage?: string
): Promise<{
  plan: TabularReportPlan
  columns: string[]
  rows: Record<string, string | number | null>[]
  repaired: boolean
}> {
  let currentPlan = plan
  let repaired = false

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = executeTabularQuery(rows, currentPlan.query)
    const validation = validateTabularQueryResults(currentPlan.query, result.rows, profiles)

    if (validation.valid) {
      return {
        plan: currentPlan,
        columns: result.columns,
        rows: result.rows,
        repaired,
      }
    }

    if (attempt === 1) {
      return {
        plan: currentPlan,
        columns: result.columns,
        rows: result.rows,
        repaired,
      }
    }

    const wantsZeroTax = userMessage ? /\b(zero|no)\s+(tax|vat)\b/i.test(userMessage) : false
    if (wantsZeroTax) {
      const fallbackQuery = buildZeroTaxFallbackQuery(
        currentPlan.query.sourceTable,
        profiles
      )
      if (fallbackQuery) {
        const fallbackResult = executeTabularQuery(rows, fallbackQuery)
        const fallbackValidation = validateTabularQueryResults(
          fallbackQuery,
          fallbackResult.rows,
          profiles
        )
        if (fallbackValidation.valid) {
          return {
            plan: {
              ...currentPlan,
              query: fallbackQuery,
              explanation: `Invoices where ${fallbackQuery.filters?.[0]?.column} is numerically zero (excluding values like 642,042.00).`,
            },
            columns: fallbackResult.columns,
            rows: fallbackResult.rows,
            repaired: true,
          }
        }
      }
    }

    const fixed = await repairTabularQuery(
      anthropic,
      systemPrompt,
      messages,
      currentPlan,
      profiles,
      validation.errors
    )
    if (!fixed) {
      return {
        plan: currentPlan,
        columns: result.columns,
        rows: result.rows,
        repaired,
      }
    }
    currentPlan = fixed
    repaired = true
  }

  const fallback = executeTabularQuery(rows, currentPlan.query)
  return {
    plan: currentPlan,
    columns: fallback.columns,
    rows: fallback.rows,
    repaired,
  }
}
