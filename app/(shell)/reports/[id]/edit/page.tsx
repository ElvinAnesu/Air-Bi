"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import type { ChatMessageModel } from "@/types"
import { useRestoreActiveDataSource } from "@/lib/hooks/use-restore-active-data-source"
import { WorkspaceView } from "@/components/workspace/workspace-view"
import type { ReportData } from "@/components/workspace/report-panel"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"

type ApiReport = {
  id: string
  title: string
  description: string | null
  sql: string
  chart_type: string
  columns: string[]
  rows: Record<string, string | number | null>[]
  row_count: number
  connection_id: string | null
  data_source_id: string | null
  chat_id: string | null
}

type ApiChat = {
  id: string
  connection_id: string | null
  data_source_id: string | null
  messages: { id: string; role: "user" | "assistant"; content: string }[]
}

export default function EditReportPage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""

  const [report, setReport] = useState<ApiReport | null>(null)
  const [messages, setMessages] = useState<ChatMessageModel[]>([])
  const [chatId, setChatId] = useState<string | null>(null)
  const [chatDataSourceId, setChatDataSourceId] = useState<string | null>(null)
  const [chatConnectionId, setChatConnectionId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    async function load() {
      setLoaded(false)
      setLoadError(null)
      try {
        const reportRes = await fetch(`/api/reports/${id}`)
        if (!reportRes.ok) {
          setReport(null)
          setLoadError("Report not found")
          return
        }

        const reportData = (await reportRes.json()) as ApiReport
        setReport(reportData)

        if (reportData.chat_id) {
          const chatRes = await fetch(`/api/chats/${reportData.chat_id}`)
          if (chatRes.ok) {
            const chat = (await chatRes.json()) as ApiChat
            setChatId(chat.id)
            setChatDataSourceId(chat.data_source_id)
            setChatConnectionId(chat.connection_id)
            setMessages(
              chat.messages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
              }))
            )
          }
        }
      } catch {
        setReport(null)
        setLoadError("Failed to load report")
      } finally {
        setLoaded(true)
      }
    }

    void load()
  }, [id])

  useRestoreActiveDataSource({
    ready: loaded && !!report,
    dataSourceId: chatDataSourceId ?? report?.data_source_id ?? null,
    connectionId: chatConnectionId ?? report?.connection_id ?? null,
  })

  if (!loaded) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading workspace&hellip;
      </div>
    )
  }

  if (!report || loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-medium">{loadError ?? "Report not found"}</p>
        <Link href="/reports">
          <Button variant="outline" size="sm" className="rounded-xl">
            <ArrowLeft className="mr-1.5 size-3.5" />
            Back to reports
          </Button>
        </Link>
      </div>
    )
  }

  const initialReport: ReportData = {
    title: report.title,
    explanation: report.description ?? "",
    sql: report.sql,
    chartType: report.chart_type as ReportData["chartType"],
    columns: report.columns,
    rows: report.rows,
    rowCount: report.row_count,
  }

  return (
    <WorkspaceView
      initialMessages={messages}
      initialChatId={chatId ?? undefined}
      initialReport={initialReport}
      initialSavedReportId={report.id}
    />
  )
}
