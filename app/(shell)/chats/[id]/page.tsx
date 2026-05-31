"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import type { ChatMessageModel } from "@/types"
import { WorkspaceView } from "@/components/workspace/workspace-view"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

type ApiChat = {
  id: string
  title: string
  messages: { id: string; role: "user" | "assistant"; content: string; created_at: string }[]
}

export default function ChatDetailPage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""

  const [chat, setChat] = useState<ApiChat | null | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    fetch(`/api/chats/${id}`)
      .then((r) => {
        if (!r.ok) return null
        return r.json()
      })
      .then((data) => setChat(data))
      .catch(() => setChat(null))
  }, [id])

  if (chat === undefined) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading chat&hellip;
      </div>
    )
  }

  if (chat === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-medium">Chat not found</p>
        <p className="text-xs text-muted-foreground">It may have been deleted or the link is invalid.</p>
        <Link href="/chats">
          <Button variant="outline" size="sm" className="rounded-xl">
            <ArrowLeft className="mr-1.5 size-3.5" />
            Back to chats
          </Button>
        </Link>
      </div>
    )
  }

  const messages: ChatMessageModel[] = chat.messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
  }))

  return <WorkspaceView initialMessages={messages} initialChatId={chat.id} />
}
