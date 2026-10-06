// Separated into AUTH and DOWNLOAD configs for better organization

export const AUTH_CONFIG = {
  // eSignet authorization endpoint
  AUTHORIZE_URL: "https://prod-opt.credissuer.com/authorize",
  // Mimoto signs the client_assertion with its own key (issuer's client_alias) and proxies to eSignet's token endpoint
  TOKEN_URL: "https://prod-opt.credissuer.com/mimoto/v1/mimoto/get-token/INJIC-8W9L7",
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

export const CREDISSUER_CONFIG = {
  // Creates a wallet presentation request; returns { base64qrcode, response_uri }
  PRESENTATION_URL:
    process.env.CREDISSUER_PRESENTATION_URL || "https://api.credissuer.com/api/verifier/vp/presentation/12",
  // Only response_uri values under this prefix are polled (stops the status route fetching arbitrary URLs)
  RESPONSE_URI_PREFIX: "https://api.credissuer.com/api/verifier/vp/presentation/",
  // CredIssuer only answers requests that look like they come from its verifier site
  HEADERS: {
    Accept: "*/*",
    "Accept-Language": "en",
    Origin: "https://staging-verify.credissuer.com",
    Referer: "https://staging-verify.credissuer.com/",
  },
}

export const API_CONFIG = {
  // Accept headers for download
  ACCEPT: "application/pdf",
  ACCEPT_LANGUAGE: "en-GB,en-US;q=0.9,en;q=0.8",
  CACHE_CONTROL: "no-cache, no-store, must-revalidate",
  CONTENT_TYPE: "application/x-www-form-urlencoded",
}
