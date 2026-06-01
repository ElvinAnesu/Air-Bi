"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare } from "lucide-react"

type ApiChat = {
  id: string
  title: string
  connection_id: string | null
  created_at: string
  updated_at: string
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ChatsPage() {
  const [chats, setChats] = useState<ApiChat[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch("/api/chats")
      .then((r) => r.json())
      .then((data) => setChats(Array.isArray(data) ? data : []))
      .catch(() => setChats([]))
      .finally(() => setLoaded(true))
  }, [])

  return (
    <div className="h-full overflow-auto p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chats</h1>
          <p className="text-muted-foreground mt-1 text-sm">Your conversation history, shared across your workspace.</p>
        </div>

        {loaded && chats.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.08]">
              <MessageSquare className="size-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium">No chats yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Start a conversation from the home page and it will appear here automatically.
            </p>
            <Link
              href="/workspace"
              className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium transition hover:bg-white/[0.08]"
            >
              New chat
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <Link key={chat.id} href={`/chats/${chat.id}`} className="block">
                <Card className="rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.05]">
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex min-w-0 gap-2">
                      <div className="bg-muted/50 flex size-9 shrink-0 items-center justify-center rounded-xl">
                        <MessageSquare className="text-muted-foreground size-4" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-sm font-medium">{chat.title}</CardTitle>
                      </div>
                    </div>
                    <span className="shrink-0 text-muted-foreground text-[11px]">
                      {relativeTime(chat.updated_at)}
                    </span>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
