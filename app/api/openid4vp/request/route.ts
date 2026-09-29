import { type NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { OPENID4VP_CONFIG } from "@/lib/config"
import { createSession } from "@/lib/openid4vp"

export async function POST(request: NextRequest) {
  const baseUrl = (OPENID4VP_CONFIG.PUBLIC_BASE_URL || request.nextUrl.origin).replace(/\/$/, "")
  const responseUri = `${baseUrl}${OPENID4VP_CONFIG.RESPONSE_PATH}`

  const state = randomBytes(16).toString("base64url")
  const nonce = randomBytes(16).toString("base64url")
  createSession(state, nonce)

  const params = new URLSearchParams({
    client_id: responseUri,
    client_id_scheme: OPENID4VP_CONFIG.CLIENT_ID_SCHEME,
    response_type: OPENID4VP_CONFIG.RESPONSE_TYPE,
    response_mode: OPENID4VP_CONFIG.RESPONSE_MODE,
    response_uri: responseUri,
    presentation_definition: JSON.stringify(OPENID4VP_CONFIG.PRESENTATION_DEFINITION),
    client_metadata: JSON.stringify(OPENID4VP_CONFIG.CLIENT_METADATA),
    nonce,
    state,
  })

  const url = `${OPENID4VP_CONFIG.REQUEST_SCHEME}?${params.toString()}`
  return NextResponse.json({ state, url })
}
