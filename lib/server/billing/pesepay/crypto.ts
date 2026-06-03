import CryptoJS from "crypto-js"
import { getPesepayEncryptionKey } from "@/lib/server/billing/config"

/**
 * Pesepay encryption steps:
 * 1. JSON.stringify the request body
 * 2. AES-256-CBC with the encryption key
 * 3. IV = first 16 characters of the encryption key
 * 4. Base64-encode the encrypted result
 * 5. Send as { payload: encryptedBase64String }
 */
export function encryptPesepayPayload(payload: unknown, encryptionKey: string): string {
  const plainText = JSON.stringify(payload)

  return CryptoJS.AES.encrypt(plainText, CryptoJS.enc.Utf8.parse(encryptionKey), {
    iv: CryptoJS.enc.Utf8.parse(encryptionKey.substring(0, 16)),
  }).toString()
}

/**
 * Decrypt the encrypted response from Pesepay API.
 * Use this for every Pesepay response that returns an encrypted payload.
 */
export function decryptPesepayData<T = unknown>(
  encryptedJson: string,
  encryptionKey: string
): T {
  const iv = encryptionKey.substring(0, 16)

  console.log("[Pesepay][decrypt] start", {
    payloadLength: encryptedJson?.length ?? 0,
    payloadPreview: encryptedJson ? `${encryptedJson.slice(0, 40)}...${encryptedJson.slice(-20)}` : null,
    keyLength: encryptionKey?.length ?? 0,
    ivPreview: iv ? `${iv.slice(0, 4)}...${iv.slice(-4)}` : null,
  })

  try {
    const decryptedBytes = CryptoJS.AES.decrypt(
      encryptedJson,
      CryptoJS.enc.Utf8.parse(encryptionKey),
      {
        iv: CryptoJS.enc.Utf8.parse(encryptionKey.substring(0, 16)),
      }
    )

    console.log("[Pesepay][decrypt] (elvin) after AES.decrypt", {
      sigBytes: decryptedBytes.sigBytes,
      wordsLength: decryptedBytes.words?.length ?? 0,
    })

    const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8)

    console.log("[Pesepay][decrypt] after UTF-8 conversion", {
      decryptedLength: decryptedData.length,
      decryptedPreview: decryptedData
        ? `${decryptedData.slice(0, 120)}${decryptedData.length > 120 ? "..." : ""}`
        : null,
      isEmpty: !decryptedData,
    })

    if (!decryptedData) {
      throw new Error("Decryption failed - empty result")
    }

    const parsed = JSON.parse(decryptedData) as T

    console.log("[Pesepay][decrypt] JSON.parse success", {
      parsedType: typeof parsed,
      parsedKeys:
        parsed && typeof parsed === "object" ? Object.keys(parsed as object) : null,
    })

    return parsed
  } catch (error) {
    console.error("[Pesepay][decrypt] failed", {
      step:
        error instanceof SyntaxError
          ? "json-parse"
          : error instanceof Error && error.message.includes("empty result")
            ? "utf8-conversion"
            : "unknown",
      message: error instanceof Error ? error.message : String(error),
    })
    console.error("Error decrypting Pesepay data:", error)
    throw error
  }
}

export function decryptPesepayResultPayload<T = unknown>(encryptedJson: string): T {
  const encryptionKey = getPesepayEncryptionKey()
  if (!encryptionKey) {
    throw new Error("Pesepay encryption key is not configured.")
  }

  return decryptPesepayData<T>(encryptedJson, encryptionKey)
}
