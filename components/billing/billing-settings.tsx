"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  cancelBillingSubscription,
  fetchBilling,
  pollBillingPayment,
  type BillingOverview,
} from "@/lib/api/billing"
import { useAuth } from "@/lib/context/auth-context"
import { cn } from "@/lib/utils"
import { CreditCard, Loader2 } from "lucide-react"

type UsageRowProps = {
  label: string
  used: number
  limit: number | null
  limitLabel: string
}

function UsageRow({ label, used, limit, limitLabel }: UsageRowProps) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {used} / {limitLabel}
        </span>
      </div>
      {limit !== null && (
        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
          <div
            className={cn("h-full rounded-full bg-primary transition-all", pct >= 100 && "bg-amber-500")}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function BillingSettings() {
  const searchParams = useSearchParams()
  const { refreshAuth } = useAuth()

  const [billing, setBilling] = useState<BillingOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const billingData = await fetchBilling()
      setBilling(billingData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const payment = searchParams.get("payment")
    const transactionId = searchParams.get("transactionId")

    if (payment === "success") {
      setMessage("Payment successful. Your plan is now active.")
      refreshAuth()
      load()
      return
    }

    if (payment === "failed") {
      setError("Payment failed or was canceled on Pesepay.")
      return
    }

    if (payment === "error") {
      setError("We could not confirm your payment. Try again or contact support.")
      return
    }

    if (payment === "pending" && transactionId) {
      pollBillingPayment(transactionId)
        .then((result) => {
          if (result.status === "paid") {
            setMessage("Payment confirmed. Your plan is now active.")
            setBilling(result.billing)
            refreshAuth()
          } else if (result.status === "failed") {
            setError("Payment failed. Please try again.")
          } else {
            setMessage("Payment is still pending. Refresh this page in a moment.")
          }
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to check payment status")
        })
    }
  }, [searchParams, load, refreshAuth])

  async function handleCancel() {
    setCanceling(true)
    setError(null)
    setMessage(null)
    try {
      const updated = await cancelBillingSubscription()
      setBilling(updated)
      await refreshAuth()
      setMessage("Subscription canceled. Your workspace is back on the Basic plan.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel subscription")
    } finally {
      setCanceling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading billing...
      </div>
    )
  }

  if (!billing) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {error ?? "Unable to load billing."}
      </div>
    )
  }

  const canManage = billing.canManageBilling
  const showUpgrade = canManage && billing.subscription.plan !== "enterprise"

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card rounded-2xl shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-card-foreground flex items-center gap-2 text-base">
                  <CreditCard className="text-primary size-4" />
                  Current plan
                </CardTitle>
                <CardDescription>Manage your workspace subscription.</CardDescription>
              </div>
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary dark:text-primary">
                {billing.subscription.planLabel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border-border bg-muted/50 rounded-xl border p-4">
                <p className="text-muted-foreground text-xs">Price</p>
                <p className="text-foreground mt-1 text-lg font-semibold">{billing.subscription.price}</p>
              </div>
              <div className="border-border bg-muted/50 rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">Billing period</p>
                <p className="mt-1 text-sm font-medium">
                  {billing.subscription.currentPeriodEnd
                    ? `Renews ${new Date(billing.subscription.currentPeriodEnd).toLocaleDateString()}`
                    : "No active paid period"}
                </p>
              </div>
            </div>

            {!canManage && (
              <p className="text-sm text-muted-foreground">
                Only team owners and admins can change billing settings.
              </p>
            )}

            {canManage && (
              <div className="flex flex-wrap gap-3">
                {showUpgrade && (
                  <Link href="/pricing" className={cn(buttonVariants(), "rounded-xl")}>
                    Upgrade
                  </Link>
                )}
                {billing.subscription.isPaid && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={canceling}
                    onClick={handleCancel}
                    className="border-border rounded-xl"
                  >
                    {canceling ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Cancel subscription
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-card-foreground text-base">Usage</CardTitle>
            <CardDescription>Track how much of your plan you&apos;re using today.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageRow
              label="Database connections"
              used={billing.usage.connections}
              limit={billing.limits.connections}
              limitLabel={billing.limitLabels.connections}
            />
            <UsageRow
              label="Data sources"
              used={billing.usage.dataSources}
              limit={billing.limits.dataSources}
              limitLabel={billing.limitLabels.dataSources}
            />
            <UsageRow
              label="Team members"
              used={billing.usage.teamMembers}
              limit={billing.limits.teamMembers}
              limitLabel={billing.limitLabels.teamMembers}
            />
            <UsageRow
              label="Saved chats"
              used={billing.usage.chats}
              limit={billing.limits.savedChats}
              limitLabel={billing.limitLabels.savedChats}
            />
            <UsageRow
              label="Saved reports"
              used={billing.usage.reports}
              limit={billing.limits.savedReports}
              limitLabel={billing.limitLabels.savedReports}
            />
            <UsageRow
              label="Saved queries"
              used={billing.usage.savedQueries}
              limit={billing.limits.savedQueries}
              limitLabel={billing.limitLabels.savedQueries}
            />
            <UsageRow
              label="Published reports"
              used={billing.usage.publishedReports}
              limit={billing.limits.publishedReports}
              limitLabel={billing.limitLabels.publishedReports}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-card-foreground text-base">Invoice history</CardTitle>
          <CardDescription>Pesepay payments and plan changes appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          {billing.invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <div className="space-y-3">
              {billing.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="border-border bg-muted/40 flex items-center justify-between rounded-xl border px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {invoice.planLabel} — {invoice.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.description ?? "Plan payment"} ·{" "}
                      {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : "Pending"}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {invoice.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
