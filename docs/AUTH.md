# HB-007 Google sign-in

Only the application owner's verified Google account is admitted. There is no
password login, public registration, test bypass, or automatic bank-account creation.

## Configure Google

1. Create/select a project in Google Cloud Console and configure Google Auth
   Platform's consent screen (branding, audience and contact details). During
   testing add only the owner's account as a test user, where applicable.
2. Create an OAuth client of type **Web application**. Request only OpenID Connect
   `openid email profile`; no bank, Gmail, Drive or offline access is requested.
3. Register the exact development redirect URI
   `http://localhost:3000/api/auth/callback/google`. If using a different local port,
   register that exact URI too. Do not interchange localhost and 127.0.0.1.
4. The production domain is undecided. Once selected, register its HTTPS origin
   followed by `/api/auth/callback/google`; no wildcard or invented domain.
5. Set these private server variables in ignored `.env.local` or the deployment
   environment: `AUTH_SECRET` (cryptographically random, at least 32 characters),
   `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ALLOWED_GOOGLE_EMAIL` (one address).
   Generate the secret locally with a trusted password manager or Node crypto.
   Never paste its output into an issue, log, chat, or tracked file.
6. Use the existing server `DATABASE_URL` pointing at a separately provisioned,
   migrated database. Application startup does not apply migrations. Migration and
   test commands remain restricted to an explicitly selected local Docker database.

The application trims and lowercases email for exact comparison. It never removes
dots, strips plus-tags, matches domains or accepts a list of addresses. Google must
return boolean `email_verified=true`, a nonempty stable subject, and a matching
provider account ID. Callback data comes from Auth.js's verified OIDC response.
Syntactically missing/invalid configuration denies access; plausible but incorrect
Google credentials can only be detected during the provider exchange.

## Identity and sessions

The first admitted login creates only one `users` row. A table lock serializes
concurrent first logins. Later logins must match its unique `google_subject` and
verified flag. A different subject, an existing unbound row, or multiple users
denies provisioning; nothing is reassigned. Resolve unexpected preexisting users
through a separate reviewed administrative procedure, never by deleting history.

Auth.js 5.0.0-beta.32 is pinned. Its published peers include Next.js 16 and React 19;
the official v5 installation guide currently recommends the beta channel. This is
an explicit prerelease dependency, without changing the existing framework stack.

Sessions use Auth.js encrypted JWT cookies, with an eight-hour rolling lifetime,
HttpOnly, SameSite=Lax, and Secure on HTTPS. Google access/refresh/ID tokens are
neither stored in PostgreSQL nor projected into the app session. Every session
read revalidates internal UUID + Google subject against PostgreSQL and the current
allowlist. Client session update fields are ignored. Database failures deny access.
React.cache deduplicates only within a server render, never across users/requests.

Logout uses an Auth.js Server Action and clears the browser session cookie.
Direct HTTP signout requires Auth.js CSRF validation; Server Actions retain Next's
Origin/Host checks. OAuth uses PKCE, state and nonce. No protection is disabled.
With JWT sessions, logout does **not** revoke a previously copied cookie elsewhere;
it remains usable until expiry unless the secret/allowlist/stored identity changes.
Per-session global revocation would require separately reviewed persistence.

All five page components check the session before rendering. `currentOwner()` and
`requireOwner()` return only trusted server identity; `requireOwnedAccount(id)`
queries the account by both session owner ID and validated account UUID, returning
only the authorized scope. Future protected Route Handlers/Server Actions must
call this helper inside each operation before invoking persistence. No financial
endpoint is exposed in HB-007. The locale preference action remains public because
it only sets the visitor's own validated locale cookie, with no financial access.

## Vercel rollout and manual acceptance

1. Choose the canonical HTTPS domain and OAuth redirect URI before enabling login.
   Set Auth.js `AUTH_URL` to that canonical origin in the deployment environment;
   do not derive canonical URLs from arbitrary inbound Host headers. Vercel is
   a trusted proxy detected by Auth.js; do not enable blanket host trust on an
   untrusted/self-hosted proxy. Keep default same-origin callback redirects.
2. Configure the four private auth variables and an appropriately scoped database
   credential in the intended Vercel environment only. Keep Preview credentials
   and databases separate; leave OAuth disabled on uncontrolled preview domains.
3. Apply independently reviewed deployment/migration procedures before runtime
   access. No deployment or remote migration was performed for this task.
4. Configure platform rate limits for `/api/auth/*` and login actions, verify HTTPS,
   cookie flags, redirect origin and response headers on the chosen deployment.
5. Verify the allowed account can sign in, navigate all five pages, retain theme
   and RU/DE/EN preferences, and sign out. In a separate browser verify another
   Google account is rejected and creates no user row. Check return access after
   logout and direct protected requests. Inspect only token *presence*, never log
   token values. These live provider/browser checks remain manual acceptance gates.

Sources: [Auth.js installation](https://authjs.dev/getting-started/installation),
[Google provider](https://authjs.dev/getting-started/providers/google),
[deployment](https://authjs.dev/getting-started/deployment),
[session strategies](https://authjs.dev/concepts/session-strategies),
[Google OIDC](https://developers.google.com/identity/openid-connect/openid-connect).
Next.js APIs were checked against installed `node_modules/next/dist/docs/`.
