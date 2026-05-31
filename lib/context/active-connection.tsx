"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { ErpConnection } from "@/types"
import { fetchConnections } from "@/lib/api/connections"

type ActiveConnectionContextValue = {
  connections: ErpConnection[]
  activeConnectionId: string
  setActiveConnectionId: (id: string) => void
  activeConnection: ErpConnection | undefined
  loadingConnections: boolean
  refreshConnections: () => Promise<void>
}

const ActiveConnectionContext = createContext<ActiveConnectionContextValue>({
  connections: [],
  activeConnectionId: "",
  setActiveConnectionId: () => {},
  activeConnection: undefined,
  loadingConnections: true,
  refreshConnections: async () => {},
})

export function ActiveConnectionProvider({ children }: { children: React.ReactNode }) {
  const [connections, setConnections] = useState<ErpConnection[]>([])
  const [activeConnectionId, setActiveConnectionId] = useState("")
  const [loadingConnections, setLoadingConnections] = useState(true)

  const load = async () => {
    setLoadingConnections(true)
    try {
      const list = await fetchConnections()
      setConnections(list)
      setActiveConnectionId((prev) => prev || list[0]?.id || "")
    } catch {
      setConnections([])
    } finally {
      setLoadingConnections(false)
    }
  }

  useEffect(() => { load() }, [])

  const activeConnection = connections.find((c) => c.id === activeConnectionId) ?? connections[0]

  return (
    <ActiveConnectionContext.Provider
      value={{
        connections,
        activeConnectionId,
        setActiveConnectionId,
        activeConnection,
        loadingConnections,
        refreshConnections: load,
      }}
    >
      {children}
    </ActiveConnectionContext.Provider>
  )
}

export function useActiveConnection() {
  return useContext(ActiveConnectionContext)
}
