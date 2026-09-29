import { createPrivateKey, randomUUID } from "crypto"
import { type JWTPayload, type KeyLike, SignJWT, createRemoteJWKSet, importJWK, jwtVerify } from "jose"
import { AUTH_CONFIG } from "@/lib/config"

const esignetJwks = createRemoteJWKSet(new URL(AUTH_CONFIG.JWKS_URL))

type ClientPrivateKey = KeyLike | Uint8Array

// Accepts a single-line JWK JSON or a PEM (PKCS#8 or PKCS#1)
async function loadClientPrivateKey(): Promise<ClientPrivateKey> {
  const rawKey = process.env.ESIGNET_CLIENT_PRIVATE_KEY?.trim()
  if (!rawKey) {
    throw new Error("ESIGNET_CLIENT_PRIVATE_KEY is not set. Add the private key registered for the eSignet client.")
  }
  if (rawKey.startsWith("-----BEGIN")) {
    return createPrivateKey(rawKey.replace(/\\n/g, "\n"))
  }
  return importJWK(JSON.parse(rawKey), AUTH_CONFIG.CLIENT_ASSERTION_ALG)
}

// No kid in the header: eSignet matches the header kid against the registered JWK, so a differing kid fails verification
async function createClientAssertion(privateKey: ClientPrivateKey): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: AUTH_CONFIG.CLIENT_ASSERTION_ALG, typ: "JWT" })
    .setIssuer(AUTH_CONFIG.CLIENT_ID)
    .setSubject(AUTH_CONFIG.CLIENT_ID)
    .setAudience(AUTH_CONFIG.CLIENT_ASSERTION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("60s")
    .setJti(randomUUID())
    .sign(privateKey)
}

async function exchangeCodeForAccessToken(code: string, codeVerifier: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: AUTH_CONFIG.REDIRECT_URI,
    client_id: AUTH_CONFIG.CLIENT_ID,
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: await createClientAssertion(await loadClientPrivateKey()),
    code_verifier: codeVerifier,
  })

  const response = await fetch(AUTH_CONFIG.TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok || !data.access_token) {
    throw new Error(
      `Token request failed (${response.status}): ${data.error_description || data.error || "no access_token returned"}`,
    )
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
