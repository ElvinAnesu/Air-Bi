"use client"

import { useEffect } from "react"
import { useActiveDataSource } from "@/lib/context/active-data-source"

type RestoreActiveDataSourceOptions = {
  dataSourceId?: string | null
  connectionId?: string | null
  ready?: boolean
}

export function useRestoreActiveDataSource({
  dataSourceId,
  connectionId,
  ready = true,
}: RestoreActiveDataSourceOptions) {
  const { dataSources, loadingDataSources, setActiveDataSourceId } = useActiveDataSource()

  useEffect(() => {
    if (!ready || loadingDataSources) return

    if (dataSourceId && dataSources.some((d) => d.id === dataSourceId)) {
      setActiveDataSourceId(dataSourceId)
      return
    }

    if (connectionId) {
      const match = dataSources.find((d) => d.connectionId === connectionId)
      if (match) setActiveDataSourceId(match.id)
    }
  }, [ready, loadingDataSources, dataSourceId, connectionId, dataSources, setActiveDataSourceId])
}
