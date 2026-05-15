"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SendHorizonal } from "lucide-react"
import { cn } from "@/lib/utils"

export function ChatInput({
  onSend,
  disabled,
  variant = "default",
}: {
  onSend: (text: string) => void
  disabled?: boolean
  variant?: "default" | "prominent"
}) {
  const [value, setValue] = useState("")

  const submit = () => {
    const t = value.trim()
    if (!t) return
    onSend(t)
    setValue("")
  }

  const prominent = variant === "prominent"

  return (
    <div
      className={cn(
        "border border-white/[0.08] bg-black/25 p-2 shadow-none backdrop-blur-md",
        prominent ? "rounded-[1.35rem]" : "border-border/60 rounded-2xl bg-black/30 shadow-inner"
      )}
    >
      <Textarea
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        placeholder={prominent ? "Message AirBI…" : "Ask AirBI anything about your ERP data..."}
        className={cn(
          "resize-none border-0 bg-transparent px-3 py-3 text-[0.9375rem] leading-relaxed shadow-none focus-visible:ring-0",
          prominent ? "min-h-[100px] md:min-h-[120px]" : "min-h-[52px] px-2 py-2 text-sm"
        )}
      />
      <div className="flex items-center justify-end px-1 pb-1">
        <Button
          type="button"
          size="sm"
          className={cn("rounded-xl", prominent && "h-9 px-4")}
          onClick={submit}
          disabled={disabled || !value.trim()}
        >
          <SendHorizonal className="mr-1.5 size-4" />
          Send
        </Button>
      </div>
    </div>
  )
}
