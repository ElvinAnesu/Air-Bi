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
import { useActiveDataSource } from "@/lib/context/active-data-source"
import { useActiveConnection } from "@/lib/context/active-connection"
import { useAuth } from "@/lib/context/auth-context"
import { LogOut, Menu, Moon, Plus, Search, Sun } from "lucide-react"

const titles: Record<string, string> = {
  "/workspace": "New chat",
  "/chats": "Chats",
  "/reports": "Reports",
  "/saved-queries": "Saved queries",
  "/data-sources": "Data sources",
  "/connections": "Connections",
  "/teams": "Teams",
  "/billing": "Billing & usage",
  "/settings": "Settings",
}

function useDarkModeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark)
  }, [isDark])

  return { isDark, toggle: () => setIsDark((d) => !d) }
}

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname()
  const { dataSources, activeDataSource } = useActiveDataSource()
  const { connections } = useActiveConnection()

  const dataSourceDetailTitle =
    pathname?.startsWith("/data-sources/") && pathname !== "/data-sources"
      ? dataSources.find((d) => pathname === `/data-sources/${d.id}`)?.name
      : undefined

  const connectionDetailTitle =
    pathname?.startsWith("/connections/") && pathname !== "/connections"
      ? connections.find((c) => pathname === `/connections/${c.id}`)?.name
      : undefined

  const title =
    titles[pathname ?? ""] ??
    dataSourceDetailTitle ??
    connectionDetailTitle ??
    (pathname?.startsWith("/chats") ? titles["/chats"] : undefined) ??
    "AirBI"
  const { user, teamName, signOut } = useAuth()
  const { isDark, toggle } = useDarkModeToggle()

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email?.[0] ?? "?").toUpperCase()

  return (
    <header className="border-border bg-background/95 flex h-14 items-center gap-3 border-b px-3 backdrop-blur-xl md:px-4">
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
        <p className="text-muted-foreground truncate text-xs">Natural language to ERP intelligence</p>
      </div>
      <div className="relative mx-auto hidden max-w-md flex-1 md:mx-0 md:flex">
        <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-3 size-4" />
        <Input
          placeholder="Search workspaces, tables, and insights"
          className="border-border bg-muted/60 text-foreground placeholder:text-muted-foreground h-9 rounded-xl pl-9 text-xs"
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
        {activeDataSource && (
          <Badge
            variant="outline"
            className="hidden border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-200 sm:inline-flex"
          >
            {activeDataSource.name}
          </Badge>
        )}
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
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52 rounded-xl" align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs">
                <span className="block truncate font-medium">{user?.fullName ?? user?.email}</span>
                {teamName && (
                  <span className="block truncate text-[10px] font-normal text-muted-foreground">{teamName}</span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => signOut()}
              >
                <LogOut className="mr-2 size-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
