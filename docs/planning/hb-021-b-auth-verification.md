# HB-021 B — Auth.js session / ownership / security E2E

2026-11-13. Implementation submitted for independent review; B acceptance NOT
PASSED (14 passed / 3 failed / 0 skipped / 0 flaky). No B/HB-021 Done or Owner
Acceptance. The three failures remain ordinary failing assertions.
The owner reports A independently APPROVED 0/0/0/0 after HB21-A-R01; A publication
and Owner Acceptance remain separate. Existing local work and approved context
are preserved. Branch feat/hb-021-e2e-harness; HEAD and remote main both
f8bfca7f836271cff87858c04be2cbf3643ce4e9 (read-only ls-remote; no dirty merge).

## Approved integration and threat boundaries

A's launcher currently always starts an anonymous, empty-DB smoke: its clean
environment intentionally does not forward auth configuration, and its snapshot
does not include a separate B config/spec directory. Reusing that lifecycle for
B needs a narrow test-launcher extension; production auth/config/domain/schema
must remain unchanged.

The owner explicitly answered «Разрешаю узкий --auth адаптер» after the concrete
proposal tmp/hb021-b-proposal/launcher.patch was presented. The authorized integration was applied:
scripts/e2e/run.ts accepts an explicit --auth mode.
Default A and --fail-after-database remain unchanged. After the full A checks and
anonymous smoke, --auth provisions synthetic identities/financial evidence on the
existing separate migration connection, closes that process, then executes the
separate B Playwright config with only runtime DB credentials and generated
synthetic auth configuration. No new grants, DML/DDL for hb_runtime, password
sharing, host publication or external application network. scripts/e2e/server.ts
and the A Playwright config remain unchanged; a B-only server launcher supplies
synthetic AUTH_* to the unmodified real Next/Auth.js implementation.

The only modification of approved A is this agreed launcher integration plus
B-only report scope/failure-evidence handling. The A server/config/safety tests,
independent role passwords, grants, scripts and dependency pins remain intact.
Runtime grants remain SELECT-only. The final run exposes an incompatible
SELECT FOR UPDATE in the existing status/history reader; these assertions FAIL.
No UPDATE grant or production workaround was applied. Transition previews and
actual financial writes are outside B.
Google provider login/relogin for each of
HB20-B01/B03/B04 remains BLOCKED BY CONSTRAINT / NOT EXECUTED; offline session
proof is not provider proof. Financial confirmation/onboarding completion remains
part C and is not claimed by session access checks.

Files for B: playwright.auth.config.ts; tests/auth-e2e/auth.spec.ts;
tests/e2e/support/{session,seed,server,proof,reporter}.ts; this report; the
authorized changes to scripts/e2e/run.ts. No new library, production endpoint,
provider, cookie bypass, domain code, schema/migration, runtime DML/DDL grant,
CI or Finance Gate modification. The architecture skills are applied to test
boundaries, without rewriting production ARCHITECTURE/architecture.json.

The short-lived run secret is generated in launcher memory; the cookie fixture
uses the installed next-auth/jwt encode (Auth.js encrypted JWE), exact HTTP
cookie name and salt authjs.session-token, claims sub/googleSubject/email,
HttpOnly/SameSite=Lax. Positive token maxAge180s; expired case -120s exceeds the
installed decoder's 15s tolerance. Actual jwt/session callbacks and DB.matches
remain active. AUTH_URL is fixed local canonical origin; no AUTH_TRUST_HOST,
OAuth registration, provider request or production credential is used. The
Google client values are synthetic format-valid placeholders only.

Provisioning occurs after the unchanged empty-DB A smoke. Existing
identityRepository.bind creates the single verified owner; the foreign identity
is unverified and has a different subject. Two accounts, real complete checkpoint/
allocation revisions, full obligation/saving states, aggregate audit/receipts and
immutable past closings are created by existing repositories/validators with
Berlin-relative completed dates. This is setup, not a user financial flow or
Google admission. Seed connection/process closes before Next/Playwright starts.
Only the private provisioning process receives the migrator password. Runtime
and tests retain SELECT-only credentials and cannot authenticate as hb_migrator.

No-write proof independently enumerates all20 public tables and compares exact
canonical full row strings before/after each direct auth denial (and complete
case/navigation flows), including owned AND foreign finance, users, accounts,
counters/pointers, audit, receipts, histories and report heads/payloads. Fixtures
are nonempty; positive owned read/status controls prevent vacuous refusal-only
success. Reports export only hashes and closed labels, never the row strings.
Database credentials can read both scopes to measure isolation; the boundary
under test is Next/Server Action ownership, not new PostgreSQL RLS.

Action IDs/bodies are captured from actual browser UI requests in the current
build and retained only in memory. To discover status safely, the test aborts a
confirm transport before delivery; it does not fabricate a successful response or
commit. The UI naturally offers status. Valid financial confirm is never sent.
For Origin/Host forgery, Node HTTP replays those captured requests because browser
fetch cannot freely set forbidden headers. All traffic still targets namespace
loopback; synthetic foreign.invalid is a header value, not an external target.

The B-only reporter records sanitized statuses/errors/no-write hashes without
config/env dumps, URLs, fixture UUIDs, cookies or JWT. Trace/video/screenshots/HAR/
storageState are disabled. Failed B reports are copied before cleanup; failure
counts remain failures. Default A reporting is unchanged. Local test-discovery
and quick TypeScript checks do not count as browser evidence.

## B proof inventory (execution status recorded after the full run)

| Test IDs | Contract | Required browser/PG proof |
|---|---|---|
| B-01 | HB20-B04; HBH-006; BR-10 | Real JWE session, reload, Auth.js projection, owned read/receipt control, protected pages, no disclosure/storage writes |
| B-02..B-11 | HB20-A03/B04; HBUX-023; HBH-006 | Anonymous/expired/corrupt/subject/email/missing claims/bad UUID/missing DB identity/changed binding/unverified identity; each read/preview/confirm/status/history operation denies before writes |
| B-12 | HBH-006; HBUX-023 | Actual foreign owner/account/update/report/request fixtures; untrusted scope cannot retarget owned server composition; foreign status/history absent; source/report membership refuses |
| B-13 | HB20-B04; HBUX-023 | Session expires after real review or already-open form; actual preview/confirm UI actions reauthorize and deny, no financial write |
| B-14 | BR-10; existing Next policy | Forged Origin, Host and X-Forwarded-Host on captured real action requests refuse, with unchanged rows |
| B-15 | AUTH.md HTTP CSRF contract | Invalid/missing correct CSRF cannot sign out; real local CSRF token permits logout; protected return denied; no database mutation |
| B-16 | HB20-B03/B04 session portion | Actual local logout UI clears session; fresh protected navigation/direct read stays denied; no claim of Google relogin |
| B-17 | HB20-B04 existing-account navigation; report acceptance remains required | Separate authenticated closed-month page and actual month chunk request; a failure here remains a failure, without skipping the independent auth cases |

Missing/changed-identity cases use signed fixture claims against independently
seeded retained DB truth, including a different/unverified binding. They prove
fresh per-request DB validation; they do not claim a live administrative DB
identity edit while a browser is open. Mid-form expiry is separately executed
by replacing the cookie with a genuinely expired Auth.js JWE.
B-05 tests a different subject against the verified owner's retained DB binding;
B-10 has the additional unverified foreign-identity condition, not an independent
verified second owner. No second admitted owner was created.

## Execution ledger

All full runs use `node --import tsx scripts/e2e/run.ts --auth` from the
repository root. No retries are configured. Each attempt has its own source
inventory, disposable database/network/volume and cleanup receipt under
`tmp/hb021-reports/<runId>/`. Failures below are retained, not counted as B PASS.

| Run ID | Process exit | Actual result |
|---|---:|---|
| 337339740e2045d0d784bb6e520313b1 | 1 | Typecheck failed: test-support relative imports/header union. No browser B execution. Corrected test code. |
| 933709b1ef2a21637de0020cabf549e5 | 1 | A checks/build/smoke and seed passed; B loader rejected missing JSON import attribute. No B tests executed. Corrected import. |
| 9188543ea075e15720e0c0b4275e312c | 1 | A and seed passed; B setup timed out capturing report action: 1 unexpected, 15 skipped. Added control readiness check. |
| b577febd570a5c1048a5010941da16fa | 1 | A and seed passed; B setup strict CSS balance locator matched retained hidden tree: 1 unexpected, 15 skipped. Replaced with strict accessible-role locator. |
| a7ef8f0c3c45f27ce28413af40cf402c | 1 | Deliberately stopped only the exact receipt-owned dependency installer after local typecheck found optional-secret narrowing in its source snapshot. Cleanup ran; no test PASS claimed. |
| c8e86b2f4ef2897d9aee8efcbcc106c6 | 1 | All A checks/build/smoke and seed passed; report control readiness failed in B setup: 1 unexpected, 15 skipped. Added real pointer hover before readiness polling for selective hydration; explicit browser locale/viewport/timezone/service-worker settings. |
| f375be50d0d4ce11ab18fd24b2793a21 | 1 | All A checks/build/smoke and seed passed; B setup still timed out: 1 unexpected, 15 skipped. Code inspection found history-detail and report reads share the production transient advisory admission lock; a visible history heading precedes detail completion. Setup now awaits and asserts the successful actual detail response before report navigation. No lock/policy change, retries or longer timeout. |
| e792ca4b835c8c03501e4d46083154ce | 1 | A and seed passed; owned history-detail response passed, but report Details absent (5s action timeout): 1 unexpected, 15 skipped. Waiting for history completion did not resolve report failure. |
| 7ee7292f3f52e485b5060e4843b4aade | 1 | A and seed passed; safe diagnostic confirmed authenticated /months route with no closing section/Details and no known dashboard state message. 1 unexpected, 15 skipped; no B PASS claimed. Added direct seed report-read validation and bounded server-error diagnostics. |
| e16d30de433afc7ed7074b253dac1ec0 | 1 | Harness38 passed; lint rejected ANSI-control regex in diagnostic reporter. No build/browser/seed execution. Replaced regex with Node stripVTControlCharacters; local lint/typecheck passed. |
| 7d7a50e5a3c23aae9856f52a49f31a5d | 1 | All A checks, seed and post-seed immutable report repository read passed. Authenticated closed-month page HTTP200, no generic exception/digest, but Details absent: 1 unexpected, 15 skipped. No B PASS. Separated that retained page assertion into B-17; B auth report packets now come from actual history MONTH_CLOSE→REPORT UI requests, independently proving report ownership. This does not claim coverage of the separate month chunk route. |
| 86614ae9fc0ece37845174dfae7f2b78 | 1 | All A checks/seed passed; B 3 passed / 14 failed / 0 skipped / 0 flaky. B-13/B-14/B-16 passed. Found real SELECT-only row-lock incompatibility and Server/Client serialization failure; also test-infrastructure errors reading a discarded streamed-redirect body and following CSRF error redirects. Fixed only the latter test mechanics. |
| a445bf17b20e9c83c5bccd02d3b9e264 | 1 | Final exact source: A38 + original smoke2 passed, all A gates0. B17 executed: 14 passed, 3 failed, 0 skipped, 0 flaky. B-01/B-12/B-17 remain failed; details below. |

Standalone checks: `node node_modules/typescript/bin/tsc --noEmit --project
tmp/hb021-b-check/tsconfig.json` exit0; `node
node_modules/eslint/bin/eslint.js . --ignore-pattern 'tmp/**' --max-warnings=0`
exit0. The temporary typecheck config is a fast local check only; the harness
also runs the real repository typecheck after Next type generation. Temporary
archived checkouts are excluded from host lint; isolated harness lint uses the
unmodified project config on the clean source snapshot.

Failure-cleanup: `node --import tsx scripts/e2e/run.ts --auth
--fail-after-database` exit1, run f523d19b64a1109598a5177c2880bdd5,
failure E2E_INJECTED_STARTUP_FAILURE. Both receipt-owned resources (one network,
one PostgreSQL container) removed, cleanupFailures empty. Earlier same-purpose
check cba0f002d6121a045284cbb887db8a01 also exited1 with cleanup complete.

No production source, domain, migrations/schema, release scripts, CI or finance
tests changed (`git diff --exit-code HEAD -- src drizzle .github
scripts/production-init tests/finance`, exit0). Prior A-R01 manifest comparison
confirms every approved repo file remains byte-identical except the explicitly
authorized scripts/e2e/run.ts adapter, including A report, plan and OPEN_QUESTIONS.
Full Finance Gate and finance integration suite: NOT EXECUTED for this test-only
change; no claim of their PASS or waiver of their release criteria.

## Final exact commands, versions and evidence

Final full command: `node --import tsx scripts/e2e/run.ts --auth`, **exit1**,
run **a445bf17b20e9c83c5bccd02d3b9e264**. This is an overall FAIL, not an A
regression: every A step passed, B has three ordinary failures. Source HEAD
f8bfca7f836271cff87858c04be2cbf3643ce4e9; dirty clean-snapshot inventory
235 files, SHA-256 **f5def10e03b0681ad34d1d1dbff4db488375edb8d4a5d966623898b8be11f370**.
The final source files match that inventory; documentation is outside the build
snapshot. Original A-R01 manifest is the baseline for preservation and B-only diff.

Inside the isolated runner, commands below ran with explicit generated env
allowlists (values intentionally omitted):

| Command / check | Actual exit and result |
|---|---|
| `node --conditions=react-server --import tsx scripts/db-migrate.ts` twice | 0, 0; identical six-row journal, hashes/created_at retained in raw report |
| Target/DB identity, foreign-container refusal, no-default-route guards | All0; own exact IDs/images/labels; no host publications |
| `node node_modules/vitest/vitest.mjs run tests/e2e-harness.test.ts` | 0; 38 passed |
| `node node_modules/eslint/bin/eslint.js . --max-warnings=0` | 0 |
| `node node_modules/next/dist/bin/next typegen` | 0 |
| `node node_modules/typescript/bin/tsc --noEmit` | 0 |
| `node node_modules/next/dist/bin/next build` | 0; actual fresh production build, no env files |
| `node node_modules/@playwright/test/cli.js test` | 0; original anonymous Chromium smoke and actual PG 28P01 regression, 2 passed |
| `node --conditions=react-server --import tsx tests/e2e/support/seed.ts` | 0; current + historical synthetic evidence, immutable report reread after current update succeeds |
| `node node_modules/@playwright/test/cli.js test --config playwright.auth.config.ts` | 1; 14 passed / 3 failed / 0 skipped / 0 flaky |

Host Node22.23.0; isolated Node26.13.1, pnpm12.16.1, Playwright1.65.0,
Next16.4.3. Frozen package versions: Auth.js/next-auth5.0.0-beta.32,
React/ReactDOM19.3.1, TypeScript6.0.3, Vitest5.0.5. PostgreSQL18.6
(Debian18.6-1.pgdg13+2) and Chromium/Google Chrome for Testing158.0.8127.18
use the same immutable image pins/executables verified in A; no upgrade/pull.
Exact Docker image IDs/digests and runtime versions are in final report.json.

The final 127 no-write annotations compare exact full rows across all20 public
tables, including failing test flows (finally verification). Every comparison
passed; all have the same baseline SHA-256
**0e494775c2674969903d4a340f0cd3b4610f8aeb1db69c64fafb97b5658eeac7**.
This is a fingerprint, not a substitute for the exact in-memory row comparison.
No raw financial rows, cookies, JWTs or generated secrets are exported.

| Test | Final result / actual proof |
|---|---|
| B-01 | FAIL: valid Auth.js session projection, reload, owned load and history detail/report reads execute; owned receipt status returns STORAGE_ERROR. Soft assertion retains the failure while allowing other checks to run. |
| B-02..B-11 | All10 PASS: each invalid session gets actual browser login redirect/no form; independent raw HTTP SSR has no private data; eight captured Server Action requests each deny with exact error-only payload and per-operation no-write. |
| B-12 | FAIL: foreign owner/account injection, source/report membership and report selector refusals complete with no disclosure/no-write; foreign status/history return STORAGE_ERROR rather than meaningful scoped absence. Soft assertions retain both failures and still run the other operations. |
| B-13 | PASS: already-open real form/review, expired real JWE, preview and confirm both deny with per-operation no-write. |
| B-14 | PASS: Origin/Host/X-Forwarded-Host mismatch, real captured requests, HTTP refusal, per-request no-write. The three Invalid Server Actions request log headings are expected for these refusals. |
| B-15 | PASS: missing/wrong HTTP CSRF cannot clear session; actual local CSRF permits logout; cleared cookie/protected return proven. Signout fetch uses redirect:manual; it tests CSRF/cookie effects without following an error/return page or any provider flow. |
| B-16 | PASS: actual UI logout, cleared cookie, fresh protected GET/direct read denial, exact no-write. |
| B-17 | FAIL: authenticated completed-month route HTTP200 but React441 and server function→Client Component serialization error; no Details button. Actual month-chunk request cannot execute and is NOT EXECUTED. Test remains enabled/failing, no skip/xfail/retry. |

Raw SSR uses BrowserContext.request with the same context cookies and
maxRedirects0, alongside the independent actual browser navigation. It avoids
claiming access to a Chromium response body discarded after a streamed redirect;
it does not replace the real endpoint or fulfill a mock response. Browser action
IDs and bodies still come only from actual hydrated UI requests. Report ownership
read uses actual history MONTH_CLOSE→REPORT, separate from unexecuted month chunk.

## Two unresolved acceptance blockers (no production changes authorized)

1. **SELECT-only runtime versus existing row lock.**
   `src/infrastructure/db/budget-update-repository.ts:48` uses `.for('update')`
   in ownedAccount; status/history call it before scoped receipt lookup. The
   final real PG probe proves SELECT works but SELECT FOR UPDATE refuses with
   **SQLSTATE42501**. Actual application replies are STORAGE_ERROR. This prevents
   claiming authorized receipt reads or foreign request/history absence PASS.
   No UPDATE/DDL permission was granted; weakening the assertion to accept a
   storage failure would conceal the missing proof. Resolving the incompatible
   existing read path requires a separately reviewed/authorized decision.
2. **Closed-month server rendering.**
   Real Next emits `Functions cannot be passed directly to Client Components`
   and browser React441 on the completed-month page. The immutable report is
   independently readable through seed repository validation and actual history
   REPORT actions. The failure is consistent with the server-rendered
   Button component={Link} in `src/app/months/page.tsx` (source-level inference;
   no production fix attempted). This report does not assert that production
   data or a deployed instance was tested. B-17 retains the required assertion;
   report-page/chunk acceptance is unresolved.

No alternative is selected for the owner. Production changes, DML grants,
financial/domain/schema adjustments and auth-policy changes remain outside this
authorized patch. These failures prevent accepting B, even though negative auth
boundaries and no-write checks passed. They do not justify changing Finance Gate.

## Independent session/provider statuses

| Normative scenario | Session-authenticated application proof | Provider-login/relogin proof |
|---|---|---|
| HB20-B01 | Full first-run UNKNOWN→review→first financial confirmation: NOT EXECUTED (C). B tests only the synthetic existing-account access/security prerequisite. No B01 session PASS. | BLOCKED BY CONSTRAINT / NOT EXECUTED |
| HB20-B03 | Local logout/protected return subcase PASS B-16; cancel/reload UNKNOWN/known0/existing-empty and saved financial-state reconstruction NOT EXECUTED (C). Full session scenario NOT PASSED. | BLOCKED BY CONSTRAINT / NOT EXECUTED |
| HB20-B04 | Expired-form auth refusal PASS B-13; valid session/reload/history subproofs execute. Full session scenario NOT PASSED: receipt/status and closed-month rendering failures B-01/B-12/B-17 remain. | BLOCKED BY CONSTRAINT / NOT EXECUTED |

No synthetic reinstallation is called relogin. Q-HB21-AUTH and all original
acceptance criteria remain open/unchanged. This HTTP loopback proof does not
verify production HTTPS/Secure-cookie behavior, Google admission or global JWT
revocation. No financial onboarding/write/close UI acceptance, responsive/a11y,
locales or parts C–J are claimed by this B run.

## Cleanup, retained artifacts and review handoff

Final matching failure injection: `node --import tsx scripts/e2e/run.ts --auth
--fail-after-database`, exit1, run **2d79045d6864e316a5e37b15440dc651**,
E2E_INJECTED_STARTUP_FAILURE. Same235-file source inventory/hash as final full
run; its one PG container and network removed, cleanupFailures empty. Additional
earlier injection 8ab93425c97aaa83a3742fee4dfeb266 also exited1 and cleaned2/2.

Final full run created and removed its3 containers (PG/acquisition/runner),
one work volume and one internal network, plus its own clean snapshot/empty
Docker-config workspace. Exact IDs/names/removal receipts are in report.json.
Across all17 B-development/injection attempts: **72 Docker resources created
and72 removed (42 containers,17 networks,13 volumes)**; every cleanupFailures
list empty. Final read-only label-filtered Docker listing found zero remaining
HB-021 containers/networks/volumes, exit0; no unrelated resource was touched.
No image cache was deleted. Reports, proposal, local quick-check tooling and
new ZIP staging remain intentionally under tmp; previous A reports/ZIP remain.

Review ZIP contains every uncommitted A+B repo file and approved plan/questions,
all-local-changes.patch, B-only delta from approved A-R01, sanitized raw evidence
for every attempt, preservation check and SHA-256 manifest. Secrets/env files,
storageState/traces/screenshots/HAR and raw DB rows are excluded. URL strings in
raw evidence are explicitly redacted; original local receipts are retained.
No commit/push/PR/merge/deploy, Done or Owner Acceptance. Stop here for independent
ChatGPT review; no work on C–J.

Final local verification: `node tmp/hb021-b-check/check-final.mjs` exit0:
235/235 source hashes match the executed snapshot; approved A preservation
matches except the agreed launcher; `git diff --check` exit0; tracked
out-of-scope diff exit0; all17 untracked files pass UTF-8/whitespace checks;
23 local Markdown link targets exist. Evidence: final-local-checks.json in ZIP.
Package: `tmp/hb-021-b-review-20261113-a445bf17.zip`, with manifest.json covering
every other entry; ZIP SHA-256 sidecar is next to it. The two patch files make
the full dirty change and B-only delta independently reviewable.
