"use client"

import { useEffect, useState } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { ChatMessageModel } from "@/types"
import { cn } from "@/lib/utils"
import { SQLCodeBlock } from "@/components/chat/sql-code-block"
import { MessageActions } from "@/components/chat/message-actions"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function StreamingMarkdown({ text }: { text: string }) {
  const [shown, setShown] = useState("")

  useEffect(() => {
    let i = 0
    const id = window.setInterval(() => {
      i += 2
      setShown(text.slice(0, i))
      if (i >= text.length) window.clearInterval(id)
    }, 12)
    return () => window.clearInterval(id)
  }, [text])

  return (
    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-a:text-sky-300">
      <Markdown remarkPlugins={[remarkGfm]}>{shown}</Markdown>
    </div>
  )
}

const proseChat =
  "prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-a:text-sky-300"

function AssistantBody({
  message,
  loading,
  typing,
  forceSqlOpen,
}: {
  message: ChatMessageModel
  loading?: boolean
  typing?: boolean
  forceSqlOpen?: boolean
}) {
  return (
    <>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      ) : typing ? (
        <StreamingMarkdown key={message.content} text={message.content} />
      ) : (
        <div className={proseChat}>
          <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
        </div>
      )}
      {!loading && !typing && message.summary && (
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2 text-xs leading-relaxed">
          <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
            Summary
          </p>
          <div className={cn(proseChat, "text-xs")}>
            <Markdown remarkPlugins={[remarkGfm]}>{message.summary}</Markdown>
          </div>
        </div>
      )}
      {!loading && !typing && message.sql && (
        <SQLCodeBlock code={message.sql} defaultOpen={forceSqlOpen ?? true} />
      )}
      {!loading && !typing && <MessageActions />}
    </>
  )
}

export function ChatMessage({
  message,
  loading,
  typing,
  forceSqlOpen,
  appearance = "card",
}: {
  message: ChatMessageModel
  loading?: boolean
  typing?: boolean
  forceSqlOpen?: boolean
  appearance?: "card" | "chat"
}) {
  const isUser = message.role === "user"

  if (appearance === "chat") {
    return (
      <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
        <div className={cn("w-full max-w-[min(100%,42rem)] space-y-3", isUser ? "flex flex-col items-end" : "")}>
          {isUser ? (
            <div className="rounded-[1.35rem] border border-white/[0.08] bg-white/[0.07] px-4 py-2.5 text-[0.9375rem] leading-relaxed">
              {message.content}
            </div>
          ) : (
            <div className="text-[0.9375rem] leading-relaxed">
              <AssistantBody
                message={message}
                loading={loading}
                typing={typing}
                forceSqlOpen={forceSqlOpen}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[min(720px,100%)] space-y-3", isUser ? "items-end" : "items-start")}>
        {isUser ? (
          <Card className="rounded-2xl border-white/10 bg-white/[0.06] shadow-none">
            <CardContent className="px-4 py-3 text-sm leading-relaxed">{message.content}</CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md">
            <CardContent className="space-y-3 px-4 py-3">
              <AssistantBody
                message={message}
                loading={loading}
                typing={typing}
                forceSqlOpen={forceSqlOpen}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
