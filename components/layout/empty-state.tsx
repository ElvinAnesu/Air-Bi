import type { ComponentType } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center",
        className
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
        <Icon className="text-muted-foreground size-5" />
      </div>
      <h3 className="text-base font-medium tracking-tight">{title}</h3>
      <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button type="button" className="mt-6 rounded-xl" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
