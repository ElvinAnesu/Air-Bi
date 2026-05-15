import { NextResponse } from "next/server"
import { listConnections, saveConnection } from "@/lib/server/connections/store"
import { toPublicConnection } from "@/lib/server/connections/public"
import { countMssqlTables, testMssqlConnection } from "@/lib/server/mssql/client"
import type { ConnectionCreateInput } from "@/lib/server/connections/types"

function parseCreateBody(body: unknown): ConnectionCreateInput | null {
  if (!body || typeof body !== "object") return null
  const b = body as Record<string, unknown>
  const name = typeof b.name === "string" ? b.name.trim() : ""
  const server = typeof b.server === "string" ? b.server.trim() : ""
  const database = typeof b.database === "string" ? b.database.trim() : ""
  const user = typeof b.user === "string" ? b.user.trim() : ""
  const password = typeof b.password === "string" ? b.password : ""
  if (!name || !server || !database || !user || !password) return null
  return { name, server, database, user, password }
}

export async function GET() {
  const connections = listConnections().map(toPublicConnection)
  return NextResponse.json({ connections })
}

export async function POST(request: Request) {
  const parsed = parseCreateBody(await request.json())
  if (!parsed) {
    return NextResponse.json({ error: "Name, server, database, user, and password are required." }, { status: 400 })
  }

  try {
    await testMssqlConnection(parsed)
    const tableCount = await countMssqlTables(parsed)
    const stored = saveConnection({
      id: crypto.randomUUID(),
      name: parsed.name,
      erpType: "SAP B1 MSSQL",
      server: parsed.server,
      database: parsed.database,
      user: parsed.user,
      password: parsed.password,
      createdAt: new Date().toISOString(),
      tableCount,
    })
    return NextResponse.json({ connection: toPublicConnection(stored) }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save connection"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
