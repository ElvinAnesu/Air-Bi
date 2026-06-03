/** @jest-environment node */

import {
  decryptPesepayData,
  decryptPesepayResultPayload,
  encryptPesepayPayload,
} from "@/lib/server/billing/pesepay/crypto"
import { getPesepayEncryptionKey } from "@/lib/server/billing/config"

jest.mock("@/lib/server/billing/config", () => ({
  getPesepayEncryptionKey: jest.fn(),
}))

const TEST_ENCRYPTION_KEY = "f8e8250713ee4f18b9eca7202a4b3ac3"

const sampleTransaction = {
  referenceNumber: "20260602160602903-9ED69E4B",
  pollUrl:
    "https://api.test.sandbox.pesepay.com/payments-engine/v1/payments/check-payment?referenceNumber=20260602160602903-9ED69E4B",
  redirectUrl:
    "https://pesepay-payments-sandbox-test.web.app/#/pesepay-payments?referenceNumber=20260602160602903-9ED69E4B",
  transactionStatus: "SUCCESS",
}

describe("decryptPesepayData", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {})
    jest.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("decrypts a payload encrypted with encryptPesepayPayload", () => {
    const encrypted = encryptPesepayPayload(sampleTransaction, TEST_ENCRYPTION_KEY)

    const decrypted = decryptPesepayData<typeof sampleTransaction>(
      encrypted,
      TEST_ENCRYPTION_KEY
    )

    expect(decrypted).toEqual(sampleTransaction)
  })

  it("returns parsed transaction fields from a Pesepay-style initiate response", () => {
    const initiateResponse = {
      referenceNumber: "20260602153006433-F28F9CA9",
      pollUrl:
        "https://api.test.sandbox.pesepay.com/payments-engine/v1/payments/check-payment?referenceNumber=20260602153006433-F28F9CA9",
      redirectUrl:
        "https://pesepay-payments-sandbox-test.web.app/#/pesepay-payments?referenceNumber=20260602153006433-F28F9CA9",
    }

    const encrypted = encryptPesepayPayload(initiateResponse, TEST_ENCRYPTION_KEY)
    const decrypted = decryptPesepayData<typeof initiateResponse>(
      encrypted,
      TEST_ENCRYPTION_KEY
    )

    expect(decrypted.referenceNumber).toBe(initiateResponse.referenceNumber)
    expect(decrypted.pollUrl).toBe(initiateResponse.pollUrl)
    expect(decrypted.redirectUrl).toBe(initiateResponse.redirectUrl)
  })

  it("throws when the encryption key is wrong", () => {
    const encrypted = encryptPesepayPayload(sampleTransaction, TEST_ENCRYPTION_KEY)

    expect(() =>
      decryptPesepayData(encrypted, "00000000000000000000000000000000")
    ).toThrow()
  })

  it("throws when the payload is not valid encrypted data", () => {
    expect(() => decryptPesepayData("not-a-valid-payload", TEST_ENCRYPTION_KEY)).toThrow()
  })
})

describe("decryptPesepayResultPayload", () => {
  const mockedGetPesepayEncryptionKey = jest.mocked(getPesepayEncryptionKey)

  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {})
    jest.spyOn(console, "error").mockImplementation(() => {})
    mockedGetPesepayEncryptionKey.mockReturnValue(TEST_ENCRYPTION_KEY)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("reads the encryption key from config and decrypts the payload", () => {
    const encrypted = encryptPesepayPayload(sampleTransaction, TEST_ENCRYPTION_KEY)

    const decrypted = decryptPesepayResultPayload<typeof sampleTransaction>(encrypted)

    expect(mockedGetPesepayEncryptionKey).toHaveBeenCalled()
    expect(decrypted).toEqual(sampleTransaction)
  })

  it("throws when the encryption key is not configured", () => {
    mockedGetPesepayEncryptionKey.mockReturnValue(null)

    expect(() => decryptPesepayResultPayload("some-payload")).toThrow(
      "Pesepay encryption key is not configured."
    )
  })
})
