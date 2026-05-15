"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { mockConnections } from "@/lib/mock-data"
import { Menu, Moon, Plus, Search, Sun } from "lucide-react"

const titles: Record<string, string> = {
  "/": "New chat",
  "/chats": "Chats",
  "/reports": "Reports",
  "/saved-queries": "Saved queries",
  "/connections": "Connections",
  "/settings": "Settings",
}

function useDarkModeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark)
  }, [isDark])

  return { isDark, toggle: () => setIsDark((d) => !d) }
}

export function Topbar({
  onMenuClick,
  connectionLabel = "SAP B1 LIVE",
}: {
  onMenuClick?: () => void
  connectionLabel?: string
}) {
  const pathname = usePathname()
  const connectionDetailTitle =
    pathname?.startsWith("/connections/") && pathname !== "/connections"
      ? mockConnections.find((c) => pathname === `/connections/${c.id}`)?.name
      : undefined

  const title =
    titles[pathname ?? ""] ??
    connectionDetailTitle ??
    (pathname?.startsWith("/chats") ? titles["/chats"] : undefined) ??
    "AirBI"
  const { isDark, toggle } = useDarkModeToggle()

  return (
    <header className="border-border/60 flex h-14 items-center gap-3 border-b bg-black/20 px-3 backdrop-blur-xl md:px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </Button>
      <div className="hidden min-w-0 flex-1 md:block">
        <p className="truncate text-sm font-medium">{title}</p>
        {pathname !== "/" && (
          <p className="text-muted-foreground truncate text-xs">Natural language to ERP intelligence</p>
        )}
      </div>
      <div className="relative mx-auto hidden max-w-md flex-1 md:mx-0 md:flex">
        <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-3 size-4" />
        <Input
          placeholder="Search workspaces, tables, and insights"
          className="h-9 rounded-xl border-white/10 bg-white/[0.04] pl-9 text-xs"
        />
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-xl"
          title="Quick actions"
          aria-label="Quick actions"
        >
          <Plus className="size-4" />
        </Button>
        <Badge
          variant="outline"
          className="hidden border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-200 sm:inline-flex"
        >
          {connectionLabel}
        </Badge>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-xl"
          onClick={toggle}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger className="ring-offset-background focus-visible:ring-ring rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
            <Avatar className="size-8 border border-white/10">
              <AvatarFallback className="text-xs">JL</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 rounded-xl" align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs">Jordan Lee</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
