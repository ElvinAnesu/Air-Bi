"use client"

import { Button } from "@/components/ui/button"
import { SkipForward } from "lucide-react"

type Props = {
  disabled?: boolean
  onSkip: () => void
}

export function ClarifyPromptActions({ disabled, onSkip }: Props) {
  return (
    <div className="border-border/60 bg-muted/30 flex flex-col gap-2 rounded-xl border px-3 py-3">
      <p className="text-muted-foreground text-xs leading-relaxed">
        Answer the questions above, or skip and AirBI will build the best report it can from your request and data.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-fit rounded-xl border-white/15 text-xs"
        disabled={disabled}
        onClick={onSkip}
      >
        <SkipForward className="mr-1.5 size-3.5" />
        Skip questions &amp; create report
      </Button>
    </div>
  )
}
