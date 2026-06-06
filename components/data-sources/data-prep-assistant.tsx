"use client"

import { useState } from "react"
import type { TableCleaningConfig } from "@/types"
import { runDataSourceAssist, type DataPrepAssistResult } from "@/lib/api/data-sources"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

type Props = {
  dataSourceId?: string
  task: "clean" | "suggest_relationships"
  tableKey?: string
  onApplyClean?: (tableKey: string, cleaning: TableCleaningConfig) => void
  onApplyRelationships?: (
    suggestions: Extract<DataPrepAssistResult, { type: "relationships" }>["suggestions"]
  ) => void
  wizardMode?: boolean
  onWizardAssist?: (instruction: string) => Promise<DataPrepAssistResult>
}

export function DataPrepAssistant({
  dataSourceId,
  task,
  tableKey,
  onApplyClean,
  onApplyRelationships,
  wizardMode,
  onWizardAssist,
}: Props) {
  const [instruction, setInstruction] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DataPrepAssistResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (!instruction.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      if (wizardMode && onWizardAssist) {
        setResult(await onWizardAssist(instruction.trim()))
      } else if (dataSourceId) {
        setResult(
          await runDataSourceAssist(dataSourceId, {
            task,
            instruction: instruction.trim(),
            tableKey,
          })
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assistant failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-border/60 space-y-3 rounded-xl border bg-black/20 p-4">
      <p className="text-sm font-medium">Data prep assistant</p>
      <p className="text-muted-foreground text-xs">
        Describe how to clean data or suggest joins. Review suggestions before applying.
      </p>
      <div className="space-y-2">
        <Label htmlFor="assist-instruction" className="text-xs">
          Instruction
        </Label>
        <Input
          id="assist-instruction"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={
            task === "clean"
              ? "e.g. trim whitespace in Name column"
              : "e.g. link Orders.CustomerId to Customers.Id"
          }
          className="rounded-xl border-white/12 bg-black/30 text-sm"
        />
      </div>
      <Button
        type="button"
        size="sm"
        className="rounded-xl"
        disabled={loading || !instruction.trim()}
        onClick={() => void run()}
      >
        {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
        Suggest
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
      {result?.type === "message" && (
        <p className="text-muted-foreground text-xs">{result.message}</p>
      )}
      {result?.type === "clean" && (
        <div className="space-y-2 rounded-lg border border-white/10 p-3 text-xs">
          <p>{result.message}</p>
          {onApplyClean && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => onApplyClean(result.tableKey, result.cleaning)}
            >
              Apply cleaning
            </Button>
          )}
        </div>
      )}
      {result?.type === "relationships" && (
        <div className="space-y-2 rounded-lg border border-white/10 p-3 text-xs">
          <p>{result.message}</p>
          <ul className="text-muted-foreground space-y-1 font-mono">
            {result.suggestions.map((s, i) => (
              <li key={i}>
                {s.fromTableKey}.{s.fromColumn} &rarr; {s.toTableKey}.{s.toColumn} ({s.joinType})
              </li>
            ))}
          </ul>
          {onApplyRelationships && result.suggestions.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => onApplyRelationships(result.suggestions)}
            >
              Use suggestions (manual confirm)
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
