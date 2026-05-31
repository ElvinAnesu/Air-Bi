"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useActiveConnection } from "@/lib/context/active-connection"
import { useUI } from "@/lib/context/ui-context"
import { cn } from "@/lib/utils"
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Cable,
  ChevronDown,
  Database,
  LayoutDashboard,
  MessagesSquare,
  PanelLeft,
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

function NavTooltip({
  label,
  collapsed,
  children,
}: {
  label: string
  collapsed: boolean
  children: React.ReactNode
}) {
  if (!collapsed) return <>{children}</>
  return (
    <Tooltip>
      {/*
        base-ui Trigger renders as <button> by default, causing nested-button errors
        when children contain a <button> or <Link> (<a>).
        Using render={<span />} makes the trigger a <span>, which is valid as a
        parent of any element, and pointer/hover events still bubble up correctly.
      */}
      <TooltipTrigger render={<span className="block" />}>
        {children}
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export function SidebarNav({
  className,
  collapsed = false,
}: {
  className?: string
  collapsed?: boolean
}) {
  const pathname = usePathname() ?? "/"
  const { connections, activeConnectionId, setActiveConnectionId, activeConnection } = useActiveConnection()
  const { toggleSidebar } = useUI()

  return (
    <div className={cn("flex h-full flex-col", className)}>

      {/* ── Logo ── */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-4",
          collapsed && "justify-center px-0"
        )}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/30 to-violet-500/30 ring-1 ring-white/10">
          <Sparkles className="size-4 text-primary dark:text-sky-200" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-semibold tracking-tight">AirBI</p>
            <p className="text-muted-foreground text-[11px]">Enterprise intelligence</p>
          </div>
        )}
      </div>

      {/* ── Data source picker ── */}
      <div className={cn("pb-3", collapsed ? "flex justify-center px-0" : "px-3")}>
        {collapsed ? (
          <NavTooltip label={activeConnection?.name ?? "Data sources"} collapsed={collapsed}>
            <button className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] transition hover:bg-white/[0.06]">
              <Database className="size-4 text-muted-foreground" />
            </button>
          </NavTooltip>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex min-h-10 w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium shadow-none outline-none transition hover:bg-white/[0.05]">
              <span className="flex min-w-0 flex-col items-start text-left leading-tight">
                <span className="truncate">{activeConnection?.name ?? "Data sources"}</span>
                {activeConnection && (
                  <span className="text-muted-foreground max-w-full truncate text-[10px] font-normal">
                    {activeConnection.erpType}
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
                    onClick={() => setActiveConnectionId(c.id)}
                    className={cn(
                      "rounded-lg py-2 focus:bg-white/10 focus:text-foreground",
                      activeConnectionId === c.id
                        ? "bg-sky-500/15 text-foreground ring-1 ring-sky-500/25"
                        : "text-foreground hover:bg-white/[0.08]"
                    )}
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-medium">{c.name}</span>
                      <span
                        className={cn(
                          "truncate text-[11px] font-normal",
                          activeConnectionId === c.id ? "text-foreground/70" : "text-muted-foreground"
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
        )}
      </div>

      <Separator className="bg-white/10" />

      {/* ── Nav items ── */}
      <nav className={cn("flex-1 space-y-0.5 overflow-y-auto py-3", collapsed ? "px-1.5" : "px-2")}>
        {!collapsed && (
          <p className="text-muted-foreground px-2 pb-2 text-[10px] font-semibold tracking-wide uppercase">
            Navigate
          </p>
        )}
        {mainNav.map((item) => {
          const Icon = item.icon
          const active = navItemIsActive(pathname, item.href)
          return (
            <NavTooltip key={item.href + item.label} label={item.label} collapsed={collapsed}>
              <Link href={item.href}>
                <span
                  className={cn(
                    "flex items-center rounded-xl transition",
                    collapsed ? "justify-center p-2.5" : "gap-2 px-2 py-2",
                    active
                      ? "bg-primary/15 text-primary ring-1 ring-primary/20 dark:bg-white/[0.08] dark:text-foreground dark:ring-white/10"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-foreground dark:hover:bg-white/[0.05]"
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", active ? "opacity-100" : "opacity-70")} />
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                </span>
              </Link>
            </NavTooltip>
          )
        })}
      </nav>

      {/* ── Toggle button ── */}
      <div className={cn("border-t border-white/10 p-2", collapsed && "flex justify-center")}>
        <NavTooltip label={collapsed ? "Expand sidebar" : "Collapse sidebar"} collapsed={collapsed}>
          <button
            onClick={toggleSidebar}
            className={cn(
              "flex items-center justify-center rounded-xl p-2.5 text-muted-foreground transition hover:bg-white/[0.05] hover:text-foreground",
              !collapsed && "w-full"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="size-4 shrink-0" />
          </button>
        </NavTooltip>
      </div>
    </div>
  )
}
