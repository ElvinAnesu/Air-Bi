import CryptoJS from "crypto-js"
import { createCipheriv, createDecipheriv } from "crypto"
import { readFileSync } from "fs"

const env = readFileSync(".env.local", "utf8")
const encKey = env.match(/PESEPAY_ENCRYPTION_KEY=(.+)/)?.[1]?.trim()
const intKey = env.match(/PESEPAY_INTEGRATION_KEY=(.+)/)?.[1]?.trim()
const baseUrl = env.match(/PESEPAY_API_BASE_URL=(.+)/)?.[1]?.trim()

function encryptCryptoJs(obj) {
  return CryptoJS.AES.encrypt(JSON.stringify(obj), CryptoJS.enc.Utf8.parse(encKey), {
    iv: CryptoJS.enc.Utf8.parse(encKey.substring(0, 16)),
  }).toString()
}

function encryptNode(obj) {
  const iv = Buffer.from(encKey.substring(0, 16), "utf8")
  const cipher = createCipheriv("aes-256-cbc", Buffer.from(encKey, "utf8"), iv)
  return cipher.update(JSON.stringify(obj), "utf8", "base64") + cipher.final("base64")
}

function decryptCryptoJs(payload) {
  const bytes = CryptoJS.AES.decrypt(payload, CryptoJS.enc.Utf8.parse(encKey), {
    iv: CryptoJS.enc.Utf8.parse(encKey.substring(0, 16)),
  })
  return bytes.toString(CryptoJS.enc.Utf8)
}

function decryptNode(payload) {
  const iv = Buffer.from(encKey.substring(0, 16), "utf8")
  const decipher = createDecipheriv("aes-256-cbc", Buffer.from(encKey, "utf8"), iv)
  return decipher.update(payload, "base64", "utf8") + decipher.final("utf8")
}

function tryDecrypt(label, payload) {
  for (const [name, fn] of [
    ["cryptojs", decryptCryptoJs],
    ["node", decryptNode],
  ]) {
    try {
      const text = fn(payload)
      const parsed = JSON.parse(text)
      console.log(label, name, "OK", parsed.transactionStatus, parsed.referenceNumber)
      return parsed
    } catch (error) {
      console.log(label, name, "ERR", error.message)
    }
  }
  return null
}

const body = {
  amountDetails: { amount: 25, currencyCode: "USD" },
  merchantReference: `test-${Date.now()}`,
  reasonForPayment: "AirBI test",
  resultUrl: "http://localhost:3000/api/billing/pesepay/result",
  returnUrl: "http://localhost:3000/billing",
  paymentMethodCode: "PZW212",
  customer: { email: "test@test.com", phoneNumber: "", name: "Test" },
  paymentMethodRequiredFields: {},
}

for (const [encName, encFn] of [
  ["cryptojs", encryptCryptoJs],
  ["node", encryptNode],
]) {
  console.log("\n=== initiate with", encName, "encrypt ===")
  const res = await fetch(`${baseUrl}/v1/payments/initiate`, {
    method: "POST",
    headers: { key: intKey, authorization: intKey, "Content-Type": "application/json" },
    body: JSON.stringify({ payload: encFn(body) }),
  })
  const data = await res.json()
  console.log("initiate status", res.status, "payload len", data.payload?.length)
  const initiated = tryDecrypt("initiate-response", data.payload)
  if (!initiated?.referenceNumber) continue

  const checkUrl = `${baseUrl}/v1/payments/check-payment?referenceNumber=${encodeURIComponent(initiated.referenceNumber)}`
  const checkRes = await fetch(checkUrl, {
    headers: { key: intKey, authorization: intKey, "Content-Type": "application/json" },
  })
  const checkData = await checkRes.json()
  console.log("check status", checkRes.status, "payload len", checkData.payload?.length)
  tryDecrypt("check-response", checkData.payload)
}
