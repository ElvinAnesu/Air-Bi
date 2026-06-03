export type BillingOverview = {
  payment: {
    provider: "pesepay"
    currency: string
    pesepayConfigured: boolean
  }
  subscription: {
    id: string | null
    plan: "free" | "pro" | "enterprise"
    planLabel: string
    status: string
    price: string
    priceCents: number
    currentPeriodStart: string | null
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    isPaid: boolean
    paymentProvider: string
  }
  usage: {
    connections: number
    dataSources: number
    chats: number
    reports: number
    savedQueries: number
    publishedReports: number
    teamMembers: number
  }
  limits: {
    connections: number | null
    dataSources: number | null
    teamMembers: number | null
    savedChats: number | null
    savedReports: number | null
    savedQueries: number | null
    publishedReports: number | null
  }
  limitLabels: Record<string, string>
  invoices: Array<{
    id: string
    plan: string
    planLabel: string
    amount: string
    currency: string
    status: string
    description: string | null
    pesepayReferenceNumber: string | null
    paidAt: string | null
    createdAt: string
  }>
  canManageBilling: boolean
  role: string | null
}

export type CheckoutResponse = {
  transactionId: string
  plan: "pro" | "enterprise"
  planLabel: string
  amountCents: number
  amount: string
  currency: string
  redirectUrl: string
  referenceNumber?: string
}

export async function fetchBilling(): Promise<BillingOverview> {
  const res = await fetch("/api/billing")
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? "Failed to load billing")
  }
  return res.json()
}

export async function startBillingCheckout(plan: "pro" | "enterprise"): Promise<CheckoutResponse> {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to start checkout")
  return data
}

export async function pollBillingPayment(transactionId: string) {
  const res = await fetch("/api/billing/pesepay/poll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactionId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to check payment status")
  return data as { status: "paid" | "pending" | "failed"; billing: BillingOverview }
}

export async function cancelBillingSubscription() {
  const res = await fetch("/api/billing/cancel", { method: "POST" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? "Failed to cancel subscription")
  return data.billing as BillingOverview
}
