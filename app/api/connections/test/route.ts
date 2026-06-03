import { NextResponse } from "next/server"
import { testMssqlConnection } from "@/lib/server/mssql/client"
import { testSmartsheetConnection } from "@/lib/server/smartsheet/client"

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>
  const connectionType = body.connectionType === "smartsheet" ? "smartsheet" : "mssql"

  if (connectionType === "smartsheet") {
    const apiToken = typeof body.apiToken === "string" ? body.apiToken.trim() : ""
    if (!apiToken) {
      return NextResponse.json({ error: "Smartsheet API token is required." }, { status: 400 })
    }
    try {
      await testSmartsheetConnection(apiToken)
      return NextResponse.json({ ok: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection test failed"
      return NextResponse.json({ error: message }, { status: 502 })
    }
  }

  const server = typeof body.server === "string" ? body.server.trim() : ""
  const database = typeof body.database === "string" ? body.database.trim() : ""
  const user = typeof body.user === "string" ? body.user.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""

  if (!server || !database || !user || !password) {
    return NextResponse.json(
      { error: "Server, database, user, and password are required." },
      { status: 400 }
    )
  }

  try {
    await testMssqlConnection({ server, database, user, password })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection test failed"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
