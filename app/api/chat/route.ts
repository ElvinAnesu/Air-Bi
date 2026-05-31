import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireAuth } from "@/lib/supabase/auth"
import { getTeamMssqlConnection } from "@/lib/server/connections/repository"
import { getMssqlTablePreview } from "@/lib/server/mssql/client"
import sql from "mssql"
import type { MssqlConnectionConfig } from "@/lib/server/connections/types"

type SelectedTable = { schema: string; name: string }

type ChatRequestBody = {
  message: string
  connectionId: string
  selectedTables: SelectedTable[]
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
}

type ClaudeClarifyResponse = {
  type: "clarify"
  message: string
  questions: string[]
}

type ClaudeReportResponse = {
  type: "report"
  sql: string
  explanation: string
  chartType: "bar" | "pie" | "line" | "table"
  title: string
}

type ClaudeResponse = ClaudeClarifyResponse | ClaudeReportResponse

function poolConfig(config: MssqlConnectionConfig) {
  return {
    server: config.server,
    database: config.database,
    user: config.user,
    password: config.password,
    port: config.port ?? 1433,
    options: { encrypt: true, trustServerCertificate: true },
    connectionTimeout: 20_000,
    requestTimeout: 60_000,
  }
}

async function runSql(
  config: MssqlConnectionConfig,
  query: string
): Promise<{ columns: string[]; rows: Record<string, string | number | null>[] }> {
  const pool = await sql.connect(poolConfig(config))
  try {
    const result = await pool.request().query(query)
    const recordset = result.recordset as Record<string, unknown>[]
    if (!recordset || recordset.length === 0) return { columns: [], rows: [] }
    const columns = Object.keys(recordset[0])
    const rows = recordset.map((row) => {
      const normalized: Record<string, string | number | null> = {}
      for (const [key, value] of Object.entries(row)) {
        if (value === null || value === undefined) normalized[key] = null
        else if (typeof value === "number") normalized[key] = value
        else if (value instanceof Date) normalized[key] = value.toISOString().split("T")[0]
        else normalized[key] = String(value)
      }
      return normalized
    })
    return { columns, rows }
  } finally {
    await pool.close()
  }
}

export async function POST(request: NextRequest) {
  const { auth, errorResponse } = await requireAuth(request)
  if (errorResponse) return errorResponse

  const body = (await request.json()) as ChatRequestBody
  const { message, connectionId, selectedTables, conversationHistory = [] } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 })
  }
  if (!connectionId) {
    return NextResponse.json({ error: "No database connection selected" }, { status: 400 })
  }

  const stored = await getTeamMssqlConnection(auth!.teamId!, connectionId)
  if (!stored) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 })
  }

  // Fetch schemas for selected tables
  let schemaContext = ""
  if (selectedTables.length > 0) {
    const tableSchemas = await Promise.all(
      selectedTables.map(async (t) => {
        try {
          const table = await getMssqlTablePreview(stored, t.schema, t.name)
          const colList = table.columns
            .map((c) => `  - ${c.name} (${c.type}${c.description === "Nullable" ? ", nullable" : ""})`)
            .join("\n")
          return `Table: [${t.schema}].[${t.name}]\nColumns:\n${colList}`
        } catch {
          return `Table: [${t.schema}].[${t.name}] (schema unavailable)`
        }
      })
    )
    schemaContext = tableSchemas.join("\n\n")
  }

  // Detect whether the user is clearly answering a previous clarification round
  const isAnsweringClarification =
    conversationHistory.length >= 2 &&
    conversationHistory[conversationHistory.length - 1].role === "assistant" &&
    conversationHistory[conversationHistory.length - 1].content.includes("?")

  const systemPrompt = `You are an expert SQL analyst for enterprise ERP and business databases on Microsoft SQL Server.
The user has connected a database${schemaContext ? " and selected the following tables as context" : ""}.

${schemaContext ? `DATABASE SCHEMA:\n${schemaContext}` : "No specific tables were selected. Use your best judgment based on the user's question."}

## YOUR JOB

Decide whether you have ENOUGH information to write an accurate, non-hallucinated SQL query.

### When to ask clarifying questions (type: "clarify")
Ask ONLY when one or more of these critical details are missing and cannot be safely assumed:
- Date range or time period (e.g. "this month" is OK to assume as current month; "recently" is not clear enough)
- Specific filter values you cannot infer (e.g. a specific warehouse code, customer segment, product category)
- Ambiguous metric (e.g. "revenue" could mean DocTotal, LineTotal, net amount — ask which column)
- Grouping or breakdown dimension that is unclear
- Whether the user wants a summary or row-level detail

Do NOT ask questions if:
- The conversation history already contains the answers
- The user is clearly answering your previous questions
- The request is straightforward and the schema makes the intent obvious
- You have enough context to make a reasonable, non-hallucinated query

Ask a maximum of 3 short, specific questions. Never ask for information you already have.

### When to generate the report (type: "report")
- You have all the information needed
- The user just answered your previous clarifying questions
- The request is clear enough to write a confident, accurate query

## RESPONSE FORMAT

Respond ONLY with valid JSON — no markdown, no extra text.

If you need clarification:
{
  "type": "clarify",
  "message": "One sentence explaining what you need before generating the report.",
  "questions": ["Specific question 1?", "Specific question 2?"]
}

If you are ready to generate:
{
  "type": "report",
  "sql": "SELECT ...",
  "explanation": "Plain English explanation of what the data shows.",
  "chartType": "bar",
  "title": "Short report title"
}

SQL rules:
- SELECT only — no INSERT, UPDATE, DELETE, DROP, DDL
- Valid T-SQL syntax (GETDATE(), TOP N, etc.)
- Use exact column names from the schema
- Use TOP 500 or similar limits unless the user asks for all rows
- Always use bracket-quoted identifiers: [schema].[table]

chartType must be one of: "bar", "pie", "line", "table"
- "table" → detail rows
- "bar" → comparisons across categories
- "pie" → proportions of a whole
- "line" → trends over time`

  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Claude API key not configured" }, { status: 500 })
  }

  const anthropic = new Anthropic({ apiKey })

  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: message },
  ]

  let claudeResponse: ClaudeResponse
  try {
    const completion = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    })

    const rawText = completion.content[0].type === "text" ? completion.content[0].text : ""
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: "Claude returned an unexpected response" }, { status: 502 })
    }
    claudeResponse = JSON.parse(jsonMatch[0]) as ClaudeResponse
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Claude API error"
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // ── Clarify response — return questions to the client, no SQL execution ──
  if (claudeResponse.type === "clarify") {
    const questionList = claudeResponse.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")
    const fullMessage = `${claudeResponse.message}\n\n${questionList}`
    return NextResponse.json({ type: "clarify", message: fullMessage })
  }

  // ── Report response — execute SQL ────────────────────────────────────────
  let queryResult: { columns: string[]; rows: Record<string, string | number | null>[] }
  try {
    queryResult = await runSql(stored, claudeResponse.sql)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "SQL execution failed"
    return NextResponse.json(
      {
        type: "report",
        error: `SQL execution failed: ${errMsg}`,
        sql: claudeResponse.sql,
        explanation: claudeResponse.explanation,
        title: claudeResponse.title,
      },
      { status: 422 }
    )
  }

  return NextResponse.json({
    type: "report",
    title: claudeResponse.title,
    explanation: claudeResponse.explanation,
    sql: claudeResponse.sql,
    chartType: claudeResponse.chartType,
    columns: queryResult.columns,
    rows: queryResult.rows,
    rowCount: queryResult.rows.length,
  })
}
