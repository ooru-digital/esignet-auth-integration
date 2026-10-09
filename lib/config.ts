// Deployment-specific values come from environment variables (see .env.example).
// NEXT_PUBLIC_* values are sent to the browser; all other values stay on the server.

export const AUTH_CONFIG = {
  AUTHORIZE_URL: process.env.NEXT_PUBLIC_ESIGNET_AUTHORIZE_URL ?? "",
  CLIENT_ID: process.env.NEXT_PUBLIC_ESIGNET_CLIENT_ID ?? "",
  REDIRECT_URI: process.env.NEXT_PUBLIC_ESIGNET_REDIRECT_URI ?? "",
  // userinfo requires the openid scope; profile/email map to the user claims
  SCOPE: process.env.NEXT_PUBLIC_ESIGNET_SCOPE || "openid profile email",
  UI_LOCALES: process.env.NEXT_PUBLIC_ESIGNET_UI_LOCALES || "en",
  RESPONSE_TYPE: "code",
  CODE_CHALLENGE_METHOD: "S256",
  // Claims requested from userinfo; eSignet only releases claims listed here (and allowed for CLIENT_ID)
  CLAIMS: {
    userinfo: {
      name: { essential: true },
      gender: { essential: true },
      birthdate: { essential: true },
      email: { essential: true },
      phone_number: { essential: true },
      address: { essential: true },
      picture: { essential: true },
    },
    id_token: {},
  },
}

// Server-only: used by the API routes for the token exchange and userinfo call
export const ESIGNET_SERVER_CONFIG = {
  TOKEN_URL: process.env.ESIGNET_TOKEN_URL ?? "",
  USERINFO_URL: process.env.ESIGNET_USERINFO_URL ?? "",
  JWKS_URL: process.env.ESIGNET_JWKS_URL ?? "",
  ISSUER: process.env.ESIGNET_ISSUER ?? "",
  CLIENT_ASSERTION_ALG: "RS256",
  // Must equal the `aud` eSignet expects for the client_assertion (normally the token endpoint)
  CLIENT_ASSERTION_AUDIENCE: process.env.ESIGNET_CLIENT_ASSERTION_AUDIENCE || process.env.ESIGNET_TOKEN_URL || "",
}

// Shows "Login with Wallet" and enables its API routes; off unless set to "true"
export const WALLET_LOGIN_ENABLED = process.env.NEXT_PUBLIC_ENABLE_WALLET_LOGIN === "true"

// Server-only: wallet (OpenID4VP) login through the CredIssuer verifier
const verifierOrigin = process.env.CREDISSUER_VERIFIER_ORIGIN

export const CREDISSUER_CONFIG = {
  // Creates a wallet presentation request; returns { base64qrcode, response_uri }
  PRESENTATION_URL: process.env.CREDISSUER_PRESENTATION_URL ?? "",
  // Only response_uri values with this origin and under this path are polled (stops the status route fetching arbitrary URLs)
  RESPONSE_URI_PREFIX: process.env.CREDISSUER_RESPONSE_URI_PREFIX ?? "",
  HEADERS: {
    Accept: "*/*",
    "Accept-Language": "en",
    ...(verifierOrigin ? { Origin: verifierOrigin, Referer: `${verifierOrigin}/` } : {}),
  },
}
