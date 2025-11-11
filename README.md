## Overview

This application provides a user-friendly interface for:
1. Displaying credential issuers (Digital Liquio)
2. Allowing users to request credentials (NationalIDCredential)
3. Redirecting users to eSignet for authentication
4. Downloading issued credentials via the Mimoto service

**Key Features:**
- OAuth 2.0 PKCE flow for secure authentication
- Integration with eSignet authorization service
- Credential download from Mimoto API
- Responsive UI built with React and Tailwind CSS
- Configurable authentication and credential parameters

---

## Prerequisites

- **Node.js**: v20.9.0 or higher
- **npm**: v10.0.0 or higher
- **Git**: For cloning the repository

### Verify Installation

```
node --version
npm --version
```

---

## Installation

### 1. Clone or Download the Project

```
git clone <repository-url>
cd esignet-auth-integration
```

### 2. Install Dependencies

```
npm install --legacy-peer-deps
```

The `--legacy-peer-deps` flag is required due to React 19.2.0 compatibility with some packages.

### 3. Verify Installation

```
npm run build
```

If the build succeeds, you're ready to proceed.

---

## Configuration

All application configuration is centralized in `lib/config.ts`. This file contains two configuration objects:

### AUTH_CONFIG - eSignet Authorization

```
export const AUTH_CONFIG = {
  AUTHORIZE_URL: "https://esignet.id.assembly.govstack.global/authorize",
  CLIENT_ID: "Liquio",
  SCOPE: "mosip_identity_vc_ldp",
  REDIRECT_URI: "https://v0-digital-liquio-ui.vercel.app/redirect",
  UI_LOCALES: "en",
  RESPONSE_TYPE: "code",
  CODE_CHALLENGE_METHOD: "S256",
}
```

**Parameters:**
- `AUTHORIZE_URL`: eSignet's OAuth authorization endpoint
- `CLIENT_ID`: Your registered OIDC client ID in eSignet
- `SCOPE`: Permission scope for credential issuance
- `REDIRECT_URI`: Where eSignet redirects after authentication (must match OIDC client registration)
- `UI_LOCALES`: Preferred language for eSignet UI
- `RESPONSE_TYPE`: OAuth response type (always "code" for authorization code flow)
- `CODE_CHALLENGE_METHOD`: PKCE method (S256 for SHA-256)

### DOWNLOAD_CONFIG - Mimoto Credential Download

```
export const DOWNLOAD_CONFIG = {
  DOWNLOAD_URL: "https://injiweb.id.assembly.govstack.global/v1/mimoto/credentials/download",
  GRANT_TYPE: "authorization_code",
  ISSUER: "Digital Liquio",
  CREDENTIAL_TYPE: "NationalIDCredential",
  VC_STORAGE_EXPIRY_LIMIT: "1",
  LOCALE: "en",
  FILENAME: "NationalIDCredential.pdf",
}
```

**Parameters:**
- `DOWNLOAD_URL`: Mimoto credential download endpoint
- `GRANT_TYPE`: OAuth grant type (always "authorization_code")
- `ISSUER`: Name of the credential issuer
- `CREDENTIAL_TYPE`: Type of credential to download
- `VC_STORAGE_EXPIRY_LIMIT`: Credential validity period
- `LOCALE`: Credential language preference
- `FILENAME`: Name of downloaded PDF file

---

## Running Locally

### Start Development Server

```
npm run dev
```

The application will be available at:
```
http://localhost:3000
```

### Verify It's Running

1. Open your browser
2. Navigate to `http://localhost:3000`
3. You should see:
   - "Credential Issuers" heading
   - "Digital Liquio" issuer card
   - "View Templates" button

### Test the Flow

1. Click "View Templates"
2. Click "Authorize with eSignet"
3. You should be redirected to eSignet's login page
4. After authentication, credentials will download automatically

### Troubleshooting

**Port 3000 already in use:**
```
npm run dev -- -p 3001
```

**Dependencies issues:**
```
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run dev
```

---

## API Flow

### 1. Authorization Flow (PKCE OAuth 2.0)

```
User clicks "Authorize with eSignet"
    ↓
Generate PKCE parameters (code_verifier, code_challenge, state)
    ↓
Redirect to: https://esignet.id.assembly.govstack.global/authorize?
    - client_id=Liquio
    - scope=mosip_identity_vc_ldp
    - redirect_uri=https://your-domain.com/redirect
    - state=[random_state]
    - code_challenge=[SHA256_hash]
    - code_challenge_method=S256
    ↓
User authenticates at eSignet
    ↓
eSignet redirects back with authorization code:
    https://your-domain.com/redirect?code=[auth_code]&state=[state]
```

### 2. Credential Download Flow

```
Redirect page captures authorization code
    ↓
Calls /api/credentials/download with:
    - code (from eSignet)
    - code_verifier (from sessionStorage)
    - redirect_uri
    - issuer
    - credential_type
    ↓
Server calls Mimoto API:
    POST https://injiweb.id.assembly.govstack.global/v1/mimoto/credentials/download
    ↓
Mimoto validates and returns PDF credential
    ↓
Browser automatically downloads PDF file
```

---
