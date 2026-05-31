"use client"

import { useCallback, useRef, useState } from "react"
import type { ChatMessageModel } from "@/types"
import { useActiveConnection } from "@/lib/context/active-connection"
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
}

export function WorkspaceView({ initialMessages, initialChatId }: WorkspaceViewProps = {}) {
  const { activeConnection } = useActiveConnection()
  const { autoCollapse } = useUI()
  const [messages, setMessages] = useState<ChatMessageModel[]>(initialMessages ?? [])
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<ReportData | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const conversationRef = useRef<ConversationTurn[]>(
    // Rebuild conversation history from initial messages so Claude has context
    (initialMessages ?? []).map((m) => ({ role: m.role, content: m.content }))
  )
  const chatIdRef = useRef<string | null>(initialChatId ?? null)
  // Track which message IDs are already persisted to avoid re-saving
  const savedMsgIds = useRef<Set<string>>(
    new Set((initialMessages ?? []).map((m) => m.id))
  )
  const bottomRef = useRef<HTMLDivElement>(null)

  const hasConversation = messages.length > 0

  const persistChat = useCallback(
    async (updatedMessages: ChatMessageModel[]) => {
      const firstUser = updatedMessages.find((m) => m.role === "user")
      if (!firstUser) return

      // Create the chat row on first save
      if (!chatIdRef.current) {
        try {
          const res = await fetch("/api/chats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: truncate(firstUser.content),
              connectionId: activeConnection?.id ?? null,
            }),
          })
          if (res.ok) {
            const chat = await res.json()
            chatIdRef.current = chat.id
          }
        } catch { /* ignore — chat data stays in memory */ }
      }

      if (!chatIdRef.current) return

      // Save only messages not yet persisted
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
    [activeConnection]
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

      // Persist chat immediately with user message
      persistChat(nextMessages)

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            connectionId: activeConnection?.id ?? "",
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

        // ── Clarify: Claude asked questions, no report yet ──────────────────
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

        // ── Report: Claude generated SQL and it was executed ────────────────
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
          connectionName: activeConnection?.name,
        }
        setReport(reportData)

        // Persist updated chat with assistant reply
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
    [busy, activeConnection, autoCollapse, messages, persistChat]
  )

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!hasConversation) {
    return (
      <div className="flex h-full flex-col overflow-auto">
        <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-3 md:px-4">
          <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
            <div className="mb-6 flex flex-col items-center gap-4 md:flex-row md:gap-5">
              <Sparkles className="size-9 shrink-0 text-amber-400/90 md:size-10" strokeWidth={1.25} />
              <h1 className="font-serif text-[1.65rem] font-normal tracking-tight text-foreground md:text-4xl md:leading-tight">
                {greetingLine()}
              </h1>
            </div>
            <p className="text-muted-foreground mb-10 max-w-md text-sm leading-relaxed md:text-[0.9375rem]">
              Talk to your database in plain language. Add tables as context, ask a question, and AirBI generates a live report.
            </p>

            {!activeConnection && (
              <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-300/80">
                <AlertCircle className="size-4 shrink-0" />
                No database connected. Add a connection first from the sidebar.
              </div>
            )}

            <div className="w-full">
              <ChatInput
                variant="prominent"
                onSend={sendPrompt}
                disabled={busy || !activeConnection}
                connectionId={activeConnection?.id}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Split panel ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-full gap-0 overflow-hidden">
      {/* Left: chat panel */}
      <div className="flex w-[360px] shrink-0 flex-col border-r border-white/[0.06]">
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 p-4 pb-2">
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

        <div className="shrink-0 border-t border-white/[0.06] bg-background/80 p-3 backdrop-blur-md">
          {error && (
            <div className="mb-2 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-300/80">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </div>
          )}
          <ChatInput
            variant="default"
            onSend={sendPrompt}
            disabled={busy || !activeConnection}
            connectionId={activeConnection?.id}
          />
        </div>
      </div>

      {/* Right: report panel */}
      <div className="min-w-0 flex-1 overflow-hidden bg-white/[0.01]">
        <ReportPanel report={report} loading={reportLoading} />
      </div>
    </div>
  )
}
