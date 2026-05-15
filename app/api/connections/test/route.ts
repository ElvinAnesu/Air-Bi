import { NextResponse } from "next/server"
import { testMssqlConnection } from "@/lib/server/mssql/client"

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>
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
