import { NextRequest, NextResponse } from "next/server"
import CryptoJS from "crypto-js"

function readDecryptParams(
  searchParams: URLSearchParams,
  body?: Record<string, unknown>
) {
  const encryptedJson =
    (typeof body?.encryptedJson === "string" ? body.encryptedJson : null) ??
    searchParams.get("encryptedJson") ??
    searchParams.get("encryptedjson")

  const encryptionKey =
    (typeof body?.encryptionKey === "string" ? body.encryptionKey : null) ??
    searchParams.get("encryptionKey") ??
    searchParams.get("encryptionkey")

  return { encryptedJson, encryptionKey }
}

function decryptRouteResponse(encryptedJson: string | null, encryptionKey: string | null) {
  if (!encryptedJson) {
    return NextResponse.json({ error: "encryptedJson is required" }, { status: 400 })
  }

  if (!encryptionKey) {
    return NextResponse.json({ error: "encryptionKey is required" }, { status: 400 })
  }

  try { 
    console.log("encryptedJson", encryptedJson);
    console.log("encryptionKey", encryptionKey);

    const decryptedBytes = CryptoJS.AES.decrypt(
      encryptedJson,
      CryptoJS.enc.Utf8.parse(encryptionKey),
      {
        iv: CryptoJS.enc.Utf8.parse(encryptionKey.substring(0, 16)),
        padding: CryptoJS.pad.NoPadding
      }
    );

    const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedData) {
      throw new Error('Decryption failed - empty result');
    }

    return JSON.parse(decryptedData);
    //const decrypted = decryptPesepayData(encryptedJson, encryptionKey)
    //return NextResponse.json({ ok: true, decrypted : false})
  } catch (error) {
    console.error('Error decrypting data:', error);
    const message = error instanceof Error ? error.message : "Decryption failed"
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  const { encryptedJson, encryptionKey } = readDecryptParams(req.nextUrl.searchParams)
  return decryptRouteResponse(encryptedJson, encryptionKey)
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const { encryptedJson, encryptionKey } = readDecryptParams(req.nextUrl.searchParams, body)
  return decryptRouteResponse(encryptedJson, encryptionKey)
}
