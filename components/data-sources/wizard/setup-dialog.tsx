"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useDataSourceWizard } from "@/lib/context/data-source-wizard-context"
import { fetchConnections } from "@/lib/api/connections"
import { uploadWizardExcel } from "@/lib/api/data-sources"
import type { ErpConnection } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Database, FileSpreadsheet, Loader2, Upload } from "lucide-react"

type SetupStep = "name" | "type" | "source"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialStep?: SetupStep
}

export function DataSourceSetupDialog({ open, onOpenChange, initialStep = "name" }: Props) {
  const router = useRouter()
  const { state, setState } = useDataSourceWizard()
  const [step, setStep] = useState<SetupStep>(initialStep)
  const [connections, setConnections] = useState<ErpConnection[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setStep(initialStep)
  }, [open, initialStep])

  useEffect(() => {
    if (open && step === "source" && state.sourceKind === "connection") {
      void fetchConnections().then(setConnections).catch(() => setConnections([]))
    }
  }, [open, step, state.sourceKind])

  const handleClose = (next: boolean) => {
    if (!next) {
      setError(null)
      setStep("name")
    }
    onOpenChange(next)
  }

  const finishToTables = () => {
    setError(null)
    onOpenChange(false)
    router.replace("/data-sources/new/tables")
  }

  const handleExcelUpload = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const res = await uploadWizardExcel(file)
      setState((s) => ({
        ...s,
        sessionId: res.sessionId,
        excelFileName: res.fileName,
      }))
      finishToTables()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const title =
    step === "name"
      ? "Name your data source"
      : step === "type"
        ? "Choose a source type"
        : state.sourceKind === "excel"
          ? "Upload Excel file"
          : "Select connection"

  const description =
    step === "name"
      ? "Choose a clear name your team will recognize."
      : step === "type"
        ? "Import from a live connection or an Excel workbook."
        : state.sourceKind === "excel"
          ? "Pick a file, then you will choose sheets on the next screen."
          : "Pick the connection that holds your tables."

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto rounded-2xl border-white/15 bg-zinc-950 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error && <p className="text-destructive text-sm">{error}</p>}

        {step === "name" && (
          <div className="space-y-2 py-1">
            <Label htmlFor="setup-name">Name</Label>
            <Input
              id="setup-name"
              value={state.name}
              onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
              placeholder="Sales reporting"
              className="rounded-xl border-white/12 bg-black/30"
            />
          </div>
        )}

        {step === "type" && (
          <div className="grid gap-3 py-1 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setState((s) => ({ ...s, sourceKind: "connection" }))
                setStep("source")
              }}
              className="rounded-xl border border-white/12 p-4 text-left transition hover:bg-white/[0.04]"
            >
              <Database className="text-sky-400 mb-2 size-5" />
              <p className="text-sm font-medium">From connection</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setState((s) => ({ ...s, sourceKind: "excel" }))
                setStep("source")
              }}
              className="rounded-xl border border-white/12 p-4 text-left transition hover:bg-white/[0.04]"
            >
              <FileSpreadsheet className="text-emerald-400 mb-2 size-5" />
              <p className="text-sm font-medium">Upload Excel</p>
            </button>
          </div>
        )}

        {step === "source" && state.sourceKind === "connection" && (
          <div className="space-y-2 py-1">
            <Label htmlFor="setup-conn">Connection</Label>
            <select
              id="setup-conn"
              value={state.connectionId}
              onChange={(e) => setState((s) => ({ ...s, connectionId: e.target.value }))}
              className="border-input bg-background h-10 w-full rounded-xl border px-3 text-sm"
            >
              <option value="">Select a connection</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.connectionType})
                </option>
              ))}
            </select>
          </div>
        )}

        {step === "source" && state.sourceKind === "excel" && (
          <div className="space-y-3 py-1">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleExcelUpload(file)
                e.target.value = ""
              }}
            />
            <Button
              type="button"
              variant="outline"
              className={cn("w-full rounded-xl border-white/15")}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Upload className="mr-2 size-4" />
              )}
              Choose Excel file
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step !== "name" && (
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => {
                if (step === "source") setStep("type")
                else if (step === "type") setStep("name")
              }}
            >
              Back
            </Button>
          )}
          <Button type="button" variant="ghost" className="rounded-xl" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          {step === "name" && (
            <Button
              type="button"
              className="rounded-xl"
              disabled={!state.name.trim()}
              onClick={() => setStep("type")}
            >
              Next
            </Button>
          )}
          {step === "source" && state.sourceKind === "connection" && (
            <Button
              type="button"
              className="rounded-xl"
              disabled={!state.connectionId}
              onClick={finishToTables}
            >
              Next
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
