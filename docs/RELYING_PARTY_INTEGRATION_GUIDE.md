# Integrating a Relying Party with CredIssuer eSignet

This guide explains how any portal or application (a **relying party**) can add **"Login with eSignet"** using the eSignet instance hosted by CredIssuer at `https://prod-opt.credissuer.com`.

eSignet follows the standard **OpenID Connect (OIDC)** protocol. Each relying party:

1. Creates its **own key pair** and keeps the **private key in its own backend**.
2. Registers its **own OIDC client** in eSignet with the **public key**.
3. Implements the OIDC Authorization Code flow with PKCE, signing the token request with its private key (`private_key_jwt`).

---

## 1. Background: current setup vs. new relying parties

eSignet does not use client secrets. To exchange the authorization code for a token, the relying party must send a JWT (`client_assertion`) **signed with the private key** that matches the public key registered on its OIDC client.

| | Current reference portal (`cred-flow2`) | New relying parties (this guide) |
| --- | --- | --- |
| Token call | Portal calls Mimoto `get-token`, Mimoto signs `client_assertion` and forwards to eSignet | Relying party signs `client_assertion` itself and calls eSignet token endpoint directly |
| Who controls the key | CredIssuer | Relying party |

The current portal uses Mimoto only because Mimoto maintains the private key for `cred-flow2`. A new relying party owns its client and key, so **it does not need Mimoto**. The rest of the flow (authorize, callback, userinfo) is the same.

---

## 2. eSignet endpoints

| Purpose | URL |
| --- | --- |
| Issuer | `https://prod-opt.credissuer.com` |
| Discovery | `https://prod-opt.credissuer.com/.well-known/openid-configuration` |
| Authorize | `https://prod-opt.credissuer.com/authorize` |
| Token | `https://prod-opt.credissuer.com/esignet/v1/esignet/oauth/v2/token` |
| Userinfo | `https://prod-opt.credissuer.com/v1/esignet/oidc/userinfo` |
| JWKS (eSignet public keys) | `https://prod-opt.credissuer.com/.well-known/jwks.json` |
| CSRF token (for client creation) | `https://prod-opt.credissuer.com/esignet/v1/esignet/csrf/token` |
| Create OIDC client | `https://prod-opt.credissuer.com/esignet/v1/esignet/client-mgmt/oidc-client` |

Supported values:

| Item | Values |
| --- | --- |
| Scopes | `openid` (required), `profile`, `email`, `phone` |
| User claims | `name`, `gender`, `birthdate`, `email`, `phone_number`, `address`, `picture`, `individual_id`, `phone_number_verified` |
| Login methods (`authContextRefs` / `acr_values`) | `mosip:idp:acr:generated-code` (OTP), `mosip:idp:acr:biometrics`, `mosip:idp:acr:password`, `mosip:idp:acr:knowledge`, `mosip:idp:acr:static-code`, `mosip:idp:acr:linked-wallet` |
| Client authentication | `private_key_jwt` with `RS256` |

---

## 3. Step 1: Generate a key pair

Generate an **RSA 2048-bit** key pair in JWK format.

- The **public key** goes into the OIDC client registration (Step 2).
- The **private key** stays in the relying party **backend** only (environment variable or secret manager). Never put it in frontend code, mobile apps, or git.

Example using Node.js (`npm install jose`):

```js
// generate-keys.mjs  ->  run: node generate-keys.mjs
import { generateKeyPair, exportJWK, calculateJwkThumbprint } from "jose"

const { publicKey, privateKey } = await generateKeyPair("RS256", { modulusLength: 2048, extractable: true })
const publicJwk = await exportJWK(publicKey)
const privateJwk = await exportJWK(privateKey)
const kid = await calculateJwkThumbprint(publicJwk)

Object.assign(privateJwk, { kid, use: "sig", alg: "RS256" })

console.log("PUBLIC KEY (use in client registration):")
console.log(JSON.stringify({ kty: publicJwk.kty, n: publicJwk.n, e: publicJwk.e }, null, 2))
console.log("\nPRIVATE KEY (store in backend secret, e.g. ESIGNET_CLIENT_PRIVATE_KEY):")
console.log(JSON.stringify(privateJwk))
```

The public key looks like this:

```json
{
  "kty": "RSA",
  "n": "2zh6x_OiH6uqVYor5fcn...<long base64url value>...",
  "e": "AQAB"
}
```

---

## 4. Step 2: Create the OIDC client

### 4.1 Get a CSRF token

The client-management API requires a CSRF token. The **same value** must be sent in the `X-XSRF-TOKEN` header **and** in the `XSRF-TOKEN` cookie.

```bash
curl -s -i 'https://prod-opt.credissuer.com/esignet/v1/esignet/csrf/token'
```

Response:

```
Set-Cookie: XSRF-TOKEN=9a14e69e-9753-4c72-b348-5204c8278412; Path=/

{"token":"9a14e69e-9753-4c72-b348-5204c8278412","parameterName":"_csrf","headerName":"X-XSRF-TOKEN"}
```

### 4.2 Create the client

Replace the values in `< >` and set `requestTime` to the **current UTC time** (format `yyyy-MM-ddTHH:mm:ss.SSSZ`).

```bash
curl --location 'https://prod-opt.credissuer.com/esignet/v1/esignet/client-mgmt/oidc-client' \
--header 'X-XSRF-TOKEN: <csrf_token>' \
--header 'Cookie: XSRF-TOKEN=<csrf_token>' \
--header 'Content-Type: application/json' \
--data '{
  "requestTime": "2026-09-30T12:33:04.605Z",
  "request": {
    "clientId": "<your-client-id>",
    "clientName": "<Your Portal Name>",
    "publicKey": {
      "kty": "RSA",
      "n": "<public key n value from Step 1>",
      "e": "AQAB"
    },
    "relyingPartyId": "mpartner-default-esignet",
    "userClaims": ["name", "email", "gender", "phone_number", "picture", "birthdate"],
    "authContextRefs": ["mosip:idp:acr:generated-code", "mosip:idp:acr:biometrics"],
    "logoUri": "https://<your-domain>/logo.png",
    "redirectUris": [
      "https://<your-domain>/redirect"
    ],
    "grantTypes": ["authorization_code"],
    "clientAuthMethods": ["private_key_jwt"]
  }
}'
```

Field reference:

| Field | Description | Example |
| --- | --- | --- |
| `requestTime` | Current UTC time. Requests with an old time are rejected. | `2026-09-30T12:33:04.605Z` |
| `clientId` | Unique ID for your application. Used as `client_id` in every OIDC call. | `my-portal` |
| `clientName` | Name shown to users on the eSignet login and consent page. | `My Portal` |
| `publicKey` | Public JWK from Step 1 (`kty`, `n`, `e`). | |
| `relyingPartyId` | Partner ID the client belongs to. | `mpartner-default-esignet` |
| `userClaims` | Claims your application may request. Ask only for what you need. | `["name","email","phone_number"]` |
| `authContextRefs` | Login methods allowed for your users. | `["mosip:idp:acr:generated-code"]` (OTP) |
| `logoUri` | Public HTTPS URL of your logo. Required by the API; the logo is not currently displayed on the eSignet page. | `https://my-portal.gov/logo.png` |
| `redirectUris` | **Exact** callback URLs of your application (web or mobile deep links). | `https://my-portal.gov/redirect` |
| `grantTypes` | Always `authorization_code`. | `["authorization_code"]` |
| `clientAuthMethods` | Always `private_key_jwt`. | `["private_key_jwt"]` |

Successful response:

```json
{
  "responseTime": "2026-09-30T12:33:05.120Z",
  "response": { "clientId": "my-portal", "status": "ACTIVE" },
  "errors": []
}
```

If `errors` is not empty, check `errorCode` (for example `duplicate_client_id`, `invalid_public_key`, `invalid_request_time`) and fix the request.

### 4.3 Update the client later (optional)

To add redirect URLs, change claims, or change the client name, update the client (same CSRF headers):

```bash
curl --location --request PUT 'https://prod-opt.credissuer.com/esignet/v1/esignet/client-mgmt/oidc-client/<your-client-id>' \
--header 'X-XSRF-TOKEN: <csrf_token>' \
--header 'Cookie: XSRF-TOKEN=<csrf_token>' \
--header 'Content-Type: application/json' \
--data '{
  "requestTime": "<current UTC time>",
  "request": {
    "clientName": "<Your Portal Name>",
    "status": "ACTIVE",
    "logoUri": "https://<your-domain>/logo.png",
    "redirectUris": ["https://<your-domain>/redirect", "https://<your-domain>/new-redirect"],
    "userClaims": ["name", "email", "gender", "phone_number", "picture", "birthdate"],
    "authContextRefs": ["mosip:idp:acr:generated-code", "mosip:idp:acr:biometrics"],
    "grantTypes": ["authorization_code"],
    "clientAuthMethods": ["private_key_jwt"]
  }
}'
```

---

## 5. Step 3: Configure the relying party backend

```env
ESIGNET_ISSUER=https://prod-opt.credissuer.com
ESIGNET_AUTHORIZE_URL=https://prod-opt.credissuer.com/authorize
ESIGNET_TOKEN_URL=https://prod-opt.credissuer.com/esignet/v1/esignet/oauth/v2/token
ESIGNET_USERINFO_URL=https://prod-opt.credissuer.com/v1/esignet/oidc/userinfo
ESIGNET_JWKS_URL=https://prod-opt.credissuer.com/.well-known/jwks.json
ESIGNET_CLIENT_ID=<your-client-id>
ESIGNET_REDIRECT_URI=https://<your-domain>/redirect
ESIGNET_SCOPE=openid profile email
ESIGNET_CLIENT_PRIVATE_KEY={"kty":"RSA","n":"...","e":"AQAB","d":"...","p":"...","q":"...","dp":"...","dq":"...","qi":"...","kid":"...","alg":"RS256","use":"sig"}
```

`ESIGNET_CLIENT_PRIVATE_KEY` is secret. Store it in the backend only.

---

## 6. Step 4: Implement the login flow

### 6.1 Flow overview

```
 User        RP frontend              RP backend                     eSignet
  | Login        |                         |                             |
  |------------->| create state + PKCE     |                             |
  |              |-- redirect to /authorize ----------------------------->|
  |<----------------------- eSignet login (OTP / biometrics) + consent ---|
  |              |<-- redirect_uri?code=...&state=... --------------------|
  |              | check state             |                             |
  |              |-- code + code_verifier->|                             |
  |              |                         | sign client_assertion       |
  |              |                         |   with PRIVATE KEY          |
  |              |                         |-- POST /token ------------->|
  |              |                         |<-- access_token, id_token --|
  |              |                         |-- GET /userinfo ----------->|
  |              |                         |<-- signed user claims ------|
  |              |<-- user profile / session                             |
```

### 6.2 Redirect the user to eSignet (frontend)

Generate a random `state` and a PKCE `code_verifier` / `code_challenge`, keep them in the session, and redirect:

```
GET https://prod-opt.credissuer.com/authorize
  ?response_type=code
  &client_id=<your-client-id>
  &scope=openid%20profile%20email
  &redirect_uri=<your registered redirect URI, URL-encoded>
  &state=<random state>
  &code_challenge=<BASE64URL(SHA256(code_verifier))>
  &code_challenge_method=S256
  &ui_locales=en
  &acr_values=mosip:idp:acr:generated-code
  &claims=<URL-encoded claims JSON>
```

`claims` JSON (only claims allowed in your client's `userClaims`):

```json
{
  "userinfo": {
    "name": { "essential": true },
    "email": { "essential": true },
    "phone_number": { "essential": true },
    "gender": { "essential": true },
    "birthdate": { "essential": true },
    "picture": { "essential": true }
  },
  "id_token": {}
}
```

Example (browser JavaScript):

```js
function randomString(length) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
  return Array.from(crypto.getRandomValues(new Uint8Array(length)), (b) => charset[b % charset.length]).join("")
}

async function loginWithEsignet() {
  const codeVerifier = randomString(128)
  const state = randomString(32)
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier))
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")

  sessionStorage.setItem("pkce_code_verifier", codeVerifier)
  sessionStorage.setItem("pkce_state", state)

  const url = new URL("https://prod-opt.credissuer.com/authorize")
  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", "<your-client-id>")
  url.searchParams.set("scope", "openid profile email")
  url.searchParams.set("redirect_uri", "https://<your-domain>/redirect")
  url.searchParams.set("state", state)
  url.searchParams.set("code_challenge", codeChallenge)
  url.searchParams.set("code_challenge_method", "S256")
  url.searchParams.set("ui_locales", "en")
  url.searchParams.set("claims", JSON.stringify({
    userinfo: { name: { essential: true }, email: { essential: true }, phone_number: { essential: true } },
    id_token: {},
  }))
  window.location.href = url.toString()
}
```

### 6.3 Handle the callback (frontend)

eSignet redirects to your `redirect_uri`:

- Success: `?code=<auth_code>&state=<state>`
- Failure: `?error=<code>&error_description=<message>`

1. If `error` is present, show `error_description`.
2. Check that `state` equals the stored value. If not, stop.
3. Send `code` and the stored `code_verifier` to **your backend**.
4. Clear the stored values. The code can be used only once.

### 6.4 Exchange the code for tokens (backend)

The backend creates a **client assertion** JWT, signed with the private key:

| JWT claim | Value |
| --- | --- |
| `iss` | Your `client_id` |
| `sub` | Your `client_id` |
| `aud` | `https://prod-opt.credissuer.com/esignet/v1/esignet/oauth/v2/token` |
| `iat` | Current time (seconds) |
| `exp` | A few minutes after `iat` |
| `jti` | Random unique ID |
| Header | `alg: RS256`, `kid: <your key id>` |

Then it calls the token endpoint:

```
POST https://prod-opt.credissuer.com/esignet/v1/esignet/oauth/v2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=<auth_code>
&redirect_uri=<same redirect URI used in the authorize step>
&client_id=<your-client-id>
&code_verifier=<code_verifier>
&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
&client_assertion=<signed JWT>
```

Example (Node.js, `npm install jose`):

```js
import { SignJWT, importJWK } from "jose"

const TOKEN_URL = process.env.ESIGNET_TOKEN_URL
const CLIENT_ID = process.env.ESIGNET_CLIENT_ID

async function createClientAssertion() {
  const jwk = JSON.parse(process.env.ESIGNET_CLIENT_PRIVATE_KEY)
  const privateKey = await importJWK(jwk, "RS256")
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
    .setIssuer(CLIENT_ID)
    .setSubject(CLIENT_ID)
    .setAudience(TOKEN_URL)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(privateKey)
}

async function exchangeCode(code, codeVerifier) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.ESIGNET_REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: codeVerifier,
      client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: await createClientAssertion(),
    }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(`${data.error}: ${data.error_description}`)
  return data
}
```

Successful response:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 6.5 Get the user details (backend)

```
GET https://prod-opt.credissuer.com/v1/esignet/oidc/userinfo
Authorization: Bearer <access_token>
```

The response is a **signed JWT**. Verify it with eSignet's JWKS before trusting it. Some responses arrive as plain JSON, so handle both:

```js
import { createRemoteJWKSet, jwtVerify } from "jose"

const jwks = createRemoteJWKSet(new URL(process.env.ESIGNET_JWKS_URL))

async function getUserInfo(accessToken) {
  const response = await fetch(process.env.ESIGNET_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const text = (await response.text()).trim()
  if (!response.ok) throw new Error(`Userinfo failed (${response.status}): ${text.slice(0, 300)}`)

  const body = text.startsWith('"') ? JSON.parse(text).trim() : text
  if (body.startsWith("{")) return JSON.parse(body)

  const { payload } = await jwtVerify(body, jwks, { issuer: process.env.ESIGNET_ISSUER })
  return payload
}
```

Example claims:

```json
{
  "sub": "8Hx1...unique-user-id",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone_number": "+91XXXXXXXXXX",
  "gender": "Female",
  "birthdate": "1990/01/01",
  "picture": "data:image/jpeg;base64,..."
}
```

Use `sub` as the user's unique ID in your system. It is specific to your client. Then create your application's own session.

---

## 7. Common errors

| Error | Cause and fix |
| --- | --- |
| `invalid_redirect_uri` on the eSignet page | `redirect_uri` is not in the client's `redirectUris`, or doesn't match exactly (scheme, host, port, path, trailing slash). |
| `invalid_client_id` | Wrong `client_id`, or the client is not `ACTIVE`. |
| `invalid_assertion` | `client_assertion` missing, signed with a key that doesn't match the registered public key, wrong `aud`, `iss`/`sub` not equal to `client_id`, or expired (check server clock). |
| `invalid_pkce_challenge` / `invalid_code_verifier` | `code_verifier` doesn't match the `code_challenge` from the authorize step. |
| `invalid_transaction` / `invalid_code` | Code already used or expired, or `redirect_uri` differs between the authorize and token calls. |
| `invalid_claim` / missing claims | Claim not in the client's `userClaims`, not requested in `claims`, or the user declined consent. |
| `invalid_acr` | `acr_values` not in the client's `authContextRefs`. |
| CSRF error (`403`) when creating the client | `X-XSRF-TOKEN` header and `XSRF-TOKEN` cookie are missing or don't have the same value. Get a fresh token (section 4.1). |
| `invalid_request_time` when creating the client | `requestTime` is not the current UTC time. |
| `duplicate_client_id` | The `clientId` already exists. Choose another one, or update the existing client (section 4.3). |

---

## 8. Security checklist

- [ ] Private key stored only in the backend (environment variable or secret manager), never in frontend, mobile app, or git.
- [ ] Token exchange and userinfo calls made from the backend.
- [ ] `state` checked on callback, and PKCE (`S256`) used.
- [ ] Userinfo JWT verified with the eSignet JWKS.
- [ ] All `redirectUris` use HTTPS.
- [ ] Only the claims you need are listed in `userClaims`.
- [ ] Key rotation or leak plan: agree with the CredIssuer team how a new public key is registered (for example a new client ID), then switch the backend to the new private key.
