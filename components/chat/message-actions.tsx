"use client"

import { Button } from "@/components/ui/button"
import { ThumbsDown, ThumbsUp, Share2 } from "lucide-react"

export function MessageActions() {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      <Button variant="ghost" size="icon-sm" className="rounded-lg" type="button" aria-label="Helpful">
        <ThumbsUp className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon-sm" className="rounded-lg" type="button" aria-label="Not helpful">
        <ThumbsDown className="size-3.5" />
      </Button>
      <Button variant="ghost" size="sm" className="rounded-lg text-xs" type="button">
        <Share2 className="mr-1.5 size-3.5" />
        Share
      </Button>
    </div>
  )
}
