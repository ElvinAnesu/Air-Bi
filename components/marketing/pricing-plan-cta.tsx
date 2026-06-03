"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import type { PricingPlan } from "@/lib/marketing/pricing-plans"
import {
  canManageBillingClient,
  pricingPlanToDbPlan,
  resolveEffectivePlanClient,
} from "@/lib/marketing/plan-utils"
import { startBillingCheckout } from "@/lib/api/billing"
import { cn } from "@/lib/utils"

type AuthMeResponse = {
  user?: { id: string; email: string; fullName: string }
  role?: string | null
  subscription?: { plan: string; status: string } | null
  effectivePlan?: "free" | "pro" | "enterprise"
  canManageBilling?: boolean
}

export function PricingPlanCta({ plan }: { plan: PricingPlan }) {
  const [auth, setAuth] = useState<AuthMeResponse | null>(null)
  const [checked, setChecked] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setAuth(data))
      .catch(() => setAuth(null))
      .finally(() => setChecked(true))
  }, [])

  const isLoggedIn = Boolean(auth?.user)
  const dbPlan = pricingPlanToDbPlan(plan.id)
  const effectivePlan =
    auth?.effectivePlan ??
    resolveEffectivePlanClient(auth?.subscription?.plan, auth?.subscription?.status)
  const canManage = auth?.canManageBilling ?? canManageBillingClient(auth?.role)
  const isCurrentPlan = isLoggedIn && dbPlan !== "free" && effectivePlan === dbPlan

  async function handleCheckout() {
    if (dbPlan !== "pro" && dbPlan !== "enterprise") return

    setCheckingOut(true)
    setError(null)

    try {
      const checkout = await startBillingCheckout(dbPlan)
      if (checkout.redirectUrl) {
        window.location.href = checkout.redirectUrl
        return
      }
      setError("Unable to start checkout. Please try again.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed")
    } finally {
      setCheckingOut(false)
    }
  }

  const buttonClassName = cn(
    buttonVariants({ size: "lg" }),
    "h-11 w-full rounded-xl",
    plan.highlighted
      ? "bg-white text-black hover:bg-white/90"
      : "border border-white/15 bg-transparent text-white hover:bg-white/8"
  )

  if (!checked) {
    return (
      <div className={cn(buttonClassName, "pointer-events-none opacity-60")}>
        <Loader2 className="mx-auto size-4 animate-spin" />
      </div>
    )
  }

  if (plan.id === "basic") {
    if (isLoggedIn && effectivePlan === "free") {
      return (
        <Button type="button" disabled className={cn(buttonClassName, "opacity-70")}>
          Current plan
        </Button>
      )
    }

    const href = isLoggedIn ? "/workspace" : "/login?redirectTo=%2Fpricing"
    return (
      <Link href={href} className={buttonClassName}>
        {plan.cta}
      </Link>
    )
  }

  if (!isLoggedIn) {
    return (
      <Link href="/login?redirectTo=%2Fpricing" className={buttonClassName}>
        {plan.cta}
      </Link>
    )
  }

  if (isCurrentPlan) {
    return (
      <Button type="button" disabled className={cn(buttonClassName, "opacity-70")}>
        Current plan
      </Button>
    )
  }

  if (!canManage) {
    return (
      <Button type="button" disabled className={cn(buttonClassName, "opacity-70")}>
        Ask an admin to upgrade
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={checkingOut}
        onClick={handleCheckout}
        className={buttonClassName}
      >
        {checkingOut ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        {plan.cta}
      </Button>
      {error && <p className="text-center text-xs text-red-300">{error}</p>}
    </div>
  )
}
