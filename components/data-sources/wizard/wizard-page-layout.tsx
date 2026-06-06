"use client"

import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowLeft, Loader2 } from "lucide-react"

const PAGE_STEPS = ["Tables", "Prepare", "Review"] as const

type Props = {
  stepIndex: number
  title: string
  description: string
  children: React.ReactNode
  /** Narrow centered column (tables/review) vs full workspace width (prepare) */
  variant?: "default" | "full"
  backHref?: string
  onBack?: () => void
  primaryLabel?: string
  onPrimary?: () => void
  primaryDisabled?: boolean
  primaryLoading?: boolean
  showPrimary?: boolean
  secondaryLabel?: string
  onSecondary?: () => void
  secondaryDisabled?: boolean
}

export function WizardPageLayout({
  stepIndex,
  title,
  description,
  children,
  variant = "default",
  backHref,
  onBack,
  primaryLabel = "Next",
  onPrimary,
  primaryDisabled,
  primaryLoading,
  showPrimary = true,
  secondaryLabel,
  onSecondary,
  secondaryDisabled,
}: Props) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          "mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden py-4",
          variant === "full"
            ? "max-w-none px-4 md:px-8 lg:px-10"
            : "max-w-3xl px-4 md:px-8 md:py-6"
        )}
      >
        <div className="shrink-0">
          <Link
            href="/data-sources"
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm transition"
          >
            <ArrowLeft className="size-4" />
            Data sources
          </Link>

          <nav className="mb-4 flex flex-wrap gap-1" aria-label="Progress">
            {PAGE_STEPS.map((label, i) => (
              <span
                key={label}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-medium tracking-wide uppercase",
                  i === stepIndex
                    ? "bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/30"
                    : i < stepIndex
                      ? "text-muted-foreground"
                      : "text-muted-foreground/50"
                )}
              >
                {label}
              </span>
            ))}
            <span className="text-muted-foreground/40 px-1 text-[10px]">·</span>
            <span className="text-muted-foreground/50 rounded-full px-2 py-1 text-[10px] uppercase">
              Setup in dialog
            </span>
          </nav>

          <header className="mb-3">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">{description}</p>
          </header>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 pr-1",
            variant === "full"
              ? "flex flex-col overflow-hidden"
              : "overflow-y-auto overscroll-y-contain"
          )}
        >
          {children}
        </div>

        <footer className="border-border/60 mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-zinc-950 pt-4 pb-1">
          <div className="flex flex-wrap gap-2">
            {backHref ? (
              <Link
                href={backHref}
                className={cn(buttonVariants({ variant: "ghost" }), "rounded-xl")}
              >
                Back
              </Link>
            ) : onBack ? (
              <Button type="button" variant="ghost" className="rounded-xl" onClick={onBack}>
                Back
              </Button>
            ) : null}
            <Link
              href="/data-sources"
              className={cn(buttonVariants({ variant: "ghost" }), "rounded-xl")}
            >
              Cancel
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {secondaryLabel && onSecondary && (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-white/15"
                disabled={secondaryDisabled}
                onClick={onSecondary}
              >
                {secondaryLabel}
              </Button>
            )}
            {showPrimary && onPrimary && (
              <Button
                type="button"
                className="rounded-xl"
                disabled={primaryDisabled || primaryLoading}
                onClick={onPrimary}
              >
                {primaryLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {primaryLabel}
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
