import sql from "mssql"
import type { MssqlConnectionConfig, SchemaTableSummary } from "@/lib/server/connections/types"
import type { ErpColumn, ErpTable } from "@/types"

function poolConfig(config: MssqlConnectionConfig): sql.config {
  return {
    server: config.server,
    database: config.database,
    user: config.user,
    password: config.password,
    port: config.port ?? 1433,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
    connectionTimeout: 20_000,
    requestTimeout: 60_000,
  }
}

export async function testMssqlConnection(config: MssqlConnectionConfig): Promise<void> {
  const pool = await sql.connect(poolConfig(config))
  try {
    await pool.request().query("SELECT 1 AS ok")
  } finally {
    await pool.close()
  }
}

export async function countMssqlTables(config: MssqlConnectionConfig): Promise<number> {
  const pool = await sql.connect(poolConfig(config))
  try {
    const result = await pool.request().query<{ cnt: number }>(`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
        AND TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
    `)
    return Number(result.recordset[0]?.cnt ?? 0)
  } finally {
    await pool.close()
  }
}

export async function listMssqlTables(config: MssqlConnectionConfig): Promise<SchemaTableSummary[]> {
  const pool = await sql.connect(poolConfig(config))
  try {
    const result = await pool.request().query<{
      schema: string
      name: string
    }>(`
      SELECT
        TABLE_SCHEMA AS [schema],
        TABLE_NAME AS [name]
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
        AND TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `)

    return result.recordset.map((row) => ({
      id: `${row.schema}.${row.name}`,
      schema: row.schema,
      name: row.name,
      description: `${row.schema}.${row.name}`,
    }))
  } finally {
    await pool.close()
  }
}

function assertSafeSqlIdentifier(value: string, label: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error(`Invalid ${label}`)
  }
}

export async function getMssqlTablePreview(
  config: MssqlConnectionConfig,
  schema: string,
  tableName: string
): Promise<ErpTable> {
  assertSafeSqlIdentifier(schema, "schema")
  assertSafeSqlIdentifier(tableName, "table")

  const pool = await sql.connect(poolConfig(config))
  try {
    const columnsResult = await pool
      .request()
      .input("schema", sql.NVarChar, schema)
      .input("table", sql.NVarChar, tableName)
      .query<{
        COLUMN_NAME: string
        DATA_TYPE: string
        IS_NULLABLE: string
      }>(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
        ORDER BY ORDINAL_POSITION
      `)

    const columns: ErpColumn[] = columnsResult.recordset.map((col) => ({
      name: col.COLUMN_NAME,
      type: col.DATA_TYPE,
      description: col.IS_NULLABLE === "YES" ? "Nullable" : undefined,
    }))

    const qualified = `[${schema}].[${tableName}]`
    const sampleResult = await pool.request().query(`SELECT TOP 25 * FROM ${qualified}`)

    const sampleRows: Record<string, string | number>[] = sampleResult.recordset.map((row) => {
      const normalized: Record<string, string | number> = {}
      for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
        if (value === null || value === undefined) {
          normalized[key] = ""
        } else if (typeof value === "number" || typeof value === "string") {
          normalized[key] = value
        } else if (value instanceof Date) {
          normalized[key] = value.toISOString()
        } else {
          normalized[key] = String(value)
        }
      }
      return normalized
    })

    return {
      id: `${schema}.${tableName}`,
      name: tableName,
      description: `${schema}.${tableName}`,
      columns,
      sampleRows,
    }
  } finally {
    await pool.close()
  }
}
