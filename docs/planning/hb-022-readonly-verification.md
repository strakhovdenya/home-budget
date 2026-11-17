# HB-022 reduced read-only analytics — verification, 2026-11-16

**BLOCKED / REVIEW. Not Done, not independently approved, not Owner Accepted.** D61 authorizes the reduced P1→P4 implementation. New read-only source/UI and tests exist locally. The final unchanged shell regression has four failures: `tests/shell.test.tsx:66` expects six navigation links in RU/DE/EN and `:135` expects six mobile links; the explicitly authorized Analytics navigation produces seven. No old assertion, navigation role, or visibility was altered to conceal the discrepancy. This is a regression-gate conflict, not evidence of incorrect financial arithmetic. Continuing to a green unchanged suite would require removing the authorized menu item or changing protected tests; neither was done. Implementation stopped at that boundary. All changes are uncommitted for review.

## Baseline and preservation

- Branch `feat/hb-022-p1-feasibility`; HEAD `3f166c100715cd5ac6c23d2ed6ab88f8c94a21f7`; index unchanged. Initial 13 dirty files and 740 original file hashes are in `evidence/baseline.json` in the ZIP. Full copies of the initial dirty files are in `baseline-before/`.
- The final preservation check found exactly nine changed baseline files: DECISIONS, TASKS, the analytics plan, the previous P1 report, shell sections/icon and the three locales. No other baseline source/test/configuration/schema/skill file changed. All old tests, including both feasibility files, retain their original hashes. The seven unrelated dirty documents retain their exact initial bytes. D59/D60 and every original line of the old P1 report remain in order; B01 and 57/111 query measurements remain historical evidence.
- TASKS differences are confined to the HB-022 entry. Every pre-existing locale value is unchanged after removing the added analytics keys. The plan removes active promises for the excluded chronology; its original dirty version is included for comparison. Original files were never restored from archive reconstructions.
- No commit, push, issue/PR, merge, deployment, cloud access, financial production data, real OAuth or `.env` access was performed for this implementation. No new dependency, architecture manifest, schema, financial writer, existing reader/verifier/selector or existing test was changed.

## Implemented contract and source of shown values

New files are confined to `src/domain/analytics`, `src/features/analytics`, `src/app/analytics`, `src/infrastructure/db/analytics-reader.ts` and four new test files. Existing changes are the permitted navigation/icon/locales and documentation.

`/analytics` is a dynamic owner-protected page. Three private Server Actions expose open, continuation and metadata choices. There is no financial query-string contract or new write action. Request bodies are bounded descriptor-copied and exactly validated before asynchronous account discovery/ownership checks. Existing `requirePageOwner`, account resolution and `requireOwnedAccount` are reused unchanged. Each reader operation runs in its own scoped `REPEATABLE READ READ ONLY` transaction, with a local 10-second statement timeout and existing-account advisory try-lock. The reader has no DML/DDL statements.

The schema-versioned basis includes account, captured index anchor/cut, chosen state anchor/cut, calendar H, Berlin today/capture timestamp, and optional immutable report ID/batch/version/digest. Continuations revalidate owned anchors and the same cut. Cursors bind to basis/view/filters/comparison and must be members of the complete sorted result. Explicit refresh opens a new basis; ordinary tab/filter/page changes retain it. Choices return 20 retained update metadata entries with optional report references; opening a report performs its proof and pins the digest rather than treating metadata as proof.

| Displayed fact | Source/proof and limitation |
|---|---|
| Actual bank checks, dates, integer cents | Ordinary existing `readProjectionContext`; full lineage resolution at K before H/range. New read-layer typed bank/vector/order audit-field validation follows existing history-detail evidence fields. Only saved observations become points; no interpolated days or connecting balance lines. |
| Difference of two selected checks | Existing reconciliation over the chosen eligible pair, including nonadjacent checks. Only net difference is shown; confirmed movement evidence is `NOT_AVAILABLE`, known/unexplained amounts remain null. No income/expense claim. |
| A, R, S, signed F | Existing projection/period-budget and reserve selectors, unchanged. A/F are null before an observation, while known R/S can still be shown. Observed zero is a number, future reserves and negative F remain explicit. No copied financial formula or historical daily-limit series. |
| Immutable report/endBalance | Existing owned-report/original-report validation and `ClosingReadBudget`, with version/digest pinned. Its context is distinct from ordinary daily context. Report end balance and real bank-check date/balance are separately labelled; report points are not presented as a daily series. |
| Origin → funding groups/identities | Complete selected UNPAID/full-reserve identities at H/K; checked integer grouping reconciles U[p] with the existing R[p] before filtering/paging. Full/filtered totals and identity counts remain distinct from visible page contents. Historical title, revision, original/outstanding, status, reserve and origin/funding are available. |

The three tabs are Checkpoints/Months/Funding with RU/DE/EN strings, MUI theme use, desktop tables/mobile cards and equivalent values for SVG charts. Comparison/date-range/metadata selectors are read-only. Generation tokens, serialized requests and echoed basis/filter validation reject stale or mismatched results. Errors suppress the result body and permit read-only retry. No confirmed-transfer chronology, action-date filter, confirmation summary/export or replacement block was implemented.

## Resource evidence

The new reader performs whole-source aggregate admission before materialization; existing projection guards remain unchanged. Limits include 20,000 rows, 8 MiB source bytes, 1,200 owned periods, W² ≤ 4,000,000, at most 12 calendar months, 100 checkpoint points/page, 20 identities/page, 20 metadata choices/page and a 1 MiB response. A conservative additional cumulative work model accounts for day/index/vector/lifecycle/canonical traversal; it is an admission model, not a measured universal CPU guarantee. Source aggregate scans and the subsequent projection preflight are real repeated database work and are not counted as one query. A 10-second statement limit remains a separate bound.

The 101-point fixture measured **45 SQL statements for both the first full page and the last page**. It continued returning the original 101 points after an independent fixture appended K+1; refresh returned 102. This proves no per-point SOURCE-query fan-out for that exercised daily case, not every possible report/resource shape. The 24-identity HB22-17 fixture returned 20+4, full total100020/count24, and origin/funding/both subtotals30010/60010/20005 with counts12/12/6. Whole-set totals/groups stayed invariant across pages. Resource negatives rejected before partial output: >20,000 rows, W>2,000, >8 MiB; 1,200 periods accepted and 1,201 rejected.

## Commands and actual outcomes

Installed tools: Vitest5.0.5; existing Playwright1.65.0. Commands ran from repository root, using existing installed dependencies. JSON reports and captured final stdout are in ZIP `evidence/`. `--maxWorkers=2` was used for unit/regression, `--maxWorkers=1` for the integration file. Commands did not load real environment files.

```text
node node_modules/vitest/vitest.mjs run tests/analytics-read-contract.test.ts tests/analytics-read-actions.test.ts tests/analytics-read-ui.test.tsx --maxWorkers=2 --reporter=default --reporter=json --outputFile=tmp/hb22-readonly-review/final-new-unit.json
```

Exit0, **12/12 passed** (contract4, actions1, UI7). UI tests cover three locales, real dots/dates/net comparison, wrong-basis rejection, signed deficit, full/filter identity disclosure, initial error/retry. These are jsdom checks; they do not prove responsive browser layout.

```text
node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts tests/integration/analytics-read.test.ts --maxWorkers=1 --reporter=default --reporter=json --outputFile=tmp/hb22-readonly-review/final-pg.json
```

Exit0, **11/11 passed**. Explicit synthetic environment: `HB_TEST_DATABASE_TARGET=disposable-local-container`, `HB_DATABASE_TARGET=isolated-development`; all DB URL variables targeted owned localhost PostgreSQL port55695/base database `hb22_readonly`. Credentials are synthetic and omitted from this report. Each test setup created a unique disposable child database and separate SELECT-only login; setup used existing public fixture/writer mechanisms. The intentional corruption/resource-negative fixtures used privileged synthetic setup only. All 20 public tables were compared before/after successful open/read/page/filter/error/refresh operations. Coverage includes ownership failure, unknown/zero, full funding reconciliation, >100 points, same-day equal balances, nonadjacent D, pinned K+1, correction before range, invalid displayed source, immutable reportv1/v2, later FRESH_START, older state reachability, future reserves/deficit and resource refusal. The test suite itself dropped child databases/roles. The owned base container and network were removed after successful final tests, following exact-ID and label validation; no task-labelled resources remained.

```text
node node_modules/vitest/vitest.mjs run tests/analytics-feasibility.test.ts tests/checkpoints.test.ts tests/forecast.test.ts tests/forecast-oracles.test.ts tests/forecast-boundary.test.ts tests/obligations.test.ts tests/savings.test.ts --maxWorkers=2 --reporter=default --reporter=json --outputFile=tmp/hb22-readonly-review/final-finance-regression.json
```

Exit0, **211/211 unchanged finance/previous-feasibility regressions passed**, including the existing exhaustive27000-state forecast case.

```text
node node_modules/vitest/vitest.mjs run tests/analytics-read-contract.test.ts tests/analytics-read-actions.test.ts tests/analytics-read-ui.test.tsx tests/shell.test.tsx tests/architecture.test.ts --maxWorkers=2 --reporter=default --reporter=json --outputFile=tmp/hb22-readonly-review/final-unit-regression.json
```

Exit1, **30 passed /4 failed**. Architecture passed. All four failures are the protected shell link-count assertions described above; they are retained as failures, not skipped or relabelled as passing. No full-suite PASS is claimed.

```text
node --max-old-space-size=4096 node_modules/typescript/bin/tsc -p tmp/hb22-readonly-review/tsconfig.json --pretty false
node node_modules/eslint/bin/eslint.js src/domain/analytics src/features/analytics src/app/analytics src/infrastructure/db/analytics-reader.ts src/features/shell/sections.ts src/features/shell/section-icon.tsx tests/analytics-read-actions.test.ts tests/analytics-read-contract.test.ts tests/analytics-read-ui.test.tsx tests/integration/analytics-read.test.ts
```

Both final exits0. This is a **scoped strict typecheck**, including all new TS/TSX test files and their imported graph, using an ignored temporary config extending the unchanged project config. It is not a full-project typecheck/build. Initial inclusion of UI tests revealed a widened mock boolean and unsupported Testing Library `exact` options; only the newly created test file was corrected, preserving assertions. The failed output is retained as `typecheck-ui-first-failed.log`. Earlier new-fixture failures and filtered/skipped runs are preserved in their original JSONs and do not inflate final totals. No old tests were repaired.

Code-simplifier review was applied only to new/directly edited hunks. Contracts, ownership/error control flow, side effects and original protected tests were checked; no neighboring cleanup or global formatting was performed. Dense declarations/long JSX and reader proof/resource accounting still warrant independent readability/correctness review. This self-review is not independent approval.

## Not executed / remaining gates

- **Actual analytics browser flows, screenshots, 320/375/1280 widths, light/dark/system matrix and browser keyboard/ARIA: NOT EXECUTED.** Tool discovery found no browser Node REPL; an existing Docker Playwright image successfully launched Chromium158.0.8127.18 and fetched an owned loopback marker. That availability probe is not analytics/UI verification. Further implementation/browser setup stopped at the protected regression conflict.
- Native browser zoom200%, genuine OAuth, production/provider environments, full integration suite, complete unit suite, full-project typecheck and production build: **NOT EXECUTED**. No contrary PASS is implied by the targeted checks.
- Additional adversarial/report resource shapes and an independent audit of the cumulative work model remain review items; exercised tests do not establish universal proof.
- Independent review and Owner Acceptance: **NOT EXECUTED**. P2–P4 final responsive/accessibility gates are unproven. HB-022 stays **BLOCKED / REVIEW**, not Done.

The owner/reviewer can resolve the navigation-test scope conflict explicitly. No test alteration or financial change is proposed as an automatic follow-up. Review ZIP contains complete changed/new files, initial dirty context, tracked patch, per-file hashes and actual evidence. ZIP SHA-256 is supplied separately to avoid a self-reference.

## Implementation correction and verification — owner request, 2026-11-17

**Current status: REVIEW; corrections A–D implemented locally. Not Done, not independently approved, not Owner Accepted.** The owner explicitly authorized updating the four menu expectations. This resolves the old protected-test blocker described above; the historical failures and the preceding report remain unchanged. No commit, push, PR, merge or deployment was performed.

### Scope and preservation

The continuation started on `feat/hb-022-p1-feasibility`, HEAD `3f166c100715cd5ac6c23d2ed6ab88f8c94a21f7`, with the existing dirty implementation and hook tooling. A new baseline recorded SHA-256 for 825 tracked/non-ignored untracked files before edits. Exact copies of the five files planned for correction are retained under `tmp/hb22-correction-review/before/`; the session hook independently retained the initial TS/TSX baseline. This is a continuation, not a reconstruction from the old ZIP.

| File changed in this continuation | Purpose |
|---|---|
| `tests/shell.test.tsx` | Only the RU/DE/EN parameterized navigation case and mobile case: expect seven links and assert the localized Analytics link targets `/analytics`. All prior assertions remain. |
| `src/features/analytics/charts.tsx` | Group coincident rendered coordinates into separately painted arc segments at the unchanged center. Each check retains its own ID, focusable button, Enter/Space handler and a distinct ordinal label. No invented timestamp, changed financial value or connecting series line. Nearby values that quantize to one pixel coordinate also receive independent arcs. |
| `src/features/analytics/analytics-screen.tsx` | Starting a new selection clears the previous page/current basis and obsolete knowledge options. Retry retains the originally requested selection even with no visible page; initial-load retry still opens the default selection. Existing serialization, generation checks and response validation remain. |
| `tests/analytics-corrections-ui.test.tsx` (new) | Three tests: coincident targets/handlers, returned storage error on changed H/K, and thrown storage error on changed H/K. Both failure cases select a different saved knowledge anchor and date, assert the old balance disappears, and verify retry uses the identical request and renders UNKNOWN when appropriate. |
| `docs/planning/hb-022-analytics.md` | Remove the residual confirmed-transfer promise from goal 3; historical state, H/K and origin→funding checks remain. |
| This report | Append current evidence and limitations while retaining previous facts, failures and decisions. |

The final preservation receipt compares all 825 initial hashes and admits only these five previously existing files, plus the one new test. All other initial files retain their bytes, including financial formulas, selectors, commands, writers, existing readers/verifiers, `originalEvidence`, schema/migrations, architecture, dependencies, hook tooling/skills and every other old test. Initial unrelated dirty work remains. The index/HEAD are unchanged. No real bank data, OAuth, Neon, production connection or real environment file was used.

### Actual hooks and skill loading

This fresh IDE session received **both complete SKILL.md contents** through native SessionStart additional context, not just filenames. The local receipt is `tmp/codex-quality/dc37abb444b3925e6a1796a8d3deb85b0ea2e53f4d93f6741675b5709936690e/skills.json`. Its hashes match both the injected context and current file bytes:

- clean-code-ts-react: `0d2e46b140b32b198a9bfbd68eb2d29bbbecdf83cd1dd7158ec3ae272c87da43`
- code-simplifier: `9247f7cac9cd368b821ec5c1b43d65c90afc069a74b2619f60e6d31a21a44eec`

Native PreToolUse reminders and PostToolUse receipts occurred throughout the actual work. Before edits the result was `NOT_APPLICABLE`, not PASS. After edits the changed-code gate reports **PASS, four TS/TSX files**, scoped against this session's original dirty baseline. The complete skills and receipts were not modified or re-baselined. No trust bypass or hook configuration change was used.

The **Stop handler was explicitly executed on the actual session ID and original baseline**, with `stop_hook_active:false`, and produced PASS for the same four files. Its receipt and invocation method are saved separately. This verifies the actual handler/gate execution; it is **not a claim that the native end-of-turn Stop event had already occurred** while this report was being written. That lifecycle event runs when the turn ends and cannot be pre-certified here. SessionStart/PreToolUse/PostToolUse were directly observed in this IDE conversation; native Stop at final completion is still pending at report preparation. The mechanical gate does not execute TypeScript, tests or subjective review.

Both required skills were applied to this continuation's new/directly edited TS/TSX hunks only. The final code-simplifier self-review checked intent-revealing names, explicit guards, unchanged side-effect order outside the authorized state reset, request retry/serialization, unchanged money/date coordinates, and the two permitted old-test hunks. No helper layer, neighboring cleanup, protected-test rewrite or automatic formatter/fix was introduced. This subjective self-review is separate from the mechanical PASS and is not independent approval. Project React guidance was also consulted for this UI correction.

### Executed commands and results

All commands used installed dependencies. Machine-readable evidence is under `tmp/hb22-correction-review/`. The initial three new UI tests failed against the old implementation (`red-ui.json`), reproducing both stale balance paths and indistinguishable coincident labels. `green-ui-first.json` retains the intermediate failures: jsdom did not focus SVG elements, and clearing the page exposed the retry/default-selection issue. Keyboard handlers are now unit-tested directly; real focus/Tab/hit testing was separately executed in Chromium. An initial temporary TypeScript config-generation command failed on an existing BOM; the corrected explicit config and final results are retained. These failures are not counted as passes.

```text
node node_modules/vitest/vitest.mjs run tests/analytics-corrections-ui.test.tsx tests/analytics-read-contract.test.ts tests/analytics-read-actions.test.ts tests/analytics-read-ui.test.tsx tests/analytics-feasibility.test.ts tests/shell.test.tsx tests/architecture.test.ts --maxWorkers=2 --reporter=default --reporter=json --outputFile=tmp/hb22-correction-review/unit-final.json
```

**PASS, exit 0: 41/41, seven files, no skipped tests.** Includes all 19 HB-022 unit/UI/feasibility tests, all 21 shell tests (including the four authorized menu cases), and architecture. The final H/K tests select a historical K and H and exercise both returned and thrown errors. Existing wrong-basis rejection and initial retry tests remain unchanged and pass.

```text
node node_modules/vitest/vitest.mjs run tests/checkpoints.test.ts tests/forecast.test.ts tests/forecast-oracles.test.ts tests/forecast-boundary.test.ts tests/obligations.test.ts tests/savings.test.ts --maxWorkers=2 --reporter=default --reporter=json --outputFile=tmp/hb22-correction-review/finance.json
```

**PASS, exit 0: 207/207, six unchanged financial test files, no skipped tests.** Includes the exhaustive 27,000-state forecast case. Together with the four unchanged feasibility tests above, this repeats the earlier 211-test finance/feasibility coverage without changing its sources.

```text
node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts tests/integration/analytics-read.test.ts tests/integration/analytics-feasibility.test.ts --maxWorkers=1 --reporter=default --reporter=json --outputFile=tmp/hb22-correction-review/pg.json
```

**PASS, exit 0: 12/12, two unchanged integration files, no skipped tests.** A newly created PostgreSQL18 container used only synthetic credentials/data, explicit loopback port57911/base database `hb22_correction`, `HB_TEST_DATABASE_TARGET=disposable-local-container`, `HB_DATABASE_TARGET=isolated-development`, and all three URL variables explicitly set to that owned database. The read-only suite created a SELECT-only role, compared all 20 public tables, and exercised pinned K, same-day equal checks, paging/funding/filter/resource/report/error cases. The 101-point case again measured 45 SQL statements on each page; the old P1 diagnostic remains 57/111. No production financial code or fixture source was changed. Read-suite child databases were cleaned up by the suite; the feasibility reader role remained inside the disposable container until teardown. Exact ID and task label were validated before removing the owned container and its anonymous volumes. No task-labelled containers remain (`cleanup.json`). Foreign containers were not modified.

```text
node --max-old-space-size=4096 node_modules/typescript/bin/tsc -p tmp/hb22-correction-review/tsconfig.json --pretty false
node node_modules/eslint/bin/eslint.js src/domain/analytics src/features/analytics src/app/analytics src/infrastructure/db/analytics-reader.ts src/features/shell/sections.ts src/features/shell/section-icon.tsx tests/analytics-corrections-ui.test.tsx tests/shell.test.tsx tests/analytics-read-actions.test.ts tests/analytics-read-contract.test.ts tests/analytics-read-ui.test.tsx tests/analytics-feasibility.test.ts tests/integration/analytics-read.test.ts tests/integration/analytics-feasibility.test.ts --max-warnings=0
```

**Scoped strict TypeScript: PASS, exit 0. Scoped ESLint: PASS, exit 0, zero warnings.** The temporary type configuration extends the unchanged project config and includes the analytics graph, both feasibility tests, the new correction test and shell test. This is not a full-project typecheck/build. Final source tests and checker results are recorded separately from hook receipts.

### Real browser evidence and its boundary

Discovery found no Node REPL `js` tool for the in-app browser. The fallback used the existing local Playwright1.65.0/Chromium158.0.8127.18 Docker image with `--pull=never`. A temporary loopback Vite harness served the **actual production AnalyticsScreen, CheckDots, i18n catalogs and MUI theme**, with bounded synthetic async action responses. No application source/config/dependency or auth bypass was added to create the harness. External page requests were blocked. Harness controls are test scaffolding, not product UI.

**PASS: 27/27 real Chromium component scenarios** = 320/375/1280 px × RU/DE/EN × light/dark/system. System mode used emulated dark OS preference. Each scenario verified localized heading, independent actual SVG paint hit tests for both equal-date/equal-balance checks, the compared IDs, Enter/Tab/Space, keyboard arrow/Enter tab selection, tabpanel ARIA linkage, all three tabs, read error/retry, failed H selection with disappearance of the old balance, identical-selection retry, and no horizontal page overflow or page errors. New K selection/error is covered by the UI unit tests; the browser harness tests H with the retained K. Screenshots for all 27 combinations and `browser/browser.json` are retained. Mobile EN/light and desktop DE/dark screenshots were visually inspected.

The first browser attempt failed because the hit test was outside the viewport; the second failed because an exact text locator included the Retry button text. Both harness failures, screenshots and JSONs are retained. The final run scrolls to the actual SVG and locates the alert by role/text; neither fix changed product behavior. The Vite server and owned browser container were stopped after execution.

**NOT EXECUTED:** complete Next.js route → Server Action → PostgreSQL browser flow, production build, full-project TypeScript/full test suites, native browser zoom200%, live OS theme switching, screen-reader/complete automated accessibility audit, real OAuth/provider environments. The browser component matrix is not represented as a Next/auth/DB transport PASS; PostgreSQL and Server Action behavior were exercised separately by the integration/unit suites above.

### Remaining review items and handoff

- The protected menu conflict is resolved by explicit owner authorization. Financial and all other protected-test boundaries remain intact.
- Visual inspection found pre-existing large vertical spaces in mobile date filters and low-contrast SVG tick/period labels in dark mode. They were not part of corrections A–D and remain unchanged for owner/reviewer assessment. Dense coincident clusters beyond the exercised pair still need usability review; exact-value tables/cards remain available.
- End-to-end Next/auth/DB browser transport and independent review are unproven. Native end-of-turn Stop observation cannot be certified before completion; the explicit Stop-handler PASS is labelled as such.
- Existing report/resource-proof review questions above remain open. No universal correctness, full WCAG compliance, Owner Acceptance or release approval is claimed.

The handoff ZIP supplies full current changed/new repository files, a correction-only patch against this continuation's baseline, the old review ZIP as historical evidence, new success/failure receipts, browser scripts/screenshots, baseline hashes and a SHA-256 manifest. Raw session source snapshots, real user profile/config, `.env`, dependencies and database exports are excluded. HB-022 remains **REVIEW**, with owner and independent review outstanding.

## Final mobile date-filter correction — owner request, 2026-11-17

**REVIEW: the remaining Medium mobile-filter finding is corrected locally and verified. Not Done, not Owner Accepted, not independently approved.** This continuation preserves the previous implementation, correction A–D and every preceding report paragraph. No commit, push, PR, merge or deployment.

### Narrow change and preservation

- `src/features/analytics/analytics-screen.tsx`: only the shared filter TextField's `sx.flex` changed from `'1 1 160px'` to `{ xs: '0 0 auto', sm: '1 1 160px' }`. The mobile column therefore uses natural field height, while the desktop row retains the original flex shorthand. The Stack's direction, spacing/gap and all neighboring code remain unchanged. The same shared field styling also removes stretching from optional origin/funding controls.
- New `tests/analytics-mobile-filters-ui.test.tsx`: nine cases, RU/DE/EN × Checkpoints/Months/Funding. They check the base mobile natural flex sizing for all two/four controls and exercise selecting/applying dates with the same basis, filters and query contract. jsdom assertions are explicitly limited to base computed CSS/handlers; they do not claim browser geometry.
- This report: append-only evidence. Temporary scripts, screenshots, receipts and packaging files are isolated under ignored `tmp/hb22-mobile-review/`.

Before work, SHA-256 was captured for 826 tracked/non-ignored untracked files on `feat/hb-022-p1-feasibility`, HEAD `3f166c100715cd5ac6c23d2ed6ab88f8c94a21f7`. Final preservation admits only the two existing files above (screen/report) and the new test; all 824 other initial files remain byte-identical. Every existing test, including the previously corrected shell/menu tests and earlier HB-022 UI tests, is unchanged. Financial engine/formulas/selectors/commands/writers/readers/evidence/schema, H/K, event handlers, filter values/contracts, dependencies, architecture, hooks/skills, HEAD/index and unrelated dirty work are preserved. The old report bytes remain an exact prefix of the updated report. No database/environment/OAuth/production access was needed for this CSS-only change.

### Actual verification

| Check | Current result and evidence |
|---|---|
| New mobile UI tests | **PASS 9/9**, part of `ui-regression.json`. An initial new fixture incorrectly paired zero cuts with non-null anchors; that validation failure is retained in `red-ui.json`. After correcting only the new fixture, all nine cases failed specifically on the original `160px` flex basis (`red-layout.json`/log), then passed after the CSS fix. No existing test was edited. |
| Related UI/architecture regression | **PASS 41/41**, five files, zero skipped: new mobile9 + earlier corrections3 + analytics UI7 + unchanged shell21 + architecture1. Command below; JSON/log retained. |
| Scoped strict TypeScript | **PASS, exit0**: `node --max-old-space-size=4096 node_modules/typescript/bin/tsc -p tmp/hb22-mobile-review/tsconfig.json --pretty false`. Temporary config extends the project config and includes the analytics graph and relevant tests, including the new file; project config unchanged. |
| Scoped ESLint | **PASS, exit0, zero warnings**: `node node_modules/eslint/bin/eslint.js src/features/analytics/analytics-screen.tsx tests/analytics-mobile-filters-ui.test.tsx --max-warnings=0`. No `--fix`. |
| Actual Chromium UI matrix | **PASS 81/81**: 320/375/1280 px × RU/DE/EN × light/dark/system × three tabs. Browser158.0.8127.18, existing Playwright1.65.0, no image/dependency downloads. System mode resolves to emulated dark preference. `browser/after.json`, `browser-summary.json`, scripts and full-page screenshots retained. |
| Measured geometry | Before: mobile fields160px. After: every field48px in all 54 mobile cases; native inputs40px with normal 4px top/bottom MUI spacing, adjacent input gap32px. No horizontal page overflow. All 27 desktop cases passed; EN/light fieldset size, field sizes and relative positions match the before snapshot exactly on all three tabs at1280px. Nine before screenshots/measurements retained. |
| Date filtering in browser | Every after-case filled both date inputs, applied filters, checked retained input values and the emitted query's view, complete filters, H and K anchor/cut. Actual production handlers execute against synthetic async action responses; neither date semantics nor product handlers were changed. |
| Quality hooks/skills | Native PreToolUse/PostToolUse continue running; skill receipt hashes match the same complete skill texts loaded earlier in this conversation. Original hook baseline was not reset. Changed-code gate **PASS, five TS/TSX files since the original session baseline** (includes prior authorized corrections; this task changes only screen/new test). Explicit Stop-handler execution on that same actual session baseline also PASS; receipts retained. A native end-of-turn event for this final turn cannot be observed before ending it and is not claimed in advance. |

```text
node node_modules/vitest/vitest.mjs run tests/analytics-mobile-filters-ui.test.tsx tests/analytics-corrections-ui.test.tsx tests/analytics-read-ui.test.tsx tests/shell.test.tsx tests/architecture.test.ts --maxWorkers=2 --reporter=default --reporter=json --outputFile=tmp/hb22-mobile-review/ui-regression.json
```

Real Chromium used an owned loopback-only Vite harness serving the actual AnalyticsScreen, MUI and locale catalogs, with synthetic async actions. No Node REPL `js` browser tool was available; the already installed Docker Playwright image was used with `--pull=never`, and external page requests were blocked. The old harness/evidence were copied into a new ignored directory without changing their originals. All 81 final screenshots were saved. Visual inspection covered 320px RU light Funding/dark Checkpoints, 375px DE system Months and1280px EN light Funding. The first after-run's test threshold allowed only4px between the native input/root heights; before measurements demonstrated MUI's normal total8px spacing. Only that new harness assertion was corrected; its failure JSON/screenshot remain. The server was stopped and `--rm` removed the owned browser container.

Both required skills and project React guidance were applied within the authorized hunks. Final code-simplifier self-review confirmed one responsive style substitution, unchanged surrounding logic, no extra abstraction/refactor/formatting, and readable new test setup/cases. This is subjective self-review, separate from mechanical gate PASS and independent approval.

### Remaining NOT EXECUTED and handoff

**Native browser zoom200%: NOT EXECUTED.** The available headless surface has no browser-chrome/native zoom control; CSS zoom, deviceScaleFactor and pinch scaling were not substituted. Full Next.js route→Server Action→PostgreSQL browser transport, real OAuth, screen-reader/full accessibility audit, full-project build/typecheck and full financial/integration suites were not rerun for this CSS-only fix. Previous dated evidence remains historical evidence, not a fresh PASS. Current browser claims concern actual UI layout/handlers with synthetic responses only.

The mobile-filter Medium finding is ready for independent review. Other historical limitations are not erased or promoted to PASS. The review ZIP contains full current changed/new repository files (including preserved prior dirty work), a mobile-correction-only patch, exact before copies, the previous correction ZIP, new tests/evidence/screenshots and a SHA-256 manifest. Raw hook baseline source snapshots, real profile/config, `.env`, dependencies and database exports are excluded. HB-022 remains **REVIEW**, without automatic completion or Owner Acceptance.

## Owner Acceptance and Practical UI QA finalization — 2026-11-17

**Implementation: Done / Owner Accepted (D63). Release: BLOCKED before commit; not published.** In the owner's current in-chat attachment titled “HB-022 — OWNER ACCEPTANCE, QA POLICY, RELEASE”, the explicit decision is: **«Я, владелец проекта, подтверждаю полную приёмку HB-022 (Owner Acceptance).»** This exact owner decision, dated2026-11-17, is recorded in [D63](../DECISIONS.md#hb-022-owner-acceptance-and-gated-release--2026-11-17). No repeated acceptance is required for the same accepted limitations. TASKS now reflects Done as an accepted implementation; it does not imply a successful production release.

The owner's supplied review context reports independent **APPROVED for the final mobile CSS correction**. No independent whole-HB-022 review verdict was supplied or inferred. Earlier REVIEW/BLOCKED statements and the old protected-menu failures above remain historical facts. The owner has separately granted full task acceptance, which must not be attributed to the independent reviewer.

### Standing QA decision and accepted omissions

[D62](../DECISIONS.md#practical-ui-qa--owner-2026-11-17) and the Practical UI QA paragraph in `AGENTS.md` now route current/future work to ordinary desktop mouse and mobile touch QA: working controls/states/errors/retries, readable labels and exact financial information, no clipping/overlap/horizontal overflow, RU/DE/EN and light/dark. This changes future acceptance scope without removing working accessibility or any existing tests.

The owner consciously accepts the optional NOT EXECUTED/limitations presented in preflight: separate keyboard/ARIA matrices, screen readers/formal WCAG/physical AT, native zoom200%, live OS theme switching, extended optional browser/resource investigations and dense-cluster follow-up. These are **accepted omissions, not PASS**. Existing executions remain dated evidence. Full CI for the exact PR SHA, synthetic preview/staging proving frontend/auth/account isolation/read-only behavior, and confirmed production configuration/deployment safety remain mandatory and cannot be waived by this acceptance. Real unreadable labels remain defects under D62.

### Dark chart-label correction and fresh bounded evidence

The known dark-label problem was confirmed: the CSS-variable MUI theme's plain `theme.palette.text.primary` supplied the light palette value to native SVG text. Only the two MonthBars label `fill` attributes in `src/features/analytics/charts.tsx` changed to `currentColor`, inheriting the actual surrounding text color. No chart amount, date, coordinate, shape, input/query/state logic, schema, financial source or test was changed. Sizes/geometry remain unchanged; exact-value tables/cards remain available.

- **PASS 19/19 unchanged UI tests**, zero skipped: `node node_modules/vitest/vitest.mjs run tests/analytics-read-ui.test.tsx tests/analytics-corrections-ui.test.tsx tests/analytics-mobile-filters-ui.test.tsx --maxWorkers=2 --reporter=default --reporter=json --outputFile=tmp/hb22-owner-finalization/ui.json`.
- **PASS scoped TypeScript**, exit0: `node --max-old-space-size=4096 node_modules/typescript/bin/tsc -p tmp/hb22-mobile-review/tsconfig.json --pretty false`.
- **PASS scoped ESLint**, exit0/zero warnings: `node node_modules/eslint/bin/eslint.js src/features/analytics/charts.tsx --max-warnings=0`. No fix/formatter.
- **PASS 18/18 actual Chromium UI cases**: 320/375/1280 × RU/DE/EN × light/dark; emulated touch/tap at mobile widths and mouse/click at desktop. Both native SVG text fills resolve to the actual body text color, no horizontal overflow/page errors. Current synthetic screenshots/results/scripts are under `tmp/hb22-owner-finalization/browser/`; mobile375 RU/dark and desktop1280 EN/dark were visually inspected. This uses the real UI in an owned loopback Vite harness with synthetic async responses, not the required full Next/auth/DB preview/staging. The existing image was used with `--pull=never`, external page requests were blocked, and the owned browser/server were stopped.
- Native PreToolUse/PostToolUse continue running; both loaded skill hashes remain unchanged. The changed-code quality gate remains **PASS, five TS/TSX files against the original preserved session baseline**, including earlier authorized work. Both code-quality skills were applied to these two directly edited attributes; self-review found no neighboring refactor, new abstraction or side-effect change. No new code/test dependency or production configuration was added.

### Read-only release preflight and exact stopping gate

Local baseline: branch `feat/hb-022-p1-feasibility`, HEAD `3f166c100715cd5ac6c23d2ed6ab88f8c94a21f7`, empty index, no configured upstream; remote `https://github.com/strakhovdenya/home-budget.git`. This turn captured hashes for827 tracked/non-ignored untracked files and before-copies of the five authorized files. Only AGENTS, DECISIONS, TASKS, this append-only report and the two chart text attributes changed in this turn; all822 other initial files, all existing tests and the Finance manifest remain byte-identical. Prior dirty work and ignored `.vscode/`/environment files are preserved; no environment file or secret was read.

GitHub read-only API confirms the public `strakhovdenya/home-budget` repository/default branch `main`, squash merging allowed, `branches/main/protection` returns404 “Branch not protected”, and `rules/branches/main` returns an empty array. No protection/check configuration was changed.

Vercel read-only tools confirm the existing project **home-budget**, `prj_ohpNhJ8XcApFjBeEpONeoVyJFgRP`, owner team **Denya's projects**, `team_8CIxfH6pWMGHuoWC1zyr48pt` / `denyas-projects-c7c8aa39`, and Git link to `strakhovdenya/home-budget`. Verified domain: `home-budget-bice.vercel.app`. Existing older production deployment `dpl_6BWr6aN79g1vbQ5Dqqmiy6fYsdhK` is READY on old SHA `3f166c100715cd5ac6c23d2ed6ab88f8c94a21f7`; it is **not an HB-022 release**. The connected tools return reduced project/deployment metadata and did not expose the configured production branch, auto-domain assignment or required Deployment Checks; a Vercel CLI is not installed. Their safety is **UNVERIFIED**, not assumed from the Git link or the old READY deployment. No project, resource, secret, environment, DB, branch protection or deployment was created/changed.

Current official [GitHub branch protection guidance](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) and [Vercel Deployment Checks](https://vercel.com/docs/deployment-checks) were consulted. Required checks must be satisfied for the relevant source/build; checking old deployments or merely having a CI workflow is not evidence of enforced promotion safety. With current metadata, production-branch/auto-deploy/check configuration still needs read-only confirmation before any merge. It must not be changed as an inferred authorization.

**New concrete blocker: Finance Gate manifest FAIL — `NORMATIVE_CONTEXT_MISMATCH`.** The existing exported `validateManifest()` was executed read-only against the current repository documents. Stale `contexts[].sha256` entries in `tests/finance/coverage.json` reference exactly:

1. `docs/DECISIONS.md`
2. `docs/ARCHITECTURE.md`
3. `docs/DATA_MODEL.md`
4. `docs/TASKS.md`
5. `docs/IMPLEMENTATION_PLAN.md`

Evidence: `tmp/hb22-owner-finalization/finance-manifest-preflight.json`, exit1. The manifest/checker/scenario definitions/dispositions/assertions/bindings and existing financial tests were **not modified**. The current CI invokes this validation in `Initialize current-run finance evidence`, so the known mismatch prevents a green CI without the appropriate reviewed maintenance. A fresh PASS must not be forged/reused from previous runs.

**Stop before commit/push/PR.** The owner's latest request says to stop on a new blocker and forbids financial-test changes. The concrete next action requiring a separate narrow decision is updating **only these five normalized document hashes** in the existing Finance Gate manifest, with no change to scenarios, assertions, dispositions, references, tests or checker. It is not performed implicitly. Further mandatory gates remain: full local/CI lint/typecheck/unit/build/isolated PG and fresh finance evidence on the final source/PR SHA; full synthetic Next→Server Action→PostgreSQL preview/staging including auth/isolation/no-write; and confirmed production branch/auto-deploy/Deployment Checks. No component-harness result substitutes for these.

Current publication fields: **commit SHA NOT CREATED; PR NOT CREATED; exact-PR CI NOT EXECUTED; squash merge NOT EXECUTED; local main NOT UPDATED; HB-022 production deployment NOT CREATED; production smoke NOT EXECUTED; rollback NOT PERFORMED.** The old production deployment is only configuration/history evidence, not current success. Owner Acceptance and D62 remain valid while release is blocked; no repeated acceptance is requested.

## Publication preparation after explicit context-hash authorization — 2026-11-17

The owner answered **«да»** to the explicit request to update only five stale `contexts[].sha256` values in `tests/finance/coverage.json`, followed by commit/push/PR after successful checks. This resolves the manifest-maintenance authorization blocker in the preceding section. D63 full Owner Acceptance and D62 Practical UI QA remain valid; neither is requested again.

Exactly five existing hashes were replaced, for DECISIONS/ARCHITECTURE/DATA_MODEL/TASKS/IMPLEMENTATION_PLAN. A structural comparison restored those hashes in memory and proved the complete remaining manifest JSON identical. Scenario definitions/dispositions/assertions/test references/checker and all existing financial tests remain unchanged. The existing exported `validateManifest()` now passes. No new financial meaning, scenario waiver or claimed old receipt was introduced.

### Actual full local checks on the proposed publication source

Checks ran from `tmp/hb22-publication/checkout`, a separate copy of the proposed commit without `.env`/`.env.local`, inherited auth/cloud/DB variables or private data. Installed dependencies were reused. All three DB URLs explicitly targeted the newly owned PostgreSQL18 container's loopback port58570/base `hb22_publication`, with synthetic credentials and both local/disposable target markers. Temporary package-manager user/global config files were empty, network package downloads disabled, and Next telemetry disabled. Node22.23.0/pnpm12.16.1 were used locally; GitHub's configured Node24 execution for the future PR SHA remains separate.

The snapshot includes the reviewed DOC-HB22-01 dependency-acceptance addenda and HB-022 implementation/finalization. It excludes the separate uncommitted hooks tooling (`.codex/`, `scripts/codex-quality/`, `tests/tooling/`, CODE_QUALITY_HOOKS) and uses the unchanged HEAD ESLint config, matching the proposed PR. Those unrelated local tooling files remain preserved outside the commit. `.vscode/`, environment files, generated output, snapshots and raw evidence are not staged.

| Current check | Exact invocation / result |
|---|---|
| Full lint | `pnpm lint` — **PASS, exit0**, zero warnings. |
| Full typecheck | `pnpm typecheck` — **PASS, exit0**, Next route type generation plus project-wide strict TypeScript. |
| Unit UTC | `pnpm test --maxWorkers=2 --reporter=default --reporter=json --outputFile.json=<evidence>/unit.json`, `TZ=UTC` — **PASS1200/1200**, zero skipped/failed. |
| Production build | `pnpm build`, `NODE_ENV=production` — **PASS, exit0**, including dynamic `/analytics`; no real environment file or production connection. |
| Disposable migration/replay | `pnpm db:migrate` twice against only the owned local synthetic DB — both **PASS, exit0**. No migration source changed and no production migration is needed/run. |
| Full isolated PostgreSQL | `pnpm test:integration --maxWorkers=1 --reporter=default --reporter=json --outputFile.json=<evidence>/integration.json` — **PASS559/559**, zero skipped/failed. |
| America/Los_Angeles | Existing `check-finance-coverage.mjs timezone` command — **PASS552/552**, zero skipped/failed. |
| Separate DB17 | `pnpm test:integration -t DB17 --maxWorkers=1` — **PASS2/2 selected**. The557 intentionally unselected tests are skipped only in this targeted repeat; they all ran in the full559-test suite. |
| Fresh Finance Gate | Existing `init`, three `record`, timezone and final `check` steps — all **PASS, exit0**, on the actual snapshot fingerprint/current-run receipts. No old receipts were substituted. |

Machine-readable full results, fresh Finance receipts and per-command exit codes/timestamps are retained in `tmp/hb22-publication/finance/` and `checks.json`; logs in the same ignored evidence directory. The two-worker cap repeats the previously accepted local resource limit without changing assertions, fixtures or timeouts. Protected-context hashes are current; later doc/report-only addenda here are outside the normative context set. Mandatory GitHub CI must still run on the exact PR SHA.

### Full built Next.js → Server Actions → PostgreSQL synthetic staging

**PASS: four actual Chromium journeys and12 real Server Action POSTs**, using this production build, not Vite or action mocks. A separately created disposable child DB was migrated and provisioned using the existing reviewed offline fixture/writer seed. The application runtime used a separate SELECT-only login with `default_transaction_read_only=on`; setup credentials were not available to the app. Auth.js encrypted synthetic session cookies were generated offline in memory, with synthetic provider settings/allowlist only; no genuine Google/provider exchange, production tenant, Neon or cloud credential was used.

- Anonymous `/analytics` and a correctly encrypted foreign/unverified synthetic identity both redirected to login without private analytics.
- The admitted synthetic owner exercised all three real tabs and exact B/A/R/S/F values through desktop1280 mouse and mobile375 emulated touch. A foreign account ID in the URL did not change the owner's account or expose the sentinel.
- The browser then replaced the owned account ID with the foreign fixture ID inside an actual Server Action query. The server rejected it, the result panel disappeared, and Retry re-sent the original valid query successfully. There were no page errors or horizontal overflow.
- SHA-256 census over all20 public tables before/after all auth/read/error/retry operations was identical. Runtime grants were checked for SELECT and absence of INSERT/UPDATE/DELETE; no financial/auth record changed during these reads. The child DB and its reader role were removed in `finally`, and the owned Next server/browser stopped.

The first temporary staging harness checked the redirect URL before the streamed client redirect completed and failed. Its JSON/proof were retained as `staging-*-first-failed.json`, not counted as PASS. The new temporary harness was corrected to wait for the real login URL, with no application/test-source change; the successful repeat and screenshots are `staging-browser.json`, `staging-proof.json`, `staging-second.log`, `staging-mouse-1280.png` and `staging-touch-375.png`. No cookie/token, production secret or database export is included in Git.

### Publication boundary after this preparation

The selected39 paths contain the new read-only analytics, authorized shell/i18n/menu tests, DOC-HB22-01/D62/D63 documents and only the five Finance context hashes. A staged-content review must still verify this explicit allowlist, whitespace and secret/fixture provenance. GitHub main was equal to the local base at remote preflight; the feature branch had not yet been published.

The earlier manifest/blocker and Vite-only limitations remain historical evidence. Full local build/typecheck/unit/integration and an actual built-Next synthetic staging are now executed as above. **Production readiness is still conditional:** after commit/push/PR, require the complete GitHub CI on that exact SHA and confirm Vercel's actual production branch, automatic promotion mode and Deployment Checks before squash merge. Current tools only confirmed the existing Home Budget team/project/Git link/domain and old deployment; unexposed promotion settings are not guessed, changed or bypassed. No HB-022 merge/production deployment or production smoke PASS is claimed by this pre-commit report. Actual commit/PR/CI URLs and outcomes belong to the PR/final handoff.
