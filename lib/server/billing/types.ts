export type DbSubscriptionPlan = "free" | "pro" | "enterprise"

export type DbSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"

export type PaymentTransactionStatus = "pending" | "paid" | "failed" | "expired" | "canceled"

export type BillingResource =
  | "connections"
  | "data_sources"
  | "chats"
  | "reports"
  | "saved_queries"
  | "published_reports"
  | "team_members"

export type PlanLimits = {
  connections: number | null
  dataSources: number | null
  teamMembers: number | null
  savedChats: number | null
  savedReports: number | null
  savedQueries: number | null
  publishedReports: number | null
}

export type TeamUsage = {
  connections: number
  dataSources: number
  chats: number
  reports: number
  savedQueries: number
  publishedReports: number
  teamMembers: number
}

export type PaymentTransactionRow = {
  id: string
  team_id: string
  user_id: string
  plan: DbSubscriptionPlan
  amount_minor: number
  currency: string
  status: PaymentTransactionStatus
  merchant_reference: string
  pesepay_reference_number: string | null
  pesepay_poll_url: string | null
  pesepay_redirect_url: string | null
  payment_reason: string
  paid_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type SubscriptionRow = {
  id: string
  team_id: string
  plan: DbSubscriptionPlan
  status: DbSubscriptionStatus
  payment_provider: string
  last_payment_transaction_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export type InvoiceRow = {
  id: string
  team_id: string
  subscription_id: string | null
  payment_transaction_id: string | null
  pesepay_reference_number: string | null
  plan: DbSubscriptionPlan
  amount_cents: number
  currency: string
  status: string
  description: string | null
  period_start: string | null
  period_end: string | null
  paid_at: string | null
  created_at: string
}

export type BillingEventRow = {
  id: string
  team_id: string
  user_id: string
  payment_transaction_id: string | null
  event_type: string
  plan: DbSubscriptionPlan | null
  amount_cents: number | null
  currency: string | null
  metadata: Record<string, unknown>
  created_at: string
}
