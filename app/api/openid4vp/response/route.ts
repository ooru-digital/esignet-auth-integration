import { type NextRequest, NextResponse } from "next/server"
import { extractCredentialSubject, getSession, updateSession } from "@/lib/openid4vp"

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const state = form.get("state")?.toString()
  const vpToken = form.get("vp_token")?.toString()
  const walletError = form.get("error")?.toString()

  if (!state || !getSession(state)) {
    return NextResponse.json({ error: "invalid_request", error_description: "Unknown or expired state" }, { status: 400 })
  }

  if (walletError) {
    updateSession(state, { status: "failed", error: form.get("error_description")?.toString() || walletError })
    return NextResponse.json({})
  }

  if (!vpToken) {
    updateSession(state, { status: "failed", error: "Wallet did not send a vp_token" })
    return NextResponse.json({ error: "invalid_request", error_description: "Missing vp_token" }, { status: 400 })
  }

  const credentialSubject = extractCredentialSubject(vpToken)
  if (!credentialSubject) {
    updateSession(state, { status: "failed", error: "Could not read the shared credential" })
    return NextResponse.json({ error: "invalid_request", error_description: "Unreadable vp_token" }, { status: 400 })
  }

  updateSession(state, { status: "received", credentialSubject })
  return NextResponse.json({})
}
