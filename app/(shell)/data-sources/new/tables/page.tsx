"use client"

import { useRouter } from "next/navigation"
import { useDataSourceWizard } from "@/lib/context/data-source-wizard-context"
import { WizardPageLayout } from "@/components/data-sources/wizard/wizard-page-layout"
import { TableCatalogPicker } from "@/components/data-sources/wizard/table-catalog-picker"
import {
  searchWizardConnectionTables,
  searchWizardExcelTables,
} from "@/lib/api/data-sources"

export default function NewDataSourceTablesPage() {
  const router = useRouter()
  const { state, setState, ensureDrafts, setSetupDialogOpen } = useDataSourceWizard()

  const setupComplete =
    !!state.name.trim() &&
    !!state.sourceKind &&
    (state.sourceKind === "connection"
      ? !!state.connectionId
      : !!state.sessionId)

  const goPrepare = () => {
    ensureDrafts(state.selected)
    router.push("/data-sources/new/prepare")
  }

  return (
    <>
      <WizardPageLayout
        stepIndex={0}
        title="Select tables"
        description="Search and choose the tables or sheets to include. You can prepare data later or skip that step entirely."
        onBack={() => setSetupDialogOpen(true)}
        primaryDisabled={state.selected.length === 0}
        onPrimary={goPrepare}
      >
        {state.sourceKind && setupComplete && (
          <TableCatalogPicker
            selected={state.selected}
            onSelectionChange={(tables) => setState((s) => ({ ...s, selected: tables }))}
            emptyHint={
              state.sourceKind === "excel"
                ? "No sheets match your search."
                : "No tables match your search."
            }
            loadCatalog={async ({ q, limit, offset }) => {
              if (state.sourceKind === "excel" && state.sessionId) {
                const res = await searchWizardExcelTables(state.sessionId, { q, limit, offset })
                return { tables: res.tables, total: res.total }
              }
              if (state.sourceKind === "connection" && state.connectionId) {
                const res = await searchWizardConnectionTables(state.connectionId, {
                  q,
                  limit,
                  offset,
                  sessionId: state.sessionId ?? undefined,
                })
                if (res.sessionId) {
                  setState((s) => ({ ...s, sessionId: res.sessionId ?? null }))
                }
                return { tables: res.tables, total: res.total }
              }
              return { tables: [], total: 0 }
            }}
          />
        )}
      </WizardPageLayout>
    </>
  )
}
