# HB-019.2 — local implementation verification

**Latest execution:** [Final documentation and publication preparation](#final-documentation-and-publication-preparation--2026-11-11). Earlier execution records below are historical; the latest section gives D54, final local proof and publication boundaries.

**2026-11-11. Local implementation prepared for independent review. Not Done; no Owner Acceptance.** Browser/physical AT verification remains NOT EXECUTED. The full unit suite and Finance Gate are not green; the protected-context blocker below is unresolved. This report records executed assertions, not independent approval.

## Authorization and baseline

Owner authorization is the implementation handoff dated 2026-11-09 with D50–D53. Work resumed on 2026-11-11 after the owner's pause. The approved documentation review is not a review of this runtime implementation.

B0 on 2026-11-09: `git fetch origin main` and `git ls-remote origin refs/heads/main` verified the same live main commit before branch creation. `git worktree add -b feat/hb-019-2-financial-history D:\projects_js\home-budget-hb-019-2 origin/main` started with an empty diff and HEAD/merge-base equal to BASE. No historical HB-019.1 commits were cherry-picked. Only the ten approved local document changes were copied after comparison with fetched main.

- Worktree: `D:\projects_js\home-budget-hb-019-2`.
- Branch: `feat/hb-019-2-financial-history`.
- BASE, HEAD and merge-base with the fetched origin/main: `050c7b0e5d497fc016726bf705fc9b17fbd2f010`.
- No commit, staging, push, PR, merge, deploy or production/Neon action occurred.
- Original worktree remains on `feat/hb-019-1-budget-update-ux`, HEAD `5e6df62b4173c20dde51d4caff1d95adec5c8503`. Its ten approved document modifications are preserved byte for byte; no environment files were read or copied.

## Implemented behavior and boundaries

The new read-only `/history` section uses account-scoped committed `budget_updates` as its registry, descending recorded sequence, 20-row keyset pages, a retained owned anchor and fixed K_index. Every request captures input before asynchronous authorization, reauthorizes ownership, validates exact runtime shapes and checks cut/boundary/filter/source membership. Previous/Next boundaries exist only in component memory. Entry/refresh captures a new cut. The UI rejects stale responses and mismatched basis, page boundaries, batch, H, perspective and evidence offset.

List reads admit bounded source metadata independently of selected detail. Thirteen source families cover identities, allocations, checkpoints, lifecycle revisions, transitions, transfers, ordering, positions, reports and audits. Unknown kinds and malformed/missing required sources remain visible in the all-history registry. If invalid sources make a month filter undecidable, the filtered read returns an explicit error. The index does not claim to reconstruct twenty financial states per page.

On demand, the existing projection context/selection and `projectAccount` prove a **daily** state through H at source-proven original K or the captured later K. There is no new assembler or intra-day state contract. Same-day ordering/positions remain retained source evidence. Immutable report versions are verified by the existing closing reader and show their own H/K/version/digest. Saved aggregate review evidence uses the existing `originalEvidence` verifier; its body is unchanged (only exported). Legacy HB-013 confirmation evidence is checked without requiring a later aggregate review document.

The viewer shows real bank-check dates, UNKNOWN separately from zero, full period A/R/S/F and deficits, historical identity/origin/funding/status/amounts, and separately selected source/day/report perspectives in RU/DE/EN. It contains no historical daily forecast. Financial parameters are request-body data, with no URL query, persistent browser storage, financial logging or shared financial cache added. History navigation disables speculative prefetch and fetches its financial cut on entry.

Reads use scoped REPEATABLE READ READ ONLY transactions, the existing advisory admission convention and SQL timeout 10 seconds. Existing limits remain: source rows 20,000; storage 8 MiB; quadratic work 4,000,000; identities 1,000; periods 1,200; wire 1 MiB. Refusals do not claim complete empty history. No schema, index, migration, dependency, financial formula, selector, selectionContractVersion, existing write/closing UX, Finance Gate checker, coverage manifest or CI change was made. No PWA/offline cache was added. HB-027/020/021/022 are not implemented.

## Executed verification

All commands below ran from `D:\projects_js\home-budget-hb-019-2`, using Node v22.23.0 and pnpm 12.16.1. Dependencies were installed with the existing frozen lockfile. Reports are ignored temporary local files, not new committed evidence bundles or gate receipts. The test tree is uncommitted HEAD plus the exact source fingerprint below; there is no invented implementation commit SHA.

Source fingerprint (unchanged checker function, 337 files): `b806b1df4ce3c3afa5a803a833e49dfc90f9175cfe5352627bc3162dd12ac99d`. This includes runtime code/tests/migrations/scripts/configs and protected normative contexts; the administrative verification report itself is outside that fingerprint.

| Check | Actual result | Exit |
|---|---|---:|
| Targeted U/C, UTC | 18 PASS / 0 FAIL / 0 pending; total 18 | 0 |
| Full unit, UTC | 1027 PASS / 4 FAIL / 0 pending; total 1031 | 1 |
| Full isolated PG, UTC | 457 PASS / 0 FAIL / 0 pending; total 457 | 0 |
| Targeted history PG, UTC | 14 PASS / 0 FAIL / 0 pending; total 14 | 0 |
| DB17, UTC | 2 PASS / 0 FAIL / 455 filtered (not executed); total 457 | 0 |
| Timezone subset, UTC | 570 PASS / 0 FAIL / 0 pending; total 570 | 0 |
| Same subset, America/Los_Angeles | 570 PASS / 0 FAIL / 0 pending; total 570 | 0 |
| Lint: `pnpm.cmd lint` | PASS, zero warnings | 0 |
| Types: `pnpm.cmd typecheck` | PASS, route type generation and tsc | 0 |
| Production build: `pnpm.cmd build` | PASS; `/history` dynamic | 0 |
| `git diff --check` | PASS | 0 |
| Finance Gate init | FAIL, protected context mismatch | 1 |
| Real browser, 320px, desktop/native 200% zoom, physical screen reader | NOT EXECUTED | — |

Exact test commands:

```powershell
$env:TZ='UTC'
pnpm.cmd exec vitest run tests/financial-history-ui.test.tsx tests/financial-history-boundary.test.ts tests/financial-history-feasibility.test.ts --no-file-parallelism --reporter=json --outputFile=tmp/hb0192-target-current.json
pnpm.cmd exec vitest run --no-file-parallelism --reporter=json --outputFile=tmp/hb0192-unit-current.json
pnpm.cmd exec vitest run --config vitest.integration.config.ts --reporter=json --outputFile=tmp/hb0192-pg-current.json
pnpm.cmd exec vitest run --config vitest.integration.config.ts tests/integration/financial-history.test.ts --reporter=json --outputFile=tmp/hb0192-history-current.json
pnpm.cmd exec vitest run --config vitest.integration.config.ts -t DB17 --reporter=json --outputFile=tmp/hb0192-db17-current.json
$files=@((Get-Content tests/finance/coverage.json -Raw | ConvertFrom-Json).timezoneFiles)+@('tests/financial-history-boundary.test.ts','tests/financial-history-feasibility.test.ts','tests/financial-history-ui.test.tsx')
$env:TZ='UTC'
pnpm.cmd exec vitest run @files --no-file-parallelism --reporter=json --outputFile=tmp/hb0192-subset-utc-current.json
$env:TZ='America/Los_Angeles'
pnpm.cmd exec vitest run @files --no-file-parallelism --reporter=json --outputFile=tmp/hb0192-subset-la-current.json
$env:TZ='UTC'
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd build
node scripts/check-finance-coverage.mjs init tmp/hb0192-gate-current-run
git diff --check
```

Timezone parity compares sorted `(relative test file, expanded full test name, status)` records, rejecting duplicate identities. Both runs have 570 actual PASS records and identical identities/statuses. SHA-256 of that canonical identity list: `1a58146a9fa302f842072ff8c915deeeaf355cbbc5c2604ebf95fd829b4eb691`. The manifest's 16 existing timezone files are unchanged; the three added history U/C files are passed explicitly, not added to Finance Gate.

### Isolated PostgreSQL and no-write proof

DB17 selects only its two matching assertions; filtered/pending entries are not counted as passes.

The explicitly owned disposable container is `hb0192-20261109-implementation`, ID `b8aeeeb33ca696cf429cc7abd9afb133800ab5dc75e6d52eafe6d8d65636451c`, labels `home-budget.task=HB-019.2`, `home-budget.purpose=disposable-test`, PostgreSQL 18.6, bound only at `127.0.0.1:62799`. These identifiers and ownership were checked before reuse on 2026-11-11. No other container was manipulated.

For each PG invocation, process-local `HB_TEST_DATABASE_TARGET=disposable-local-container`, `HB_DATABASE_TARGET=isolated-development`, and all three database URL overrides pointed to that synthetic loopback target. Credentials are intentionally omitted. Existing `requireLocalDatabaseTargets` validates protocol, explicit 127.0.0.1/port/database and rejects redirection parameters before connection. Each suite creates a new UUID-named synthetic database and applies existing migrations; it does not reset an existing user database. Financial dates are server-relative completed Berlin months; no calendar/auth bypass was added.

Process-local PG setup before each integration command (credential value redacted; no `.env` loaded):

```powershell
$env:TZ='UTC'
$env:HB_TEST_DATABASE_TARGET='disposable-local-container'
$env:HB_DATABASE_TARGET='isolated-development'
$env:DATABASE_URL='<synthetic-credential PostgreSQL URL at 127.0.0.1:62799/hb0192>'
$env:DATABASE_URL_UNPOOLED=$env:DATABASE_URL
$env:TEST_DATABASE_URL=$env:DATABASE_URL
```


The new integration helper independently snapshots **every public table** as complete sorted JSON before/after each `unchanged` read/refusal, including financial rows, audit events, receipts, account/head/control rows, report documents and counters stored in those rows. The reads themselves also run under PostgreSQL READ ONLY. The 45-root pagination test captures a separate registry census, commits a 46th synthetic update using a separate connection between page requests, proves pages 20/20/5 still equal the original census, and proves refresh sees 46. A separate physical-table census covers all thirteen child source families after real legacy transition/report/payment writers.

The exact day oracle proves B80000/A60000/R20000/S10000/F30000 at original K0 versus B76000/A56000/R20000/S10000/F26000 at later K2, with unknown original end and observed later end76000. Existing current head is retained. The same real-writer fixture preserves original report v1 bytes, selects both immutable report versions through the original validator, retains origin/identity while moving funding, then confirms payment with B80000, R0, S10000, F50000. No automatic extra debit occurs; October still has full R20000/S10000 after later payment. The zero branch proves B/A/end0 with full R2000/S1000, F-3000 and deficit3000; the no-observation branch retains known R/S while A/F/end remain unknown. Overflow guard fixtures prove real bytes/rows/work/wire refusal and table equality, including malformed int64 root receipts that stay visible as invalid rather than causing SQL arithmetic overflow.

### HBH trace matrix — actual test identities

U = unit, C = jsdom component, P = isolated real PostgreSQL. Every listed PASS is limited to the assertions actually executed. No row means complete browser/AT acceptance. All applicable B/A portions remain NOT EXECUTED.

| Scenario | Exact executed identities / assertions | Evidence status |
|---|---|---|
| HBH-001 | `HBH-001/006 registry census pages 20/20/5, independent child census and concurrent append are read only`<br>`HBH-001/002/003 PG legacy transition, exact K0/K2 daily oracle and immutable v1/v2`<br>`HBH-001/006 unsupported and missing source stay visible, details and filtered membership refuse read only`<br>`HBH-001/006 malformed required typed audit remains a visible source error without writes`<br>`HBH-001 original aggregate source proof reuses the existing verifier under read-only transaction` | Listed assertions PASS; B/A NOT EXECUTED; acceptance incomplete |
| HBH-002 | `HBH-002 S0 existing daily assembler preserves October K0 and late K2 with November head`<br>`HBH-002 PG selected original daily state uses retained batch K and has no write`<br>`HBH-001/002/003 PG legacy transition, exact K0/K2 daily oracle and immutable v1/v2`<br>`HB14-056 correction reposition resolves before H and never resurrects old observation`<br>`HB10-H chronological authority, ordering and corrections (ADR0002) date correction resolves before H; new manifests preserve old versions and never resurrect old date` | Listed assertions PASS; B/A NOT EXECUTED; acceptance incomplete |
| HBH-003 | `HBH-001/002/003 PG legacy transition, exact K0/K2 daily oracle and immutable v1/v2`<br>`HBH-003/007 explicitly selected v1 reloads its own version and H/K instead of latest` | Listed assertions PASS; B/A NOT EXECUTED; acceptance incomplete |
| HBH-004 | `HBH-004 PG observed zero with full R/S differs from no observation and unknown A/F`<br>`HBH-007 observed zero and negative F are rendered as amounts`<br>`HBH-007 localized daily basis, UNKNOWN/full R/S and focus are component evidence only ru`<br>`HBH-007 localized daily basis, UNKNOWN/full R/S and focus are component evidence only de`<br>`HBH-007 localized daily basis, UNKNOWN/full R/S and focus are component evidence only en` | Listed assertions PASS; B/A NOT EXECUTED; acceptance incomplete |
| HBH-005 | `HBH-001/002/003 PG legacy transition, exact K0/K2 daily oracle and immutable v1/v2`<br>`HBH-005/007 identity amounts, possible-claim reservation and status are localized ru`<br>`HBH-005/007 identity amounts, possible-claim reservation and status are localized de`<br>`HBH-005/007 identity amounts, possible-claim reservation and status are localized en` | Listed assertions PASS; B/A NOT EXECUTED; acceptance incomplete |
| HBH-006 | `HBH-006 exact keys, prototypes, accessors, schema and int64 sequence boundaries`<br>`HBH-006 input graph is copied and complete basis comparisons reject mixed cuts/filters/anchors/timestamps`<br>`HBH-006 each feature operation reauthorizes and captures input before an asynchronous authorization`<br>`HBH-006 fixed-cut shape, source membership and invalid page ranks refuse without writes`<br>`HBH-006 malformed registry int64 receipt stays a visible invalid row instead of SQL overflow`<br>`HBH-006 metadata admission bytes refuses honestly without writes`<br>`HBH-006 metadata admission rows refuses honestly without writes`<br>`HBH-006 metadata admission work refuses honestly without writes`<br>`HBH-006 metadata admission wire refuses honestly without writes`<br>`HBH-006/007 mismatched valid basis cannot replace an existing page`<br>`HBH-006/007 a different requested page boundary cannot replace the current page`<br>`HBH-006/007 evidence for another offset is discarded without showing a financial state`<br>`HBH-006/007 verified next page navigation and refresh clear the navigation stack` | Listed assertions PASS; B/A NOT EXECUTED; acceptance incomplete |
| HBH-007 | `HBH-007 localized daily basis, UNKNOWN/full R/S and focus are component evidence only ru`<br>`HBH-007 localized daily basis, UNKNOWN/full R/S and focus are component evidence only de`<br>`HBH-007 localized daily basis, UNKNOWN/full R/S and focus are component evidence only en`<br>`HBH-006/007 rejected details disclose no fabricated state and error is announced`<br>`HBH-007 source failures stay visible and never open as a saved state` | Listed assertions PASS; B/A NOT EXECUTED; acceptance incomplete |

The combined PG fixture's title lists 001/002/003; its later payment, retained October reserve/saving and identity/funding assertions also provide the HBH-005 proof. SOURCE evidence ordering is deterministic by audit ID only for paging; this is not asserted to be financial event order. EventIndex/confirmed position/order remain in the original source documents.

Existing full-suite proofs additionally cover integer money/rounding, unauthorized scopes, retries, future-month isolation, leap/year boundaries and Berlin DST, including `HB19-D18 leap and year boundaries use civil periods`, `HB14-038 DST civil dates` and `HB14-039 DST civil dates`. No new finance engine was introduced to satisfy the history UI.

### Finance Gate blocker and failed attempts

The current unchanged checker returns `HB015_GATE_REJECTED` (exit 1). Calling its exported `validateManifest` against the actual source inventory identifies **NORMATIVE_CONTEXT_MISMATCH**. Eight pre-approved protected documents differ from the old manifest:

- `docs/BUSINESS_RULES.md`
- `docs/DECISIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/architecture.json`
- `docs/PRD.md`
- `docs/UX.md`
- `docs/TASKS.md`
- `docs/OPEN_QUESTIONS.md`

Four actual full-unit failures:

- `HB15-G03 CLI rejection and repository contract returns nonzero for malformed current-run JSON and refuses context reuse`.
- `HB15-G03 CLI rejection and repository contract validates the actual normative inventory and approved timezone source list`.
- `HB19 finance inventory and honest verification status requires both added closing timezone files without reducing the prior source set`.
- `FPG-008 actual CLI init cannot record after a financial edit`.

D53 forbids silently servicing these contexts, rewriting receipts or expanding bindings/CI. No gate PASS is claimed. Separate owner authorization for context maintenance is needed before future publication; no publication is requested here. The earlier HB-019.1 accepted receipts remain historical evidence and are not reused as a current run.

Earlier implementation runs exposed and corrected a missing explicit future-allocation consent in the synthetic transition fixture, malformed typed-audit validation, shell navigation expectations after adding History, and two currency assertions affected by whitespace normalization. An early concurrent full run also hit an existing component's 5-second timeout; the serial final full-unit run used unchanged test limits and leaves only the four context failures above. No failed attempt is counted as PASS, no assertions/guards were weakened to obtain success.

The Codex browser skill was inspected, but its required Node REPL `js` tool was unavailable after tool discovery. No authenticated browser, native viewport/zoom or physical assistive technology execution occurred, and no new browser infrastructure was installed. jsdom focus, button, locale, caption, storage and stale-response assertions are component evidence only. Responsive styling is implemented but real 320px/native 200% layout and physical screen-reader acceptance remain **NOT EXECUTED**. Independent runtime review has not happened.

## Evidence cleanup — exact outcome

The approved table permits up to 41 candidates; it does not require deleting all of them. Before removal, the immutable GitHub tree for BASE was verified (not truncated, 48 HB-019.1 artifact blobs). Blob identity and SHA-256 checks compared current bytes with `git show BASE:path` and the published tree object IDs. Twenty-five artifacts were byte-identical; twenty-three differed only in CRLF/LF. No contents/receipts were normalized to force removal.

Actual cleanup: **16 files removed: 2 DELETE empty outputs, 14 REPLACE artifacts in two complete seven-file report/receipt run groups.** Seventeen additional HB-019.1 candidates are KEEP because strict byte-identity admission failed in their groups; the three-file failed publication attempt stays together. All 14 final publication files, the unique LA dashboard, 32 retained HB-019.1 artifacts in total, and all 8 conditional HB-017 screenshots remain. Screenshots were not visually compared and therefore were not deleted.

Before removal, the original technical narrative, exact commands/run identities/timing, failed attempts and unique summaries were consolidated into the existing [HB-019.1 primary verification report](hb-019-1-verification.md#consolidated-technical-history---2026-11-09). The other existing report retains historical heading anchors as a link stub. Report/receipt digests were checked before removal; retained final evidence hashes were rechecked after cleanup and on 2026-11-11. All deleted-path links were repaired to immutable BASE permalinks. Local Markdown file-link scan: 4 baseline broken links outside this change, **0 new broken links**.

Evidence-only cleanup had the same before/after source fingerprint `c338b1eba77d3d4e15dfbdb237a3010892604bc247887707815799a396b802e6` (337 files). Later runtime/test edits legitimately changed the final fingerprint recorded above; these are not attributed to cleanup.

| Decision | Exact removed archive | Bytes | SHA-256 |
|---|---|---:|---|
| DELETE | [docs/planning/hb-019-1-correction-evidence/diff-check.txt](https://github.com/strakhovdenya/home-budget/blob/050c7b0e5d497fc016726bf705fc9b17fbd2f010/docs/planning/hb-019-1-correction-evidence/diff-check.txt) | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| DELETE | [docs/planning/hb-019-1-correction-evidence/index-stat.txt](https://github.com/strakhovdenya/home-budget/blob/050c7b0e5d497fc016726bf705fc9b17fbd2f010/docs/planning/hb-019-1-correction-evidence/index-stat.txt) | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| REPLACE | [docs/planning/hb-019-1-correction-evidence/integration.json](https://github.com/strakhovdenya/home-budget/blob/050c7b0e5d497fc016726bf705fc9b17fbd2f010/docs/planning/hb-019-1-correction-evidence/integration.json) | 135874 | `609dcec5310746f68f3cac9b2ecb4db0d62f7f1195260dccb284e3b3f5b2f1f3` |
| REPLACE | [docs/planning/hb-019-1-correction-evidence/integration.receipt.json](https://github.com/strakhovdenya/home-budget/blob/050c7b0e5d497fc016726bf705fc9b17fbd2f010/docs/planning/hb-019-1-correction-evidence/integration.receipt.json) | 124 | `f58a4c1dc647c65e5ac433297f7286f0ae03dc1eba6e79ff90d281674f0397b4` |
| REPLACE | [docs/planning/hb-019-1-correction-evidence/run.json](https://github.com/strakhovdenya/home-budget/blob/050c7b0e5d497fc016726bf705fc9b17fbd2f010/docs/planning/hb-019-1-correction-evidence/run.json) | 205 | `62b30e7da0889ea27cfb875e4972664f899351c8a4701580d8c3581007c70873` |
| REPLACE | [docs/planning/hb-019-1-correction-evidence/timezone.json](https://github.com/strakhovdenya/home-budget/blob/050c7b0e5d497fc016726bf705fc9b17fbd2f010/docs/planning/hb-019-1-correction-evidence/timezone.json) | 171342 | `5cbf3f7b81b893d2b71b842699d3f8a97d541687f80641a305bca4d3ed62e033` |
| REPLACE | [docs/planning/hb-019-1-correction-evidence/timezone.receipt.json](https://github.com/strakhovdenya/home-budget/blob/050c7b0e5d497fc016726bf705fc9b17fbd2f010/docs/planning/hb-019-1-correction-evidence/timezone.receipt.json) | 124 | `dc1d0ad3bf95d6cbd3f9ac28cc65bee8ebbec6ab932d674aada023268bb05b70` |
| REPLACE | [docs/planning/hb-019-1-correction-evidence/unit.json](https://github.com/strakhovdenya/home-budget/blob/050c7b0e5d497fc016726bf705fc9b17fbd2f010/docs/planning/hb-019-1-correction-evidence/unit.json) | 324046 | `64e680d3adc74796149b30722fd5b6d9158d0ec015171939098bfafbed72fc14` |
| REPLACE | [docs/planning/hb-019-1-correction-evidence/unit.receipt.json](https://github.com/strakhovdenya/home-budget/blob/050c7b0e5d497fc016726bf705fc9b17fbd2f010/docs/planning/hb-019-1-correction-evidence/unit.receipt.json) | 124 | `f239f9fbd4f09b15a2032d842a72bfe772d79a9433748d6f59e9a70a1cc1e33e` |
| REPLACE | [docs/planning/hb-019-1-evidence/integration.json](https://github.com/strakhovdenya/home-budget/blob/050c7b0e5d497fc016726bf705fc9b17fbd2f010/docs/planning/hb-019-1-evidence/integration.json) | 134647 | `f35c227fd934033fa895a8022f215e0b7d215c00cd3b2a4af3fdb17b55362d91` |
| REPLACE | [docs/planning/hb-019-1-evidence/integration.receipt.json](https://github.com/strakhovdenya/home-budget/blob/050c7b0e5d497fc016726bf705fc9b17fbd2f010/docs/planning/hb-019-1-evidence/integration.receipt.json) | 124 | `7c4bb842d342835100a2d42af9326914cc593006201978a056ffde3c86308227` |
| REPLACE | [docs/planning/hb-019-1-evidence/run.json](https://github.com/strakhovdenya/home-budget/blob/050c7b0e5d497fc016726bf705fc9b17fbd2f010/docs/planning/hb-019-1-evidence/run.json) | 205 | `57b0d53f2d95ac5e74f40cea53c42881a63b04475ff77ad378ab197ec669b404` |
| REPLACE | [docs/planning/hb-019-1-evidence/timezone.json](https://github.com/strakhovdenya/home-budget/blob/050c7b0e5d497fc016726bf705fc9b17fbd2f010/docs/planning/hb-019-1-evidence/timezone.json) | 171325 | `117060de50b8c8179eea05997317db3b49dc91454df4ddbd1bd7c1a381f456a2` |
| REPLACE | [docs/planning/hb-019-1-evidence/timezone.receipt.json](https://github.com/strakhovdenya/home-budget/blob/050c7b0e5d497fc016726bf705fc9b17fbd2f010/docs/planning/hb-019-1-evidence/timezone.receipt.json) | 124 | `b585e3f5a54fd6e22472a348c69c9153ef0356eab1fe1f01716fd295d78fb079` |
| REPLACE | [docs/planning/hb-019-1-evidence/unit.json](https://github.com/strakhovdenya/home-budget/blob/050c7b0e5d497fc016726bf705fc9b17fbd2f010/docs/planning/hb-019-1-evidence/unit.json) | 320214 | `c9c73c660e3237b9e7b939d565ef3c619607b6513ca3a9a6690ac1fa8c01c5f3` |
| REPLACE | [docs/planning/hb-019-1-evidence/unit.receipt.json](https://github.com/strakhovdenya/home-budget/blob/050c7b0e5d497fc016726bf705fc9b17fbd2f010/docs/planning/hb-019-1-evidence/unit.receipt.json) | 124 | `acfe2a09a6525f2b22b06194cb25f7a7a13663402c0eae3ee8f966e02f0b627e` |

Additional KEEP candidates:

- `docs/planning/hb-019-1-correction-evidence/baseline.json`
- `docs/planning/hb-019-1-correction-evidence/commands.json`
- `docs/planning/hb-019-1-correction-evidence/final-audit.json`
- `docs/planning/hb-019-1-correction-evidence/final-audit.txt`
- `docs/planning/hb-019-1-correction-evidence/final-finance-check.txt`
- `docs/planning/hb-019-1-correction-evidence/git-status.txt`
- `docs/planning/hb-019-1-correction-evidence/source-integrity.json`
- `docs/planning/hb-019-1-correction-evidence/summary.json`
- `docs/planning/hb-019-1-evidence/baseline.json`
- `docs/planning/hb-019-1-evidence/commands.json`
- `docs/planning/hb-019-1-evidence/final-audit.json`
- `docs/planning/hb-019-1-evidence/git-status.txt`
- `docs/planning/hb-019-1-evidence/source-integrity.json`
- `docs/planning/hb-019-1-evidence/summary.json`
- `docs/planning/hb-019-1-publication-evidence/attempt-1-record-pg.txt`
- `docs/planning/hb-019-1-publication-evidence/attempt-1-run.json`
- `docs/planning/hb-019-1-publication-evidence/attempt-1-summary.json`

## Changed files and handoff

The ZIP is a review snapshot made from this worktree, plus a change/deletion manifest and instructions for comparison with BASE. It contains current nonignored repository sources/tests/docs/configuration needed for review and all changed/new files. Deleted files are listed explicitly. `.git`, environment files, credentials, dependency/build caches and temporary machine reports are excluded. No commit or independent review is implied by a ZIP.

Approved-document preservation SHA-256:

| File | SHA-256 |
|---|---|
| `docs/ARCHITECTURE.md` | `9b3dbabe225fb1cd7c95259214152cbe39843a37e750663bb125f29694b4e6c3` |
| `docs/BUSINESS_RULES.md` | `21b624ff0229e1ead48ac8533d2a4dac689b200684b8dd141b1e9201ebdd978e` |
| `docs/DECISIONS.md` | `1231433fa1c1a3161c8e683c49a892daf23d6e359608e61c1422cde5f6bab67c` |
| `docs/OPEN_QUESTIONS.md` | `e4eee9a5eaef1c23454920c127624f8481f256e6b17fbce5a442d3774f0dbf19` |
| `docs/PRD.md` | `1d118c27cb87190cc4d8c821049474f534fa099b1f4e7b28ecf6b48c2255bfbc` |
| `docs/TASKS.md` | `b582b86a25a937d08eddf657aecfde367400c428c9876222f18094fa3d782ac1` |
| `docs/UX.md` | `2eefe59d242795210d36a4364e0b6cd57d6da6d1fe919491d8dd4f210034410c` |
| `docs/architecture.json` | `05a78cfbf68310c1317bea071171d53a97c6beb3fe23dfd8d22ab27c966f8e30` |
| `docs/planning/hb-019-2-financial-history.md` | `9a76400301fd67872072a0dafa270360556b06be75f1cd3b910cb0e3cafeb7d0` |
| `tests/scenarios/phase-01/hb-019-2-financial-history.md` | `e661e181c6887e0b76488c6e13b289edd94f7a468b7b955cad5fb8cf475788f8` |

`git status --short` (includes this sole new verification report):

```text
M docs/ARCHITECTURE.md
 M docs/BUSINESS_RULES.md
 M docs/DECISIONS.md
 M docs/OPEN_QUESTIONS.md
 M docs/PRD.md
 M docs/TASKS.md
 M docs/UX.md
 M docs/architecture.json
 D docs/planning/hb-019-1-correction-evidence/diff-check.txt
 D docs/planning/hb-019-1-correction-evidence/index-stat.txt
 D docs/planning/hb-019-1-correction-evidence/integration.json
 D docs/planning/hb-019-1-correction-evidence/integration.receipt.json
 D docs/planning/hb-019-1-correction-evidence/run.json
 D docs/planning/hb-019-1-correction-evidence/timezone.json
 D docs/planning/hb-019-1-correction-evidence/timezone.receipt.json
 D docs/planning/hb-019-1-correction-evidence/unit.json
 D docs/planning/hb-019-1-correction-evidence/unit.receipt.json
 D docs/planning/hb-019-1-evidence/integration.json
 D docs/planning/hb-019-1-evidence/integration.receipt.json
 D docs/planning/hb-019-1-evidence/run.json
 D docs/planning/hb-019-1-evidence/timezone.json
 D docs/planning/hb-019-1-evidence/timezone.receipt.json
 D docs/planning/hb-019-1-evidence/unit.json
 D docs/planning/hb-019-1-evidence/unit.receipt.json
 M docs/planning/hb-019-1-finance-gate-verification.md
 M docs/planning/hb-019-1-verification.md
 M docs/planning/hb-019-2-financial-history.md
 M src/features/shell/app-shell.tsx
 M src/features/shell/section-icon.tsx
 M src/features/shell/sections.ts
 M src/infrastructure/db/budget-update-repository.ts
 M src/shared/i18n/messages/de.json
 M src/shared/i18n/messages/en.json
 M src/shared/i18n/messages/ru.json
 M tests/scenarios/phase-01/hb-019-2-financial-history.md
 M tests/shell.test.tsx
?? docs/planning/hb-019-2-verification.md
?? src/app/financial-history-boundary.ts
?? src/app/history/
?? src/domain/history/
?? src/features/financial-history/
?? src/infrastructure/db/financial-history-detail.ts
?? src/infrastructure/db/financial-history-index.ts
?? tests/financial-history-boundary.test.ts
?? tests/financial-history-feasibility.test.ts
?? tests/financial-history-ui.test.tsx
?? tests/integration/financial-history.test.ts
```

`git diff --stat` (tracked files only; untracked additions listed separately below):

```text
docs/ARCHITECTURE.md                               |   14 +-
 docs/BUSINESS_RULES.md                             |   13 +
 docs/DECISIONS.md                                  |   65 ++
 docs/OPEN_QUESTIONS.md                             |   12 +-
 docs/PRD.md                                        |   10 +
 docs/TASKS.md                                      |   42 +-
 docs/UX.md                                         |   13 +-
 docs/architecture.json                             |    6 +
 .../hb-019-1-correction-evidence/diff-check.txt    |    0
 .../hb-019-1-correction-evidence/index-stat.txt    |    0
 .../hb-019-1-correction-evidence/integration.json  |    1 -
 .../integration.receipt.json                       |    1 -
 .../planning/hb-019-1-correction-evidence/run.json |    1 -
 .../hb-019-1-correction-evidence/timezone.json     |    1 -
 .../timezone.receipt.json                          |    1 -
 .../hb-019-1-correction-evidence/unit.json         |    1 -
 .../hb-019-1-correction-evidence/unit.receipt.json |    1 -
 docs/planning/hb-019-1-evidence/integration.json   |    1 -
 .../hb-019-1-evidence/integration.receipt.json     |    1 -
 docs/planning/hb-019-1-evidence/run.json           |    1 -
 docs/planning/hb-019-1-evidence/timezone.json      |    1 -
 .../hb-019-1-evidence/timezone.receipt.json        |    1 -
 docs/planning/hb-019-1-evidence/unit.json          |    1 -
 docs/planning/hb-019-1-evidence/unit.receipt.json  |    1 -
 .../planning/hb-019-1-finance-gate-verification.md |  133 +--
 docs/planning/hb-019-1-verification.md             | 1049 ++++++++++++++++++++
 docs/planning/hb-019-2-financial-history.md        |  837 +++++++++++++++-
 src/features/shell/app-shell.tsx                   |    2 +-
 src/features/shell/section-icon.tsx                |    1 +
 src/features/shell/sections.ts                     |    4 +-
 src/infrastructure/db/budget-update-repository.ts  |    2 +-
 src/shared/i18n/messages/de.json                   |   91 +-
 src/shared/i18n/messages/en.json                   |   91 +-
 src/shared/i18n/messages/ru.json                   |   91 +-
 .../phase-01/hb-019-2-financial-history.md         |  104 +-
 tests/shell.test.tsx                               |    4 +-
 36 files changed, 2408 insertions(+), 190 deletions(-)
```

New-file inventory (nonignored):

- `docs/planning/hb-019-2-verification.md` (33976 bytes; line count 308).
- `src/app/financial-history-boundary.ts` (748 bytes; line count 10).
- `src/app/history/actions.ts` (876 bytes; line count 13).
- `src/app/history/page.tsx` (636 bytes; line count 10).
- `src/domain/history/contracts.ts` (1590 bytes; line count 15).
- `src/domain/history/validation.ts` (2469 bytes; line count 39).
- `src/features/financial-history/history-screen.tsx` (12071 bytes; line count 119).
- `src/features/financial-history/read-history.ts` (1982 bytes; line count 31).
- `src/infrastructure/db/financial-history-detail.ts` (17841 bytes; line count 166).
- `src/infrastructure/db/financial-history-index.ts` (22448 bytes; line count 251).
- `tests/financial-history-boundary.test.ts` (3126 bytes; line count 29).
- `tests/financial-history-feasibility.test.ts` (3038 bytes; line count 38).
- `tests/financial-history-ui.test.tsx` (10026 bytes; line count 71).
- `tests/integration/financial-history.test.ts` (27535 bytes; line count 235).

The new-file byte/line inventory is captured before this final report rewrite; the ZIP manifest provides final exact hashes and sizes, including this report. Checks confirm an empty index, unchanged HEAD/ancestry, unchanged protected checker/manifest/CI/schema/dependencies/financial selectors, ten original document changes preserved, and all retained cleanup artifacts byte-identical to their recorded hashes.

Pending before acceptance: independent review, actual browser/responsive/native zoom/physical AT evidence where required, and separately authorized Finance Gate context maintenance before publication. The task register and scenarios retain their approved planning status; this report is the local execution record and does not grant Done or Owner Acceptance.

Final safety checks: no new broken local Markdown file links (4 pre-existing), no typical private-key/cloud-token patterns in changed/new text, and no source fingerprint change after verification. Only the explicitly owned HB-019.2 container is stopped after the final PG runs; no foreign container is stopped or removed.


## Correction R1 — 2026-11-11

**Independent review supplied by owner: CHANGES REQUESTED — Critical 0 / High 1 / Medium 2 / Low 0.** Findings addressed locally as described below; repeat independent review and separate owner acceptance are pending. Not Done. The original execution record above is historical; this section contains current R1 results.

Work continued in the existing `D:\projects_js\home-budget-hb-019-2`, branch `feat/hb-019-2-financial-history`. HEAD/BASE remains `050c7b0e5d497fc016726bf705fc9b17fbd2f010`. AGENTS.md, current approved plan/HBH-001–007 and relevant project financial verification, scenario, architecture, configuration, React and server authorization guidance were consulted. The explicit R1 request authorizes these corrections; historical planning-only statements do not supersede it.

### High: original financial confirmation

- `src/infrastructure/db/financial-history-detail.ts`: selected BUDGET_UPDATE/aggregate-review batches now invoke the existing `originalEvidence` before **any** perspective response. Legacy PERIOD_TRANSITION invokes the existing `legacyProof` for ORIGINAL/LATER as well as SOURCE. MONTH_CLOSE invokes the existing `validateOriginal` closing reader before daily/report/source disclosure. Invalid original confirmation returns `HISTORY_SOURCE_INVALID` without a financial state.
- Report validation is performed once per request and reused. ORIGINAL report-day K is obtained from the verified report cutoff; LATER retains K_index. No H/K rule/formula was changed.
- `src/infrastructure/db/financial-history-index.ts` explicitly documents VALID as metadata admission only. Its bounded metadata queries remain unchanged; full proof is on demand.
- `src/shared/i18n/messages/{ru,de,en}.json`: VALID now says required metadata is present and confirmation is verified on opening. Corrupted confirmation with valid metadata stays reachable and explicitly fails on detail; the list no longer labels it fully validated.

The reviewer finding was reproduced: all three properly prepared negative PG cases failed before the reader fix because ORIGINAL returned `ok:true` after confirmation damage. After correction, every applicable perspective refuses. No replacement financial validator was written.

### Medium: recording instants in Europe/Berlin

`src/features/financial-history/history-screen.tsx` formats `recordedAt` and `knowledgeRecordedAt` in the active RU/DE/EN locale with explicit `Europe/Berlin`, seconds and UTC offset. The repeated autumn 02:30 is distinguished by GMT+2/GMT+1. Original UTC strings, including six microsecond digits, remain unchanged in the data and `<time dateTime>` attributes. Calendar H/effective dates and financial selection are unchanged.

Component tests check winter/summer midnight rollover, both sides of the spring gap and both autumn fold instants in each locale. They assert known literal clocks/offsets and expected civil dates, not a second call to the implementation formatter, and preserve raw datetime values.

### Medium: report version provenance

`src/infrastructure/db/financial-history-detail.ts` exposes REPORT `reason`, `previousVersionId`, `createdAt` from the existing validated record's `reason`, `previousVersionId`, `closedAt`. The existing `validateOriginal` already verifies creation time against the batch instant. The screen and RU/DE/EN catalogs display these alongside the report's own version/H/K, including an explicit initial-version label. No new version model/write was introduced.

The real-writer v1/v2 test now uses different saved reasons and asserts reason, predecessor, exact creation instant, original H/K, exact A/R/S/F/end values, equal complete v1 response after reading v2, unchanged stored v1 and current head. Locale component tests switch v1 → v2 → v1 and check retained provenance and H/K.

### New and extended tests

| Exact runtime identity | Actual proof |
|---|---|
| `HB15-G02 R1 shared normative context and compound meaning rejects changed HB12 common GIVEN with individual definitions untouched` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning rejects changed HB12 legend with individual definitions untouched` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning rejects changed HB12 between-row qualification with individual definitions untouched` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning rejects changed HB13 shared row baseline with individual definitions untouched` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning rejects changed HB14 common observation with individual definitions untouched` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning pins every scenario preamble and every declared external normative source` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning accepts CRLF/LF changes without treating money/meaning edits as formatting` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning rejects missing normative context record` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning rejects duplicate normative context record` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning rejects extra normative context record` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning rejects wrong-digest normative context record` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning bounds whole-file context input before hashing it` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning requires a per-reference guarantee rather than only the shared scenario heading` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning rejects F-009 missing-before` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning rejects F-009 pretend-complete` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning rejects F-009 closing-as-runtime` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning rejects F-009 after-test-as-before` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning rejects F-009 false-exact` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning rejects F-009 wrong-evidence` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning cannot present the future branch of F-011 as fully executed` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning cannot present the future branch of HB1-011 as fully executed` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning cannot present the future branch of HB2-018 as fully executed` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning cannot present the future branch of HB1-006 as fully executed` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning cannot present the future branch of HBL-023 as fully executed` | C PASS |
| `HB15-G02 R1 shared normative context and compound meaning does not let a closing label replace future statistics or operation workflows` | C PASS |
| `HBH-007 R1 Berlin recording instants retain UTC across midnight and DST ru` | C PASS |
| `HBH-007 R1 Berlin recording instants retain UTC across midnight and DST de` | C PASS |
| `HBH-007 R1 Berlin recording instants retain UTC across midnight and DST en` | C PASS |
| `HBH-003/007 R1 report v1 v2 provenance and selected H K remain explicit ru` | C PASS |
| `HBH-003/007 R1 report v1 v2 provenance and selected H K remain explicit de` | C PASS |
| `HBH-003/007 R1 report v1 v2 provenance and selected H K remain explicit en` | C PASS |
| `HBH-002/003/006 R1 corrupt original confirmation rejects every perspective BUDGET_UPDATE` | P PASS |
| `HBH-002/003/006 R1 corrupt original confirmation rejects every perspective LEGACY_TRANSITION` | P PASS |
| `HBH-002/003/006 R1 corrupt original confirmation rejects every perspective MONTH_CLOSE` | P PASS |
| `HBH-001/002/003 PG legacy transition, exact K0/K2 daily oracle and immutable v1/v2` | P PASS; extended with exact saved reason/predecessor/creation/H/K/full amount and immutable v1 re-read assertions; payment/no-double-debit and full no-write assertions retained |

Each new PG case first proves genuine confirmation works in all applicable perspectives, then damages only its original evidence: aggregate review command reason, legacy confirmation reason, or report digest. Typed facts and metadata envelopes remain valid; the registry entry stays visible. ORIGINAL/LATER/SOURCE all refuse; MONTH_CLOSE also refuses REPORT. Valid reads/refusals retain full public-table before/after comparisons, including account/head/audit/receipt/report/control rows.

Synthetic fault injection is setup in the suite's newly created disposable database only: transaction-local `session_replication_role=replica` permits immutable-audit damage and ends before reads; `SHOW session_replication_role` is asserted `origin`. No application writer, production confirmation, schema/migration/trigger definition or normal append-only protection changed. Reads remain REPEATABLE READ READ ONLY.

Initial fixture setup errors were not regression proof: normal UPDATE was correctly blocked by append-only protection and a legacy prepared-result payload had an extra key. After fixing setup, all three actual red reproductions returned the wrongly accepted state. A later whole-file attempt hit unchanged 20-second timeouts for these three tests after large overflow fixtures (14 PASS / 3 timeout FAIL). Moving them before those fixtures preserved full table snapshots and all timeouts/resource guards. Final executions below are authoritative.

### Current verification

CWD for every command: `D:\projects_js\home-budget-hb-019-2`; Node v22.23.0, pnpm 12.16.1. Test tree is unchanged BASE plus uncommitted local changes, not an invented implementation commit.

Final source fingerprint: `e51f49e1e8aaea69136a6130b9ef8e0c48cbde6c433e4a58cef4c102b0a9c673` (337 files). Final full UTC unit, full PG/DB17, UTC/LA, build and safety checks use these unchanged runtime/test sources. This administrative Markdown report is outside the fingerprint.

| Check | Actual result | Exit |
|---|---|---:|
| Targeted U/C UTC | 24 PASS / 0 FAIL / 0 pending; total 24 | 0 |
| Targeted history PG UTC | 17 PASS / 0 FAIL / 0 pending; total 17 | 0 |
| Full unit UTC | 1033 PASS / 4 FAIL / 0 pending; total 1037 | 1 |
| Full isolated PG UTC | 460 PASS / 0 FAIL / 0 pending; total 460 | 0 |
| DB17 UTC | 2 PASS / 0 FAIL / 458 filtered / NOT EXECUTED; total 460 | 0 |
| Timezone UTC | 576 PASS / 0 FAIL / 0 pending; total 576 | 0 |
| Timezone America/Los_Angeles | 576 PASS / 0 FAIL / 0 pending; total 576 | 0 |
| Lint `pnpm.cmd lint` | PASS, zero warnings | 0 |
| Types `pnpm.cmd typecheck` | PASS | 0 |
| Build `pnpm.cmd build` | PASS, dynamic `/history` | 0 |
| `git diff --check` | PASS | 0 |
| Existing Finance Gate init | FAIL: NORMATIVE_CONTEXT_MISMATCH | 1 |
| Browser / 320px / native 200% zoom / physical AT | NOT EXECUTED | — |

UTC/LA parity: 576 unique matching `(relative file, expanded full name, status)` records, all PASS. Canonical identity/status SHA-256: `ee0396a6f0ccd0e2ab83faafd3fcf1c2c373e0a1fc6c669e4bd59b2add5938e6`. DB17 filtered assertions are not passes.

Owned disposable target: `hb0192-20261109-implementation`, ID `b8aeeeb33ca696cf429cc7abd9afb133800ab5dc75e6d52eafe6d8d65636451c`, verified by ID/task/purpose labels before restart. New loopback mapping: `127.0.0.1:53660`; the initial run used a different ephemeral port. Every suite creates a fresh UUID child database with existing migrations and explicit-local-target guards; only synthetic data and server-relative Berlin months. No foreign container, Neon/production, `.env` or OAuth data was accessed.

Exact setup and commands (only the synthetic credential URL is redacted):

```powershell
$env:TZ='UTC'
$env:HB_TEST_DATABASE_TARGET='disposable-local-container'
$env:HB_DATABASE_TARGET='isolated-development'
$env:DATABASE_URL='<synthetic credential URL at 127.0.0.1:53660/hb0192>'
$env:DATABASE_URL_UNPOOLED=$env:DATABASE_URL
$env:TEST_DATABASE_URL=$env:DATABASE_URL
pnpm.cmd exec vitest run --config vitest.integration.config.ts tests/integration/financial-history.test.ts -t R1 --reporter=json --outputFile=tmp/hb0192-r1-target-pg.json
pnpm.cmd exec vitest run --config vitest.integration.config.ts tests/integration/financial-history.test.ts --reporter=json --outputFile=tmp/hb0192-r1-history-pg.json
pnpm.cmd exec vitest run --config vitest.integration.config.ts --reporter=json --outputFile=tmp/hb0192-r1-pg.json
pnpm.cmd exec vitest run --config vitest.integration.config.ts -t DB17 --reporter=json --outputFile=tmp/hb0192-r1-db17.json
pnpm.cmd exec vitest run tests/financial-history-ui.test.tsx tests/financial-history-boundary.test.ts tests/financial-history-feasibility.test.ts --no-file-parallelism --reporter=json --outputFile=tmp/hb0192-r1-target-uc.json
pnpm.cmd exec vitest run --no-file-parallelism --reporter=json --outputFile=tmp/hb0192-r1-unit.json
$files=@((Get-Content tests/finance/coverage.json -Raw | ConvertFrom-Json).timezoneFiles)+@('tests/financial-history-boundary.test.ts','tests/financial-history-feasibility.test.ts','tests/financial-history-ui.test.tsx')
pnpm.cmd exec vitest run @files --no-file-parallelism --reporter=json --outputFile=tmp/hb0192-r1-utc.json
$env:TZ='America/Los_Angeles'
pnpm.cmd exec vitest run @files --no-file-parallelism --reporter=json --outputFile=tmp/hb0192-r1-la.json
$env:TZ='UTC'
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd build
node scripts/check-finance-coverage.mjs init tmp/hb0192-r1-gate-run
git diff --check
```

The isolated `-t R1` invocation passed all three new cases (14 others filtered); full final PG repeats them. Machine reports are temporary in the existing ignored `tmp`, excluded from the ZIP. No extra verification report or evidence directory was created.

### Remaining errors and limits

The full unit suite still has exactly these four known context failures:

- `HB15-G03 CLI rejection and repository contract returns nonzero for malformed current-run JSON and refuses context reuse`.
- `HB15-G03 CLI rejection and repository contract validates the actual normative inventory and approved timezone source list`.
- `HB19 finance inventory and honest verification status requires both added closing timezone files without reducing the prior source set`.
- `FPG-008 actual CLI init cannot record after a financial edit`.

The unchanged checker independently reports `NORMATIVE_CONTEXT_MISMATCH` for the same eight pre-approved documents:

- `docs/BUSINESS_RULES.md`
- `docs/DECISIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/architecture.json`
- `docs/PRD.md`
- `docs/UX.md`
- `docs/TASKS.md`
- `docs/OPEN_QUESTIONS.md`

Checker, manifest, receipts and CI were not serviced, expanded or bypassed. Separate owner authorization for context maintenance remains necessary before future publication. No green full-unit/gate claim.

Tool discovery found no usable browser/Node REPL execution tool. Real authenticated browser, native layout/zoom and physical AT remain NOT EXECUTED; component tests do not replace them. No browser infrastructure was installed. Repeat independent review and owner acceptance are pending.

D50–D53 remain unchanged: day H/K precision, 20-row keyset paging, metadata-first/on-demand detail, existing resource guards; no financial formulas/selectors/schema/migrations/confirmation writer changes, no new scaling infrastructure/secrets/sessions/cache, no HB-027. R1 adds no cleanup/deletions; the original 16 cleanup deletions and all 32 retained artifact hashes remain unchanged.

### Files, worktree preservation and repeat-review ZIP

Compared with the initial ZIP (SHA-256 `2f0f31fed2aa8702ca617ef16b22a2fe53993d9dab5a006c4258e61f422e874c`), R1 changes only:

- `src/features/financial-history/history-screen.tsx`.
- `src/infrastructure/db/financial-history-detail.ts`.
- `src/infrastructure/db/financial-history-index.ts`.
- `src/shared/i18n/messages/de.json`.
- `src/shared/i18n/messages/en.json`.
- `src/shared/i18n/messages/ru.json`.
- `tests/financial-history-ui.test.tsx`.
- `tests/integration/financial-history.test.ts`.
- `docs/planning/hb-019-2-verification.md`.

Original worktree: branch `feat/hb-019-1-budget-update-ux`, HEAD `5e6df62b4173c20dde51d4caff1d95adec5c8503`, exact status unchanged below. The ten approved document SHA-256 values match both worktrees and the recorded initial hashes. Real environment files remain untouched.

```text
M docs/ARCHITECTURE.md
 M docs/BUSINESS_RULES.md
 M docs/DECISIONS.md
 M docs/OPEN_QUESTIONS.md
 M docs/PRD.md
 M docs/TASKS.md
 M docs/UX.md
 M docs/architecture.json
 M docs/planning/hb-019-2-financial-history.md
 M tests/scenarios/phase-01/hb-019-2-financial-history.md
```

Correction worktree `git status --short`:

```text
M docs/ARCHITECTURE.md
 M docs/BUSINESS_RULES.md
 M docs/DECISIONS.md
 M docs/OPEN_QUESTIONS.md
 M docs/PRD.md
 M docs/TASKS.md
 M docs/UX.md
 M docs/architecture.json
 D docs/planning/hb-019-1-correction-evidence/diff-check.txt
 D docs/planning/hb-019-1-correction-evidence/index-stat.txt
 D docs/planning/hb-019-1-correction-evidence/integration.json
 D docs/planning/hb-019-1-correction-evidence/integration.receipt.json
 D docs/planning/hb-019-1-correction-evidence/run.json
 D docs/planning/hb-019-1-correction-evidence/timezone.json
 D docs/planning/hb-019-1-correction-evidence/timezone.receipt.json
 D docs/planning/hb-019-1-correction-evidence/unit.json
 D docs/planning/hb-019-1-correction-evidence/unit.receipt.json
 D docs/planning/hb-019-1-evidence/integration.json
 D docs/planning/hb-019-1-evidence/integration.receipt.json
 D docs/planning/hb-019-1-evidence/run.json
 D docs/planning/hb-019-1-evidence/timezone.json
 D docs/planning/hb-019-1-evidence/timezone.receipt.json
 D docs/planning/hb-019-1-evidence/unit.json
 D docs/planning/hb-019-1-evidence/unit.receipt.json
 M docs/planning/hb-019-1-finance-gate-verification.md
 M docs/planning/hb-019-1-verification.md
 M docs/planning/hb-019-2-financial-history.md
 M src/features/shell/app-shell.tsx
 M src/features/shell/section-icon.tsx
 M src/features/shell/sections.ts
 M src/infrastructure/db/budget-update-repository.ts
 M src/shared/i18n/messages/de.json
 M src/shared/i18n/messages/en.json
 M src/shared/i18n/messages/ru.json
 M tests/scenarios/phase-01/hb-019-2-financial-history.md
 M tests/shell.test.tsx
?? docs/planning/hb-019-2-verification.md
?? src/app/financial-history-boundary.ts
?? src/app/history/
?? src/domain/history/
?? src/features/financial-history/
?? src/infrastructure/db/financial-history-detail.ts
?? src/infrastructure/db/financial-history-index.ts
?? tests/financial-history-boundary.test.ts
?? tests/financial-history-feasibility.test.ts
?? tests/financial-history-ui.test.tsx
?? tests/integration/financial-history.test.ts
```

Tracked `git diff --stat` (untracked code/tests/report supplied in full in ZIP):

```text
docs/ARCHITECTURE.md                               |   14 +-
 docs/BUSINESS_RULES.md                             |   13 +
 docs/DECISIONS.md                                  |   65 ++
 docs/OPEN_QUESTIONS.md                             |   12 +-
 docs/PRD.md                                        |   10 +
 docs/TASKS.md                                      |   42 +-
 docs/UX.md                                         |   13 +-
 docs/architecture.json                             |    6 +
 .../hb-019-1-correction-evidence/diff-check.txt    |    0
 .../hb-019-1-correction-evidence/index-stat.txt    |    0
 .../hb-019-1-correction-evidence/integration.json  |    1 -
 .../integration.receipt.json                       |    1 -
 .../planning/hb-019-1-correction-evidence/run.json |    1 -
 .../hb-019-1-correction-evidence/timezone.json     |    1 -
 .../timezone.receipt.json                          |    1 -
 .../hb-019-1-correction-evidence/unit.json         |    1 -
 .../hb-019-1-correction-evidence/unit.receipt.json |    1 -
 docs/planning/hb-019-1-evidence/integration.json   |    1 -
 .../hb-019-1-evidence/integration.receipt.json     |    1 -
 docs/planning/hb-019-1-evidence/run.json           |    1 -
 docs/planning/hb-019-1-evidence/timezone.json      |    1 -
 .../hb-019-1-evidence/timezone.receipt.json        |    1 -
 docs/planning/hb-019-1-evidence/unit.json          |    1 -
 docs/planning/hb-019-1-evidence/unit.receipt.json  |    1 -
 .../planning/hb-019-1-finance-gate-verification.md |  133 +--
 docs/planning/hb-019-1-verification.md             | 1049 ++++++++++++++++++++
 docs/planning/hb-019-2-financial-history.md        |  837 +++++++++++++++-
 src/features/shell/app-shell.tsx                   |    2 +-
 src/features/shell/section-icon.tsx                |    1 +
 src/features/shell/sections.ts                     |    4 +-
 src/infrastructure/db/budget-update-repository.ts  |    2 +-
 src/shared/i18n/messages/de.json                   |   95 +-
 src/shared/i18n/messages/en.json                   |   95 +-
 src/shared/i18n/messages/ru.json                   |   95 +-
 .../phase-01/hb-019-2-financial-history.md         |  104 +-
 tests/shell.test.tsx                               |    4 +-
 36 files changed, 2420 insertions(+), 190 deletions(-)
```

Repeat-review archive: `tmp/HB-019.2-R1-review-2026-11-11.zip`, created from this worktree with all current local changes, necessary sources/tests/docs, tracked patch, exact change/deletion manifest and instructions. `.git`, all environment files, credentials and ignored runtime/build/machine artifacts are excluded. Prior ZIP preserved. CRC and per-entry hashes/sizes are verified; outer ZIP hash is supplied at handoff to avoid report self-reference.

No commit, staging, push, PR, merge, deploy or Done transition. Stop at repeat-review handoff; the owner accepts separately.


## Finance Gate context maintenance — 2026-11-11

**Owner reports independent R1 implementation review APPROVED: Critical 0 / High 0 / Medium 0 / Low 0.** The owner separately authorized this context-only technical stage. This maintenance patch now awaits its own independent review; HB-019.2 is not Done and no owner acceptance, commit, push, PR, merge or deploy is claimed.

All results in the initial/R1 sections remain historical. The previous NORMATIVE_CONTEXT_MISMATCH and four associated unit failures are resolved by the narrow manifest update below. Browser/320px/native 200% zoom/physical AT remain NOT EXECUTED.

### Exact change and preserved scope

Reviewed current BUSINESS_RULES, DECISIONS, ARCHITECTURE, architecture.json, PRD, UX, TASKS and OPEN_QUESTIONS against their previous context entries and the approved local D50–D53 changes. Updated exactly eight `contexts[].sha256` values in `tests/finance/coverage.json`. Hashes were calculated from actual UTF-8 document text with CRLF→LF normalization by the unchanged checker `sourceContexts` function. The document files themselves were not edited.

The entire original manifest was recovered byte-for-byte by replacing only these eight new hashes with their previous values. JSON deep comparison confirms every other field is unchanged. Scenario definitions/dispositions/obligations/guarantees, test references, timezoneFiles and typecheck entries are unchanged: 596 scenarios, 1171 references, 39 contexts, 16 timezone files. HBH-001–007 were not added to the gate. No tests, assertions, checker, CI, implementation, financial rules, schema, migration, dependencies or architecture were changed in this stage.

| Context path | Previous SHA-256 | Current SHA-256 |
|---|---|---|
| `docs/BUSINESS_RULES.md` | `0fa6fe5cbaa3b9f86967cad70f24fda188ddee20ea18ed27acccf2d365c8bafc` | `7b22cfbf3aa14f7f62acfe6afddf03985c2ea85d42fcb72f2560f39230d18538` |
| `docs/DECISIONS.md` | `ce3a60157ce4b118fc23bf08ecdf0f19d894ac8847c10806921847459bf55221` | `96c23b246ca54279f113f4213193fc576a223a93a612c2aad180944143094416` |
| `docs/ARCHITECTURE.md` | `b5dc7f1046a142fbc6f19a983f93bb5be269da4076ac525946ec0d74d06c6c69` | `94cb18cdc58ccfca0171c72a4f6b4c335d36c217dc69cee389dacfc11f317403` |
| `docs/architecture.json` | `de32658319ff23a2fbd73ee399d7279e651e857a50b26c99ebe78046231dd181` | `fd9349aa8c1ded613a886d04440f02609b50a15b9a3d73c0081c3e6aa3879225` |
| `docs/PRD.md` | `49af6d189b96363ec749c638504307aaa9f8164a2a6aee9643020e1b61a20f93` | `e4f72d7a496878e962b7532eabdb80240970170020a7c67e6fc9e5490cdd6ebb` |
| `docs/UX.md` | `20ad92addef49791487acc7c6c366e6cf53e252e475bf7855f840f85de4f9087` | `e77a3b0e10ff10db8525fc5b5723db122cbecbea0cd7dfa57722cd95443e29d9` |
| `docs/TASKS.md` | `b59a76540af129c998f7e7ea720123fa75be2e42ee3bbb2df8241cd3923c3d1d` | `7ed6130614c11a938379ca78419025a12464fb38e81dc41011b489246870410f` |
| `docs/OPEN_QUESTIONS.md` | `f386b9888eaacc82d3f454f60bf2a2e56976b5457aab10f6915b7d936f7fb850` | `421ff88b96c8e56c56cfe7b2da526531cafd2d63146c982267637d4430ab24ce` |

Raw manifest SHA-256 before: `9b0491ddee1f190fdcc4bad4eb90d451aa88b49dcac4eb4d59400f2f743ed00a`; after: `37687fcdf161a69075c7458154cff12828ee00a03648a96236275102f2837a91`. Git diff for this file is exactly 8 removed / 8 added hash lines.

### One fresh current-run gate

Existing worktree `D:\projects_js\home-budget-hb-019-2`, branch `feat/hb-019-2-financial-history`, unchanged HEAD/BASE `050c7b0e5d497fc016726bf705fc9b17fbd2f010`. Node v22.23.0 / pnpm 12.16.1.

Used the existing ignored `tmp` directory directly, with no new evidence directory. Before init, `run.json`, the three report paths and all three receipt paths were absent there. `init` created a new run and every report/receipt was generated after that init. No historical receipt was copied, modified or reused. Concurrent unit/integration executions shared the same immutable source fingerprint; each `record` ran only after its suite exited 0.

- Run ID: `73638a68-391f-4f51-9670-b1b2763928a7`.
- Started at: `2026-11-11T09:43:01.549000+00:00`.
- Root/job: `D:/projects_js/home-budget-hb-019-2` / `local`.
- Current source fingerprint: `7544cc1551ea9d4ea3b1c8e70046efbc6470452ee64483102e62f7a1fa67cdfc` (337 files, including updated manifest).

| Stage | Actual result | Exit |
|---|---|---:|
| `init tmp` | PASS, new run/fingerprint | 0 |
| unit | 1037/1037 PASS; 0 FAIL, 0 pending | 0 |
| `record tmp unit` | PASS, fresh receipt of this run | 0 |
| integration | 460/460 PASS; 0 FAIL, 0 pending | 0 |
| `record tmp integration` | PASS, fresh receipt of this run | 0 |
| timezone | 552/552 PASS; 0 FAIL, 0 pending | 0 |
| `record tmp timezone` | PASS, fresh receipt of this run | 0 |
| UTC vs LA required subset | 552 matching unique expanded test identities and PASS statuses | 0 |
| DB17 | 2 PASS, 0 FAIL; 458 filtered / NOT EXECUTED | 0 |
| Lint | PASS, zero warnings | 0 |
| Typecheck | PASS | 0 |
| Build | PASS, `/history` dynamic | 0 |
| `check tmp` | PASS, existing full Finance Gate | 0 |
| `git diff --check` | PASS | 0 |
| Real browser, 320px, native 200% zoom, physical AT | NOT EXECUTED | — |

The same four assertions that failed in R1 now actually PASS:

- `HB15-G03 CLI rejection and repository contract returns nonzero for malformed current-run JSON and refuses context reuse` — PASS.
- `HB15-G03 CLI rejection and repository contract validates the actual normative inventory and approved timezone source list` — PASS.
- `HB19 finance inventory and honest verification status requires both added closing timezone files without reducing the prior source set` — PASS.
- `FPG-008 actual CLI init cannot record after a financial edit` — PASS.

The exact manifest-required 16-file UTC subset is extracted from the full UTC unit report and equals the LA report, with no identity normalization. Canonical `(relative path, expanded full name, status)` SHA-256: `0088a9b647e61a25e1ddcafdd4828b9d0dc7dfd94d6cecf561023f57d8fe28b3`. These are the existing gate's 552 assertions; the earlier broader R1 576-case run is historical, not relabelled as fresh evidence. All history unit/component tests still execute in the current full unit run.

Fresh report/receipt verification (receipt run IDs equal the current run ID; report start/mtime after init; digest equals actual report bytes):

| Suite | Report SHA-256 / receipt digest | Receipt written UTC |
|---|---|---|
| unit | `36a7e01f1e1ee2e18f565067dad2dfcfb9f3df455f5c838e7980653c71a68972` | 2026-11-11T09:46:27.887200+00:00 |
| integration | `ccaae9f535238092e22a0df75dcf638af3416c431c507283cdb82ff70a6338e5` | 2026-11-11T09:49:55.225683+00:00 |
| timezone | `882703bdd66ee929bfff0e1e311e8d4483492b26114348be7fc073b3c46712e9` | 2026-11-11T09:47:41.359963+00:00 |

Actual unchanged checker stdout from `check tmp`:

```json
{
  "scenarios": 596,
  "dispositions": {
    "required": 552,
    "partial": 31,
    "deferred": 2,
    "verification": 11
  },
  "pendingVerifications": [
    {
      "id": "HB19-E08",
      "status": "NOT_EXECUTED"
    },
    {
      "id": "HB19-E09",
      "status": "NOT_EXECUTED"
    },
    {
      "id": "HB19-E10",
      "status": "NOT_EXECUTED"
    },
    {
      "id": "HB19-E11",
      "status": "NOT_EXECUTED"
    },
    {
      "id": "HB19-E12",
      "status": "NOT_EXECUTED"
    },
    {
      "id": "HB19-E13",
      "status": "NOT_EXECUTED"
    },
    {
      "id": "HB19-E14",
      "status": "NOT_EXECUTED"
    },
    {
      "id": "HB19-F05",
      "status": "OUTSIDE_RUNTIME_GATE"
    },
    {
      "id": "HB19-F06",
      "status": "PENDING_INDEPENDENT_REVIEW"
    },
    {
      "id": "HB19-F07",
      "status": "HISTORICAL_PLANNING_ONLY"
    },
    {
      "id": "HB19-Q07",
      "status": "NOT_EXECUTED"
    }
  ],
  "obligations": 803,
  "references": 1171,
  "unit": 1037,
  "integration": 460,
  "timezone": 552
}
```

The checker's eleven verification dispositions remain exactly as before, including browser/AT and HB19-Q07 NOT_EXECUTED. Gate PASS proves execution of the existing runtime bindings; it does not grant those pending verifications, enforce new HBH bindings, mark the implementation Done or grant owner acceptance.

### Exact commands and isolated target

All commands ran from the correction worktree above. Owned disposable container `hb0192-20261109-implementation`, ID `b8aeeeb33ca696cf429cc7abd9afb133800ab5dc75e6d52eafe6d8d65636451c`, task/purpose labels verified before restart. Current mapping `127.0.0.1:50118`, PostgreSQL 18; synthetic data and fresh UUID child databases via existing local-target guards. No foreign container, production/Neon, real financial data, `.env` or OAuth access. Credentials are intentionally omitted below.

```powershell
node scripts/check-finance-coverage.mjs init tmp
$env:TZ='UTC'
pnpm.cmd exec vitest run --no-file-parallelism --reporter=json --outputFile=tmp/unit.json
node scripts/check-finance-coverage.mjs record tmp unit
$env:HB_TEST_DATABASE_TARGET='disposable-local-container'
$env:HB_DATABASE_TARGET='isolated-development'
$env:DATABASE_URL='<synthetic credential URL at 127.0.0.1:50118/hb0192>'
$env:DATABASE_URL_UNPOOLED=$env:DATABASE_URL
$env:TEST_DATABASE_URL=$env:DATABASE_URL
pnpm.cmd exec vitest run --config vitest.integration.config.ts --reporter=json --outputFile=tmp/integration.json
node scripts/check-finance-coverage.mjs record tmp integration
$env:TZ='America/Los_Angeles'
node scripts/check-finance-coverage.mjs timezone tmp
node scripts/check-finance-coverage.mjs record tmp timezone
$env:TZ='UTC'
pnpm.cmd exec vitest run --config vitest.integration.config.ts -t DB17 --reporter=json --outputFile=tmp/hb0192-maint-db17.json
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd build
node scripts/check-finance-coverage.mjs check tmp
git diff --check
```

`check` stdout was captured unmodified in an ignored temporary JSON file. No reports were rewritten to satisfy admission. All required test and gate commands succeeded; no non-checksum product/gate problem required a change. A read-only preservation helper was rerun with repository-owner permissions and sufficient stdout buffer for the existing large manifest; neither Git configuration nor repository content was changed by those retries.

### Preservation and handoff

Compared with the independently approved R1 ZIP (SHA-256 `b355b2fdc5959cec2f9b19d7746a7c104b7e9d7c90264b3b322a4087a17901ce`), this stage changes only:

- `tests/finance/coverage.json`: eight context SHA-256 values.
- `docs/planning/hb-019-2-verification.md`: this execution record/current-section link.

All other nonignored files match their pre-maintenance SHA-256 values. Existing R1/history implementation and tests are preserved, including all original local changes and earlier controlled cleanup. Original worktree remains on `feat/hb-019-1-budget-update-ux`, HEAD `5e6df62b4173c20dde51d4caff1d95adec5c8503`; exact status below unchanged. All ten approved document hashes match their recorded values in both worktrees. Empty index, no commit/publication or Done change.

Original worktree `git status --short`:

```text
M docs/ARCHITECTURE.md
 M docs/BUSINESS_RULES.md
 M docs/DECISIONS.md
 M docs/OPEN_QUESTIONS.md
 M docs/PRD.md
 M docs/TASKS.md
 M docs/UX.md
 M docs/architecture.json
 M docs/planning/hb-019-2-financial-history.md
 M tests/scenarios/phase-01/hb-019-2-financial-history.md
```

Current worktree `git status --short`:

```text
M docs/ARCHITECTURE.md
 M docs/BUSINESS_RULES.md
 M docs/DECISIONS.md
 M docs/OPEN_QUESTIONS.md
 M docs/PRD.md
 M docs/TASKS.md
 M docs/UX.md
 M docs/architecture.json
 D docs/planning/hb-019-1-correction-evidence/diff-check.txt
 D docs/planning/hb-019-1-correction-evidence/index-stat.txt
 D docs/planning/hb-019-1-correction-evidence/integration.json
 D docs/planning/hb-019-1-correction-evidence/integration.receipt.json
 D docs/planning/hb-019-1-correction-evidence/run.json
 D docs/planning/hb-019-1-correction-evidence/timezone.json
 D docs/planning/hb-019-1-correction-evidence/timezone.receipt.json
 D docs/planning/hb-019-1-correction-evidence/unit.json
 D docs/planning/hb-019-1-correction-evidence/unit.receipt.json
 D docs/planning/hb-019-1-evidence/integration.json
 D docs/planning/hb-019-1-evidence/integration.receipt.json
 D docs/planning/hb-019-1-evidence/run.json
 D docs/planning/hb-019-1-evidence/timezone.json
 D docs/planning/hb-019-1-evidence/timezone.receipt.json
 D docs/planning/hb-019-1-evidence/unit.json
 D docs/planning/hb-019-1-evidence/unit.receipt.json
 M docs/planning/hb-019-1-finance-gate-verification.md
 M docs/planning/hb-019-1-verification.md
 M docs/planning/hb-019-2-financial-history.md
 M src/features/shell/app-shell.tsx
 M src/features/shell/section-icon.tsx
 M src/features/shell/sections.ts
 M src/infrastructure/db/budget-update-repository.ts
 M src/shared/i18n/messages/de.json
 M src/shared/i18n/messages/en.json
 M src/shared/i18n/messages/ru.json
 M tests/finance/coverage.json
 M tests/scenarios/phase-01/hb-019-2-financial-history.md
 M tests/shell.test.tsx
?? docs/planning/hb-019-2-verification.md
?? src/app/financial-history-boundary.ts
?? src/app/history/
?? src/domain/history/
?? src/features/financial-history/
?? src/infrastructure/db/financial-history-detail.ts
?? src/infrastructure/db/financial-history-index.ts
?? tests/financial-history-boundary.test.ts
?? tests/financial-history-feasibility.test.ts
?? tests/financial-history-ui.test.tsx
?? tests/integration/financial-history.test.ts
```

Current review ZIP: `tmp/HB-019.2-finance-gate-review-2026-11-11.zip`, built from the current worktree with all local changes and necessary repository sources/tests/docs, tracked patch, exact change/deletion manifest and instructions. Fresh machine reports/receipts stay ignored locally and are excluded, alongside `.git`, all environment files, secrets and build/dependency artifacts. Their run ID/digests and gate result are recorded above. Prior ZIPs are preserved. Archive CRC, per-entry bytes/hashes and complete changed-file inclusion are verified; its outer SHA-256 is supplied at handoff.

Maintenance is handed to the owner for independent verification. R1 implementation approval is recorded as the owner's report, not extended into owner acceptance or a Done transition. Browser/320px/native200%/physical AT remain NOT EXECUTED.

After all checks, only the verified owned disposable container was stopped; no container was removed. The source fingerprint remains unchanged and only the authorized manifest/report files differ from the approved R1 snapshot.


## Final documentation and publication preparation — 2026-11-11

The owner explicitly authorizes documentation finalization, feature-branch commit/push and a PR to main. Implementation R1 and separate Finance Gate context maintenance are independently APPROVED (0/0/0/0 each, owner-reported). This is not HB-019.2 Owner Acceptance. HB-019.2 is **Review / awaiting Owner Acceptance**; no Done, merge/auto-merge/squash or deploy is authorized.

### D54 and final document changes

Free decision ID D54 was verified (previous maximum D53). Added a dated decision without rewriting D46–D53/Accepted ADR chronology. Updated only existing DECISIONS, TASKS, history plan, HBH scenario ownership note and this report. Required real-browser/AT checks now belong to HB-021 and must be executed before HB-021 acceptance: auth/navigation; current/past, original/later/immutable-v1/v2/reload; pagination/filter/refresh/error/basis/privacy/no-write flows; RU/DE/EN; 320px and desktop; native 200% zoom; keyboard/focus/announcements; physical screen-reader output. Every such check is **NOT EXECUTED**, not PASS. HBH-001–007 IDs, all numerical oracles and financial/U/C/P obligations remain unchanged. HB-027 is Post-MVP, A/B unselected, not an MVP blocker.

DECISIONS and TASKS are the only newly changed manifest contexts. Their actual normalized SHA-256 values were refreshed; the manifest's definitions, guarantees, references, timezone set and checker/CI remain unchanged. The HBH file changes the source fingerprint but is not added as a gate binding. Runtime, executable assertions, formulas, schema/migrations and architecture still match the approved R1+maintenance snapshot. The only test formatting change is the single extra EOF CRLF removed as described below.

| Updated context | Previous SHA-256 | Final SHA-256 |
|---|---|---|
| `docs/DECISIONS.md` | `96c23b246ca54279f113f4213193fc576a223a93a612c2aad180944143094416` | `21004a5b37b46cb2b5a4267dd4bc41863a43ed246bc13cc609e23ac69f2dfcfc` |
| `docs/TASKS.md` | `7ed6130614c11a938379ca78419025a12464fb38e81dc41011b489246870410f` | `83da10f332fad99ec485fe64503f94c7c8f03d955678ecd580bd2bd629f76bbf` |

### Baseline, preserved work and reviewed scope

Native `git fetch origin main` and `git ls-remote` verified current remote main before editing and again immediately before commit preparation. BASE, starting HEAD and merge-base are all `050c7b0e5d497fc016726bf705fc9b17fbd2f010`. Remote feature branch and open PR were absent. `git log origin/main..HEAD` was empty before the new feature commit: the squash-merged HB-019.1 ancestry was not replayed. No local main update, force push, reset/clean/stash or old-branch cherry-pick.

Starting worktree was byte-verified against the independently approved R1+Finance-Gate ZIP (`dd9d09010cd40ac35ac3506f84bb208045b483850c7ff9c5d90497ee3881c51e`). All ten originally approved uncommitted documents were present. Original `D:\projects_js\home-budget` remains on `feat/hb-019-1-budget-update-ux`, HEAD `5e6df62b4173c20dde51d4caff1d95adec5c8503`, with its exact ten document hashes/status untouched. In this feature worktree six of those documents remain byte-identical to the original approved versions; DECISIONS/TASKS/plan/HBH have only the explicitly authorized finalization changes. Normalized D46–D53 text and the complete HBH shared fixture/scenario oracle section were compared to the reviewed ZIP and preserved.

All 16 previously agreed deletions were rechecked against `git show BASE:path`: exact SHA-256 and Git blob IDs match, and the current published GitHub tree independently contains the same 16 path/blob objects at immutable BASE permalinks. All 32 retained HB-019.1 artifact hashes match; final accepted bundle, unique LA evidence and all conditional HB-017 screenshots remain. There is no additional cleanup. The full 16-path/archive/hash map remains above and in the consolidated HB-019.1 primary report; the PR lists every deletion.

Tracked/untracked/ignored enumeration was checked. Existing ignored paths `.next/`, `next-env.d.ts`, `node_modules/`, `tmp/`, `tsconfig.tsbuildinfo` are not publication inputs. No `.env`, `.vscode`, secrets, real bank data or temporary current-run receipts are staged. No real environment/OAuth/Neon/production data was read or changed. New relative-file links: 0 broken (4 pre-existing broken file links unchanged); D54 anchor checked.

### Fresh final local verification

CWD `D:/projects_js/home-budget-hb-019-2`, Node v22.23.0 / pnpm 12.16.1. New run ID `3d36cbd0-da03-4764-bad3-a0261ece6755`, started `2026-11-11T19:41:20.202000+00:00`. **Final local Windows fingerprint `8400315b3559804ac5d8c417ff08515b7b3929b507ef2ac4c1ffeb55751249b4`**, one unchanged tree for all successful reports/receipts. Existing Git text filters may normalize CRLF in committed blobs; the remote CI must independently verify its actual checkout rather than reusing local receipts.

| Check | Actual result | Exit |
|---|---|---:|
| Gate init | PASS, new run | 0 |
| Full unit | 1037/1037 PASS; 0 FAIL / pending | 0 |
| `record tmp unit` | PASS, new receipt of this run | 0 |
| Full integration | 460/460 PASS; 0 FAIL / pending | 0 |
| `record tmp integration` | PASS, new receipt of this run | 0 |
| Full timezone | 552/552 PASS; 0 FAIL / pending | 0 |
| `record tmp timezone` | PASS, new receipt of this run | 0 |
| UTC/LA required set | 552 identical expanded identities/statuses, checked by gate | 0 |
| DB17 | 2 PASS, 0 FAIL; 458 filtered, not passes | 0 |
| Lint / typecheck / build | PASS; `/history` dynamic | 0 each |
| `python scripts/check_agent_docs.py` | PASS, 22 core files / 10 skills / architecture | 0 |
| Final `check tmp` | PASS; 596 scenarios / 1171 references / 803 obligations | 0 |
| `git diff --check` | PASS | 0 |
| Real browser/auth/navigation, RU/DE/EN, 320px/desktop/native200%/keyboard/physical AT | NOT EXECUTED; HB-021 owns execution under D54 | — |

The preliminary publication run at fingerprint `6c1f81a56381bb4fcc0a2314381f85c694b0fd4462025d83b812e4b65f1f491e` produced 1036 PASS / 1 FAIL when FPG-008 exceeded its unchanged 5000ms timeout, then 1037/1037 in one quiet full repeat on identical code. Its failed report remains `tmp/hb0192-publication-unit-timeout.json`; no receipt was created for the failed attempt. Initial authorization for the read-only docs check timed out; its allowed single retry passed without repository/Git-config changes.

Initial explicit staging then exposed one blank line at EOF in the new `tests/financial-history-feasibility.test.ts`, previously untracked. Removed exactly one extra CRLF (2 bytes); all executable test tokens/assertions are identical. `git diff --cached --check` now passes. Because this changes the byte fingerprint, the entire previous publication run was preserved under `tmp/hb0192-pre-whitespace-*`, and a completely new init/full integration/DB17/full UTC unit/LA/record/check sequence was run on the final fingerprint above. Lint/typecheck/build/docs-check were also repeated. Final checks were sequenced to avoid resource contention; every final command passed at the existing limits. No old receipt or preliminary result is claimed as evidence for this final tree. No checker, test, assertion or timeout was weakened.

Earlier maintenance run/reports/receipts were preserved under `tmp/hb0192-context-*`; the complete preliminary publication run was preserved under `tmp/hb0192-pre-whitespace-*` before the final new init. No old receipt was reused, and no extra evidence directory was created. All three new receipt run IDs and report SHA-256 digests were verified:

| Suite | Report SHA-256 / receipt digest |
|---|---|
| unit | `7d13e035d1d3d88451891e77b69dbfa8be7c300bc34e950a248b4852030ab1ce` |
| integration | `bbd216eb7a0c164616f13b9d0ee3f9a3f6002b2fe4d6e05734986d2254c8a9d8` |
| timezone | `10ca9e77520fbc6bd714c8fcca0b625c0f04f7a902998d1be99c041e80c03091` |

The existing gate still retains all eleven previous verification dispositions; browser/AT and HB19-Q07 remain unexecuted, not converted into PASS. Gate execution does not enforce new HBH bindings or grant acceptance.

Exact final commands (only synthetic credential URL redacted; target was the verified owned disposable container `hb0192-20261109-implementation`, ID `b8aeeeb33ca696cf429cc7abd9afb133800ab5dc75e6d52eafe6d8d65636451c`, mapped at `127.0.0.1:51324`; each integration suite creates a fresh UUID child DB):

```powershell
git fetch origin main
git ls-remote origin refs/heads/main refs/heads/feat/hb-019-2-financial-history
node scripts/check-finance-coverage.mjs init tmp
$env:TZ='UTC'
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd build
python scripts/check_agent_docs.py
$env:HB_TEST_DATABASE_TARGET='disposable-local-container'
$env:HB_DATABASE_TARGET='isolated-development'
$env:DATABASE_URL='<synthetic credential URL at 127.0.0.1:51324/hb0192>'
$env:DATABASE_URL_UNPOOLED=$env:DATABASE_URL
$env:TEST_DATABASE_URL=$env:DATABASE_URL
pnpm.cmd exec vitest run --config vitest.integration.config.ts --reporter=json --outputFile=tmp/integration.json
node scripts/check-finance-coverage.mjs record tmp integration
pnpm.cmd exec vitest run --config vitest.integration.config.ts -t DB17 --reporter=json --outputFile=tmp/hb0192-publication-db17.json
pnpm.cmd exec vitest run --no-file-parallelism --reporter=json --outputFile=tmp/unit.json
node scripts/check-finance-coverage.mjs record tmp unit
$env:TZ='America/Los_Angeles'
node scripts/check-finance-coverage.mjs timezone tmp
node scripts/check-finance-coverage.mjs record tmp timezone
node scripts/check-finance-coverage.mjs check tmp
git diff --cached --check
```

The command list describes the successful evidence; unit first-attempt timeout and the single unchanged-code full repeat are explicitly recorded above. Execution overlaps do not imply a different fingerprint. Freshness `check` succeeded within the checker's own time window.

### Publication boundary and status evidence

This section is finalized before the feature commit. The exact commit/PR/Actions identifiers and post-publication status are recorded in the PR description and final user handoff after those actions; no remote CI PASS is claimed here in advance. Publish only the feature branch with an ordinary push, open a PR against main, inspect CI and leave the PR open for the owner's separate acceptance/merge. No auto-merge, squash, deploy or Done.

Full starting feature status (before this documentation finalization):

```text
 M docs/ARCHITECTURE.md
 M docs/BUSINESS_RULES.md
 M docs/DECISIONS.md
 M docs/OPEN_QUESTIONS.md
 M docs/PRD.md
 M docs/TASKS.md
 M docs/UX.md
 M docs/architecture.json
 D docs/planning/hb-019-1-correction-evidence/diff-check.txt
 D docs/planning/hb-019-1-correction-evidence/index-stat.txt
 D docs/planning/hb-019-1-correction-evidence/integration.json
 D docs/planning/hb-019-1-correction-evidence/integration.receipt.json
 D docs/planning/hb-019-1-correction-evidence/run.json
 D docs/planning/hb-019-1-correction-evidence/timezone.json
 D docs/planning/hb-019-1-correction-evidence/timezone.receipt.json
 D docs/planning/hb-019-1-correction-evidence/unit.json
 D docs/planning/hb-019-1-correction-evidence/unit.receipt.json
 D docs/planning/hb-019-1-evidence/integration.json
 D docs/planning/hb-019-1-evidence/integration.receipt.json
 D docs/planning/hb-019-1-evidence/run.json
 D docs/planning/hb-019-1-evidence/timezone.json
 D docs/planning/hb-019-1-evidence/timezone.receipt.json
 D docs/planning/hb-019-1-evidence/unit.json
 D docs/planning/hb-019-1-evidence/unit.receipt.json
 M docs/planning/hb-019-1-finance-gate-verification.md
 M docs/planning/hb-019-1-verification.md
 M docs/planning/hb-019-2-financial-history.md
 M src/features/shell/app-shell.tsx
 M src/features/shell/section-icon.tsx
 M src/features/shell/sections.ts
 M src/infrastructure/db/budget-update-repository.ts
 M src/shared/i18n/messages/de.json
 M src/shared/i18n/messages/en.json
 M src/shared/i18n/messages/ru.json
 M tests/finance/coverage.json
 M tests/scenarios/phase-01/hb-019-2-financial-history.md
 M tests/shell.test.tsx
?? docs/planning/hb-019-2-verification.md
?? src/app/financial-history-boundary.ts
?? src/app/history/actions.ts
?? src/app/history/page.tsx
?? src/domain/history/contracts.ts
?? src/domain/history/validation.ts
?? src/features/financial-history/history-screen.tsx
?? src/features/financial-history/read-history.ts
?? src/infrastructure/db/financial-history-detail.ts
?? src/infrastructure/db/financial-history-index.ts
?? tests/financial-history-boundary.test.ts
?? tests/financial-history-feasibility.test.ts
?? tests/financial-history-ui.test.tsx
?? tests/integration/financial-history.test.ts
```

Status before initial explicit staging (same final path set; EOF correction described above):

```text
M docs/ARCHITECTURE.md
 M docs/BUSINESS_RULES.md
 M docs/DECISIONS.md
 M docs/OPEN_QUESTIONS.md
 M docs/PRD.md
 M docs/TASKS.md
 M docs/UX.md
 M docs/architecture.json
 D docs/planning/hb-019-1-correction-evidence/diff-check.txt
 D docs/planning/hb-019-1-correction-evidence/index-stat.txt
 D docs/planning/hb-019-1-correction-evidence/integration.json
 D docs/planning/hb-019-1-correction-evidence/integration.receipt.json
 D docs/planning/hb-019-1-correction-evidence/run.json
 D docs/planning/hb-019-1-correction-evidence/timezone.json
 D docs/planning/hb-019-1-correction-evidence/timezone.receipt.json
 D docs/planning/hb-019-1-correction-evidence/unit.json
 D docs/planning/hb-019-1-correction-evidence/unit.receipt.json
 D docs/planning/hb-019-1-evidence/integration.json
 D docs/planning/hb-019-1-evidence/integration.receipt.json
 D docs/planning/hb-019-1-evidence/run.json
 D docs/planning/hb-019-1-evidence/timezone.json
 D docs/planning/hb-019-1-evidence/timezone.receipt.json
 D docs/planning/hb-019-1-evidence/unit.json
 D docs/planning/hb-019-1-evidence/unit.receipt.json
 M docs/planning/hb-019-1-finance-gate-verification.md
 M docs/planning/hb-019-1-verification.md
 M docs/planning/hb-019-2-financial-history.md
 M src/features/shell/app-shell.tsx
 M src/features/shell/section-icon.tsx
 M src/features/shell/sections.ts
 M src/infrastructure/db/budget-update-repository.ts
 M src/shared/i18n/messages/de.json
 M src/shared/i18n/messages/en.json
 M src/shared/i18n/messages/ru.json
 M tests/finance/coverage.json
 M tests/scenarios/phase-01/hb-019-2-financial-history.md
 M tests/shell.test.tsx
?? docs/planning/hb-019-2-verification.md
?? src/app/financial-history-boundary.ts
?? src/app/history/actions.ts
?? src/app/history/page.tsx
?? src/domain/history/contracts.ts
?? src/domain/history/validation.ts
?? src/features/financial-history/history-screen.tsx
?? src/features/financial-history/read-history.ts
?? src/infrastructure/db/financial-history-detail.ts
?? src/infrastructure/db/financial-history-index.ts
?? tests/financial-history-boundary.test.ts
?? tests/financial-history-feasibility.test.ts
?? tests/financial-history-ui.test.tsx
?? tests/integration/financial-history.test.ts
```

Original worktree status, unchanged:

```text
M docs/ARCHITECTURE.md
 M docs/BUSINESS_RULES.md
 M docs/DECISIONS.md
 M docs/OPEN_QUESTIONS.md
 M docs/PRD.md
 M docs/TASKS.md
 M docs/UX.md
 M docs/architecture.json
 M docs/planning/hb-019-2-financial-history.md
 M tests/scenarios/phase-01/hb-019-2-financial-history.md
```
