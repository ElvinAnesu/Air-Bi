"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ChatMessageModel } from "@/types"
import { useActiveDataSource } from "@/lib/context/active-data-source"
import { useUI } from "@/lib/context/ui-context"
import { ChatMessage } from "@/components/chat/chat-message"
import { ChatInput, type SelectedTable } from "@/components/chat/chat-input"
import { ReportPanel, type ReportData } from "@/components/workspace/report-panel"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, AlertCircle } from "lucide-react"

type ConversationTurn = {
  role: "user" | "assistant"
  content: string
}

function greetingLine() {
  const h = new Date().getHours()
  if (h < 5) return "Still up?"
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function truncate(text: string, max = 55): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + "…"
}

type WorkspaceViewProps = {
  initialMessages?: ChatMessageModel[]
  initialChatId?: string
  initialReport?: ReportData | null
  initialSavedReportId?: string | null
}

export function WorkspaceView({
  initialMessages,
  initialChatId,
  initialReport = null,
  initialSavedReportId = null,
}: WorkspaceViewProps = {}) {
  const { activeDataSource } = useActiveDataSource()
  const { autoCollapse } = useUI()
  const [messages, setMessages] = useState<ChatMessageModel[]>(initialMessages ?? [])
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<ReportData | null>(initialReport)
  const [reportLoading, setReportLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatId, setChatId] = useState<string | null>(initialChatId ?? null)
  const conversationRef = useRef<ConversationTurn[]>(
    (initialMessages ?? []).map((m) => ({ role: m.role, content: m.content }))
  )
  const chatIdRef = useRef<string | null>(initialChatId ?? null)
  const savedMsgIds = useRef<Set<string>>(
    new Set((initialMessages ?? []).map((m) => m.id))
  )
  const bottomRef = useRef<HTMLDivElement>(null)
  const [greeting, setGreeting] = useState("Welcome")

  const showWorkspace = messages.length > 0 || report !== null

  useEffect(() => {
    setGreeting(greetingLine())
  }, [])

  useEffect(() => {
    if (initialReport) autoCollapse()
  }, [initialReport, autoCollapse])

  const syncSavedReport = useCallback(
    async (reportData: ReportData, nextChatId?: string | null) => {
      if (!initialSavedReportId) return
      try {
        await fetch(`/api/reports/${initialSavedReportId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: reportData.title,
            description: reportData.explanation,
            sql: reportData.sql,
            chartType: reportData.chartType,
            columns: reportData.columns,
            rows: reportData.rows,
            rowCount: reportData.rowCount,
            connectionId: activeDataSource?.connectionId ?? null,
            dataSourceId: activeDataSource?.id ?? null,
            chatId: nextChatId ?? chatIdRef.current ?? null,
          }),
        })
      } catch { /* ignore */ }
    },
    [initialSavedReportId, activeDataSource?.id, activeDataSource?.connectionId]
  )

  const persistChat = useCallback(
    async (updatedMessages: ChatMessageModel[]) => {
      const firstUser = updatedMessages.find((m) => m.role === "user")
      if (!firstUser) return

      if (!chatIdRef.current) {
        try {
          const res = await fetch("/api/chats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: truncate(firstUser.content),
              connectionId: activeDataSource?.connectionId ?? null,
              dataSourceId: activeDataSource?.id ?? null,
            }),
          })
          if (res.ok) {
            const chat = await res.json()
            chatIdRef.current = chat.id
            setChatId(chat.id)
            if (initialSavedReportId) {
              await fetch(`/api/reports/${initialSavedReportId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chatId: chat.id }),
              })
            }
          }
        } catch { /* ignore */ }
      }

      if (!chatIdRef.current) return

      const newMsgs = updatedMessages.filter((m) => !savedMsgIds.current.has(m.id))
      if (newMsgs.length === 0) return

      try {
        const res = await fetch(`/api/chats/${chatIdRef.current}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMsgs.map((m) => ({ role: m.role, content: m.content })),
          }),
        })
        if (res.ok) {
          newMsgs.forEach((m) => savedMsgIds.current.add(m.id))
        }
      } catch { /* ignore */ }
    },
    [activeDataSource, initialSavedReportId]
  )

  const sendPrompt = useCallback(
    async (text: string, selectedTables: SelectedTable[]) => {
      const trimmed = text.trim()
      if (!trimmed || busy) return

      setError(null)

      const userMsg: ChatMessageModel = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      }

      const nextMessages = [...messages, userMsg]
      setMessages(nextMessages)
      setBusy(true)
      setReportLoading(true)
      autoCollapse()

      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50)

      persistChat(nextMessages)

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            dataSourceId: activeDataSource?.id ?? "",
            connectionId: activeDataSource?.connectionId ?? "",
            selectedTables,
            conversationHistory: conversationRef.current,
          }),
        })

        const data = (await res.json()) as {
          type?: "clarify" | "report"
          message?: string
          title?: string
          explanation?: string
          sql?: string
          chartType?: "bar" | "pie" | "line" | "table"
          columns?: string[]
          rows?: Record<string, string | number | null>[]
          rowCount?: number
          error?: string
        }

        if (!res.ok || data.error) {
          throw new Error(data.error ?? "Something went wrong")
        }

        if (data.type === "clarify") {
          const assistantContent = data.message ?? "Could you provide more details?"
          const assistantMsg: ChatMessageModel = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: assistantContent,
          }
          const withAssistant = [...nextMessages, assistantMsg]
          setMessages(withAssistant)
          conversationRef.current = [
            ...conversationRef.current,
            { role: "user", content: trimmed },
            { role: "assistant", content: assistantContent },
          ]
          persistChat(withAssistant)
          return
        }

        const assistantContent = data.explanation ?? "Report generated."
        const assistantMsg: ChatMessageModel = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: assistantContent,
        }

        const withAssistant = [...nextMessages, assistantMsg]
        setMessages(withAssistant)

        conversationRef.current = [
          ...conversationRef.current,
          { role: "user", content: trimmed },
          { role: "assistant", content: assistantContent },
        ]

        const reportData: ReportData = {
          title: data.title ?? "Report",
          explanation: data.explanation ?? "",
          sql: data.sql ?? "",
          chartType: data.chartType ?? "table",
          columns: data.columns ?? [],
          rows: data.rows ?? [],
          rowCount: data.rowCount ?? 0,
          connectionName: activeDataSource?.name,
        }
        setReport(reportData)
        void syncSavedReport(reportData)

        persistChat(withAssistant)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "An unexpected error occurred"
        setError(msg)
        const errMsg: ChatMessageModel = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Sorry, I ran into an error: ${msg}`,
        }
        const withErr = [...nextMessages, errMsg]
        setMessages(withErr)
        persistChat(withErr)
      } finally {
        setBusy(false)
        setReportLoading(false)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
      }
    },
    [busy, activeDataSource, autoCollapse, messages, persistChat, syncSavedReport]
  )

  if (!showWorkspace) {
    return (
      <div className="flex h-full flex-col overflow-auto">
        <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-3 md:px-4">
          <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
            <div className="mb-6 flex flex-col items-center gap-4 md:flex-row md:gap-5">
              <Sparkles className="size-9 shrink-0 text-amber-400/90 md:size-10" strokeWidth={1.25} />
              <h1 className="font-serif text-[1.65rem] font-normal tracking-tight text-foreground md:text-4xl md:leading-tight">
                {greeting}
              </h1>
            </div>
            <p className="text-muted-foreground mb-10 max-w-md text-sm leading-relaxed md:text-[0.9375rem]">
              Talk to your database in plain language. Add tables as context, ask a question, and AirBI generates a live report.
            </p>

            {!activeDataSource && (
              <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                <AlertCircle className="size-4 shrink-0" />
                No data source selected. Create one from the Data sources page.
              </div>
            )}

            <div className="w-full">
              <ChatInput
                variant="prominent"
                onSend={sendPrompt}
                disabled={busy || !activeDataSource}
                dataSourceId={activeDataSource?.id}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full gap-0 overflow-hidden">
      <div className="border-border flex w-[360px] shrink-0 flex-col border-r">
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 p-4 pb-2">
            {messages.length === 0 && report && (
              <p className="text-muted-foreground px-1 text-center text-xs leading-relaxed">
                Ask a follow-up question to refine this report.
              </p>
            )}
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} loading={false} appearance="chat" />
            ))}
            {busy && (
              <ChatMessage
                message={{ id: "thinking", role: "assistant", content: "" }}
                loading
                appearance="chat"
              />
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="border-border bg-background/95 shrink-0 border-t p-3 backdrop-blur-md">
          {error && (
            <div className="mb-2 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-800 dark:text-red-300">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </div>
          )}
          <ChatInput
            variant="default"
            onSend={sendPrompt}
            disabled={busy || !activeDataSource}
            dataSourceId={activeDataSource?.id}
          />
        </div>
      </div>

      <div className="bg-muted/30 min-w-0 flex-1 overflow-hidden">
        <ReportPanel
          report={report}
          loading={reportLoading}
          chatId={chatId}
          connectionId={activeDataSource?.connectionId}
          dataSourceId={activeDataSource?.id}
          savedReportId={initialSavedReportId}
        />
      </div>
    </div>
  )
}
