# HB-021 B correction — HB21-B-R01 / HB21-B-R02

Owner-authorized correction of independent review CHANGES REQUESTED:
Critical0 / High1 / Medium1 / Low0. Branch feat/hb-021-e2e-harness;
base HEAD f8bfca7f836271cff87858c04be2cbf3643ce4e9. Prior A/B changes,
approved plan/questions, old reports and ZIPs are preserved. This report is
separate from the retained pre-correction 14 PASS / 3 FAIL B report.
Both corrections pass their regressions and Auth17/A38/smoke2. Final full
verification is NOT PASS: four unit Finance Gate policy tests and Gate commands
fail on the preserved normative-context mismatch. No Done, Owner Acceptance
or publication; separate maintenance authorization remains necessary.

## Exact correction scope

Production files changed:

- src/app/months/page.tsx — replace Button's function-valued component={Link}
  with component="a" and the same /update-budget href, text and Button styling;
  remove the now-unused next/link import. Native link navigation is verified
  by the real browser. Period/version selection, H/K, loaders, report rendering
  and all existing Server Actions remain unchanged.
- src/infrastructure/db/budget-update-repository.ts — make ownedAccount a
  scoped plain SELECT for status/history; retain the exact account FOR UPDATE
  query as lockOwnedAccount for transition-proposal persistence. Status/history
  now use REPEATABLE READ, READ ONLY transactions. Original evidence and replay
  verification, predicates, limits and error contracts remain unchanged.
  commitBatch and its writer serialization/locks were not edited.

Regression files:

- tests/auth-e2e/auth.spec.ts — strengthen existing B-17: actual closed-month
  page, original chunk read, explicit version1, reload and pinned period/version
  chunk requests, no hidden balance form, zero browser errors, functional link
  to the existing budget form; exact 20-table no-write comparisons. Still17
  enabled Auth E2E; no skips/xfails/retries or reduced assertions.
- tests/integration/budget-update-read-only.test.ts — four real PG regressions:
  SELECT-only own receipt/history and foreign refusal with no-write; actual
  FOR UPDATE/DML/DDL refusal42501; concurrent commit while status holds a snapshot;
  the same for history. Both snapshot cases assert actual transaction settings,
  old coherent result, fresh new result, original evidence after later writes,
  exact replay and no additional writes after the intentional writer commit.
- tests/e2e/support/proof.ts and tests/e2e-flight.test.ts — B-only Flight result
  inspection now respects React's length-framed UTF-8 text rows, followed by a
  model without a newline. Three regression tests cover the actual large-chunk
  case, multibyte lengths/result-looking payload text, and invalid/incomplete
  frames. This corrects test evidence parsing, not any production decoder.

This report and review artifacts are the remaining correction changes. No other
production file, domain math, auth policy, migration/schema, Finance Gate,
manifest, protected context or CI/release script is edited. Approved A launcher,
roles/grants, independent passwords, configs, smoke and38 tests stay byte-identical
to the preceding B baseline. Complete dirty A+B changes are included for review;
correction-only delta is provided separately.

## Causes and proof boundaries

R01: the CLOSED branch in a Server Component passed the imported Next Link
function into MUI's Client Component prop. The actual prior browser/server
evidence contains React441 and “Functions cannot be passed directly to Client
Components”. A serializable native anchor preserves the required navigation
without adding a client wrapper or changing the financial source/view.

R02: status/history reused a helper which acquired an UPDATE row lock before
reading scoped immutable receipts/evidence. Real SELECT-only PostgreSQL refused
it with42501, exposed by the application as STORAGE_ERROR. Plain ownership
reads do not need that writer lock. REPEATABLE READ captures one MVCC snapshot
across every query and originalEvidence reread; READ ONLY prevents incidental
writes. Writers/proposals still use their existing account/proposal locks and
commitBatch, so the read does not block a valid writer or combine different cuts.

The concurrency test's PG query instrumentation only pauses after a real SELECT
completes; all SQL executes against PostgreSQL. It neither substitutes results
nor changes production code, transaction settings, clocks or financial facts.
An independent connection commits through the real repository while the reader
is paused. The returned snapshot and the subsequent fresh read must differ as
specified; saved original evidence and replay must remain unchanged.

BR-08/HBH-002/003/006: coherent retained H/K, immutable report/version and original
evidence. BR-10/HBUX-023/HB20-B04: fresh scoped ownership on each operation,
read-only denial and exact no-write. BR-01/02/03/05/11 financial equalities,
balance authority/no double debit/full reserves and integer cents are unchanged;
the final existing financial suites supply broad regression evidence.

## Verification architecture and preserved A

Approved scripts/e2e/run.ts is not changed. Temporary reproducible driver
tmp/hb021-b-correction/driver.ts derives from it and imports the unchanged A
safety module: same pinned images, fresh labeled containers/network/volume,
loopback-only shared namespace, no host publication/default route, strict DB
targets/identity, clean env and source copy, and receipt-owned finally cleanup.
No env files, .vercel, user credentials or host node_modules are copied/read.

Focused modes execute only R02 PostgreSQL/concurrency or B-17 (plus build/setup
needed for that browser). Final mode runs A38 + smoke2 + Auth17, then the existing
full unit/integration/DB17/timezone/Finance Gate protocol on one frozen source.
All scripts/tests and exact Finance Gate normative contexts/configs are copied
into that clean checkout. The final source inventory and financial fingerprint
are captured; no baseline manifest/context hash is regenerated.

The full integration suite needs to create isolated databases and synthetic
fixtures. A separate transient hb_verifier credential, independently generated
inside the owned disposable PG lifecycle, supplies that trusted test-provisioning
role. It does not alter hb_runtime or production permissions. Next/Playwright
receive only hb_runtime credentials; no Vitest/Next/Playwright process receives
the migration password. Unit/timezone need no DB credential. Integration-created
child databases/roles exist only inside the newly owned PG container. Existing
production-init core integration tests use fresh synthetic local databases;
the production initializer CLI and any hosted service are never invoked.

## Current-run ledger (retain failures)

| Command / run | Actual outcome |
|---|---|
| node node_modules/eslint/bin/eslint.js src/app/months/page.tsx src/infrastructure/db/budget-update-repository.ts tests/auth-e2e/auth.spec.ts tests/integration/budget-update-read-only.test.ts --max-warnings=0 | exit0 |
| node node_modules/typescript/bin/tsc --noEmit --project tmp/hb021-b-correction/tsconfig.json | exit0; includes all src/tests/scripts |
| node --import tsx tmp/hb021-b-correction/driver.ts --focused-db; 6255571ad3440617b4c04f062c15967c | exit0: new4/4 PG tests passed; existing concurrency/replay6 passed,18 filtered tests not executed; cleanup empty |
| node --import tsx tmp/hb021-b-correction/driver.ts --focused-browser --auth; ece9959bf15d030b19ab66bb4e1051a9 | exit1 after build0, before Auth seed/test: temporary driver incorrectly attempted to copy skipped A-smoke JSON. B-17 NOT EXECUTED. CRLF-sensitive adapter replacement corrected only in temporary tooling; cleanup empty. |
| node --import tsx tmp/hb021-b-correction/driver.ts --focused-browser --auth; 98f6326f80ab8e68f4486f0c2db6cfa8 | exit1: page/Details now open with no React441; B-17 chunk-result assertion failed because the B helper treated all Flight rows as newline-delimited. Installed React emitTextChunk confirms T<hex UTF-8 bytes>,payload framing with no trailing newline. Only B test decoder was corrected; cleanup empty. |
| optional host node --import tsx --input-type=module -e [Flight assertions] | exit1 before assertions: sandbox uv_os_get_passwd ENOMEM; not counted as test PASS. The actual isolated three-test suite below supplies the proof. |
| node --import tsx tmp/hb021-b-correction/driver.ts --focused-browser --auth; 3db6385a1aedc2fa66455e889258780a | exit0: Flight3/3; B-17 1/1,0 skipped/flaky; actual details, pinned version1/reload/chunks and navigation; lint/typecheck/build0; cleanup empty. |
| node --import tsx tmp/hb021-b-correction/driver.ts --final --auth; 514be307266d439b4bf45a3c8c8bea25 | exit1 overall: Auth17/A38/smoke2, integration544, DB17(2), timezone552 pass; unit1159/1163 and Finance Gate fail as detailed below. Every required suite executed. |
| node --import tsx tmp/hb021-b-correction/driver.ts --final --auth --fail-after-database; 0cff2c95fa2cd39fc9d2c75bbd5abcc5 | expected exit1 E2E_INJECTED_STARTUP_FAILURE; matching final snapshot; both owned resources removed, cleanupFailures=[] |

No full suite was run after each edit: the development attempts above select
only four PG/six existing concurrency tests or B-17 and its three parser cases.
The final broad run starts only after both targeted fixes pass.

## Finance Gate maintenance blocker

Static comparison against unchanged tests/finance/coverage.json finds exactly
one normative-context mismatch: docs/OPEN_QUESTIONS.md, retained from approved A.
This precedes these two fixes and is present in the pre-correction baseline.
The owner explicitly prohibits changing protected contexts/fingerprints/manifests
to obtain PASS without separate maintenance approval. No such maintenance is
performed. Final Gate commands must run unchanged and retain their actual FAIL;
independent UTC unit, isolated integration, DB17 and the manifest's exact16-file
America/Los_Angeles subset still execute, even if Gate init/receipt steps reject.
No forged run/receipt, copied PASS, replacement manifest or Gate waiver is allowed.

## Final frozen source and exact commands/results

Final run514be307266d439b4bf45a3c8c8bea25 and injected-failure run share383
copied source files, inventory SHA-256
**778751f21d0ae91ad57dcabb2b925d2f541070ba63a1a562c78bd61b57c20bb8**.
Actual observed financial source fingerprint (computed, not installed in any
baseline manifest):
**1b282a3c78b0bbc7463bf81fc1bf442e9a357b2ba4bae88f61348072af34a6df**.
Verification driver SHA-256:
**8af44969b833860d37431a6ea1e8bd12ed2fd7dfed955d7fdb697786e5037973**.
No executable source changed after this final run; subsequent report/artifact
updates are outside the checker input set. Source/fingerprint and diff checks
are repeated at packaging. Fresh run evidence is not reused across roots/jobs.

Working directory for the following commands is the clean /work checkout.
Explicit allowlisted generated DB/Auth env values are omitted, not stored in
an env file. Unit TZ=UTC; integration has only the independent verifier DB URLs;
browser/Next have hb_runtime only; timezone TZ=America/Los_Angeles.

| Command | Exit / actual result |
|---|---|
| node --conditions=react-server --import tsx scripts/db-migrate.ts (twice) | 0,0; six migration journal rows identical |
| node node_modules/vitest/vitest.mjs run tests/e2e-harness.test.ts | 0;38 passed |
| node node_modules/eslint/bin/eslint.js . --max-warnings=0 | 0 |
| node node_modules/next/dist/bin/next typegen | 0 |
| node node_modules/typescript/bin/tsc --noEmit | 0 |
| node node_modules/next/dist/bin/next build | 0 |
| node node_modules/@playwright/test/cli.js test | 0;2 passed,0 skipped/flaky; actual hb_runtime TCP login and hb_migrator/runtime-password rejection28P01, original empty-DB browser smoke |
| node --conditions=react-server --import tsx tests/e2e/support/seed.ts | 0; synthetic single verified owner/forbidden foreign scope and retained history |
| node node_modules/@playwright/test/cli.js test --config playwright.auth.config.ts | 0;17 passed,0 failed/skipped/flaky; B-01 through B-17 individually passed |
| node scripts/check-finance-coverage.mjs init /work/test-results/finance | 1;HB015_GATE_REJECTED, no valid run/receipts generated |
| node node_modules/vitest/vitest.mjs run --maxWorkers=2 --reporter=default --reporter=json --outputFile.json=/work/test-results/finance/unit.json | 1;1163 total,1159 passed,4 failed,0 pending/todo |
| node scripts/check-finance-coverage.mjs record /work/test-results/finance unit (TZ=UTC) | 1;manifest rejection |
| node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts --reporter=default --reporter=json --outputFile.json=/work/test-results/finance/integration.json | 0;544 passed,0 failed/pending |
| node scripts/check-finance-coverage.mjs record /work/test-results/finance integration | 1;manifest rejection, not an integration failure |
| node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts -t DB17 --reporter=default --reporter=json --outputFile.json=/work/test-results/finance/db17.json | 0;2 passed,542 excluded by the existing name filter (all544 passed in the full suite) |
| node scripts/check-finance-coverage.mjs timezone /work/test-results/finance (TZ=America/Los_Angeles) | 1 before running tests; unchanged Gate protocol rejected manifest |
| node node_modules/vitest/vitest.mjs run [exact manifest.timezoneFiles] --maxWorkers=2 --reporter=default --reporter=json --outputFile.json=/work/test-results/finance/timezone.json (TZ=America/Los_Angeles) | 0;552 passed,0 failed/pending; all16 manifest files executed independently despite blocked Gate CLI |
| node scripts/check-finance-coverage.mjs record /work/test-results/finance timezone (TZ=America/Los_Angeles) | 1;manifest rejection |
| node scripts/check-finance-coverage.mjs check /work/test-results/finance | 1;Finance Gate FAIL, not waived |

The literal LA invocation (TZ=America/Los_Angeles, exit0) is:

```text
node node_modules/vitest/vitest.mjs run tests/forecast.test.ts tests/forecast-boundary.test.ts tests/forecast-oracles.test.ts tests/checkpoints.test.ts tests/checkpoint-reconciliation.test.ts tests/obligations.test.ts tests/savings.test.ts tests/transitions.test.ts tests/transition-calendar.test.ts tests/shared/pure/calendar.test.ts tests/shared/pure/berlin-date.test.ts tests/domain/period.test.ts tests/domain/money.test.ts tests/domain/money-codec.test.ts tests/closing.test.ts tests/closing-boundary.test.ts --maxWorkers=2 --reporter=default --reporter=json --outputFile.json=/work/test-results/finance/timezone.json
```

The reproduction driver reads this exact16-file list from the unchanged
delivered snapshot/tests/finance/coverage.json; timezone.json lists every
executed file/test. No reduced subset is used.
DB17 executes both the BIGINT above MAX_SAFE_INTEGER Drizzle round-trip and
HB10-DB17 immutable input capture before async auth.

The four actual unit failures are retained in unit.json/unit.txt:

- tests/finance-coverage.test.ts: HB15-G03 “returns nonzero for malformed
  current-run JSON and refuses context reuse” — initial expected-success init
  returns1 because baseline context is already mismatched.
- same file: HB15-G03 “validates the actual normative inventory and approved
  timezone source list” — NORMATIVE_CONTEXT_MISMATCH.
- same file: HB19 “requires both added closing timezone files without reducing
  the prior source set” — receives NORMATIVE_CONTEXT_MISMATCH before the intended
  INVALID_TIMEZONE_SET check.
- tests/finance-fingerprint.test.ts: FPG-008 “actual CLI init cannot record after
  a financial edit” — baseline init returns1 before the fixture's intentional edit.

These are real failures, not expected-failure markers. All other1159 unit
assertions passed, including the three new Flight regressions. No maintenance
to tests/checker/manifest/OPEN_QUESTIONS was performed to turn these green.
Finance Gate validation and valid receipt binding therefore remain unproved
on this source until separately approved maintenance and a fresh full run.

The new four read-only integration cases all pass in integration544 and in their
focused run. The existing writer concurrency, duplicate/stale replay, lost-COMMIT
acknowledgement, rollback, corrupt-evidence, retained history, H/K and immutable
closing tests all ran in the complete suite. Source math/validators/writer commit
code and all six SQL migration files remain unchanged.

Auth17 produced129 exact full20-table comparisons, all equal, including each
denial and the version/reload reads. Single fingerprint across those comparisons:
**7da9b37d4e2f3b7e1d0f4d1e4a67a6eecb70bf7a1e4d93216bda6a25316eb5df**.
Only hashes/statuses are exported, not the before/after census rows. The read-only
runtime's forbidden FOR UPDATE remains42501; successful status/history prove the
fix did not rely on extra privileges. Foreign request/account/source/report
refusals complete with no data payload/disclosure and unchanged rows.

Runtime versions: host Node22.23.0; isolated Node26.13.1, pnpm12.16.1,
Playwright1.65.0, Next16.4.3; frozen TypeScript6.0.3, Vitest5.0.5,
Auth.js/next-auth5.0.0-beta.32, React/ReactDOM19.3.1. PostgreSQL18.6 and
Chromium158.0.8127.18 use the unchanged pinned A images; exact image IDs/digests
are in each raw report. No dependency, image version or release config changed.

## Cleanup and review artifacts

Every correction attempt has a resource receipt and source inventory. The final
full run removes its three containers, one work volume and one internal network;
the injected failure removes its PG container/network before any suite. Across
the six correction runs: **27 Docker resources created,27 removed (16 containers,
6 networks,5 volumes)**; every cleanupFailures list is empty. Owned clean checkout/
empty Docker-config workspaces are removed in finally. No unrelated resource or
shared image cache is removed. Reports, scratch verification tooling and ZIPs
are deliberately retained locally. Old A/B reports/ZIPs remain untouched.

The new ZIP contains all25 uncommitted A+B+correction repo files, the seven-file
correction delta and full dirty patch, approved plan/questions/old reports,
the exact executed clean source snapshot, sanitized raw evidence including all
failed attempts and full suite results, reproducible focused/final driver,
source/preservation checks and SHA-256 manifest. No env files, .vercel,
node_modules, user secrets, cookie/JWT dumps, storageState, traces or screenshots.
Evidence URLs/generated secrets are redacted; executable source bytes are not
rewritten. This is a review artifact, not valid financial receipt reuse.

Final read-only check command:
`node tmp/hb021-b-correction/check-final.mjs`, exit0. All383 source file hashes
and the driver hash match the executed run; observed financial fingerprint is
unchanged. git diff --check and protected-source diff both exit0. All20 untracked
files pass UTF-8/whitespace checks;23 local Markdown link targets exist. All18
baseline files outside the four intended existing-file corrections are preserved,
including approved A, plan/questions and prior reports. Docker label-filtered
listings find zero remaining containers/networks/volumes. These post-run checks
cover the administrative report/artifact updates without claiming a new test run.

Review package: tmp/hb-021-b-correction-review-20261113-514be307.zip; manifest.json
contains SHA-256 for every other entry, with a separate ZIP SHA-256 sidecar.
Full and correction-only patches are checked against HEAD and preserved B
respectively. Scoped fixes are ready for independent review; overall financial
verification remains FAIL and requires a separate owner maintenance decision.
Stop after this correction. No work on C–J or HB-021 Done status.

## Acceptance limits and handoff

Real provider Google login/relogin remains BLOCKED BY CONSTRAINT / NOT EXECUTED,
independently for HB20-B01/B03/B04. Synthetic JWE/session proof is application
proof only; Q-HB21-AUTH is untouched. HTTP loopback does not verify production
TLS/Secure-cookie behavior or physical AT. First financial confirmation and
parts C–J are not implemented or claimed by these corrections.
Full HB-021 and Owner Acceptance remain pending, including any Finance Gate
maintenance decision and independent ChatGPT review. No commit/push/PR/merge/deploy.
