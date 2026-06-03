"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { DataSource } from "@/types"
import { fetchDataSources } from "@/lib/api/data-sources"

type ActiveDataSourceContextValue = {
  dataSources: DataSource[]
  activeDataSourceId: string
  setActiveDataSourceId: (id: string) => void
  activeDataSource: DataSource | undefined
  loadingDataSources: boolean
  refreshDataSources: () => Promise<void>
}

const ActiveDataSourceContext = createContext<ActiveDataSourceContextValue>({
  dataSources: [],
  activeDataSourceId: "",
  setActiveDataSourceId: () => {},
  activeDataSource: undefined,
  loadingDataSources: true,
  refreshDataSources: async () => {},
})

export function ActiveDataSourceProvider({ children }: { children: React.ReactNode }) {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [activeDataSourceId, setActiveDataSourceId] = useState("")
  const [loadingDataSources, setLoadingDataSources] = useState(true)

  const load = async () => {
    setLoadingDataSources(true)
    try {
      const list = await fetchDataSources()
      setDataSources(list)
      setActiveDataSourceId((prev) => prev || list[0]?.id || "")
    } catch {
      setDataSources([])
    } finally {
      setLoadingDataSources(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const activeDataSource = dataSources.find((d) => d.id === activeDataSourceId) ?? dataSources[0]

  return (
    <ActiveDataSourceContext.Provider
      value={{
        dataSources,
        activeDataSourceId,
        setActiveDataSourceId,
        activeDataSource,
        loadingDataSources,
        refreshDataSources: load,
      }}
    >
      {children}
    </ActiveDataSourceContext.Provider>
  )
}

export function useActiveDataSource() {
  return useContext(ActiveDataSourceContext)
}
