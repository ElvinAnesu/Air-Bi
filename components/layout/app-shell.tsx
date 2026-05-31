"use client"

import { useState } from "react"
import { SidebarNav } from "@/components/layout/sidebar-nav"
import { Topbar } from "@/components/layout/topbar"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useUI } from "@/lib/context/ui-context"
import { cn } from "@/lib/utils"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { sidebarOpen } = useUI()

  return (
    <div className="bg-background text-foreground flex min-h-dvh">
      {/* Desktop sidebar — animates between w-72 (open) and w-14 (collapsed) */}
      <aside
        className={cn(
          "border-border/60 hidden shrink-0 flex-col border-r bg-black/25 backdrop-blur-xl lg:flex",
          "transition-[width] duration-200 ease-in-out",
          sidebarOpen ? "w-72" : "w-14"
        )}
      >
        <SidebarNav className="h-full" collapsed={!sidebarOpen} />
      </aside>

      {/* Mobile sidebar — sheet overlay */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarNav className="h-full pt-10" collapsed={false} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
