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
  REDIRECT_URI: "http://localhost:3000/redirect",
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
Detailed Authorization URL with Real Example

Here’s exactly what happens when you click “Authorize with eSignet”:

Step 1: Generate PKCE Parameters

Your app generates these values using cryptography.
This code runs in your browser when you click the button (from lib/pkce.ts):

```
// Generate Code Verifier (128 random characters)
const codeVerifier = generateRandomString(128)
// Example result:
// "_M.x1OQ9oBy9UWClTLo97p0jpBAOfKTx.uNNbkwLDMLc7e9f_example_verifier_128_chars_long"

// Generate State (32 random characters)
const state = generateRandomString(32)
// Example result:
// "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6"

// Generate Code Challenge (SHA-256 hash of the Verifier)
const codeChallenge = await generateCodeChallenge(codeVerifier)
// Example result:
// "0lSp2N_kJpTlW3Q2cxKJigtg2N6fnXCe3pJuSnll-Q4"
```

How generateCodeChallenge Works
```
// Takes the 128-character verifier and:

// 1. Converts it to bytes
const data = encoder.encode(codeVerifier)

// 2. Applies SHA-256 hash (one-way mathematical function)
const digest = await crypto.subtle.digest("SHA-256", data)

// 3. Converts hash to URL-safe Base64 format
const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
const codeChallenge = base64
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=/g, "")
// Result: 44-character string like "0lSp2N_kJpTlW3Q2cxKJigtg2N6fnXCe3pJuSnll-Q4"
```

Result:
A 43–44 character Base64URL-encoded string (the code_challenge), for example:

```0lSp2N_kJpTlW3Q2cxKJigtg2N6fnXCe3pJuSnll-Q4```


```
User clicks "Authorize with eSignet"
    ↓
Generate PKCE parameters (code_verifier, code_challenge, state)
    ↓
Redirect to: https://esignet.id.assembly.govstack.global/authorize?
    - client_id=Liquio
    - scope=mosip_identity_vc_ldp
    - redirect_uri=https://your-domain.com/redirect
    - state=[state]
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
