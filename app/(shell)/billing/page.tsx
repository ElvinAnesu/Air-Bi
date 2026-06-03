import { Suspense } from "react"
import { BillingSettings } from "@/components/billing/billing-settings"
import { Loader2 } from "lucide-react"

function BillingFallback() {
  return (
    <div className="flex items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" />
      Loading billing...
    </div>
  )
}

export default function BillingPage() {
  return (
    <div className="h-full overflow-auto p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing &amp; usage</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your plan, usage, and invoices.
          </p>
        </div>
        <Suspense fallback={<BillingFallback />}>
          <BillingSettings />
        </Suspense>
      </div>
    </div>
  )
}
