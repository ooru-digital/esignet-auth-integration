import { NextResponse } from "next/server"
import { CREDISSUER_CONFIG } from "@/lib/config"

export async function POST() {
  try {
    const response = await fetch(CREDISSUER_CONFIG.PRESENTATION_URL, {
      headers: CREDISSUER_CONFIG.HEADERS,
      cache: "no-store",
    })
    if (!response.ok) throw new Error(`CredIssuer returned ${response.status}`)

    const data = await response.json()
    if (!data.base64qrcode || !data.response_uri) throw new Error("CredIssuer response missing QR code")

    return NextResponse.json({ qr: data.base64qrcode, responseUri: data.response_uri })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create wallet request"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
