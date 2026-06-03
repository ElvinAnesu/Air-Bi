import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  BILLING_CURRENCY,
  getPesepayReturnUrl,
  isPesepayConfigured,
} from "@/lib/server/billing/config"
import {
  PLAN_LABELS,
  PLAN_LIMITS,
  PLAN_PRICES_CENTS,
  formatPlanPrice,
  isPaidPlan,
  limitLabel,
  normalizePlan,
  resolveEffectivePlan,
} from "@/lib/server/billing/plans"
import {
  checkPesepayPayment,
  initiatePesepayTransaction,
  isPesepayFailedStatus,
  isPesepayPaidStatus,
  pollPesepayTransaction,
  type PesepayTransactionResponse,
} from "@/lib/server/billing/pesepay/client"
import { decryptPesepayResultPayload } from "@/lib/server/billing/pesepay/crypto"
import {
  createPaymentTransaction,
  getPaymentTransaction,
  getPaymentTransactionByReference,
  updatePaymentTransaction,
} from "@/lib/server/billing/transactions"
import { getTeamUsage } from "@/lib/server/billing/usage"
import type {
  BillingEventRow,
  DbSubscriptionPlan,
  InvoiceRow,
  PaymentTransactionRow,
  SubscriptionRow,
} from "@/lib/server/billing/types"

function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function amountMinorToDecimal(amountMinor: number): number {
  return Number((amountMinor / 100).toFixed(2))
}

function formatMoney(amountMinor: number, currency: string): string {
  const value = amountMinorToDecimal(amountMinor)
  if (currency === "USD") return `$${value.toFixed(2)}`
  return `${currency} ${value.toFixed(2)}`
}

export async function getTeamSubscription(teamId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("team_id", teamId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as SubscriptionRow | null) ?? null
}

export async function getTeamInvoices(teamId: string, limit = 12): Promise<InvoiceRow[]> {
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data as InvoiceRow[]) ?? []
}

export async function getTeamBillingEvents(teamId: string, limit = 20): Promise<BillingEventRow[]> {
  const { data, error } = await supabaseAdmin
    .from("billing_events")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data as BillingEventRow[]) ?? []
}

async function recordBillingEvent(input: {
  teamId: string
  userId: string
  eventType: BillingEventRow["event_type"]
  plan?: DbSubscriptionPlan | null
  amountCents?: number | null
  paymentTransactionId?: string | null
  metadata?: Record<string, unknown>
}) {
  const { error } = await supabaseAdmin.from("billing_events").insert({
    team_id: input.teamId,
    user_id: input.userId,
    event_type: input.eventType,
    plan: input.plan ?? null,
    amount_cents: input.amountCents ?? null,
    currency: BILLING_CURRENCY,
    payment_transaction_id: input.paymentTransactionId ?? null,
    metadata: input.metadata ?? {},
  })

  if (error) throw new Error(error.message)
}

async function recordInvoice(input: {
  teamId: string
  subscriptionId: string | null
  paymentTransactionId: string | null
  pesepayReferenceNumber: string | null
  plan: DbSubscriptionPlan
  amountCents: number
  periodStart: Date
  periodEnd: Date
  description: string
}) {
  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .insert({
      team_id: input.teamId,
      subscription_id: input.subscriptionId,
      payment_transaction_id: input.paymentTransactionId,
      pesepay_reference_number: input.pesepayReferenceNumber,
      plan: input.plan,
      amount_cents: input.amountCents,
      currency: BILLING_CURRENCY,
      status: "paid",
      description: input.description,
      period_start: input.periodStart.toISOString(),
      period_end: input.periodEnd.toISOString(),
      paid_at: now,
    })
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return data as InvoiceRow
}

async function activatePlanFromTransaction(
  transaction: PaymentTransactionRow,
  userId: string
) {
  if (transaction.status === "paid") {
    return getBillingOverview(transaction.team_id)
  }

  const existing = await getTeamSubscription(transaction.team_id)
  const now = new Date()
  const periodEnd = addMonths(now, 1)
  const previousPlan = normalizePlan(existing?.plan)
  const plan = transaction.plan
  const amountCents = transaction.amount_minor

  const paidAt = now.toISOString()

  await updatePaymentTransaction(transaction.id, {
    status: "paid",
    paid_at: paidAt,
    metadata: {
      ...transaction.metadata,
      activatedAt: paidAt,
      source: "pesepay",
    },
  })

  const { data: subscription, error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(
      {
        team_id: transaction.team_id,
        plan,
        status: "active",
        payment_provider: "pesepay",
        last_payment_transaction_id: transaction.id,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        updated_at: now.toISOString(),
      },
      { onConflict: "team_id" }
    )
    .select("*")
    .single()

  if (error) throw new Error(error.message)

  const invoice = await recordInvoice({
    teamId: transaction.team_id,
    subscriptionId: subscription.id,
    paymentTransactionId: transaction.id,
    pesepayReferenceNumber: transaction.pesepay_reference_number,
    plan,
    amountCents,
    periodStart: now,
    periodEnd,
    description: `${PLAN_LABELS[plan]} plan — Pesepay payment`,
  })

  await recordBillingEvent({
    teamId: transaction.team_id,
    userId,
    eventType: "payment_succeeded",
    plan,
    amountCents,
    paymentTransactionId: transaction.id,
    metadata: { source: "pesepay", invoiceId: invoice.id },
  })

  if (previousPlan !== plan) {
    await recordBillingEvent({
      teamId: transaction.team_id,
      userId,
      eventType:
        previousPlan === "free" || PLAN_PRICES_CENTS[previousPlan] < amountCents
          ? "plan_upgraded"
          : "plan_downgraded",
      plan,
      amountCents,
      paymentTransactionId: transaction.id,
      metadata: { previousPlan, source: "pesepay" },
    })
  }

  return getBillingOverview(transaction.team_id)
}

export async function getBillingOverview(teamId: string) {
  const subscription = await getTeamSubscription(teamId)
  const storedPlan = normalizePlan(subscription?.plan)
  const effectivePlan = resolveEffectivePlan(subscription?.plan, subscription?.status)
  const usage = await getTeamUsage(teamId)
  const limits = PLAN_LIMITS[effectivePlan]
  const invoices = await getTeamInvoices(teamId)
  const events = await getTeamBillingEvents(teamId)

  return {
    payment: {
      provider: "pesepay" as const,
      currency: BILLING_CURRENCY,
      pesepayConfigured: isPesepayConfigured(),
    },
    subscription: subscription
      ? {
          id: subscription.id,
          plan: storedPlan,
          planLabel: PLAN_LABELS[storedPlan],
          status: subscription.status,
          price: formatPlanPrice(storedPlan),
          priceCents: PLAN_PRICES_CENTS[storedPlan],
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          isPaid:
            isPaidPlan(storedPlan) &&
            (subscription.status === "active" || subscription.status === "trialing"),
          paymentProvider: subscription.payment_provider,
        }
      : {
          id: null,
          plan: "free" as const,
          planLabel: PLAN_LABELS.free,
          status: "active" as const,
          price: formatPlanPrice("free"),
          priceCents: 0,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          isPaid: false,
          paymentProvider: "pesepay" as const,
        },
    usage,
    limits: {
      connections: limits.connections,
      dataSources: limits.dataSources,
      teamMembers: limits.teamMembers,
      savedChats: limits.savedChats,
      savedReports: limits.savedReports,
      savedQueries: limits.savedQueries,
      publishedReports: limits.publishedReports,
    },
    limitLabels: {
      connections: limitLabel(limits.connections),
      dataSources: limitLabel(limits.dataSources),
      teamMembers: limitLabel(limits.teamMembers),
      savedChats: limitLabel(limits.savedChats),
      savedReports: limitLabel(limits.savedReports),
      savedQueries: limitLabel(limits.savedQueries),
      publishedReports: limitLabel(limits.publishedReports),
    },
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      plan: invoice.plan,
      planLabel: PLAN_LABELS[invoice.plan],
      amountCents: invoice.amount_cents,
      amount: formatMoney(invoice.amount_cents, invoice.currency),
      currency: invoice.currency,
      status: invoice.status,
      description: invoice.description,
      pesepayReferenceNumber: invoice.pesepay_reference_number,
      periodStart: invoice.period_start,
      periodEnd: invoice.period_end,
      paidAt: invoice.paid_at,
      createdAt: invoice.created_at,
    })),
    events: events.map((event) => ({
      id: event.id,
      eventType: event.event_type,
      plan: event.plan,
      planLabel: event.plan ? PLAN_LABELS[event.plan] : null,
      amountCents: event.amount_cents,
      createdAt: event.created_at,
    })),
    availablePlans: (["free", "pro", "enterprise"] as DbSubscriptionPlan[]).map((planId) => ({
      id: planId,
      label: PLAN_LABELS[planId],
      price: formatPlanPrice(planId),
      priceCents: PLAN_PRICES_CENTS[planId],
      limits: PLAN_LIMITS[planId],
    })),
  }
}

export async function startCheckout(
  teamId: string,
  userId: string,
  plan: DbSubscriptionPlan,
  userDetails?: { email?: string | null; fullName?: string | null; phoneNumber?: string | null }
) {
  if (plan === "free") {
    throw new Error("Basic plan does not require checkout.")
  }

  if (!isPesepayConfigured()) {
    throw new Error("Pesepay is not configured.")
  }

  const amountCents = PLAN_PRICES_CENTS[plan]
  const paymentReason = `AirBI ${PLAN_LABELS[plan]} subscription`

  const transaction = await createPaymentTransaction({
    teamId,
    userId,
    plan,
    amountMinor: amountCents,
    paymentReason,
    metadata: {
      customerEmail: userDetails?.email ?? null,
      customerName: userDetails?.fullName ?? null,
      customerPhone: userDetails?.phoneNumber ?? null,
    },
  })

  await recordBillingEvent({
    teamId,
    userId,
    eventType: "checkout_started",
    plan,
    amountCents,
    paymentTransactionId: transaction.id,
    metadata: { merchantReference: transaction.merchant_reference },
  })

  const returnUrl = getPesepayReturnUrl(transaction.id)

  await recordBillingEvent({
    teamId,
    userId,
    eventType: "payment_initiated",
    plan,
    amountCents,
    paymentTransactionId: transaction.id,
    metadata: { returnUrl },
  })

  const pesepay = await initiatePesepayTransaction({
    amount: amountMinorToDecimal(amountCents),
    currencyCode: BILLING_CURRENCY,
    paymentReason,
    merchantReference: transaction.merchant_reference,
    returnUrl,
    customer: {
      email: userDetails?.email ?? null,
      name: userDetails?.fullName ?? null,
      phoneNumber: userDetails?.phoneNumber ?? null,
    },
  })

  if (!pesepay.success || !pesepay.redirectUrl) {
    await updatePaymentTransaction(transaction.id, {
      status: "failed",
      metadata: { error: pesepay.message ?? "Failed to initiate Pesepay transaction" },
    })

    await recordBillingEvent({
      teamId,
      userId,
      eventType: "payment_failed",
      plan,
      amountCents,
      paymentTransactionId: transaction.id,
      metadata: { message: pesepay.message },
    })

    throw new Error(pesepay.message ?? "Failed to initiate Pesepay payment.")
  }

  await updatePaymentTransaction(transaction.id, {
    pesepay_reference_number: pesepay.referenceNumber ?? null,
    pesepay_poll_url: pesepay.pollUrl ?? null,
    pesepay_redirect_url: pesepay.redirectUrl,
    metadata: {
      pesepayReferenceNumber: pesepay.referenceNumber,
      pesepayPollUrl: pesepay.pollUrl,
    },
  })

  return {
    transactionId: transaction.id,
    plan,
    planLabel: PLAN_LABELS[plan],
    amountCents,
    amount: formatPlanPrice(plan),
    currency: BILLING_CURRENCY,
    redirectUrl: pesepay.redirectUrl,
    referenceNumber: pesepay.referenceNumber,
  }
}

export async function pollAndCompleteTransaction(transactionId: string, userId: string) {
  const transaction = await getPaymentTransaction(transactionId)
  if (!transaction) {
    throw new Error("Payment transaction not found.")
  }

  if (transaction.status === "paid") {
    return { status: "paid" as const, billing: await getBillingOverview(transaction.team_id) }
  }

  if (transaction.status !== "pending") {
    throw new Error(`Payment is ${transaction.status}.`)
  }

  const polled = transaction.pesepay_reference_number
    ? await checkPesepayPayment(transaction.pesepay_reference_number)
    : transaction.pesepay_poll_url
      ? await pollPesepayTransaction(transaction.pesepay_poll_url)
      : null

  if (!polled) {
    throw new Error("Payment is still pending and has no Pesepay reference to verify.")
  }

  await recordBillingEvent({
    teamId: transaction.team_id,
    userId,
    eventType: "payment_polled",
    plan: transaction.plan,
    amountCents: transaction.amount_minor,
    paymentTransactionId: transaction.id,
    metadata: {
      paid: polled.paid,
      failed: polled.failed,
      pending: polled.pending,
      success: polled.success,
      transactionStatus: polled.transactionStatus,
      message: polled.message,
    },
  })

  if (polled.paid) {
    const billing = await activatePlanFromTransaction(transaction, userId)
    return { status: "paid" as const, billing }
  }

  if (polled.failed) {
    await updatePaymentTransaction(transaction.id, {
      status: "failed",
      metadata: {
        ...transaction.metadata,
        pollError: polled.message,
        transactionStatus: polled.transactionStatus,
      },
    })
    return { status: "failed" as const, billing: await getBillingOverview(transaction.team_id) }
  }

  return { status: "pending" as const, billing: await getBillingOverview(transaction.team_id) }
}

export async function completeTransactionFromReturn(
  transactionId: string,
  userId: string,
  redirect: {
    transactionStatus?: string | null
    referenceNumber?: string | null
  }
) {
  const transaction = await getPaymentTransaction(transactionId)
  if (!transaction) {
    throw new Error("Payment transaction not found.")
  }

  if (transaction.status === "paid") {
    return { status: "paid" as const, billing: await getBillingOverview(transaction.team_id) }
  }

  console.log("[Pesepay] return redirect params", {
    transactionId,
    transactionStatus: redirect.transactionStatus,
    referenceNumber: redirect.referenceNumber,
  })

  if (isPesepayPaidStatus(redirect.transactionStatus)) {
    const billing = await activatePlanFromTransaction(transaction, userId)
    return { status: "paid" as const, billing }
  }

  if (isPesepayFailedStatus(redirect.transactionStatus)) {
    await updatePaymentTransaction(transaction.id, {
      status: "failed",
      metadata: {
        ...transaction.metadata,
        returnStatus: redirect.transactionStatus,
      },
    })
    return { status: "failed" as const, billing: await getBillingOverview(transaction.team_id) }
  }

  return pollAndCompleteTransaction(transactionId, userId)
}

export async function handlePesepayResultCallback(input: {
  referenceNumber?: string | null
  merchantReference?: string | null
  encryptedPayload?: string | null
  transactionStatus?: string | null
  userId?: string | null
}) {
  if (input.encryptedPayload) {
    const decrypted = decryptPesepayResultPayload<PesepayTransactionResponse>(
      input.encryptedPayload
    )

    console.log("[Pesepay] result decrypted response", decrypted)

    const lookup =
      decrypted.referenceNumber ??
      decrypted.merchantReference ??
      input.referenceNumber ??
      input.merchantReference

    if (!lookup) {
      throw new Error("Missing Pesepay reference in decrypted callback.")
    }

    const transaction = await getPaymentTransactionByReference(lookup)
    if (!transaction) {
      throw new Error("Payment transaction not found for Pesepay callback.")
    }

    await recordBillingEvent({
      teamId: transaction.team_id,
      userId: transaction.user_id,
      eventType: "pesepay_callback_received",
      plan: transaction.plan,
      amountCents: transaction.amount_minor,
      paymentTransactionId: transaction.id,
      metadata: {
        referenceNumber: decrypted.referenceNumber,
        merchantReference: decrypted.merchantReference,
        transactionStatus: decrypted.transactionStatus,
        source: "encrypted_payload",
      },
    })

    const status = decrypted.transactionStatus ?? input.transactionStatus

    if (isPesepayPaidStatus(status)) {
      const billing = await activatePlanFromTransaction(
        transaction,
        input.userId ?? transaction.user_id
      )
      return { status: "paid" as const, billing }
    }

    if (isPesepayFailedStatus(status)) {
      await updatePaymentTransaction(transaction.id, {
        status: "failed",
        metadata: {
          ...transaction.metadata,
          transactionStatus: status,
        },
      })
      return {
        status: "failed" as const,
        billing: await getBillingOverview(transaction.team_id),
      }
    }

    return pollAndCompleteTransaction(transaction.id, input.userId ?? transaction.user_id)
  }

  const lookup = input.referenceNumber ?? input.merchantReference
  if (!lookup) {
    throw new Error("Missing Pesepay reference.")
  }

  const transaction = await getPaymentTransactionByReference(lookup)
  if (!transaction) {
    throw new Error("Payment transaction not found for Pesepay callback.")
  }

  await recordBillingEvent({
    teamId: transaction.team_id,
    userId: transaction.user_id,
    eventType: "pesepay_callback_received",
    plan: transaction.plan,
    amountCents: transaction.amount_minor,
    paymentTransactionId: transaction.id,
    metadata: {
      referenceNumber: input.referenceNumber,
      merchantReference: input.merchantReference,
    },
  })

  return pollAndCompleteTransaction(transaction.id, input.userId ?? transaction.user_id)
}

export async function cancelSubscription(teamId: string, userId: string) {
  const existing = await getTeamSubscription(teamId)
  const previousPlan = normalizePlan(existing?.plan)
  const now = new Date()

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      plan: "free",
      status: "active",
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      last_payment_transaction_id: null,
      payment_provider: "pesepay",
      updated_at: now.toISOString(),
    })
    .eq("team_id", teamId)

  if (error) throw new Error(error.message)

  await recordBillingEvent({
    teamId,
    userId,
    eventType: "subscription_canceled",
    plan: "free",
    metadata: { previousPlan },
  })

  if (previousPlan !== "free") {
    await recordBillingEvent({
      teamId,
      userId,
      eventType: "plan_downgraded",
      plan: "free",
      metadata: { previousPlan },
    })
  }

  return getBillingOverview(teamId)
}
