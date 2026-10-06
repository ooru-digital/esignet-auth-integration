import { NextResponse } from "next/server"
import { CREDISSUER_CONFIG, WALLET_LOGIN_ENABLED } from "@/lib/config"
import { parseAllowedResponseUri } from "@/lib/wallet"

export async function POST() {
  if (!WALLET_LOGIN_ENABLED) {
    return NextResponse.json({ error: "Wallet login is disabled" }, { status: 404 })
  }
  const missing = [
    !CREDISSUER_CONFIG.PRESENTATION_URL && "CREDISSUER_PRESENTATION_URL",
    !CREDISSUER_CONFIG.RESPONSE_URI_PREFIX && "CREDISSUER_RESPONSE_URI_PREFIX",
  ].filter(Boolean)
  if (missing.length) {
    return NextResponse.json({ error: `Wallet login is not configured (${missing.join(", ")})` }, { status: 503 })
  }

  try {
    const response = await fetch(CREDISSUER_CONFIG.PRESENTATION_URL, {
      headers: CREDISSUER_CONFIG.HEADERS,
      cache: "no-store",
    })
    if (!response.ok) throw new Error(`CredIssuer returned ${response.status}`)

    const data = await response.json()
    if (!data.base64qrcode || !data.response_uri) throw new Error("CredIssuer response missing QR code")
    if (!parseAllowedResponseUri(data.response_uri, CREDISSUER_CONFIG.RESPONSE_URI_PREFIX)) {
      throw new Error("Verifier response_uri is outside CREDISSUER_RESPONSE_URI_PREFIX")
    }

    return NextResponse.json({ qr: data.base64qrcode, responseUri: data.response_uri })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create wallet request"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
