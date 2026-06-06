import { Suspense } from "react"
import { DataSourcesView } from "@/components/data-sources/data-sources-view"
import { Loader2 } from "lucide-react"

export default function DataSourcesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      }
    >
      <DataSourcesView />
    </Suspense>
  )
}
