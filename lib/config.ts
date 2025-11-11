// Separated into AUTH and DOWNLOAD configs for better organization

export const AUTH_CONFIG = {
  // eSignet authorization endpoint
  AUTHORIZE_URL: "https://esignet.id.assembly.govstack.global/authorize",
  CLIENT_ID: "Liquio",
  SCOPE: "mosip_identity_vc_ldp",
  REDIRECT_URI: "http://localhost:3000/redirect",
  UI_LOCALES: "en",
  RESPONSE_TYPE: "code",
  CODE_CHALLENGE_METHOD: "S256",
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

export const API_CONFIG = {
  // Accept headers for download
  ACCEPT: "application/pdf",
  ACCEPT_LANGUAGE: "en-GB,en-US;q=0.9,en;q=0.8",
  CACHE_CONTROL: "no-cache, no-store, must-revalidate",
  CONTENT_TYPE: "application/x-www-form-urlencoded",
}
