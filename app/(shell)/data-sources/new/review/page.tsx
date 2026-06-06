"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  tableKey,
  useDataSourceWizard,
} from "@/lib/context/data-source-wizard-context"
import { WizardPageLayout } from "@/components/data-sources/wizard/wizard-page-layout"
import { finalizeWizardDataSource } from "@/lib/api/data-sources"
import { exportPreparedTable } from "@/lib/data-sources/prepare-export"

export default function NewDataSourceReviewPage() {
  const router = useRouter()
  const { state, reset, setSetupDialogOpen } = useDataSourceWizard()
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (created || creating) return
    if (!state.name.trim() || !state.sourceKind || state.selected.length === 0) {
      router.replace("/data-sources/new/tables")
    }
  }, [state, router, created, creating])

  const handleCreate = async () => {
    if (!state.sourceKind) return
    setCreating(true)
    setError(null)
    try {
      const tables = state.selected.map((t) => {
        const d = state.drafts[tableKey(t)]
        const { preparedColumns, preparedRows } = d ? exportPreparedTable(d) : { preparedColumns: undefined, preparedRows: undefined }
        return {
          externalSchema: t.schema,
          externalName: t.externalName,
          displayName: t.displayName,
          cleaning: d?.cleaning ?? { transforms: [] },
          preparedColumns: preparedRows?.length ? preparedColumns : undefined,
          preparedRows: preparedRows?.length ? preparedRows : undefined,
        }
      })
      const { source } = await finalizeWizardDataSource({
        name: state.name.trim(),
        sourceKind: state.sourceKind,
        connectionId: state.sourceKind === "connection" ? state.connectionId : undefined,
        wizardSessionId: state.sessionId ?? undefined,
        tables,
      })
      setCreated(true)
      setSetupDialogOpen(false)
      router.replace(`/data-sources/${source.id}`)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create data source")
    } finally {
      setCreating(false)
    }
  }

  return (
    <WizardPageLayout
      stepIndex={2}
      title="Review and create"
      description="Confirm your data source settings before importing."
      backHref="/data-sources/new/prepare"
      primaryLabel="Create data source"
      primaryLoading={creating}
      onPrimary={() => void handleCreate()}
    >
      <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-6 pb-8 text-sm">
        <p>
          <span className="text-muted-foreground">Name:</span>{" "}
          <span className="font-medium">{state.name}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Type:</span>{" "}
          {state.sourceKind === "excel" ? "Excel" : "Connection"}
        </p>
        {state.sourceKind === "excel" && state.excelFileName && (
          <p>
            <span className="text-muted-foreground">File:</span> {state.excelFileName}
          </p>
        )}
        <p>
          <span className="text-muted-foreground">Tables:</span> {state.selected.length}
        </p>
        <ul className="text-muted-foreground list-inside list-disc text-xs">
          {state.selected.map((t) => (
            <li key={tableKey(t)}>{t.displayName}</li>
          ))}
        </ul>
      </div>
      {error && <p className="text-destructive pb-4 text-sm">{error}</p>}
    </WizardPageLayout>
  )
}
