"use client"

import { useCallback, useMemo, useState } from "react"
import type { ChatMessageModel } from "@/types"
import {
  mockBarChart,
  mockPieChart,
  mockQueryColumns,
  mockQueryRows,
  mockRevenueSeries,
  suggestedPrompts,
} from "@/lib/mock-data"
import { ChatMessage } from "@/components/chat/chat-message"
import { ChatInput } from "@/components/chat/chat-input"
import { SuggestedPrompts } from "@/components/chat/suggested-prompts"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ResultBarChart, ResultPieChart } from "@/components/charts/result-charts"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { ChevronDown, Download, Filter, Sparkles } from "lucide-react"

function buildAssistantMessage(prompt: string): ChatMessageModel {
  const p = prompt.toLowerCase()
  if (p.includes("overdue")) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "There are **14 overdue invoices** totaling **$186,420** on OINV with DocStatus open and due dates before today.",
      summary: "Overdue A/R: **$186,420** across **14** invoices",
      sql: `SELECT COUNT(*) AS Cnt, SUM(DocTotal) AS OpenTotal
FROM OINV
WHERE DocStatus = 'O' AND DocDueDate < CAST(GETDATE() AS DATE);`,
      chart: "bar",
    }
  }
  if (p.includes("customer")) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "**Northwind Logistics** leads this month with **$842k** invoiced revenue, followed by Atlas Manufacturing at **$512k**.",
      summary: "Top customer: **Northwind Logistics**",
      sql: `SELECT TOP 5 CardCode, SUM(DocTotal) AS Revenue
FROM OINV
WHERE MONTH(DocDate) = MONTH(GETDATE())
GROUP BY CardCode
ORDER BY Revenue DESC;`,
      chart: "pie",
    }
  }
  if (p.includes("inventory") || p.includes("discrepanc")) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "OITM shows **5 SKUs** below reorder point in the main warehouse. Largest gap: **SKU-7720** (−12 units vs target).",
      summary: "**5** inventory alerts in WH-01",
      sql: `SELECT ItemCode, OnHand, MinStock
FROM OITM
WHERE OnHand < MinStock;`,
      chart: "bar",
    }
  }
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      "Based on incoming payments posted today, **cash and transfers total $24,320** across ORCT. This is **+12%** vs the same weekday last week.",
    summary: "Received today: **$24,320**",
    sql: `SELECT SUM(CashSum + TrsfrSum + CheckSum) AS ReceivedToday
FROM ORCT
WHERE DocDate = CAST(GETDATE() AS DATE);`,
    chart: "line",
  }
}

function greetingLine() {
  const h = new Date().getHours()
  if (h < 5) return "Still up?"
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  if (h < 22) return "Good evening"
  return "Good evening"
}

export function WorkspaceView() {
  const [messages, setMessages] = useState<ChatMessageModel[]>([])
  const [busy, setBusy] = useState(false)
  const [typingId, setTypingId] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)
  const [showSqlDefault, setShowSqlDefault] = useState(true)
  const [page, setPage] = useState(1)
  const [downloadNote, setDownloadNote] = useState<string | null>(null)
  const pageSize = 2
  const totalPages = Math.max(1, Math.ceil(mockQueryRows.length / pageSize))
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return mockQueryRows.slice(start, start + pageSize)
  }, [page])

  const hasConversation = messages.length > 0
  const showResultsPanel = messages.some((m) => m.role === "assistant")

  const sendPrompt = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || busy) return
      const userMsg: ChatMessageModel = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      }
      setMessages((m) => [...m, userMsg])
      setBusy(true)
      setThinking(true)

      window.setTimeout(() => {
        const assistant = buildAssistantMessage(trimmed)
        setMessages((m) => [...m, assistant])
        setThinking(false)
        setBusy(false)
        setTypingId(assistant.id)
        window.setTimeout(() => setTypingId(null), Math.min(4000, 800 + assistant.content.length * 8))
      }, 900)
    },
    [busy]
  )

  return (
    <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col">
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-3 md:px-4">
        <ScrollArea className="min-h-0 flex-1 [--radix-scroll-area-corner-width:0px]">
          <div className={hasConversation ? "pb-6 pt-2" : ""}>
            {!hasConversation ? (
              <div className="flex flex-col items-center px-2 pt-8 text-center md:pt-14">
                <div className="mb-6 flex flex-col items-center gap-4 md:flex-row md:gap-5">
                  <Sparkles className="size-9 shrink-0 text-amber-400/90 md:size-10" strokeWidth={1.25} />
                  <h1 className="font-serif text-[1.65rem] font-normal tracking-tight text-foreground md:text-4xl md:leading-tight">
                    {greetingLine()}
                  </h1>
                </div>
                <p className="text-muted-foreground max-w-md text-sm leading-relaxed md:text-[0.9375rem]">
                  Talk to your database in plain language. AirBI connects your questions to SAP B1—no SQL required on your side (mock).
                </p>
              </div>
            ) : (
              <div className="space-y-8 pb-2">
                {messages.map((m) => (
                  <ChatMessage
                    key={m.id}
                    message={m}
                    loading={false}
                    typing={m.id === typingId}
                    forceSqlOpen={showSqlDefault}
                    appearance="chat"
                  />
                ))}
                {thinking && (
                  <ChatMessage
                    message={{ id: "thinking", role: "assistant", content: "" }}
                    loading
                    appearance="chat"
                  />
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div
          className={
            hasConversation
              ? "mt-auto shrink-0 space-y-3 border-t border-white/[0.06] bg-background/85 py-4 backdrop-blur-md"
              : "mt-auto shrink-0 space-y-3 py-6"
          }
        >
          {showResultsPanel && (
            <details className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] open:border-white/[0.12] open:bg-white/[0.03]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium outline-none [&::-webkit-details-marker]:hidden">
                <span className="text-muted-foreground group-open:text-foreground">
                  Sample results & charts
                </span>
                <ChevronDown className="text-muted-foreground size-4 shrink-0 transition group-open:rotate-180" />
              </summary>
              <div className="border-border/50 space-y-3 border-t px-3 pb-3 pt-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch id="sqlvis" checked={showSqlDefault} onCheckedChange={setShowSqlDefault} />
                    <Label htmlFor="sqlvis" className="text-xs">
                      Show generated SQL
                    </Label>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-xs">
                    <Filter className="mr-1.5 size-3.5" />
                    Filters
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    onClick={() => {
                      setDownloadNote("Report exported as airbi-mock-export.xlsx (mock).")
                      window.setTimeout(() => setDownloadNote(null), 4000)
                    }}
                  >
                    <Download className="mr-1.5 size-3.5" />
                    Download
                  </Button>
                </div>
                {downloadNote && (
                  <Alert>
                    <AlertTitle>Download ready</AlertTitle>
                    <AlertDescription>{downloadNote}</AlertDescription>
                  </Alert>
                )}
                <Tabs defaultValue="table">
                  <TabsList className="bg-muted/30 h-9 w-full justify-start rounded-xl p-1">
                    <TabsTrigger value="table" className="rounded-lg text-xs">
                      Table
                    </TabsTrigger>
                    <TabsTrigger value="line" className="rounded-lg text-xs">
                      Line
                    </TabsTrigger>
                    <TabsTrigger value="bar" className="rounded-lg text-xs">
                      Bar
                    </TabsTrigger>
                    <TabsTrigger value="pie" className="rounded-lg text-xs">
                      Pie
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="table" className="mt-3">
                    <div className="overflow-hidden rounded-xl border border-white/10">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {mockQueryColumns.map((c) => (
                              <TableHead key={c} className="text-xs">
                                {c}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pageRows.map((row, idx) => (
                            <TableRow key={idx}>
                              {mockQueryColumns.map((c) => (
                                <TableCell key={c} className="text-xs">
                                  {String(row[c])}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
                      <span>
                        Page {page} of {totalPages}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg text-xs"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg text-xs"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="line" className="mt-3">
                    <RevenueChart data={mockRevenueSeries} />
                  </TabsContent>
                  <TabsContent value="bar" className="mt-3">
                    <ResultBarChart data={mockBarChart} />
                  </TabsContent>
                  <TabsContent value="pie" className="mt-3">
                    <ResultPieChart data={mockPieChart} />
                  </TabsContent>
                </Tabs>
              </div>
            </details>
          )}

          <ChatInput variant="prominent" onSend={sendPrompt} disabled={busy} />
          <SuggestedPrompts variant="minimal" prompts={suggestedPrompts} onSelect={sendPrompt} />
        </div>
      </div>
    </div>
  )
}
