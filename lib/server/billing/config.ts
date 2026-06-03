export const BILLING_CURRENCY = process.env.PESEPAY_CURRENCY_CODE ?? "USD"

const DEFAULT_PESEPAY_API_BASE_URL = "https://api.test.sandbox.pesepay.com/payments-engine"

export function getPesepayApiBaseUrl(): string {
  const configured = process.env.PESEPAY_API_BASE_URL?.replace(/\/$/, "")
  return configured || DEFAULT_PESEPAY_API_BASE_URL
}

export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return "http://localhost:3000"
}

export function getPesepayIntegrationKey(): string | null {
  return process.env.PESEPAY_INTEGRATION_KEY ?? null
}

export function getPesepayEncryptionKey(): string | null {
  return process.env.PESEPAY_ENCRYPTION_KEY ?? null
}

export function isPesepayConfigured(): boolean {
  return Boolean(getPesepayIntegrationKey() && getPesepayEncryptionKey())
}

/** PZW211 = EcoCash, PZW212 = InnBucks (no extra fields required) */
export function getPesepayPaymentMethodCode(): string {
  return process.env.PESEPAY_PAYMENT_METHOD_CODE ?? "PZW212"
}

export function getPesepayReturnUrl(transactionId: string): string {
  return `${getAppBaseUrl()}/api/billing/pesepay/return?transactionId=${transactionId}`
}

export function getPesepayResultUrl(): string {
  return `${getAppBaseUrl()}/api/billing/pesepay/result`
}
