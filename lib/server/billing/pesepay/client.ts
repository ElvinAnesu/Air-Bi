import {
  getPesepayApiBaseUrl,
  getPesepayEncryptionKey,
  getPesepayIntegrationKey,
  getPesepayPaymentMethodCode,
  getPesepayResultUrl,
  isPesepayConfigured,
} from "@/lib/server/billing/config"
import {
  decryptPesepayData,
  encryptPesepayPayload,
} from "@/lib/server/billing/pesepay/crypto"

export type PesepayInitiateResult = {
  success: boolean
  message?: string
  referenceNumber?: string
  pollUrl?: string
  redirectUrl?: string
}

export type PesepayPollResult = {
  success: boolean
  paid: boolean
  failed: boolean
  pending: boolean
  message?: string
  referenceNumber?: string
  pollUrl?: string
  transactionStatus?: string
}

export type PesepayTransactionResponse = {
  referenceNumber?: string
  pollUrl?: string
  redirectUrl?: string
  transactionStatus?: string
  transactionStatusDescription?: string
  merchantReference?: string
}

type PesepayPaymentBody = {
  amountDetails: {
    amount: number
    currencyCode: string
  }
  merchantReference: string
  reasonForPayment: string
  resultUrl: string
  returnUrl: string
  paymentMethodCode: string
  customer: {
    email: string
    phoneNumber: string
    name: string
  }
  paymentMethodRequiredFields: Record<string, string>
}

type PesepayApiResponse = {
  payload?: string
  message?: string
  error?: string
}

export function isPesepayPaidStatus(status: string | null | undefined): boolean {
  const normalized = status?.trim().toUpperCase()
  return normalized === "SUCCESS"
}

export function isPesepayFailedStatus(status: string | null | undefined): boolean {
  const normalized = status?.trim().toUpperCase()
  return (
    normalized === "FAILED" ||
    normalized === "CANCELLED" ||
    normalized === "CANCELED" ||
    normalized === "DECLINED" ||
    normalized === "EXPIRED"
  )
}

function getPesepayHeaders(integrationKey: string): HeadersInit {
  return {
    key: integrationKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  }
}

function getInitiateUrl(): string {
  return `${getPesepayApiBaseUrl()}/v1/payments/initiate`
}

function getCheckPaymentUrl(referenceNumber: string): string {
  return `${getPesepayApiBaseUrl()}/v1/payments/check-payment?referenceNumber=${encodeURIComponent(referenceNumber)}`
}

function buildPaymentMethodRequiredFields(
  paymentMethodCode: string,
  phoneNumber?: string | null
): Record<string, string> {
  if (paymentMethodCode === "PZW211" && phoneNumber) {
    return { customerPhoneNumber: phoneNumber }
  }

  return {}
}

function buildPaymentBody(input: {
  amount: number
  currencyCode: string
  paymentReason: string
  merchantReference: string
  returnUrl: string
  customer?: {
    email?: string | null
    name?: string | null
    phoneNumber?: string | null
  }
}): PesepayPaymentBody {
  const paymentMethodCode = getPesepayPaymentMethodCode()

  return {
    amountDetails: {
      amount: input.amount,
      currencyCode: input.currencyCode,
    },
    merchantReference: input.merchantReference,
    reasonForPayment: input.paymentReason,
    resultUrl: getPesepayResultUrl(),
    returnUrl: input.returnUrl,
    paymentMethodCode,
    customer: {
      email: input.customer?.email ?? "",
      phoneNumber: input.customer?.phoneNumber ?? "",
      name: input.customer?.name ?? "",
    },
    paymentMethodRequiredFields: buildPaymentMethodRequiredFields(
      paymentMethodCode,
      input.customer?.phoneNumber
    ),
  }
}

function extractPesepayErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback

  const record = data as Record<string, unknown>
  if (typeof record.message === "string" && record.message) return record.message
  if (typeof record.error === "string" && record.error) return record.error
  if (typeof record.transactionStatusDescription === "string" && record.transactionStatusDescription) {
    return record.transactionStatusDescription
  }

  return fallback
}

function logPesepayResponse(
  stage: "initiate" | "poll" | "check-payment" | "result",
  input: {
    httpStatus: number
    url?: string
    raw: unknown
    decrypted?: unknown
    error?: string
  }
) {
  console.log(`[Pesepay] ${stage} raw response`, {
    httpStatus: input.httpStatus,
    url: input.url,
    body: input.raw,
  })

  if (input.decrypted !== undefined) {
    console.log(`[Pesepay] ${stage} decrypted response`, input.decrypted)
  }

  if (input.error) {
    console.log(`[Pesepay] ${stage} error`, input.error)
  }
}

function buildPollResult(transaction: PesepayTransactionResponse, pollUrl?: string): PesepayPollResult {
  const transactionStatus = transaction.transactionStatus
  const paid = isPesepayPaidStatus(transactionStatus)
  const failed = isPesepayFailedStatus(transactionStatus)

  return {
    success: true,
    paid,
    failed,
    pending: !paid && !failed,
    referenceNumber: transaction.referenceNumber,
    pollUrl: transaction.pollUrl ?? pollUrl,
    transactionStatus,
    message: transaction.transactionStatusDescription,
  }
}

async function requestPesepayStatus(
  url: string,
  stage: "poll" | "check-payment"
): Promise<PesepayPollResult> {
  if (!isPesepayConfigured()) {
    throw new Error("Pesepay is not configured.")
  }

  const integrationKey = getPesepayIntegrationKey()
  const encryptionKey = getPesepayEncryptionKey()

  if (!integrationKey || !encryptionKey) {
    throw new Error("Pesepay is not configured.")
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: getPesepayHeaders(integrationKey),
    })

    const data = (await response.json().catch(() => ({}))) as PesepayApiResponse

    if (!response.ok) {
      logPesepayResponse(stage, {
        httpStatus: response.status,
        url,
        raw: data,
        error: extractPesepayErrorMessage(data, "Pesepay status request failed"),
      })

      return {
        success: false,
        paid: false,
        failed: false,
        pending: true,
        message: extractPesepayErrorMessage(data, "Pesepay status request failed"),
      }
    }

    if (!data.payload) {
      logPesepayResponse(stage, {
        httpStatus: response.status,
        url,
        raw: data,
        error: "Missing encrypted payload",
      })

      return {
        success: false,
        paid: false,
        failed: false,
        pending: true,
        message: extractPesepayErrorMessage(data, "Pesepay did not return an encrypted payload"),
      }
    }

    try {
      const transaction = decryptPesepayData<PesepayTransactionResponse>(
        data.payload,
        encryptionKey
      )
      const result = buildPollResult(transaction, url)

      logPesepayResponse(stage, {
        httpStatus: response.status,
        url,
        raw: data,
        decrypted: transaction,
      })

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to decrypt Pesepay payload"

      logPesepayResponse(stage, {
        httpStatus: response.status,
        url,
        raw: data,
        error: message,
      })

      return {
        success: false,
        paid: false,
        failed: false,
        pending: true,
        message,
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to poll Pesepay transaction"

    logPesepayResponse(stage, {
      httpStatus: 0,
      url,
      raw: null,
      error: message,
    })

    return {
      success: false,
      paid: false,
      failed: false,
      pending: true,
      message,
    }
  }
}

export async function initiatePesepayTransaction(input: {
  amount: number
  currencyCode: string
  paymentReason: string
  merchantReference: string
  returnUrl: string
  customer?: {
    email?: string | null
    name?: string | null
    phoneNumber?: string | null
  }
}): Promise<PesepayInitiateResult> {
  if (!isPesepayConfigured()) {
    throw new Error("Pesepay is not configured.")
  }

  const integrationKey = getPesepayIntegrationKey()
  const encryptionKey = getPesepayEncryptionKey()

  if (!integrationKey || !encryptionKey) {
    throw new Error("Pesepay is not configured. Set PESEPAY_INTEGRATION_KEY and PESEPAY_ENCRYPTION_KEY.")
  }

  const paymentMethodCode = getPesepayPaymentMethodCode()

  if (paymentMethodCode === "PZW211" && !input.customer?.phoneNumber) {
    throw new Error("EcoCash payments require a customer phone number.")
  }

  const paymentBody = buildPaymentBody(input)
  const encryptedPayload = encryptPesepayPayload(paymentBody, encryptionKey)
  const initiateUrl = getInitiateUrl()

  try {
    const response = await fetch(initiateUrl, {
      method: "POST",
      headers: getPesepayHeaders(integrationKey),
      body: JSON.stringify({ payload: encryptedPayload }),
    })

    const data = (await response.json().catch(() => ({}))) as PesepayApiResponse

    if (!response.ok || !data.payload) {
      logPesepayResponse("initiate", {
        httpStatus: response.status,
        url: initiateUrl,
        raw: data,
        error: extractPesepayErrorMessage(data, "Failed to initiate Pesepay transaction"),
      })

      return {
        success: false,
        message: extractPesepayErrorMessage(data, "Failed to initiate Pesepay transaction"),
      }
    }

    const transaction = decryptPesepayData<PesepayTransactionResponse>(
      data.payload,
      encryptionKey
    )

    logPesepayResponse("initiate", {
      httpStatus: response.status,
      url: initiateUrl,
      raw: data,
      decrypted: transaction,
    })

    if (!transaction.redirectUrl) {
      return {
        success: false,
        message:
          transaction.transactionStatusDescription ??
          "Pesepay did not return a redirect URL",
      }
    }

    return {
      success: true,
      referenceNumber: transaction.referenceNumber,
      pollUrl: transaction.pollUrl,
      redirectUrl: transaction.redirectUrl,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to initiate Pesepay transaction"
    return { success: false, message }
  }
}

export async function pollPesepayTransaction(pollUrl: string): Promise<PesepayPollResult> {
  return requestPesepayStatus(pollUrl, "poll")
}

export async function checkPesepayPayment(referenceNumber: string): Promise<PesepayPollResult> {
  return requestPesepayStatus(getCheckPaymentUrl(referenceNumber), "check-payment")
}
