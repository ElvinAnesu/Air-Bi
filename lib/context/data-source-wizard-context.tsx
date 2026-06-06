"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { TableCleaningConfig } from "@/types"
import type { SelectedCatalogTable } from "@/components/data-sources/wizard/table-catalog-picker"

export type PreparedRow = Record<string, string | number | null> & { _rowId: string }

export type TableDraft = SelectedCatalogTable & {
  cleaning: TableCleaningConfig
  /** Loaded/edited rows for prepare step */
  preparedRows?: PreparedRow[]
  preparedColumns?: Array<{ name: string; type: string }>
  /** Column names included in import; all columns when unset/empty means all included */
  includedColumns?: string[]
  /** Row ids selected for bulk actions */
  selectedRowIds?: string[]
}

export type DataSourceWizardState = {
  name: string
  sourceKind: "connection" | "excel" | null
  connectionId: string
  sessionId: string | null
  excelFileName: string | null
  selected: SelectedCatalogTable[]
  drafts: Record<string, TableDraft>
  activeCleanKey: string | null
}

const STORAGE_KEY = "airbi:data-source-wizard"

const defaultState: DataSourceWizardState = {
  name: "",
  sourceKind: null,
  connectionId: "",
  sessionId: null,
  excelFileName: null,
  selected: [],
  drafts: {},
  activeCleanKey: null,
}

export function tableKey(t: SelectedCatalogTable) {
  return `${t.schema}:${t.externalName}`
}

type ContextValue = {
  state: DataSourceWizardState
  setState: React.Dispatch<React.SetStateAction<DataSourceWizardState>>
  setupDialogOpen: boolean
  setSetupDialogOpen: (open: boolean) => void
  reset: () => void
  ensureDrafts: (tables: SelectedCatalogTable[]) => void
  updateDraft: (key: string, draft: TableDraft) => void
}

const DataSourceWizardContext = createContext<ContextValue | null>(null)

function loadStored(): DataSourceWizardState {
  if (typeof window === "undefined") return defaultState
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    return { ...defaultState, ...JSON.parse(raw) }
  } catch {
    return defaultState
  }
}

export function DataSourceWizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataSourceWizardState>(defaultState)
  const [setupDialogOpen, setSetupDialogOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setState(loadStored())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state, hydrated])

  const reset = useCallback(() => {
    setState(defaultState)
    setSetupDialogOpen(false)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const ensureDrafts = useCallback((tables: SelectedCatalogTable[]) => {
    setState((prev) => {
      const next: Record<string, TableDraft> = { ...prev.drafts }
      for (const t of tables) {
        const k = tableKey(t)
        if (!next[k]) next[k] = { ...t, cleaning: { transforms: [] } }
      }
      for (const k of Object.keys(next)) {
        if (!tables.some((t) => tableKey(t) === k)) delete next[k]
      }
      let activeCleanKey = prev.activeCleanKey
      if (!activeCleanKey && tables.length > 0) activeCleanKey = tableKey(tables[0])
      return { ...prev, selected: tables, drafts: next, activeCleanKey }
    })
  }, [])

  const updateDraft = useCallback((key: string, draft: TableDraft) => {
    setState((prev) => ({
      ...prev,
      drafts: { ...prev.drafts, [key]: draft },
    }))
  }, [])

  const value = useMemo(
    () => ({
      state,
      setState,
      setupDialogOpen,
      setSetupDialogOpen,
      reset,
      ensureDrafts,
      updateDraft,
    }),
    [state, setupDialogOpen, reset, ensureDrafts, updateDraft]
  )

  if (!hydrated) {
    return (
      <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center text-sm">
        Loading&hellip;
      </div>
    )
  }

  return (
    <DataSourceWizardContext.Provider value={value}>{children}</DataSourceWizardContext.Provider>
  )
}

export function useDataSourceWizard() {
  const ctx = useContext(DataSourceWizardContext)
  if (!ctx) throw new Error("useDataSourceWizard must be used within DataSourceWizardProvider")
  return ctx
}
