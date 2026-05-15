"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check, Copy } from "lucide-react"

export function SQLCodeBlock({ code, defaultOpen = true }: { code: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-muted-foreground text-xs font-medium tracking-wide uppercase hover:text-foreground"
        >
          {open ? "Hide SQL" : "Show SQL"}
        </button>
        <Button type="button" variant="ghost" size="icon-sm" className="rounded-lg" onClick={handleCopy}>
          {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
          <span className="sr-only">Copy SQL</span>
        </Button>
      </div>
      <div className={cn(!open && "hidden")}>
        <pre className="max-h-64 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-zinc-100">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  )
}
