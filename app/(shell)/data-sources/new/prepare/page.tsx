"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  tableKey,
  useDataSourceWizard,
} from "@/lib/context/data-source-wizard-context"
import { WizardPageLayout } from "@/components/data-sources/wizard/wizard-page-layout"
import { EditableTableEditor } from "@/components/data-sources/wizard/editable-table-editor"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function NewDataSourcePreparePage() {
  const router = useRouter()
  const { state, setState, ensureDrafts, updateDraft } = useDataSourceWizard()

  useEffect(() => {
    if (!state.name.trim() || state.selected.length === 0) {
      router.replace("/data-sources/new/tables")
    }
  }, [state.name, state.selected.length, router])

  useEffect(() => {
    if (state.selected.length > 0) ensureDrafts(state.selected)
  }, [state.selected.length, ensureDrafts, state.selected])

  const goReview = () => router.push("/data-sources/new/review")

  const activeKey = state.activeCleanKey
  const activeDraft = activeKey ? state.drafts[activeKey] : null
  const sourceKind = state.sourceKind!

  return (
    <WizardPageLayout
      variant="full"
      stepIndex={1}
      title="Prepare your data"
      description="Review each table before import. Remove rows you do not want, then continue to review."
      backHref="/data-sources/new/tables"
      primaryLabel="Next"
      onPrimary={goReview}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex shrink-0 flex-wrap gap-2">
          {state.selected.map((t) => {
            const k = tableKey(t)
            return (
              <Button
                key={k}
                type="button"
                size="sm"
                variant={activeKey === k ? "default" : "outline"}
                className={cn("rounded-xl")}
                onClick={() => setState((s) => ({ ...s, activeCleanKey: k }))}
              >
                {t.displayName}
              </Button>
            )
          })}
        </div>

        {activeDraft && activeKey ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <EditableTableEditor
              key={activeKey}
              sourceKind={sourceKind}
              sessionId={state.sessionId ?? undefined}
              connectionId={state.connectionId || undefined}
              draft={activeDraft}
              onDraftChange={(d) => updateDraft(activeKey, d)}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Select a table above to prepare your data.</p>
        )}
      </div>
    </WizardPageLayout>
  )
}
