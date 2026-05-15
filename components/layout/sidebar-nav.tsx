"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import type { ErpConnection } from "@/types"
import { cn } from "@/lib/utils"
import { fetchConnections } from "@/lib/api/connections"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Cable,
  ChevronDown,
  LayoutDashboard,
  MessagesSquare,
  ScrollText,
  Settings,
  Sparkles,
  SquarePen,
} from "lucide-react"

const mainNav = [
  { href: "/", label: "New chat", icon: SquarePen },
  { href: "/chats", label: "Chats", icon: MessagesSquare },
  { href: "/reports", label: "Reports", icon: LayoutDashboard },
  { href: "/saved-queries", label: "Saved queries", icon: ScrollText },
  { href: "/connections", label: "Connections", icon: Cable },
  { href: "/settings", label: "Settings", icon: Settings },
] as const

function navItemIsActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SidebarNav({ className }: { className?: string }) {
  const pathname = usePathname() ?? "/"
  const [connections, setConnections] = useState<ErpConnection[]>([])
  const [activeSourceId, setActiveSourceId] = useState("")

  useEffect(() => {
    void fetchConnections()
      .then((list) => {
        setConnections(list)
        setActiveSourceId((prev) => prev || list[0]?.id || "")
      })
      .catch(() => setConnections([]))
  }, [])

  const activeSource = connections.find((c) => c.id === activeSourceId) ?? connections[0]
  const triggerLabel = activeSource?.name ?? "Data sources"

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center gap-2 px-3 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/30 to-violet-500/30 ring-1 ring-white/10">
          <Sparkles className="size-4 text-sky-200" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">AirBI</p>
          <p className="text-muted-foreground text-[11px]">Enterprise intelligence</p>
        </div>
      </div>

      <div className="px-3 pb-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="border-input bg-background hover:bg-muted/50 inline-flex min-h-10 w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium shadow-none outline-none transition">
            <span className="flex min-w-0 flex-col items-start text-left leading-tight">
              <span className="truncate">{triggerLabel}</span>
              {activeSource && (
                <span className="text-muted-foreground max-w-full truncate text-[10px] font-normal">
                  {activeSource.erpType}
                </span>
              )}
            </span>
            <ChevronDown className="size-3.5 shrink-0 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-xl border border-white/15 bg-zinc-900/95 shadow-xl ring-1 ring-white/10 backdrop-blur-xl"
            align="start"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-foreground/80">Data sources</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              {connections.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => setActiveSourceId(c.id)}
                  className={cn(
                    "rounded-lg py-2 focus:bg-white/10 focus:text-foreground",
                    activeSourceId === c.id
                      ? "bg-sky-500/15 text-foreground ring-1 ring-sky-500/25"
                      : "text-foreground hover:bg-white/8"
                  )}
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-medium">{c.name}</span>
                    <span
                      className={cn(
                        "truncate text-[11px] font-normal",
                        activeSourceId === c.id ? "text-foreground/70" : "text-muted-foreground"
                      )}
                    >
                      {c.erpType}
                    </span>
                    </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator className="bg-white/10" />

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        <p className="text-muted-foreground px-2 pb-2 text-[10px] font-semibold tracking-wide uppercase">
          Navigate
        </p>
        {mainNav.map((item) => {
          const Icon = item.icon
          const active = navItemIsActive(pathname, item.href)
          return (
            <Link key={item.href + item.label} href={item.href}>
              <span
                className={cn(
                  "flex items-center gap-2 rounded-xl px-2 py-2 text-sm transition",
                  active
                    ? "bg-white/[0.08] text-foreground ring-1 ring-white/10"
                    : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0 opacity-80" />
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
