"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useDataSourceWizard } from "@/lib/context/data-source-wizard-context"
import { DataSourceSetupDialog } from "@/components/data-sources/wizard/setup-dialog"

function isSetupComplete(state: ReturnType<typeof useDataSourceWizard>["state"]) {
  return (
    !!state.name.trim() &&
    !!state.sourceKind &&
    (state.sourceKind === "connection"
      ? !!state.connectionId
      : !!state.sessionId)
  )
}

export function DataSourceWizardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { state, setupDialogOpen, setSetupDialogOpen } = useDataSourceWizard()

  const onTablesPage = pathname === "/data-sources/new/tables"
  const onListPage = pathname === "/data-sources"
  const setupComplete = isSetupComplete(state)

  useEffect(() => {
    if (searchParams.get("new") === "1" && onListPage) {
      setSetupDialogOpen(true)
      router.replace("/data-sources")
    }
  }, [searchParams, onListPage, router, setSetupDialogOpen])

  useEffect(() => {
    if (onTablesPage && !setupComplete) {
      setSetupDialogOpen(true)
    }
  }, [onTablesPage, setupComplete, setSetupDialogOpen])

  useEffect(() => {
    if (!onTablesPage && !onListPage) {
      setSetupDialogOpen(false)
    }
  }, [onTablesPage, onListPage, setSetupDialogOpen])

  const initialStep = !state.name.trim()
    ? "name"
    : !state.sourceKind
      ? "type"
      : "source"

  return (
    <>
      {children}
      <DataSourceSetupDialog
        open={setupDialogOpen}
        onOpenChange={setSetupDialogOpen}
        initialStep={initialStep}
      />
    </>
  )
}
