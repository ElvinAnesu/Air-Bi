"use client"

import { useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Bookmark } from "lucide-react"

type SaveDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "report" | "query"
  defaultName: string
  description?: string
  onSave: (name: string) => void
}

export function SaveDialog({
  open,
  onOpenChange,
  type,
  defaultName,
  description,
  onSave,
}: SaveDialogProps) {
  const [name, setName] = useState(defaultName)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync default name whenever the dialog opens
  useEffect(() => {
    if (open) {
      setName(defaultName)
      // Focus + select on next tick so the animation doesn't fight it
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 80)
    }
  }, [open, defaultName])

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed)
    onOpenChange(false)
  }

  const label = type === "report" ? "Save report" : "Save query"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="size-4 text-sky-400" />
            {label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="save-name" className="text-xs font-medium">
              Name
            </Label>
            <Input
              id="save-name"
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
                if (e.key === "Escape") onOpenChange(false)
              }}
              placeholder={type === "report" ? "Report name…" : "Query name…"}
              className="h-9 rounded-xl border-white/10 bg-white/[0.04] text-sm"
            />
          </div>

          {description && (
            <p className="line-clamp-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="rounded-xl"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            <Bookmark className="mr-1.5 size-3.5" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
