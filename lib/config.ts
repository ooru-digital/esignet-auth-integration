// Separated into AUTH and DOWNLOAD configs for better organization

export const AUTH_CONFIG = {
  // eSignet authorization endpoint
  AUTHORIZE_URL: "https://prod-opt.credissuer.com/authorize",
  TOKEN_URL: "https://prod-opt.credissuer.com/v1/esignet/oauth/v2/token",
  USERINFO_URL: "https://prod-opt.credissuer.com/v1/esignet/oidc/userinfo",
  JWKS_URL: "https://prod-opt.credissuer.com/.well-known/jwks.json",
  ISSUER: "https://prod-opt.credissuer.com",
  CLIENT_ID: "cred-flow2",
  // userinfo requires the openid scope; profile/email map to the user claims
  SCOPE: "openid profile email",
  REDIRECT_URI: "http://localhost:3001/redirect",
  UI_LOCALES: "en",
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
  CLIENT_ASSERTION_ALG: "RS256",
  // Must equal the `aud` eSignet expects for the client_assertion (the Postman `audience` variable)
  CLIENT_ASSERTION_AUDIENCE: "https://prod-opt.credissuer.com/v1/esignet/oauth/v2/token",
}

export const DOWNLOAD_CONFIG = {
  // Mimoto credential download endpoint
  DOWNLOAD_URL: "https://injiweb.id.assembly.govstack.global/v1/mimoto/credentials/download",
  GRANT_TYPE: "authorization_code",
  ISSUER: "Digital Liquio",
  CREDENTIAL_TYPE: "NationalIDCredential",
  VC_STORAGE_EXPIRY_LIMIT: "1",
  LOCALE: "en",
  FILENAME: "NationalIDCredential.pdf",
}

export const OPENID4VP_CONFIG = {
  // Scheme the wallet app is registered to handle when scanning the QR code
  REQUEST_SCHEME: "openid4vp://authorize",
  CLIENT_ID_SCHEME: "redirect_uri",
  RESPONSE_TYPE: "vp_token",
  RESPONSE_MODE: "direct_post",
  // Must be reachable from the phone running the wallet; falls back to the origin the app was opened on
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || "",
  RESPONSE_PATH: "/api/openid4vp/response",
  SESSION_TTL_MS: 5 * 60 * 1000,
  // Inji Wallet rejects client_metadata without vp_formats, and any empty string value (e.g. logo_uri: "")
  CLIENT_METADATA: {
    client_name: "Login with National ID",
    vp_formats: {
      ldp_vp: { proof_type: ["Ed25519Signature2018", "Ed25519Signature2020", "RsaSignature2018"] },
    },
  },
  PRESENTATION_DEFINITION: {
    id: "vp-token-example",
    format: { ldp_vc: { proof_type: ["Ed25519Signature2020"] } },
    purpose: "Relying party is requesting your digital ID for the purpose of Self-Authentication",
    client_metadata: { logo_uri: "", client_name: "Login with National ID" },
    input_descriptors: [
      {
        id: "id-card-credential",
        format: { ldp_vc: { proof_type: ["Ed25519Signature2020"] } },
        constraints: {
          fields: [{ path: ["$.type[?(@ == 'NationalIDCredential')]"] }],
        },
      },
    ],
  },
}

export const API_CONFIG = {
  // Accept headers for download
  ACCEPT: "application/pdf",
  ACCEPT_LANGUAGE: "en-GB,en-US;q=0.9,en;q=0.8",
  CACHE_CONTROL: "no-cache, no-store, must-revalidate",
  CONTENT_TYPE: "application/x-www-form-urlencoded",
}
