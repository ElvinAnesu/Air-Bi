"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SuggestedPrompts({
  prompts,
  onSelect,
  variant = "default",
}: {
  prompts: string[]
  onSelect: (p: string) => void
  variant?: "default" | "minimal"
}) {
  const minimal = variant === "minimal"

  return (
    <div className="flex flex-wrap justify-center gap-2 md:gap-2.5">
      {prompts.map((p) => (
        <Button
          key={p}
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-auto rounded-full border-white/[0.12] bg-transparent px-3.5 py-2 text-xs font-normal text-muted-foreground transition hover:border-white/20 hover:bg-white/[0.05] hover:text-foreground",
            minimal && "md:text-[13px]"
          )}
          onClick={() => onSelect(p)}
        >
          {p}
        </Button>
      ))}
    </div>
  )
}
