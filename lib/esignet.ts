import { type JWTPayload, createRemoteJWKSet, jwtVerify } from "jose"
import { AUTH_CONFIG } from "@/lib/config"

const esignetJwks = createRemoteJWKSet(new URL(AUTH_CONFIG.JWKS_URL))

async function exchangeCodeForAccessToken(code: string, codeVerifier: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: AUTH_CONFIG.REDIRECT_URI,
    client_id: AUTH_CONFIG.CLIENT_ID,
    code_verifier: codeVerifier,
  })

  const response = await fetch(AUTH_CONFIG.TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok || !data.access_token) {
    const mimotoError = data.errors?.[0]
    const reason = mimotoError
      ? `${mimotoError.errorCode}: ${mimotoError.errorMessage}`
      : data.error_description || data.error || "no access_token returned"
    throw new Error(`Token request failed (${response.status}): ${reason}`)
  }
  return data.access_token
}

// eSignet returns either a signed JWT or plain JSON claims (even with content-type application/jwt)
async function fetchUserInfo(accessToken: string): Promise<JWTPayload> {
  const response = await fetch(AUTH_CONFIG.USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const text = (await response.text()).trim()

  if (!response.ok) {
    throw new Error(`Userinfo request failed (${response.status}): ${text.slice(0, 300)}`)
  }

  const body = text.startsWith('"') ? (JSON.parse(text) as string).trim() : text
  if (body.startsWith("{")) {
    return JSON.parse(body) as JWTPayload
  }
  const { payload } = await jwtVerify(body, esignetJwks, { issuer: AUTH_CONFIG.ISSUER })
  return payload
}

const JWT_METADATA_CLAIMS = new Set(["iss", "aud", "iat", "exp", "nbf", "jti"])

export async function getUserInfoFromCode(code: string, codeVerifier: string): Promise<Record<string, unknown>> {
  const accessToken = await exchangeCodeForAccessToken(code, codeVerifier)
  const userInfo = await fetchUserInfo(accessToken)
  return Object.fromEntries(Object.entries(userInfo).filter(([key]) => !JWT_METADATA_CLAIMS.has(key)))
}
