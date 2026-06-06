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
import {
  formatRelationshipsForSchema,
  listDataSourceRelationships,
} from "@/lib/server/data-sources/relationships"
import type { TabularQuery } from "@/lib/server/query/tabular"
import type { DbDataSourceRow, DbDataSourceTableRow } from "@/lib/server/data-sources/types"
import sql from "mssql"
import type { MssqlConnectionConfig } from "@/lib/server/connections/types"
import {
  CLARIFY_RULES,
  DATA_GROUNDING_RULES,
  SQL_REPORT_JSON,
  TABULAR_QUERY_RULES,
  TABULAR_REPORT_JSON,
  VISUALIZATION_RULES,
} from "@/lib/reports/chat-prompts"
import { DEFAULT_CLARIFY_QUESTIONS, formatClarifyResponse } from "@/lib/reports/clarify"
import {
  chartTypeFromVisualization,
  normalizeVisualization,
  requiresClarification,
  type ReportVisualization,
} from "@/lib/reports/visualization"
import {
  buildProfilesMap,
  formatTableContextBlock,
  profileTable,
} from "@/lib/server/data-sources/table-profile"
import { runTabularReport } from "@/lib/server/chat/tabular-report"

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
  title: string
  visualization?: ReportVisualization
  chartType?: string
}

type ClaudeTabularReportResponse = {
  type: "report"
  mode: "tabular"
  query: TabularQuery
  explanation: string
  title: string
  visualization?: ReportVisualization
  chartType?: string
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

function normalizeTableKey(key: string) {
  return key
    .toLowerCase()
    .replace(/^\[+|\]+$/g, "")
    .trim()
}

function findTableEntry(
  tableData: Array<{ table: DbDataSourceTableRow; rows: Record<string, string | number | null>[] }>,
  sourceKey: string
) {
  const key = normalizeTableKey(sourceKey)
  return tableData.find((entry) => {
    const schema = entry.table.external_schema.toLowerCase()
    const name = entry.table.external_name.toLowerCase()
    const full = `${schema}.${name}`
    return (
      full === key ||
      name === key ||
      key.endsWith(`.${name}`) ||
      key.replace(/^excel\./, "") === name
    )
  })
}

async function resolveTableData(
  teamId: string,
  dataSource: DbDataSourceRow,
  connection: DbConnectionRow | null,
  selected: SelectedTable[],
  conversationHistory: Array<{ role: string; content: string }>
) {
  let tableData = await loadSelectedTableRows(teamId, dataSource, connection, selected)

  if (tableData.length === 0 && conversationHistory.length > 0) {
    const all = await listDataSourceTables(dataSource.id)
    const fallbackSelected: SelectedTable[] =
      selected.length > 0
        ? selected
        : all.map((t) => ({
            id: t.id,
            schema: t.externalSchema,
            name: t.externalName,
          }))

    if (fallbackSelected.length > 0) {
      tableData = await loadSelectedTableRows(
        teamId,
        dataSource,
        connection,
        fallbackSelected
      )
    }
  }

  return tableData
}

function buildEnrichedTableContext(
  tables: Array<{ table: DbDataSourceTableRow; rows: Record<string, string | number | null>[] }>,
  relationshipsBlock?: string
) {
  const blocks = tables.map(({ table, rows }) => {
    const declared = Array.isArray(table.columns_json)
      ? (table.columns_json as Array<{ name: string; type?: string }>)
      : undefined
    const profile = profileTable(
      table.external_schema,
      table.external_name,
      rows,
      declared
    )
    return formatTableContextBlock(profile, rows)
  })

  const tableBlock = blocks.join("\n\n---\n\n")
  if (!relationshipsBlock) return tableBlock
  return `${tableBlock}\n\nTABLE RELATIONSHIPS:\n${relationshipsBlock}`
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

  const tableData = await resolveTableData(
    auth!.teamId!,
    dataSource,
    connection,
    selectedTables,
    conversationHistory
  )
  const relationships = await listDataSourceRelationships(dataSource.id).catch(() => [])
  const relationshipsBlock = formatRelationshipsForSchema(relationships)
  const tableContext = buildEnrichedTableContext(tableData, relationshipsBlock || undefined)
  const profilesByTable = buildProfilesMap(tableData)

  const sqlSystemPrompt = `You are an expert SQL analyst for enterprise ERP and business databases on Microsoft SQL Server.
The user is querying a data source with the following actual table data and column profiles.

${DATA_GROUNDING_RULES}

${tableContext ? `TABLES IN CONTEXT:\n${tableContext}` : "No specific tables were selected."}

Respond ONLY with valid JSON.
${CLARIFY_RULES}
${VISUALIZATION_RULES}
${SQL_REPORT_JSON}

SQL rules: SELECT only, valid T-SQL, bracket-quoted identifiers, TOP 500 default. Use column profiles to cast/compare formatted numeric text correctly.`

  const tabularSystemPrompt = `You are an expert data analyst. You query in-memory snapshots of real business tables (Excel, Smartsheet, ERP exports).

${DATA_GROUNDING_RULES}

${tableContext ? `TABLES IN CONTEXT:\n${tableContext}` : "No specific tables were selected."}

Respond ONLY with valid JSON.
${CLARIFY_RULES}
${TABULAR_QUERY_RULES}
${VISUALIZATION_RULES}
${TABULAR_REPORT_JSON}

sourceTable must match a table name shown above (schema.name format). Use exact column names from profiles and sample rows.`

  const systemPrompt = useLiveSql ? sqlSystemPrompt : tabularSystemPrompt
  const mustClarify = requiresClarification(conversationHistory, message)

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
    const questions =
      claudeResponse.questions?.length > 0
        ? claudeResponse.questions
        : DEFAULT_CLARIFY_QUESTIONS
    return NextResponse.json({
      type: "clarify",
      message: formatClarifyResponse(claudeResponse.message, questions),
      questions,
      canSkip: true,
    })
  }

  if (mustClarify && claudeResponse.type === "report") {
    return NextResponse.json({
      type: "clarify",
      message: formatClarifyResponse(
        "Before I build your report, I need a bit more context so the visuals match what you need.",
        DEFAULT_CLARIFY_QUESTIONS
      ),
      questions: DEFAULT_CLARIFY_QUESTIONS,
      canSkip: true,
    })
  }

  function reportPayload(
    title: string,
    explanation: string,
    sql: string,
    columns: string[],
    rows: Record<string, string | number | null>[],
    rawVisualization?: ReportVisualization,
    legacyChartType?: string
  ) {
    const visualization = normalizeVisualization(
      rawVisualization,
      columns,
      rows,
      legacyChartType
    )
    return {
      type: "report" as const,
      title,
      explanation,
      sql,
      visualization,
      chartType: chartTypeFromVisualization(visualization),
      columns,
      rows,
      rowCount: rows.length,
    }
  }

  if (useLiveSql && (!claudeResponse.mode || claudeResponse.mode === "sql") && "sql" in claudeResponse) {
    const mssql = await getTeamMssqlConnection(auth!.teamId!, dataSource.connection_id!)
    if (!mssql) {
      return NextResponse.json({ error: "MSSQL connection not found" }, { status: 404 })
    }

    try {
      const queryResult = await runSql(mssql, claudeResponse.sql)
      return NextResponse.json(
        reportPayload(
          claudeResponse.title,
          claudeResponse.explanation,
          claudeResponse.sql,
          queryResult.columns,
          queryResult.rows,
          claudeResponse.visualization,
          claudeResponse.chartType
        )
      )
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
  const sourceKey = tabularResponse.query?.sourceTable ?? ""
  const match = sourceKey ? findTableEntry(tableData, sourceKey) : undefined
  const target = match ?? (tableData.length === 1 ? tableData[0] : undefined) ?? tableData[0]
  if (!target) {
    return NextResponse.json({ error: "No table data available for query" }, { status: 422 })
  }

  const tableKey = `${target.table.external_schema}.${target.table.external_name}`
  const columnProfiles = profilesByTable.get(tableKey) ?? []
  const firstUserTurn = conversationHistory.find((h) => h.role === "user")?.content ?? ""
  const reportIntent = `${firstUserTurn}\n${message}`.trim()

  try {
    const executed = await runTabularReport(
      anthropic,
      systemPrompt,
      messages,
      {
        title: tabularResponse.title,
        explanation: tabularResponse.explanation,
        query: tabularResponse.query,
        visualization: tabularResponse.visualization,
        chartType: tabularResponse.chartType,
      },
      target.rows,
      columnProfiles,
      reportIntent
    )

    const explanation = executed.repaired
      ? `${executed.plan.explanation} (Query was adjusted automatically to match your filter criteria.)`
      : executed.plan.explanation

    return NextResponse.json(
      reportPayload(
        executed.plan.title,
        explanation,
        JSON.stringify(executed.plan.query),
        executed.columns,
        executed.rows,
        executed.plan.visualization,
        executed.plan.chartType
      )
    )
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Query execution failed"
    return NextResponse.json({ error: errMsg }, { status: 422 })
  }
}
