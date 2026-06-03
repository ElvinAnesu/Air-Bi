declare module "pesepay" {
  export class Pesepay {
    returnUrl: string
    resultUrl: string
    constructor(integrationKey: string, encryptionKey: string)
    createTransaction(
      amount: number,
      currencyCode: string,
      paymentReason: string,
      merchantReference: string
    ): unknown
    initiateTransaction(transaction: unknown): Promise<PesepayResponse>
    checkPayment(referenceNumber: string): Promise<PesepayResponse>
    pollTransaction(pollUrl: string): Promise<PesepayResponse>
  }

  export class PesepayResponse {
    success: boolean
    message?: string
    referenceNumber?: string
    pollUrl?: string
    redirectUrl?: string
    paid: boolean
  }
}
