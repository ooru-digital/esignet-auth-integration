# Citizen Portal

A Next.js citizen portal where citizens sign in and view their profile. It offers two login options:

- **Login with OTP**: OpenID Connect login through [eSignet](https://docs.esignet.io) (Authorization Code flow with PKCE and `private_key_jwt`).
- **Login with Wallet** (optional, disabled by default): the citizen shares a credential from a wallet app by scanning a QR code (OpenID4VP).

For the full eSignet setup, including how to get an OIDC client on the CredIssuer eSignet or on your own eSignet, see the [eSignet Integration Guide](docs/RELYING_PARTY_INTEGRATION_GUIDE.md).

---

## Quick start with the CredIssuer eSignet

1. Generate an RSA key pair ([guide, Step 1](docs/RELYING_PARTY_INTEGRATION_GUIDE.md#3-step-1-generate-a-key-pair-both-options)).
2. Request an OIDC client from the CredIssuer team with your **public** key and the redirect URL `http://localhost:3001/redirect` ([guide, Option 1](docs/RELYING_PARTY_INTEGRATION_GUIDE.md#4-step-2-option-1-integrate-with-the-credissuer-esignet)). You receive a `client_id`.
3. Install dependencies and create your env file:

   ```bash
   npm install --legacy-peer-deps
   cp .env.example .env.local
   ```

4. Fill in `.env.local`:

   ```env
   NEXT_PUBLIC_ESIGNET_AUTHORIZE_URL=https://prod-opt.credissuer.com/authorize
   NEXT_PUBLIC_ESIGNET_CLIENT_ID=<your-client-id>
   NEXT_PUBLIC_ESIGNET_REDIRECT_URI=http://localhost:3001/redirect

   ESIGNET_TOKEN_URL=https://prod-opt.credissuer.com/v1/esignet/oauth/v2/token
   ESIGNET_USERINFO_URL=https://prod-opt.credissuer.com/v1/esignet/oidc/userinfo
   ESIGNET_JWKS_URL=https://prod-opt.credissuer.com/.well-known/jwks.json
   ESIGNET_ISSUER=https://prod-opt.credissuer.com
   ESIGNET_CLIENT_PRIVATE_KEY=<your private key JWK, single line>
   ```

5. Run `npm run dev -- -p 3001`, open `http://localhost:3001`, and click **Login with OTP**.

To use your own eSignet instead, see [Option 2 in the guide](docs/RELYING_PARTY_INTEGRATION_GUIDE.md#5-step-2-option-2-integrate-with-your-own-esignet).

---

## Prerequisites

- **Node.js** v20.9.0 or higher
- **npm** v10 or higher
- An **OIDC client** registered on an eSignet instance, and the private key whose public key is registered on it (see the [guide](docs/RELYING_PARTY_INTEGRATION_GUIDE.md))

---

## Installation

```bash
git clone <repository-url>
cd esignet-auth-integration
npm install --legacy-peer-deps
```

The `--legacy-peer-deps` flag is required because some packages don't yet declare React 19 support.

---

## Configuration

All deployment-specific settings are environment variables. Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

`.env.local` is gitignored. Never commit it.

### eSignet login

Take the endpoint URLs from your eSignet discovery document: `https://<esignet-host>/.well-known/openid-configuration`.

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_ESIGNET_AUTHORIZE_URL` | Yes | eSignet `authorization_endpoint` |
| `NEXT_PUBLIC_ESIGNET_CLIENT_ID` | Yes | Your registered OIDC client ID |
| `NEXT_PUBLIC_ESIGNET_REDIRECT_URI` | Yes | Portal callback URL, `<portal-url>/redirect`. Must exactly match a redirect URI registered on the client. |
| `NEXT_PUBLIC_ESIGNET_SCOPE` | No | Defaults to `openid profile email` |
| `NEXT_PUBLIC_ESIGNET_UI_LOCALES` | No | eSignet login page language. Defaults to `en`. |
| `ESIGNET_TOKEN_URL` | Yes | eSignet `token_endpoint` |
| `ESIGNET_USERINFO_URL` | Yes | eSignet `userinfo_endpoint` |
| `ESIGNET_JWKS_URL` | Yes | eSignet `jwks_uri` |
| `ESIGNET_ISSUER` | Yes | eSignet `issuer` |
| `ESIGNET_CLIENT_PRIVATE_KEY` | Yes | Private key (single-line JWK JSON or PEM) used to sign the `client_assertion`. Server only. Keep it secret. |
| `ESIGNET_CLIENT_ASSERTION_AUDIENCE` | No | `aud` of the `client_assertion`. Defaults to `ESIGNET_TOKEN_URL`. |

`NEXT_PUBLIC_*` variables are included in the browser bundle. All other variables are only available to the server.

### Wallet login (optional)

The **Login with Wallet** option is hidden unless `NEXT_PUBLIC_ENABLE_WALLET_LOGIN=true`. While it's disabled, the wallet API routes also return `404`.

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_ENABLE_WALLET_LOGIN` | `true` shows the wallet login option. Defaults to `false`. |
| `CREDISSUER_PRESENTATION_URL` | Verifier endpoint that creates a presentation request and returns `{ base64qrcode, response_uri }` |
| `CREDISSUER_RESPONSE_URI_PREFIX` | Only `response_uri` values starting with this prefix are polled |
| `CREDISSUER_VERIFIER_ORIGIN` | Origin sent to the verifier API, if the verifier requires one |

If wallet login is enabled but `CREDISSUER_PRESENTATION_URL` is not set, the wallet login shows a "not configured" error.

---

## Running locally

```bash
npm run dev -- -p 3001
```

Open `http://localhost:3001`. The port must match `NEXT_PUBLIC_ESIGNET_REDIRECT_URI`, and `http://localhost:3001/redirect` must be registered on your eSignet client.

Restart the dev server after changing `.env.local`. `NEXT_PUBLIC_*` values are read at startup and at build time.

### Production build

```bash
npm run build
npm run start
```

Set the environment variables on your server or hosting platform before running `npm run build`, because `NEXT_PUBLIC_*` values are embedded at build time. The portal needs a Node.js runtime for its API routes. A static export won't work.

---

## How the eSignet login works

1. **Login with OTP** generates `state` and a PKCE `code_verifier` / `code_challenge` (`lib/pkce.ts`) and redirects to eSignet (`components/login-card.tsx`).
2. The citizen authenticates with OTP and gives consent on eSignet.
3. eSignet redirects to `/redirect?code=...&state=...`. The page checks `state` and sends the code to the portal backend (`app/redirect/page.tsx`).
4. The backend route `app/api/esignet/userinfo/route.ts` signs a `client_assertion` with `ESIGNET_CLIENT_PRIVATE_KEY`, exchanges the code at the token endpoint, calls userinfo, and verifies the signed response (`lib/esignet.ts`).
5. The citizen profile is shown on the home page (`lib/profile.ts`, `components/profile-menu.tsx`).

See the [eSignet Integration Guide](docs/RELYING_PARTY_INTEGRATION_GUIDE.md) for details and troubleshooting.

## How the wallet login works (when enabled)

1. **Login with Wallet** calls `POST /api/openid4vp/request`, which asks the verifier at `CREDISSUER_PRESENTATION_URL` for a presentation request and returns its QR code.
2. The citizen scans the QR code with their wallet app and shares the credential.
3. The page polls `GET /api/openid4vp/status`, which checks the verifier's `response_uri` (only under `CREDISSUER_RESPONSE_URI_PREFIX`) until the credential is received, and then shows the profile.

---

## Project structure

| Path | Purpose |
| --- | --- |
| `.env.example` | Template for all environment variables |
| `lib/config.ts` | Reads the environment variables; defines the requested claims |
| `lib/pkce.ts` | PKCE and `state` generation |
| `lib/esignet.ts` | Backend: `client_assertion` signing, token exchange, userinfo verification |
| `lib/profile.ts` | Profile storage and display helpers |
| `components/login-card.tsx` | Login options (OTP, and wallet when enabled) |
| `components/profile-menu.tsx` | Signed-in profile menu and logout |
| `app/page.tsx` | Home page (login and citizen profile) |
| `app/redirect/page.tsx` | eSignet callback page |
| `app/api/esignet/userinfo/route.ts` | Backend route for the eSignet login |
| `app/api/openid4vp/request/route.ts`, `app/api/openid4vp/status/route.ts` | Backend routes for the wallet login |
| `docs/RELYING_PARTY_INTEGRATION_GUIDE.md` | eSignet integration guide |

---

## Troubleshooting

**`<VARIABLE> is not set`**: add the variable to `.env.local` (or your hosting environment) and restart the portal.

**Login with Wallet doesn't appear**: set `NEXT_PUBLIC_ENABLE_WALLET_LOGIN=true` and restart the dev server (or rebuild for production).

**Login with OTP does nothing**: `NEXT_PUBLIC_ESIGNET_AUTHORIZE_URL` is missing. Set it and restart.

**`Invalid state returned from eSignet`**: open the portal on the same host as the redirect URI (`localhost`, not `127.0.0.1`) and start the login again.

**Port 3001 already in use**: stop the other process, or run on another port and update `NEXT_PUBLIC_ESIGNET_REDIRECT_URI` and the redirect URI registered on your client.

**Dependency issues**:

```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```
