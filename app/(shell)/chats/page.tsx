"use client"

import Link from "next/link"
import { mockChatHistory } from "@/lib/mock-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, MessageSquare } from "lucide-react"

export default function ChatsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Chats</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          History and sessions with pinned charts (mock).
        </p>
      </div>

      <div className="space-y-2">
        {mockChatHistory.map((c) => (
          <Link key={c.id} href="/" className="block">
            <Card className="rounded-2xl border-white/10 bg-white/[0.03] shadow-none backdrop-blur-md transition hover:border-white/20">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="flex min-w-0 gap-2">
                  <div className="bg-muted/50 flex size-9 shrink-0 items-center justify-center rounded-xl">
                    <MessageSquare className="text-muted-foreground size-4" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-sm font-medium">{c.title}</CardTitle>
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{c.preview}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-muted-foreground text-[11px]">{c.updatedAt}</span>
                  {c.hasChart && (
                    <Badge variant="outline" className="text-[10px]">
                      <LineChart className="mr-1 size-3" />
                      Chart
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="text-muted-foreground pt-0 text-[11px]">Open to continue · mock</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
