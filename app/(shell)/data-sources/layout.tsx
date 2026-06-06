import { Suspense } from "react"
import { DataSourceWizardProvider } from "@/lib/context/data-source-wizard-context"
import { DataSourceWizardShell } from "@/components/data-sources/wizard/data-source-wizard-shell"
import { Loader2 } from "lucide-react"

export default function DataSourcesLayout({ children }: { children: React.ReactNode }) {
  return (
    <DataSourceWizardProvider>
      <Suspense
        fallback={
          <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center text-sm">
            <Loader2 className="size-4 animate-spin" />
          </div>
        }
      >
        <DataSourceWizardShell>{children}</DataSourceWizardShell>
      </Suspense>
    </DataSourceWizardProvider>
  )
}
