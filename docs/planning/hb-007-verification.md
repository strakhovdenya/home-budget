# HB-007 verification — 2026-11-02

Status: **Review**, pending repeat review of the test-isolation fix and owner acceptance. No commit,
push, PR, deployment or remote migration was performed by the agent. The owner's
successful manual localhost Google OAuth verification is recorded below.
Branch: `feat/hb-007-google-oauth`, based on `e02ac79` (merged HB-006).
`git pull --ff-only origin main` reported already up to date before branch creation.

## Owner-reported manual verification — localhost:3007

On 2026-11-02 the project owner reported successful manual checks with real Google
OAuth on `localhost:3007`:

- The allowed Google account successfully signed in through the real OAuth flow.
- The protected Home Budget page opened after sign-in.
- The logout button worked.
- After logout, directly visiting `/obligations` redirected to `/login`.

These results were performed and confirmed by the owner, not independently
re-executed by the agent. No private account identifiers, credentials, tokens or
connection strings are recorded here.

**Not manually checked:** rejection of a second Google account, because the owner
has no second account. That scenario is covered by the automated allowlist tests;
it must not be described as a successful manual test. The localhost checks also
do not establish production/Vercel behavior or a complete visual/accessibility
review. HB-007 remains **Review**; these results do not mark the task Done.

Only this report was updated for this manual-evidence follow-up. No application
code, private local files, or task status was changed, and no tests were rerun for
this documentation-only update. No additional skill usage is claimed.

## Independent review follow-up — test isolation

On 2026-11-02 the owner reported completed independent static review: authorization
architecture accepted, with one finding in AUTH-DB01/02/03 test isolation. The
original suite shared one database; AUTH-DB03 relied on users/accounts left by
earlier tests. Running AUTH-DB03 alone reproduced the failure before the fix
(1 failed, 21 skipped): an empty database admitted the subject instead of denying it.

Only `tests/integration/auth.test.ts` and this report changed in this follow-up.
`beforeEach` now creates a fresh, uniquely named, migrated database for each test;
`afterEach` closes its database/admin pools. AUTH-DB01 starts empty; AUTH-DB02
provisions its own owner and foreign-account fixtures. AUTH-DB03 explicitly seeds
the verified owner, a second unbound user and a synthetic account with nonzero
revision/sequence counters. It retains both denial assertions and counter
comparison, asserts that the account snapshot is nonempty, and additionally
compares the complete user rows before/after to detect rebinding or provisioning.
No deletion/truncation, constraint changes, financial schema changes, or production
authorization changes were needed. Fixture integers use `BigInt(...)` to match
the existing ES2017 TypeScript target; an initial typecheck caught and corrected
unsupported BigInt literal syntax before the final successful checks below.

The existing dedicated Docker PostgreSQL 18 container `hb007-auth-tests` was
restarted; Docker assigned **127.0.0.1:61283** on this run. All three database URLs
were explicitly overridden to that loopback destination and both local target
guards were set. No Neon connection was made. Each test created its own disposable
child database using the existing migrations and unchanged PostgreSQL constraints.

Final checks after the complete fix (Windows commands use `pnpm.cmd`):

| Command | Actual result |
|---|---|
| `pnpm test:integration -t AUTH-DB01` | Passed: 1 passed, 21 skipped; exit 0 |
| `pnpm test:integration -t AUTH-DB02` | Passed: 1 passed, 21 skipped; exit 0 |
| `pnpm test:integration -t AUTH-DB03` | Passed: 1 passed, 21 skipped; exit 0 |
| `pnpm lint` | Passed, zero warnings; exit 0 |
| `pnpm typecheck` | Passed, route generation and strict TypeScript; exit 0 |
| `pnpm test` | Passed: 8 files, 72 tests; exit 0 |
| `pnpm test:integration` | Passed: 2 files, 22 tests; exit 0 |
| `pnpm build` | Passed, Next.js 16.4.3 production build; exit 0 |
| `git diff --check` | Passed; exit 0 |

All three filtered runs were separate invocations, followed by the full DB suite.
The 21 skipped tests in each filtered invocation are the intended name-filter
exclusions. Typecheck/build explicitly cleared OAuth variables and all three
database URLs in the process environment; approved access to the existing Windows
SWC cache was used. No credential values were printed.

Local `.env.example` inspection found **10 assignments, all 10 empty**, with no
nonempty values to disclose or modify. SHA-256 checks before/after confirmed that
`.env.local` and `.vscode/extensions.json` were untouched. The test container was
stopped after verification and its data retained. No commit, push or PR was made.
HB-007 remained Review for repeat inspection at this stage; subsequent owner
manual OAuth evidence is recorded above. Earlier evidence below is retained as the initial delivery
record, including its original Docker port and working-tree snapshot.

Skill usage evidence for this follow-up: the existing `configure-project/SKILL.md`
was actually read and applied to the established local verification commands and
environment guards. No new skills were installed, and no further application-code
usage of the three installed React/security/design skills is claimed for this
test-only correction; their original usage evidence remains below.

## Delivered scope

Google-only Auth.js with exact verified-email allowlist and stable subject binding
to the existing users table; encrypted session cookies; public localized login;
logout; server guards on all five pages; trusted owner/account-scope helpers.
Only an admitted callback can create a user. Concurrent first login is serialized;
subject replacement and ambiguous preexisting users reject. No financial records,
schema changes, migrations, or financial endpoints were added.

Auth.js is pinned to `5.0.0-beta.32`. Official npm metadata returned Next peers
`^14.0.0-0 || ^15.0.0 || ^16.0.0` and React `^18.2.0 || ^19.0.0`.
The current official App Router guide recommends v5 beta. Its prerelease status
is explicit; no foundational stack dependency was upgraded. See [AUTH.md](../AUTH.md).

## Executed evidence

Windows, Node 22.23.0, pnpm 12.16.1, PostgreSQL 18 in a dedicated Docker container.
All DATABASE_URL / DATABASE_URL_UNPOOLED / TEST_DATABASE_URL values were explicitly
overridden to `127.0.0.1:59268`, with local target guards enabled. Integration
suites each created a fresh, generated child database and applied the existing
migration chain. No Neon connection was used.

| Command | Actual result |
|---|---|
| `pnpm.cmd install --frozen-lockfile --offline` | Passed; resolution skipped, lockfile current |
| `pnpm.cmd lint` | Passed, zero warnings |
| `pnpm.cmd typecheck` | Passed, Next route type generation + strict TypeScript |
| `pnpm.cmd test` | Passed: **8 files, 72 tests**; original 28 retained, 44 added |
| `pnpm.cmd db:migrate` twice | Both passed against isolated local Docker DB |
| `pnpm.cmd test:integration` | Passed: **2 files, 22 tests**; original 19 retained, 3 added |
| `pnpm.cmd build` | Passed, Next 16.4.3 Turbopack; all five pages, login and auth route rendered on demand |
| `node scripts/check-shell-http.mjs http://127.0.0.1:3107` | Passed: **23 checks**, against production server |
| `git diff --check` | Passed |

Typecheck/build/start explicitly cleared all four OAuth variables and DATABASE_URL
in their process environment. The private `.env.local` was not changed. Next
still reports the env filename while loading its config; no value was printed.

Initial red evidence: the new policy suite failed because its implementation
module did not exist; the original 28 tests passed in that same run. Later test
failures revealed a session callback TypeScript intersection and Vitest's handling
of Auth.js extensionless Next imports; both were corrected before final green runs.

Environment limitations encountered and resolved: sandboxed Next/SWC could not
access its Windows native cache, and tsx migrations failed at Windows user-info
access. Approved runs outside the sandbox passed without changing permissions or
cache settings. The original fixed Docker port was blocked by Windows; a new
dedicated container used an automatically allocated loopback port instead.

## What the tests prove

- `auth-policy.test.ts`: exact normalized email, boolean verification, Google
  provider/subject validation, blank or malformed environment values deny access.
- `auth-config.test.ts`: actual config callbacks bind only an admitted identity,
  reject provider-account/subject mismatch and DB errors, issue minimal claims,
  omit provider tokens, ignore client session updates and recheck stored identity.
- `auth-boundaries.test.ts`: all five actual page functions deny anonymous access
  and render for a trusted mocked session; direct scope checks deny missing auth,
  foreign accounts and invalid input; login/logout actions call the intended APIs.
- `auth-routes.test.ts`: actual exported Auth.js Route Handlers parse real
  **synthetic encrypted test cookies**, reject forged cookies/substituted user IDs,
  enforce logout CSRF, expire the session cookie and deny subsequent access.
  Removed configuration invalidates access. The repository is mocked in this suite.
- `integration/auth.test.ts`: real PostgreSQL concurrency/identity reuse, no
  automatic account creation, subject replacement denial, UUID/ownership checks,
  ambiguous-user rejection and unchanged financial account counters.
- HTTP smoke: 15 anonymous redirects (five pages × RU/DE/EN), three translated
  login pages with Google controls/theme initialization and frame protection,
  three translated 404s and two Russian locale fallbacks. These are HTTP checks,
  not visual browser interaction tests.

Existing CI already runs the expanded test globs plus lint, typecheck, build,
migrations twice and DB17. No workflow change or OAuth GitHub Secret is required.
No GitHub Actions run is claimed for this unpushed branch.

## Skill installation integrity

Installed with project-local `npx skills add ... -a codex --copy -y`, without `-g`.
The requested `react-best-practices` selector did not match upstream's actual
frontmatter name; the successful retry used `vercel-react-best-practices`.
`skills-lock.json` records sources, source paths and content hashes.

All **10 original `.agents/skills/` files** were SHA-256 compared before/after;
none changed or disappeared. The new directories contain Markdown/JSON/license
data and one declarative `agents/openai.yaml`; no executable skill scripts are
present or were run. The CLI itself was used only after checking its npm metadata
and documented install behavior. Existing `.env.local` and `.vscode/extensions.json`
hashes also matched before/after. No global skill installation was requested.

`AGENTS.md` retains its original text and adds skill routing plus compatible
`nextjs-agent-rules` markers pointing to installed documentation. `agentRules: false`
remains enabled as before; no automatic runtime was introduced.

## Skill usage evidence

Installation or mention in AGENTS.md is not counted as usage. The three newly
installed SKILL.md files were actually opened with `Get-Content -Encoding UTF8`
during this work, before applying them. Early HB-007 code predates installation;
that code is credited only where subsequently inspected against the skill.

| Skill / SKILL.md path | Actually read? | HB-007 use and concrete recommendations | Code evidence |
|---|---|---|---|
| `vercel-react-best-practices` — [SKILL.md](../../.agents/skills/vercel-react-best-practices/SKILL.md) | Yes; also opened `server-auth-actions`, `server-cache-react`, `async-parallel`, `server-serialization` rule files | Server React composition and auth review: authenticate at the operation boundary, use React.cache only for render-local deduplication, parallelize independent layout reads, expose only necessary session fields to client UI | `src/infrastructure/auth/auth.ts` (`currentOwner` cache and `requireOwnedAccount`); `src/app/layout.tsx` (Promise.all and rendered session-control slot); `src/infrastructure/auth/config.ts` (session projection); `src/features/shell/app-shell.tsx` (slot without auth imports) |
| `security-best-practices` — [SKILL.md](../../.agents/skills/security-best-practices/SKILL.md) | Yes; opened Next.js server, React frontend and general frontend security references; consulted auth/session/CSRF/input/host/logging guidance | Server authorization implementation/review: server-only secrets/DB, runtime UUID and identity checks, fail closed, no client-supplied owner, parameterized scoped queries, no provider-token projection, preserve framework CSRF, safe fixed redirects and generic logs; stricter malformed OAuth configuration checks added after reading | `src/infrastructure/auth/{auth,config,policy,repository}.ts`; `src/app/auth-actions.ts`; `src/app/api/auth/[...nextauth]/route.ts`; `next.config.ts`; tests `auth-policy`, `auth-config`, `auth-boundaries`, `auth-routes`, `integration/auth` |
| `web-design-guidelines` — [SKILL.md](../../.agents/skills/web-design-guidelines/SKILL.md) | Yes; fetched and read the linked Vercel `web-interface-guidelines/main/command.md` | Login-page code review and form interaction: semantic heading/form/button, explicit Google action label, localized actionable errors, live pending text/loading state, disable duplicate submission while pending, balance heading text and support touch; retained existing MUI theme/preferences | `src/app/login/page.tsx`; `src/features/auth/submit-button.tsx`; `src/shared/i18n/messages/{ru,de,en}.json`. No visual accessibility audit is claimed |

**Newly installed but unused skills:** none; each has the concrete evidence above.
This does not mean every rule/reference in those packages was read or applied.
No code was changed solely to demonstrate skill usage. Generic recommendations
did not cause extra libraries, architecture changes, SWR, LRU caching, PWA, or
browser-language routing. Project ADRs and installed Next 16.4.3 docs took precedence
over the security reference's older Next 16.1 examples.

Other skills actually consulted: `configure-project` (existing scripts/CI/version
checks), system `skill-installer` (installation workflow; explicit requested npx
method took precedence), and `maintain-agent-instructions` (append-only routing in
AGENTS.md). Their SKILL.md files were opened. They were not newly installed.
The other eight original local skills were preserved but not used in this task:
create-issues, create-milestone, create-phase-overview, create-planning-doc,
create-scenarios, define-architecture, define-conventions,
verify-financial-invariants. Integrity of the full original set is covered by
the ten-file hash comparison above.

## Remaining acceptance / limitations

- Real Google OAuth, allowed-account sign-in, protected-page access, logout and
  the post-logout `/obligations` redirect on localhost:3007 were manually confirmed
  by the owner as recorded above. Second-account rejection was not manually tested;
  automated coverage is not a live second-account Google OAuth check.
- Deployed HTTPS cookies, Vercel canonical origin and rate limits remain unverified.
  Browser tooling was unavailable to the agent. Mobile/desktop visual layout,
  keyboard navigation and live pending-state checks are not established by the
  owner's reported functional checks.
- JWT logout clears this browser's cookie, without global revocation of a copied
  cookie. Details and potential future persistence scope are explicit in AUTH.md.
- Repeat review of the test-isolation correction and owner approval remain required. HB-007 is Review,
  not Done. Financial application use cases remain out of scope.

## Changed files

Added skill trees (all contents preserved from their sources):
`.agents/skills/vercel-react-best-practices/`,
`.agents/skills/web-design-guidelines/`,
`.agents/skills/security-best-practices/`, plus `skills-lock.json`.

Application/configuration: `.env.example`, `AGENTS.md`, `next.config.ts`,
`package.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `scripts/check-shell-http.mjs`,
`src/app/layout.tsx`, all five existing `src/app/**/page.tsx` screens,
`src/app/login/page.tsx`, `src/app/auth-actions.ts`, `src/app/require-page-owner.ts`,
`src/app/api/auth/[...nextauth]/route.ts`, `src/features/auth/submit-button.tsx`,
`src/features/shell/app-shell.tsx`, the four `src/infrastructure/auth/*.ts` modules,
and RU/DE/EN catalogs in `src/shared/i18n/messages/`.

Tests: `tests/architecture.test.ts`, `tests/auth-policy.test.ts`,
`tests/auth-config.test.ts`, `tests/auth-boundaries.test.ts`,
`tests/auth-routes.test.ts`, `tests/fixtures/auth.ts`, `tests/integration/auth.test.ts`.

Docs: `docs/AUTH.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`,
`docs/PROJECT_CONFIG.md`, `docs/TASKS.md`, and this verification report.
The owner's untracked `.vscode/extensions.json` remains untouched and excluded
from the task's changed-file list.

## Final integrity and working tree

Targeted credential scan examined **130 changed/new files**, including vendored
skill content, and found **0 matches** for private-key blocks, Google secret/API
key shapes, GitHub tokens and password-bearing PostgreSQL URLs. This is a scoped
pattern scan, not a guarantee that every possible secret format was audited.
Private local files were excluded from scanning and retained matching hashes.
The temporary production server and test PostgreSQL container were stopped;
test-container data was retained. Git emits a Windows global-ignore permission
warning and a lockfile line-ending notice; `git diff --check` succeeds.

Final `git status --short` (owner file included only to faithfully show status):

```text
 M .env.example
 M AGENTS.md
 M docs/ARCHITECTURE.md
 M docs/DATABASE.md
 M docs/PROJECT_CONFIG.md
 M docs/TASKS.md
 M next.config.ts
 M package.json
 M pnpm-lock.yaml
 M scripts/check-shell-http.mjs
 M src/app/layout.tsx
 M src/app/months/page.tsx
 M src/app/obligations/page.tsx
 M src/app/page.tsx
 M src/app/savings/page.tsx
 M src/app/settings/page.tsx
 M src/features/shell/app-shell.tsx
 M src/shared/i18n/messages/de.json
 M src/shared/i18n/messages/en.json
 M src/shared/i18n/messages/ru.json
 M tests/architecture.test.ts
 M vitest.config.ts
?? .agents/skills/security-best-practices/
?? .agents/skills/vercel-react-best-practices/
?? .agents/skills/web-design-guidelines/
?? .vscode/extensions.json
?? docs/AUTH.md
?? docs/planning/hb-007-verification.md
?? skills-lock.json
?? src/app/api/
?? src/app/auth-actions.ts
?? src/app/login/
?? src/app/require-page-owner.ts
?? src/features/auth/
?? src/infrastructure/auth/
?? tests/auth-boundaries.test.ts
?? tests/auth-config.test.ts
?? tests/auth-policy.test.ts
?? tests/auth-routes.test.ts
?? tests/fixtures/
?? tests/integration/auth.test.ts
```
