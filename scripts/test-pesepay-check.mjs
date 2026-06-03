import CryptoJS from "crypto-js"
import { createDecipheriv } from "crypto"
import { readFileSync } from "fs"

const env = readFileSync(".env.local", "utf8")
const key = env.match(/PESEPAY_ENCRYPTION_KEY=(.+)/)?.[1]?.trim()
const integrationKey = env.match(/PESEPAY_INTEGRATION_KEY=(.+)/)?.[1]?.trim()
const referenceNumber = process.argv[2] ?? "20260602150636814-4B20998E"

const url = `https://api.test.sandbox.pesepay.com/payments-engine/v1/payments/check-payment?referenceNumber=${encodeURIComponent(referenceNumber)}`

const response = await fetch(url, {
  headers: {
    key: integrationKey,
    authorization: integrationKey,
    "Content-Type": "application/json",
  },
})

const text = await response.text()
console.log("status", response.status)
console.log("content-type", response.headers.get("content-type"))
console.log("text length", text.length)
console.log("text preview", text.slice(0, 200))

let data
try {
  data = JSON.parse(text)
} catch (e) {
  console.log("not json", e.message)
  process.exit(0)
}

console.log("json keys", Object.keys(data))
const payload = data.payload
console.log("payload type", typeof payload, "length", payload?.length)

function cryptoJsDecrypt(encrypted) {
  const bytes = CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Utf8.parse(key), {
    iv: CryptoJS.enc.Utf8.parse(key.substring(0, 16)),
  })
  return bytes.toString(CryptoJS.enc.Utf8)
}

function nodeDecrypt(encrypted) {
  const iv = Buffer.from(key.substring(0, 16), "utf8")
  const decipher = createDecipheriv("aes-256-cbc", Buffer.from(key, "utf8"), iv)
  return decipher.update(encrypted, "base64", "utf8") + decipher.final("utf8")
}

if (typeof payload === "string") {
  try {
    const r = cryptoJsDecrypt(payload)
    console.log("cryptojs status", JSON.parse(r).transactionStatus)
  } catch (e) {
    console.log("cryptojs err", e.message)
  }

  try {
    const r = nodeDecrypt(payload)
    console.log("node status", JSON.parse(r).transactionStatus)
  } catch (e) {
    console.log("node err", e.message)
  }

  try {
    const raw = Buffer.from(payload, "base64").toString("utf8")
    console.log("base64 preview", raw.slice(0, 120))
  } catch (e) {
    console.log("base64 err", e.message)
  }
}
