# HB-016 — Owner Acceptance and documentation finalization

**Owner Acceptance: 2026-11-03. HB-016: Done.** The owner reports independent
ChatGPT implementation review **APPROVED**, with findings
**Critical 0 / High 0 / Medium 0 / Low 1**. The Low finding is nonblocking;
its description was not supplied in the acceptance instruction, so no cause,
remediation or resolution is invented here. It remains recorded as one
nonblocking Low, not zero findings.

## Acceptance and manual verification provenance

- The owner's acceptance instruction authorizes marking only HB-016 Done.
  Independent review is owner-reported; it is separate from the implementer's
  self-review and recorded test execution below.
- The owner reports manual Google OAuth verification with **local PostgreSQL**
  and the authenticated dashboard's **NO_ACCOUNT** state. This is the expected
  empty state when the owner has no existing account; login does not automatically
  provision a financial account. The agent did not rerun this manual check.
  No provider identifiers, credentials, tokens, bank figures or connection strings
  are recorded. No production OAuth verification or additional login/logout cases
  are inferred from this report.
- The original implementation results below remain historical execution evidence:
  781 unit/component, 304 PostgreSQL, 509 LA subset, finance gate and 30 browser
  checks. Owner-reported manual OAuth verification supplements the earlier
  synthetic-session browser checks; it does not retroactively turn them into
  Google's provider exchange or remove their other limitations.

## Documentation-only scope and checks

Only `docs/TASKS.md` and this report change. Code, tests, CI, other tasks, the
approved plan and local settings are unchanged. `git diff --check` passed.
No runtime tests, database, migrations, OAuth or build commands were run during
this acceptance update, and no fresh current-source finance gate PASS is claimed.
TASKS is a pinned normative context in the existing finance coverage manifest;
its context hash is not refreshed because the owner explicitly excluded test
changes. A later authorized gate run must account for the changed documentation.

The entire original report follows unchanged, including its delivery-stage
pending-review statements, results, limitations and Git snapshot. Those pending
review/acceptance statuses are historical and superseded by this acceptance entry.
The previous review ZIP/checksums describe that earlier snapshot, not these two
documentation changes. No new archive or publication action was performed.

**Stop after showing the documentation diff. No commit, push, PR or merge.**

---

# HB-016 — implementation verification

**2026-11-03. Implementation ready for independent ChatGPT review; owner acceptance pending. HB-016 is not Done.**

Owner authorized implementation after reporting independent review of the unchanged
[technical plan](hb-016-dashboard-period-switch.md): APPROVED, no blocking findings.
This report records implementer execution and self-review, not an independent
implementation review or a new product acceptance.

## Base, preservation and scope

Branch `feat/hb-016-dashboard-period-switch` was created from
`32d1ad56490656a95fdd74d749a4734ed61070e0` after checking status. Local main,
origin/main and remote main (read-only GitHub connector) matched. Initial status
contained only the untracked approved plan; `.vscode/` was ignored. SHA-256
baselines of the plan and the existing `.vscode/` file were saved before edits
and compared afterwards. Both remain byte-identical. No stash, reset, overwrite
of user changes, stage, commit, push, PR, merge or deploy occurred.

Delivered:

- Session-derived, bounded owner-scoped account discovery with separate no-account,
  ambiguous-account and storage-error states. No provisioning. The existing
  projection boundary reauthorizes ownership; its repository checks scope again
  inside its unchanged repeatable-read read-only transaction.
- One existing HB-014 projection read per render. Current D36 safe limit is main;
  ordinary guidance is secondary. Current/future/past URL modes, true bank check
  dates, full reserves/savings, signed free budget, deficit, stale reminders and
  grouped nonadditive warnings are displayed without financial writes.
- Exact bigint/decimal-cent formatting, localized date-only values, RU/DE/EN,
  existing MUI themes/AppShell, navigation/loading/error/unavailable states.
- [All 26 scenario definitions and executable mapping](../../tests/scenarios/phase-01/hb-016-dashboard-period-switch.md).
  New tests exercise real production projections rather than a duplicate D36 formula.

Past mode explicitly shows the past month's share in the **active allocation**;
it is not an as-closed historical report. Future guidance is a full-month budget
preview, never today's available cash. HB-017 update controls, account creation,
financial commands, closing, CARRY/FRESH_START, PWA and demo-money branches were
not added. Domain formulas, projection repository, schema/migrations, architecture,
dependencies, package scripts, CI and TASKS were not changed.

## Skills and implementation refinements

All eight requested current SKILL.md files were reread: create-planning-doc,
create-scenarios, verify-financial-invariants, define-architecture,
security-best-practices, configure-project, vercel-react-best-practices and
web-design-guidelines. Normative BR/DECISIONS/ADRs and existing HB-005/007/014/015
contracts take precedence. Security references for Next server authorization,
runtime input/cache/error handling and React/general frontend boundaries were
consulted, as were React serialization/request-state rules and the latest
Web Interface Guidelines. No skill required a stack/schema change.

Three narrow refinements have concrete evidence:

1. The year uses a bounded native numeric field instead of a select containing
   9,999 options. The month remains a native select. Years 0001..9999 are validated
   server-side; early-year dates and calendar boundaries have executable checks.
2. Existing `Wire<T>` maps branded string types structurally. Presentation converts
   trusted wire date/period primitives with `String` and selects display fields;
   it does not alter the accepted wire/domain contract. Adding the repository read
   method also required one mock property in `tests/auth-config.test.ts`; its old
   fixtures/assertions and test names are unchanged.
3. The first real gate correctly refused four auth-page references because `%s`
   formatted the changed page functions as their full transformed source. The two
   existing `it.each` groups now pass `[page.name, page]`. All ten page-case names
   are stable, and **only ten `tests.*.name` values** in coverage.json changed.
   A structural comparison to main proved that all contexts, definitions,
   obligations, dispositions, reference keys/paths/suites and timezone files are
   identical. No gate checker/workflow or financial assertion was weakened.

## Environment and safety

Windows; Node **22.23.0**, pnpm **12.16.1**, Vitest **5.0.5**. PostgreSQL
**18.6 (Debian 18.6-1.pgdg13+2)** in a newly created dedicated container:
`85a5f24ae69aa1b12d9611df3e9cd4cce20a73922974d8f00b3281553aa322e1`,
labels `com.home-budget.task=HB-016`, `com.home-budget.owner=codex-local`,
binding **127.0.0.1:56743 → 5432/tcp**. A random disposable password was generated
privately. All three DB destinations were explicitly overridden to this local
server, with existing target guards enabled. Integration suites created their
own migrated child databases. Browser QA used another synthetic child database.

No Neon/production, real financial data, provider OAuth credentials or user env
files were used. No framework build/typegen ran in the user's workspace. An
isolated verification copy contained src/tests/docs/migrations/scripts/config and
self-contained copies of installed dependencies; all dependency links were remapped
inside the copy. **Zero env files were copied.** The copy's source/tests were
resynchronized before final typecheck/build. Original dependencies/config/settings
were not moved or edited. Migration execution used the inspected underlying Node
entry without package.json's `--env-file-if-exists=.env.local` option.

## Exact commands and results

Commands ran from `D:\projects_js\home-budget`, unless marked **mirror**.
`$e` below is `C:\Users\Denys\AppData\Local\Temp\hb016-pzinss`;
`$r = Join-Path $e 'final-r1'`;
mirror is `$e\verify`. These are actual executed commands, not recommendations.
PowerShell environment overrides applied only to the corresponding child session.

Before DB commands the session set:

```powershell
$env:HB_DATABASE_TARGET='isolated-development'
$env:HB_TEST_DATABASE_TARGET='disposable-local-container'
# All three values built privately from the disposable container credentials:
$env:DATABASE_URL=$taskUrl
$env:DATABASE_URL_UNPOOLED=$taskUrl
$env:TEST_DATABASE_URL=$taskUrl
```

No connection string/password/token value is included in this report.

| Command | Exit / actual result |
|---|---|
| `pnpm.cmd --config.verifyDepsBeforeRun=false lint` | **0**, zero warnings; run after final production/test-label changes |
| **mirror:** `pnpm.cmd --config.verifyDepsBeforeRun=false typecheck` | **0**, Next route types + strict TypeScript; final synchronized src/tests |
| **mirror:** `pnpm.cmd --config.verifyDepsBeforeRun=false build` | **0**, compiled944ms, TypeScript5.7s; eight dynamic routes, including `/` and `/months` |
| `node --conditions=react-server --import tsx scripts/db-migrate.ts` (twice) | **0 / 0**, existing migration chain applied/reapplied to isolated parent DB |
| `pnpm.cmd --config.verifyDepsBeforeRun=false exec vitest run --config vitest.integration.config.ts tests/integration/auth.test.ts tests/integration/budget-projection.test.ts` | **0**, targeted **29/29**, 22.88s |
| `node scripts/check-finance-coverage.mjs init $r` | **0**, new run context; previous reports were not copied/reused |
| `$env:TZ='UTC'; pnpm.cmd --config.verifyDepsBeforeRun=false test --reporter=default --reporter=json --outputFile.json="$r/unit.json"` | **0**, **781/781**, 32 files, 10.92s; includes **52 new unit/component cases** and all 84 existing checker cases |
| `$env:TZ='UTC'; node scripts/check-finance-coverage.mjs record $r unit` | **0**, current-run report receipt |
| `pnpm.cmd --config.verifyDepsBeforeRun=false test:integration --reporter=default --reporter=json --outputFile.json="$r/integration.json"` | **0**, **304/304**, eight files, 107.88s; two additional PG cases plus extended nonempty report no-write assertions |
| `node scripts/check-finance-coverage.mjs record $r integration` | **0**, current-run report receipt |
| `$env:TZ='America/Los_Angeles'; node scripts/check-finance-coverage.mjs timezone $r` | **0**, unchanged 14-file subset **509/509**, 5.98s |
| `$env:TZ='America/Los_Angeles'; node scripts/check-finance-coverage.mjs record $r timezone` | **0**, current-run report receipt |
| `node scripts/check-finance-coverage.mjs check $r` | **0**, **498 scenarios / 680 obligations / 951 references**, dispositions442/54/2; U781/P304/Z509 and exact UTC/LA identity parity |
| `$env:TZ='America/Los_Angeles'; pnpm.cmd --config.verifyDepsBeforeRun=false exec vitest run tests/dashboard-presentation.test.ts tests/dashboard.test.tsx` | **0**, **40/40**, 7.76s; additional UI/format/calendar subset, not added to full-unit totals |
| `pnpm.cmd --config.verifyDepsBeforeRun=false test:integration -t DB17` | **0**, **2 passed / 302 intentionally filtered**, 7.90s |
| `git diff --check` | **0**; new untracked files also checked explicitly below |
| `git diff --exit-code main -- src/domain src/infrastructure/db drizzle docs/TASKS.md docs/ARCHITECTURE.md docs/architecture.json docs/DATA_MODEL.md .github package.json pnpm-lock.yaml` | **0**, protected scope unchanged |

The existing 27,000-state sweep remains one Vitest case. LA/full/targeted runs
overlap and must not be added together. Deliberate `HB015_GATE_REJECTED` outputs
inside checker negative tests and fixed `AUTH_REQUEST_FAILED` messages inside auth
negative tests are expected; all required final assertions passed.

Intermediate failures were not hidden or relabelled as PASS: the initial two test
suites refused missing not-yet-created modules; new UI fixtures initially had
inconsistent H/asOf dates and whitespace expectations; a shell pipe initially
damaged new translation Unicode (rewritten via UTF-8-safe file edits). Initial
mirror typegen hit the existing sandbox SWC native-cache restriction; elevated
mirror execution then exposed real wire-brand/mock type errors, which were fixed.
One temporary QA seed incorrectly treated commitBatch's receipt as Result and was
replaced with a fresh isolated QA child DB; it did not change production code.
Browser harness focus/selector mistakes were corrected. Real browser geometry
found the year input's 40px height; it is now44px and was rechecked. The first
full gate refused the function-source identities described above; entirely fresh
U/P/Z reports in **final-r1** then passed the unchanged checker.

## Browser and accessibility QA

In-app Node REPL/browser execution was unavailable after tool discovery. Used an
installed, separate headless **Chrome/155.0.8059.85** with a temporary profile and
DevTools on127.0.0.1, against the **real production build** at localhost:3016.
No browser dependency or test route/auth bypass was added to the repository.

Test setup bound a synthetic local identity, seeded financial facts through existing
writers and encrypted a test cookie with a private synthetic key using the existing
Auth.js JWT encoder (same pattern as auth-routes tests). Runtime production guards,
JWT identity revalidation, ownership SQL and projection repository remained active.
This verifies an authenticated synthetic session, **not Google's provider exchange**.

Final external harness execution, from mirror:

```powershell
node qa-baseline.mjs before
node ../browser-qa.mjs
node qa-baseline.mjs after
```

All returned **exit0**: **30 browser checks, zero runtime exceptions**; full hashed
row snapshots of **all20 public tables** were identical before/after. Native locale
and logout Server Actions produced POST `/`; financial navigation remained reads.
No financial action or provisioning endpoint was added.

Actually verified:

- Anonymous explicit-month redirect; real authenticated current dashboard;
  current/future/past scopes and text; Next period links, reload, Back, Forward,
  actual year/month picker and current-month return.
- RU/DE/EN via real locale Server Actions; real light/dark/system selection and
  live system light/dark media changes; mobile Drawer Escape/focus and keyboard skip.
- 320/375/768/1280 CSS-pixel widths with no horizontal page overflow and every
  measured main interactive hit target >=44px after correction. DE light320 and
  dark/current screenshots were inspected visually. A synthetic MAX_INT64 bank
  checkpoint verified wrapping of very large exact amounts without clipping.
- Reduced-motion preference and desktop reflow at320 CSS pixels. Existing MUI
  initialization + component hydration tests had no recoverable hydration errors.
- Actual logout then direct protected future-month navigation denied access.
  Observed document responses had `private, no-cache, no-store, max-age=0,
  must-revalidate`; no shared/static financial document caching was observed.
- Arithmetic contrast check of existing primary/secondary text and primary-link
  colors on background/paper in both palettes:12 combinations, minimum **5.23:1**.
  This covers the reused financial text palette, not a complete accessibility audit.

External evidence: `$e\browser-results.json`, `$e\qa-320.png`, `qa-375.png`,
`qa-768.png`, `qa-1280.png`, `qa-de-light-320.png`. Images contain synthetic values
only. MIN_INT64/negative-cent rendering is proven by exact unit/component fixtures;
SQL was not weakened to persist an unsupported negative bank observation.

**Limits:** no native browser200%/400% zoom or screen-reader audit, automated axe,
real mobile hardware, Safari/Firefox, actual Google OAuth, Vercel/production or
remote GitHub Actions/branch protection verification. A320px viewport demonstrates
reflow but is not claimed to execute native400% zoom. D06's remaining manual QA
subcases remain explicit. Playwright/axe dependencies and fake green E2E commands
were not introduced. All26 scenario IDs have assertion/QA mapping; this does not
turn unperformed manual subcases into PASS.

## Final review, archive and stop

Self-review checked auth before reads, owner/account separation, bounded discovery,
one financial snapshot per view, sanitized client props/errors, exact cents/date
formatting, noncurrent semantics and absence of financial controls/writes. Original
AppShell/theme/auth policy/financial repository and import boundaries are retained.
The approved plan remains unchanged; no new product decision was assumed.

Archive deliverables are stored outside the repository at `$e`:
`hb-016-review.zip`, `changed-files.txt`, `changed-files.sha256`,
`hb-016-review.zip.sha256`. ZIP entries are the complete changed/untracked task
files relative to main (including the pre-existing approved plan), with repository
relative paths. It excludes `.git`, `.vscode`, env files, dependencies/builds,
private synthetic credentials/session/profile and raw test reports. The archive is
created after this report is finalized; its SHA-256 and exact file list are external
to avoid a self-referential archive hash.

Final checks include local Markdown links/whitespace on new documents, structural
proof that manifest changes are exactly ten names, preservation SHA baselines,
empty staged diff and branch/status inspection. Runtime evidence stays in the
temporary evidence directory. The dedicated browser/server/container are stopped;
only task-owned temporary verification/profile/credential resources are removed,
preserving review artifacts and reports.

**Stop for independent ChatGPT implementation review and subsequent owner acceptance.
HB-016 remains Planned in TASKS; no Done or publication action is authorized here.**

## Recorded final Git status

`git status --short --branch --untracked-files=all` (no staged changes):

```text
## feat/hb-016-dashboard-period-switch
 M src/app/months/page.tsx
 M src/app/page.tsx
 M src/infrastructure/auth/repository.ts
 M src/shared/i18n/messages/de.json
 M src/shared/i18n/messages/en.json
 M src/shared/i18n/messages/ru.json
 M tests/auth-boundaries.test.ts
 M tests/auth-config.test.ts
 M tests/finance/coverage.json
 M tests/i18n.test.ts
 M tests/integration/auth.test.ts
 M tests/integration/budget-projection.test.ts
?? docs/planning/hb-016-dashboard-period-switch.md
?? docs/planning/hb-016-verification.md
?? src/app/dashboard-account-boundary.ts
?? src/app/dashboard-loader.ts
?? src/app/loading.tsx
?? src/app/months/loading.tsx
?? src/features/dashboard/dashboard-screen.tsx
?? src/features/dashboard/format-money.ts
?? src/features/dashboard/period-navigation.tsx
?? src/features/dashboard/presentation.ts
?? tests/dashboard-boundary.test.ts
?? tests/dashboard-presentation.test.ts
?? tests/dashboard.test.tsx
?? tests/scenarios/phase-01/hb-016-dashboard-period-switch.md
```
