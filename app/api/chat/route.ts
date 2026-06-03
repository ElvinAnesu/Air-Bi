import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireAuth } from "@/lib/supabase/auth"
import { getTeamConnectionRow, getTeamMssqlConnection, type DbConnectionRow } from "@/lib/server/connections/repository"
import {
  fetchLiveTableRows,
  getDataSourceTableRow,
  getTeamDataSourceRow,
  isLiveConnection,
  listDataSourceTables,
} from "@/lib/server/data-sources/repository"
import { executeTabularQuery, type TabularQuery } from "@/lib/server/query/tabular"
import type { DbDataSourceRow, DbDataSourceTableRow } from "@/lib/server/data-sources/types"
import sql from "mssql"
import type { MssqlConnectionConfig } from "@/lib/server/connections/types"

type SelectedTable = { id?: string; schema: string; name: string }

type ChatRequestBody = {
  message: string
  dataSourceId?: string
  connectionId?: string
  selectedTables: SelectedTable[]
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
}

type ClaudeClarifyResponse = {
  type: "clarify"
  message: string
  questions: string[]
}

type ClaudeSqlReportResponse = {
  type: "report"
  mode?: "sql"
  sql: string
  explanation: string
  chartType: "bar" | "pie" | "line" | "table"
  title: string
}

type ClaudeTabularReportResponse = {
  type: "report"
  mode: "tabular"
  query: TabularQuery
  explanation: string
  chartType: "bar" | "pie" | "line" | "table"
  title: string
}

type ClaudeResponse = ClaudeClarifyResponse | ClaudeSqlReportResponse | ClaudeTabularReportResponse

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

async function resolveDataSource(teamId: string, dataSourceId?: string, connectionId?: string) {
  if (dataSourceId) {
    const { data, error } = await getTeamDataSourceRow(teamId, dataSourceId)
    if (error || !data) return null
    return data as DbDataSourceRow
  }

  if (connectionId) {
    const { supabaseAdmin } = await import("@/lib/supabase/admin")
    const { data: byConn } = await supabaseAdmin
      .from("data_sources")
      .select("id, team_id, created_by, name, description, source_kind, connection_id, excel_file_name, excel_storage_path, created_at, updated_at")
      .eq("team_id", teamId)
      .eq("connection_id", connectionId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (byConn) return byConn as DbDataSourceRow
  }

  return null
}

async function loadSelectedTableRows(
  teamId: string,
  dataSource: DbDataSourceRow,
  connection: DbConnectionRow | null,
  selected: SelectedTable[]
): Promise<Array<{ table: DbDataSourceTableRow; rows: Record<string, string | number | null>[] }>> {
  const allTables = await listDataSourceTables(dataSource.id)
  const live = isLiveConnection(dataSource, connection)

  const resolved: DbDataSourceTableRow[] = []
  for (const sel of selected) {
    if (sel.id) {
      const { data } = await getDataSourceTableRow(dataSource.id, sel.id)
      if (data) resolved.push(data as DbDataSourceTableRow)
    } else {
      const match = allTables.find(
        (t) => t.externalSchema === sel.schema && t.externalName === sel.name
      )
      if (match) {
        const { data } = await getDataSourceTableRow(dataSource.id, match.id)
        if (data) resolved.push(data as DbDataSourceTableRow)
      }
    }
  }

  const result: Array<{ table: DbDataSourceTableRow; rows: Record<string, string | number | null>[] }> = []
  for (const table of resolved) {
    let rows: Record<string, string | number | null>[]
    if (live && dataSource.source_kind === "connection") {
      try {
        rows = await fetchLiveTableRows(teamId, dataSource, table.external_schema, table.external_name)
      } catch {
        rows = Array.isArray(table.rows_json) ? table.rows_json : []
      }
    } else {
      rows = Array.isArray(table.rows_json) ? table.rows_json : []
    }
    result.push({ table, rows })
  }
  return result
}

function buildSchemaContext(
  tables: Array<{ table: DbDataSourceTableRow; rows: Record<string, string | number | null>[] }>
) {
  return tables
    .map(({ table }) => {
      const cols = Array.isArray(table.columns_json) ? table.columns_json : []
      const colList = cols
        .map((c) => `  - ${c.name} (${c.type}${c.description ? `, ${c.description}` : ""})`)
        .join("\n")
      return `Table: [${table.external_schema}].[${table.external_name}]\nColumns:\n${colList}`
    })
    .join("\n\n")
}

export async function POST(request: NextRequest) {
  const { auth, errorResponse } = await requireAuth(request)
  if (errorResponse) return errorResponse

  const body = (await request.json()) as ChatRequestBody
  const { message, dataSourceId, connectionId, selectedTables, conversationHistory = [] } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 })
  }

  const dataSource = await resolveDataSource(auth!.teamId!, dataSourceId, connectionId)
  if (!dataSource) {
    return NextResponse.json({ error: "No data source selected" }, { status: 400 })
  }

  let connection: DbConnectionRow | null = null
  if (dataSource.connection_id) {
    const { data } = await getTeamConnectionRow(auth!.teamId!, dataSource.connection_id)
    connection = (data as DbConnectionRow) ?? null
  }

  const useLiveSql =
    dataSource.source_kind === "connection" &&
    connection?.connection_type !== "smartsheet" &&
    isLiveConnection(dataSource, connection)

  const tableData = await loadSelectedTableRows(auth!.teamId!, dataSource, connection, selectedTables)
  const schemaContext = buildSchemaContext(tableData)

  const sqlSystemPrompt = `You are an expert SQL analyst for enterprise ERP and business databases on Microsoft SQL Server.
The user is querying a data source${schemaContext ? " with the following curated tables" : ""}.

${schemaContext ? `DATABASE SCHEMA:\n${schemaContext}` : "No specific tables were selected. Use your best judgment based on the user's question."}

Respond ONLY with valid JSON.

If you need clarification:
{ "type": "clarify", "message": "...", "questions": ["..."] }

If ready to generate:
{ "type": "report", "mode": "sql", "sql": "SELECT ...", "explanation": "...", "chartType": "bar", "title": "..." }

SQL rules: SELECT only, valid T-SQL, bracket-quoted identifiers, TOP 500 default.
chartType: bar | pie | line | table`

  const tabularSystemPrompt = `You are an expert data analyst working with tabular datasets (Excel, Smartsheet, or offline snapshots).
The user is querying a data source${schemaContext ? " with the following curated tables" : ""}.

${schemaContext ? `TABLE SCHEMA:\n${schemaContext}` : "No specific tables were selected."}

Respond ONLY with valid JSON.

If you need clarification:
{ "type": "clarify", "message": "...", "questions": ["..."] }

If ready to generate:
{
  "type": "report",
  "mode": "tabular",
  "query": {
    "sourceTable": "schema.tableName",
    "filters": [{ "column": "Col", "op": "eq|contains|gt|lt|gte|lte", "value": "..." }],
    "groupBy": ["Col"],
    "aggregations": [{ "column": "Amount", "fn": "sum|count|avg|min|max", "alias": "Total" }],
    "sortBy": { "column": "Col", "direction": "asc|desc" },
    "limit": 500,
    "select": ["Col1", "Col2"]
  },
  "explanation": "...",
  "chartType": "bar",
  "title": "..."
}

Use exact column names from the schema. sourceTable must match one of the table names shown (schema.name format).
chartType: bar | pie | line | table`

  const systemPrompt = useLiveSql ? sqlSystemPrompt : tabularSystemPrompt

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

  if (claudeResponse.type === "clarify") {
    const questionList = claudeResponse.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")
    const fullMessage = `${claudeResponse.message}\n\n${questionList}`
    return NextResponse.json({ type: "clarify", message: fullMessage })
  }

  if (useLiveSql && (!claudeResponse.mode || claudeResponse.mode === "sql") && "sql" in claudeResponse) {
    const mssql = await getTeamMssqlConnection(auth!.teamId!, dataSource.connection_id!)
    if (!mssql) {
      return NextResponse.json({ error: "MSSQL connection not found" }, { status: 404 })
    }

    try {
      const queryResult = await runSql(mssql, claudeResponse.sql)
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
  }

  const tabularResponse = claudeResponse as ClaudeTabularReportResponse
  const sourceKey = tabularResponse.query.sourceTable
  const match = tableData.find(
    (t) =>
      `${t.table.external_schema}.${t.table.external_name}` === sourceKey ||
      t.table.external_name === sourceKey
  )

  if (!match && tableData.length === 1) {
    // default to single selected table
  }

  const target = match ?? tableData[0]
  if (!target) {
    return NextResponse.json({ error: "No table data available for query" }, { status: 422 })
  }

  try {
    const queryResult = executeTabularQuery(target.rows, tabularResponse.query)
    return NextResponse.json({
      type: "report",
      title: tabularResponse.title,
      explanation: tabularResponse.explanation,
      sql: JSON.stringify(tabularResponse.query),
      chartType: tabularResponse.chartType,
      columns: queryResult.columns,
      rows: queryResult.rows,
      rowCount: queryResult.rows.length,
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Query execution failed"
    return NextResponse.json({ error: errMsg }, { status: 422 })
  }
}
