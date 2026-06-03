import { randomUUID } from "crypto"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { BILLING_CURRENCY } from "@/lib/server/billing/config"
import type { DbSubscriptionPlan, PaymentTransactionRow, PaymentTransactionStatus } from "@/lib/server/billing/types"

export function buildMerchantReference(teamId: string): string {
  return `airbi-${teamId.slice(0, 8)}-${Date.now()}-${randomUUID().slice(0, 8)}`
}

export async function createPaymentTransaction(input: {
  teamId: string
  userId: string
  plan: DbSubscriptionPlan
  amountMinor: number
  paymentReason: string
  metadata?: Record<string, unknown>
}): Promise<PaymentTransactionRow> {
  const merchantReference = buildMerchantReference(input.teamId)
  const { data, error } = await supabaseAdmin
    .from("payment_transactions")
    .insert({
      team_id: input.teamId,
      user_id: input.userId,
      plan: input.plan,
      amount_minor: input.amountMinor,
      currency: BILLING_CURRENCY,
      status: "pending",
      merchant_reference: merchantReference,
      payment_reason: input.paymentReason,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return data as PaymentTransactionRow
}

export async function getPaymentTransaction(id: string): Promise<PaymentTransactionRow | null> {
  const { data, error } = await supabaseAdmin
    .from("payment_transactions")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as PaymentTransactionRow | null) ?? null
}

export async function getPaymentTransactionByReference(
  reference: string
): Promise<PaymentTransactionRow | null> {
  const { data, error } = await supabaseAdmin
    .from("payment_transactions")
    .select("*")
    .or(`merchant_reference.eq.${reference},pesepay_reference_number.eq.${reference}`)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as PaymentTransactionRow | null) ?? null
}

export async function updatePaymentTransaction(
  id: string,
  updates: Partial<{
    status: PaymentTransactionStatus
    pesepay_reference_number: string | null
    pesepay_poll_url: string | null
    pesepay_redirect_url: string | null
    paid_at: string | null
    metadata: Record<string, unknown>
  }>
): Promise<PaymentTransactionRow> {
  const { data, error } = await supabaseAdmin
    .from("payment_transactions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return data as PaymentTransactionRow
}

export async function getPendingTransactionsForTeam(teamId: string): Promise<PaymentTransactionRow[]> {
  const { data, error } = await supabaseAdmin
    .from("payment_transactions")
    .select("*")
    .eq("team_id", teamId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data as PaymentTransactionRow[]) ?? []
}
