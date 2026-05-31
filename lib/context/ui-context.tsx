"use client"

import { createContext, useCallback, useContext, useState } from "react"

type UIContextValue = {
  sidebarOpen: boolean
  /** Auto-collapse the sidebar — ignored if the user manually overrode the state */
  autoCollapse: () => void
  /** User-initiated toggle — always acts and locks out auto-collapse */
  toggleSidebar: () => void
  /** Call when the workspace resets to empty so auto-collapse works again next time */
  resetSidebarOverride: () => void
}

const UIContext = createContext<UIContextValue>({
  sidebarOpen: true,
  autoCollapse: () => {},
  toggleSidebar: () => {},
  resetSidebarOverride: () => {},
})

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userOverrode, setUserOverrode] = useState(false)

  const autoCollapse = useCallback(() => {
    if (userOverrode) return
    setSidebarOpen(false)
  }, [userOverrode])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
    setUserOverrode(true)
  }, [])

  const resetSidebarOverride = useCallback(() => {
    setUserOverrode(false)
    setSidebarOpen(true)
  }, [])

  return (
    <UIContext.Provider value={{ sidebarOpen, autoCollapse, toggleSidebar, resetSidebarOverride }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  return useContext(UIContext)
}
