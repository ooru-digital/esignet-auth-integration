# Citizen Portal: eSignet Integration Guide

This guide explains how to deploy the **Citizen Portal** (this repository) with **"Login with OTP"** through **eSignet**.

eSignet follows the standard **OpenID Connect (OIDC)** protocol. You can connect the portal to eSignet in two ways:

| | Option 1: CredIssuer eSignet | Option 2: Your own eSignet |
| --- | --- | --- |
| eSignet instance | Hosted by CredIssuer at `https://prod-opt.credissuer.com` | Deployed and operated by you |
| OIDC client registration | Done by the **CredIssuer team** on request | Done by you on your eSignet |
| Citizen Portal backend | Run by **you** | Run by **you** |
| Key pair (`private_key_jwt`) | Generated and kept by you; only the public key is shared with CredIssuer | Generated and kept by you |

In both options, **you run your own Citizen Portal backend**. The backend holds your private key and exchanges the authorization code for the citizen's details.

> **Note on the reference deployment:** The Citizen Portal deployment run by CredIssuer uses CredIssuer's internal backend services for the token exchange. Those services are not available to other deployments. Your deployment must use its own portal backend, as described in this guide.

The portal also has an optional **"Login with Wallet"** option (OpenID4VP QR code). It is separate from eSignet, disabled by default (`NEXT_PUBLIC_ENABLE_WALLET_LOGIN=false`), and not covered in this guide.

---

## 1. How the eSignet login works

The portal uses the OIDC **Authorization Code flow with PKCE** and signs the token request with its own private key (`private_key_jwt`). eSignet does not use client secrets.

```
 Citizen      Portal frontend               Portal backend                  eSignet
  | Login with OTP |                              |                              |
  |--------------->| create state + PKCE          |                              |
  |                |-- redirect to /authorize ---------------------------------->|
  |<-------------------------- eSignet login (OTP) + consent --------------------|
  |                |<-- /redirect?code=...&state=... ----------------------------|
  |                | check state                  |                              |
  |                |-- code + code_verifier ----->|                              |
  |                |   (POST /api/esignet/userinfo)                              |
  |                |                              | sign client_assertion        |
  |                |                              |   with PRIVATE KEY           |
  |                |                              |-- POST token_endpoint ------>|
  |                |                              |<-- access_token -------------|
  |                |                              |-- GET userinfo ------------->|
  |                |                              |<-- signed user claims -------|
  |                |<-- citizen profile ----------|                              |
```

The portal is a Next.js application. Its **backend** is the set of Next.js API routes that run on the server, so the private key never reaches the browser.

| Part | File | Runs on |
| --- | --- | --- |
| eSignet settings, read from environment variables | `lib/config.ts` | Frontend and backend |
| Generate `state`, `code_verifier`, `code_challenge` | `lib/pkce.ts` | Frontend |
| Build the authorize URL and redirect to eSignet | `components/login-card.tsx` (`handleAuthorize`) | Frontend |
| Handle the callback, check `state`, call the backend | `app/redirect/page.tsx` | Frontend |
| Backend API route for the login | `app/api/esignet/userinfo/route.ts` | **Backend** |
| Sign `client_assertion`, call token and userinfo endpoints, verify the userinfo JWT | `lib/esignet.ts` | **Backend** |
| Store and display the citizen profile | `lib/profile.ts`, `components/profile-menu.tsx` | Frontend |

---

## 2. Prerequisites

- **Node.js** v20.9.0 or higher and **npm** v10 or higher.
- A server or hosting platform that runs Next.js with server-side API routes (for example a Node.js server, a container, or Vercel). A static export won't work, because the backend routes are required.

Install and run locally:

```bash
npm install --legacy-peer-deps
npm run dev -- -p 3001
```

The portal runs at `http://localhost:3001`. The port must match the host and port in `NEXT_PUBLIC_ESIGNET_REDIRECT_URI` (section 6).

---

## 3. Step 1: Generate a key pair (both options)

Generate an **RSA 2048-bit** key pair. The **public key** is registered on your OIDC client. The **private key** stays in your portal backend only.

```js
// generate-keys.mjs  ->  run: node generate-keys.mjs
import { generateKeyPair, exportJWK } from "jose"

const { publicKey, privateKey } = await generateKeyPair("RS256", { modulusLength: 2048, extractable: true })
const publicJwk = await exportJWK(publicKey)
const privateJwk = await exportJWK(privateKey)

console.log("PUBLIC KEY (register on the OIDC client):")
console.log(JSON.stringify({ kty: publicJwk.kty, n: publicJwk.n, e: publicJwk.e }, null, 2))
console.log("\nPRIVATE KEY (store as ESIGNET_CLIENT_PRIVATE_KEY in the portal backend):")
console.log(JSON.stringify(privateJwk))
```

Store the private key in the backend environment, for example in `.env.local` for local development, or your hosting provider's secret manager in production:

```env
ESIGNET_CLIENT_PRIVATE_KEY={"kty":"RSA","n":"...","e":"AQAB","d":"...","p":"...","q":"...","dp":"...","dq":"...","qi":"..."}
```

A PEM private key (PKCS#8 or PKCS#1) on a single line with `\n` line breaks is also accepted.

> **Never share the private key** with anyone, including the CredIssuer team or the eSignet operator, and never commit it to git.

---

## 4. Step 2, Option 1: Integrate with the CredIssuer eSignet

### 4.1 Request an OIDC client

OIDC clients on the CredIssuer eSignet are created by the **CredIssuer team**. Contact the CredIssuer team at **`<credissuer-contact-email>`** with these details:

| Detail | Description | Example |
| --- | --- | --- |
| Organization and contact | Your organization and a technical contact for the integration. | `My Department, Jane Doe, jane@portal.example.gov` |
| Application name | Shown to citizens on the eSignet login and consent page. | `Citizen Portal` |
| Redirect URLs | **Exact** callback URL(s) of your portal. The callback page is `/redirect`. | `https://portal.example.gov/redirect` |
| User claims | Claims your portal needs (see section 4.2). | `name`, `gender`, `birthdate`, `email`, `phone_number`, `address`, `picture` |
| Login method | OTP (`mosip:idp:acr:generated-code`). | `mosip:idp:acr:generated-code` |
| Logo URL | Public HTTPS URL of your logo. | `https://portal.example.gov/logo.png` |
| Public key | The **public** JWK from Step 1 (`kty`, `n`, `e`). | |

The CredIssuer team registers the client and sends you your **`client_id`**. To change redirect URLs or claims later, or to rotate your key, contact the CredIssuer team with your `client_id`.

### 4.2 CredIssuer eSignet details

| Item | Value |
| --- | --- |
| Discovery | `https://prod-opt.credissuer.com/.well-known/openid-configuration` |
| Issuer | `https://prod-opt.credissuer.com` |
| Authorize | `https://prod-opt.credissuer.com/authorize` |
| Token | `https://prod-opt.credissuer.com/v1/esignet/oauth/v2/token` |
| Userinfo | `https://prod-opt.credissuer.com/v1/esignet/oidc/userinfo` |
| JWKS | `https://prod-opt.credissuer.com/.well-known/jwks.json` |
| Scopes | `openid` (required), `profile`, `email`, `phone` |
| Claims | `name`, `address`, `gender`, `birthdate`, `picture`, `email`, `phone_number`, `individual_id`, `phone_number_verified` |
| Login method | OTP (`mosip:idp:acr:generated-code`) |
| Client authentication | `private_key_jwt` with `RS256` |

Continue with section 6.

---

## 5. Step 2, Option 2: Integrate with your own eSignet

### 5.1 Set up eSignet

Deploy eSignet and connect it to your identity system by following the [eSignet documentation](https://docs.esignet.io). Make sure it is reachable over HTTPS from your citizens' browsers and from your portal backend.

### 5.2 Find your eSignet endpoints

Every eSignet instance publishes its endpoints in its discovery document:

```bash
curl -s https://<your-esignet-host>/.well-known/openid-configuration
```

| Discovery field | Used for |
| --- | --- |
| `issuer` | `ESIGNET_ISSUER` |
| `authorization_endpoint` | `NEXT_PUBLIC_ESIGNET_AUTHORIZE_URL` |
| `token_endpoint` | `ESIGNET_TOKEN_URL` |
| `userinfo_endpoint` | `ESIGNET_USERINFO_URL` |
| `jwks_uri` | `ESIGNET_JWKS_URL` |
| `scopes_supported` | Allowed values for `NEXT_PUBLIC_ESIGNET_SCOPE` |
| `claims_supported` | Claims you can request in `AUTH_CONFIG.CLAIMS` (`lib/config.ts`) |
| `acr_values_supported` | Must include `mosip:idp:acr:generated-code` (OTP) |

Endpoint paths differ between eSignet deployments, so copy them from the discovery document instead of guessing.

### 5.3 Register the portal as an OIDC client

Register an OIDC client on your eSignet, using its client-management API or partner management tooling as described in the eSignet documentation. Use these values:

| Client setting | Value |
| --- | --- |
| Client ID | A unique ID for your portal, for example `citizen-portal` |
| Client name | Shown to citizens on the eSignet login and consent page |
| Public key | The **public** JWK from Step 1 |
| Redirect URIs | **Exact** callback URL(s), for example `https://portal.example.gov/redirect` |
| User claims | Claims the portal needs, from `claims_supported` |
| Auth context refs (login method) | `mosip:idp:acr:generated-code` (OTP) |
| Grant types | `authorization_code` |
| Client auth methods | `private_key_jwt` |
| Logo URI | Public HTTPS URL of your logo |

Continue with section 6.

---

## 6. Step 3: Configure the portal

The portal is configured with environment variables. Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

For production, set the same variables on your server or hosting platform, using its secret manager for `ESIGNET_CLIENT_PRIVATE_KEY`. `.env.local` is gitignored. Never commit it.

Example for **Option 1 (CredIssuer eSignet)**. For **Option 2**, replace the URLs with the values from your discovery document:

```env
# eSignet login (sent to the browser)
NEXT_PUBLIC_ESIGNET_AUTHORIZE_URL=https://prod-opt.credissuer.com/authorize
NEXT_PUBLIC_ESIGNET_CLIENT_ID=<your-client-id>
NEXT_PUBLIC_ESIGNET_REDIRECT_URI=https://portal.example.gov/redirect
NEXT_PUBLIC_ESIGNET_SCOPE=openid profile email
NEXT_PUBLIC_ESIGNET_UI_LOCALES=en

# eSignet backend (server only)
ESIGNET_TOKEN_URL=https://prod-opt.credissuer.com/v1/esignet/oauth/v2/token
ESIGNET_USERINFO_URL=https://prod-opt.credissuer.com/v1/esignet/oidc/userinfo
ESIGNET_JWKS_URL=https://prod-opt.credissuer.com/.well-known/jwks.json
ESIGNET_ISSUER=https://prod-opt.credissuer.com
ESIGNET_CLIENT_PRIVATE_KEY={"kty":"RSA","n":"...","e":"AQAB","d":"...","p":"...","q":"...","dp":"...","dq":"...","qi":"..."}
```

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_ESIGNET_AUTHORIZE_URL` | Yes | eSignet authorize endpoint. |
| `NEXT_PUBLIC_ESIGNET_CLIENT_ID` | Yes | Your registered client ID. |
| `NEXT_PUBLIC_ESIGNET_REDIRECT_URI` | Yes | `<portal-url>/redirect`. Must **exactly** match a redirect URL registered on the client (scheme, host, port, path, trailing slash). |
| `NEXT_PUBLIC_ESIGNET_SCOPE` | No | Defaults to `openid profile email`. Must include `openid`. |
| `NEXT_PUBLIC_ESIGNET_UI_LOCALES` | No | Language of the eSignet login page. Defaults to `en`. |
| `ESIGNET_TOKEN_URL` | Yes | eSignet token endpoint. Called by the portal backend. |
| `ESIGNET_USERINFO_URL` | Yes | eSignet userinfo endpoint. Called by the portal backend. |
| `ESIGNET_JWKS_URL` | Yes | eSignet public keys, used to verify the signed userinfo response. |
| `ESIGNET_ISSUER` | Yes | eSignet issuer. Must match the `iss` of the userinfo JWT exactly. |
| `ESIGNET_CLIENT_PRIVATE_KEY` | Yes | Your private key from Step 1. Server only. |
| `ESIGNET_CLIENT_ASSERTION_AUDIENCE` | No | `aud` of the `client_assertion`. Defaults to `ESIGNET_TOKEN_URL`. |

`NEXT_PUBLIC_*` variables are included in the browser bundle and embedded at build time, so set them before `npm run build` and restart the dev server after changing them. All other variables are only available to the backend.

The claims requested from userinfo are set in `AUTH_CONFIG.CLAIMS` in `lib/config.ts`. eSignet only releases claims that are requested there **and** allowed for the client, so remove any claims your client isn't allowed.

The portal doesn't send `acr_values`, so eSignet uses the login method registered on the client (OTP). You can also send `acr_values=mosip:idp:acr:generated-code` explicitly by adding it to the authorize URL in `components/login-card.tsx`.

The login card only shows **Login with OTP** by default. **Login with Wallet** stays hidden unless `NEXT_PUBLIC_ENABLE_WALLET_LOGIN=true`; its settings are listed in the [README](../README.md#wallet-login-optional).

---

## 7. How the backend token exchange works

No code changes are needed. Once `ESIGNET_CLIENT_PRIVATE_KEY` is set, the portal backend (`lib/esignet.ts`) signs a `client_assertion` with your private key and sends it with the token request:

```
POST <ESIGNET_TOKEN_URL>
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=<auth_code>
&redirect_uri=<NEXT_PUBLIC_ESIGNET_REDIRECT_URI>
&client_id=<NEXT_PUBLIC_ESIGNET_CLIENT_ID>
&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
&client_assertion=<signed JWT>
&code_verifier=<code_verifier>
```

The `client_assertion` JWT contains:

| Claim | Value |
| --- | --- |
| `iss`, `sub` | Your client ID |
| `aud` | `ESIGNET_CLIENT_ASSERTION_AUDIENCE` (defaults to `ESIGNET_TOKEN_URL`) |
| `iat`, `exp` | Now, and 60 seconds later |
| `jti` | Random unique ID |
| Header | `alg: RS256`, `typ: JWT`, no `kid` |

The header has no `kid` because eSignet matches a header `kid` against the registered key, and a different value fails verification.

The backend then calls `ESIGNET_USERINFO_URL` with the access token and verifies the signed response against `ESIGNET_JWKS_URL` and `ESIGNET_ISSUER`.

---

## 8. Step 4: Test the login

1. Start the portal (`npm run dev -- -p 3001`) and open `http://localhost:3001` (use `localhost`, not `127.0.0.1`). For local testing, `NEXT_PUBLIC_ESIGNET_REDIRECT_URI=http://localhost:3001/redirect` must be registered as a redirect URL on the client.
2. Click **Login with OTP**. You are redirected to the eSignet login page with your application name.
3. Enter the citizen's ID, enter the OTP received, and accept the consent screen.
4. eSignet redirects to `/redirect`, the portal backend exchanges the code, and the profile page shows the citizen's details.

If something fails, the `/redirect` page shows the error returned by eSignet or by the portal backend. Backend errors are also logged in the terminal or server logs.

---

## 9. Citizen profile

The userinfo response is a **signed JWT**. The backend verifies it against `ESIGNET_JWKS_URL` and `ESIGNET_ISSUER`. Some eSignet deployments return plain JSON instead, which the portal also accepts. JWT metadata claims (`iss`, `aud`, `iat`, `exp`, `nbf`, `jti`) are removed, and the remaining claims become the citizen profile.

Example:

```json
{
  "sub": "8Hx1...unique-user-id",
  "name": "Jane Doe",
  "gender": "Female",
  "birthdate": "1990/01/01",
  "email": "jane@example.com",
  "phone_number": "+91XXXXXXXXXX",
  "picture": "data:image/jpeg;base64,..."
}
```

How the portal displays it (`lib/profile.ts`):

- **Name**: `givenName` + `surName`, otherwise `fullName`, otherwise `name`.
- **Photo**: `photo`, `face`, or `picture`.
- **`sub`** is shown as "National ID". It is the citizen's unique ID for your client (eSignet uses pairwise subjects, so the value differs per client).
- All other claims are listed with readable labels.

---

## 10. Troubleshooting

| Error | Cause and fix |
| --- | --- |
| `invalid_redirect_uri` on the eSignet page | `NEXT_PUBLIC_ESIGNET_REDIRECT_URI` is not registered on the client, or doesn't match exactly (scheme, host, port, path, trailing slash). Option 1: ask the CredIssuer team to add it. Option 2: update your client. |
| `invalid_client_id` | Wrong `NEXT_PUBLIC_ESIGNET_CLIENT_ID`, or the client is not active. |
| `invalid_assertion` | `ESIGNET_CLIENT_PRIVATE_KEY` is missing or doesn't match the registered public key, the `client_assertion` audience differs from what eSignet expects (set `ESIGNET_CLIENT_ASSERTION_AUDIENCE`), or the server clock is wrong. |
| `<VARIABLE> is not set` | Add the variable to the backend environment and restart the portal. |
| Login button does nothing | `NEXT_PUBLIC_ESIGNET_AUTHORIZE_URL` is missing. Set it and restart the dev server, or rebuild for production. |
| `invalid_pkce_challenge` / `invalid_code_verifier` | The `code_verifier` doesn't match the `code_challenge`. Usually caused by starting the login in one browser tab or origin and finishing it in another. |
| `invalid_transaction` / `invalid_code` | Code already used or expired, or the redirect URI differs between the authorize and token calls. Start the login again. |
| `Invalid state returned from eSignet` | The callback `state` doesn't match the stored value (session storage was cleared, or the login started on a different host such as `127.0.0.1` vs `localhost`). |
| Userinfo JWT verification fails (`JWSSignatureVerificationFailed`, `unexpected "iss" claim value`) | `ESIGNET_JWKS_URL` or `ESIGNET_ISSUER` doesn't match the eSignet instance. Copy both from the discovery document. |
| Profile missing some fields | The claim is not in `AUTH_CONFIG.CLAIMS`, not allowed for the client, not supported by the eSignet, or the citizen declined it on the consent screen. |
| `invalid_acr` | OTP (`mosip:idp:acr:generated-code`) is not enabled for the client. |

---

## 11. Production checklist

- [ ] The portal backend runs on your own server or hosting platform, with server-side API routes enabled.
- [ ] All environment variables are set on the hosting platform before `npm run build` (`NEXT_PUBLIC_*` values are embedded at build time).
- [ ] `NEXT_PUBLIC_ENABLE_WALLET_LOGIN` is `false` (or unset) unless you have configured the wallet login.
- [ ] The private key is stored only in the backend environment or a secret manager, never in git or the browser, and is not shared with anyone.
- [ ] `NEXT_PUBLIC_ESIGNET_REDIRECT_URI` uses HTTPS and your production domain, and it is registered on the client.
- [ ] Only the claims the portal needs are requested in `AUTH_CONFIG.CLAIMS` and allowed for the client.
- [ ] All `ESIGNET_*` URLs point at the same eSignet instance as `NEXT_PUBLIC_ESIGNET_AUTHORIZE_URL`.
- [ ] Key rotation plan: generate a new key pair, register the new public key (Option 1: through the CredIssuer team; Option 2: on your eSignet client), then switch `ESIGNET_CLIENT_PRIVATE_KEY`.
- [ ] The portal stores the citizen profile in the browser's `localStorage`. For production, consider a server-side session (HTTP-only cookie) instead.
