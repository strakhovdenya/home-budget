# HB-022 / HB22-P1 — feasibility review, 2026-11-16

## Later scope correction — owner 2026-11-16 (D61)

The owner excludes the separate confirmed-transfer chronology from HB-022 and authorizes the sequential reduced read-only P1→P4 pass under [D61](../DECISIONS.md#hb-022-reduced-read-only-analytics-scope--owner-2026-11-16). The complete previous report below, including B01, PG57/111 queries, old status, commands and limitations, is retained unchanged as historical evidence. B01 is not fixed in the engine and does not automatically block or pass the reduced scope. Remaining shown checkpoint/state/funding/report facts must independently satisfy their necessary proof and resource gates without changing existing readers/verifiers/selectors/tests. Current reduced-scope results are recorded separately in the new HB-022 read-only verification report; the earlier test files remain untouched.

**Status: FEASIBILITY BLOCKED / REVIEW. P1 is not implemented or fully verified.** Only new synthetic feasibility tests and this report are retained. There is no analytics domain port, production reader, Server Action, route or UI in the delivered tree. No HB task is marked Done; P2–P4 are not started. Independent review and a decision about the source-proof boundary are required before further implementation.

## Authority and preserved baseline

The owner accepts DOC-HB22-01 and separately authorizes P1 in the request dated 2026-11-16. This is the current session's authority; the preserved plan/D60 still records the earlier prohibition on P1–P4. TASKS/DECISIONS are deliberately not changed in this task. Q22-01–04 and approved UX are not reopened.

Starting branch `main`, HEAD `3f166c100715cd5ac6c23d2ed6ab88f8c94a21f7`. Safe branch creation retained the dirty tree; current branch is `feat/hb-022-p1-feasibility`, same HEAD. Initial sandbox ref-lock denial was resolved by the authorized elevated `git switch -c`; no reset, stash, index change or publication.

The starting status was nine modified documents plus the untracked analytics plan:

```text
 M docs/ARCHITECTURE.md
 M docs/DATA_MODEL.md
 M docs/DECISIONS.md
 M docs/IMPLEMENTATION_PLAN.md
 M docs/TASKS.md
 M docs/planning/hb-019-2-financial-history.md
 M docs/planning/hb-019-2-verification.md
 M docs/planning/hb-020-first-run-and-recurring-templates.md
 M docs/planning/hb-020-implementation-verification.md
?? docs/planning/hb-022-analytics.md
```

`tmp/hb22-p1-review/baseline.json` records this status, branch/HEAD and SHA-256 for 737 existing source/test/document/skill files. All 737 are unchanged by P1, including the accepted dirty DOC-HB22-01 documents. No existing tests/assertions/fixtures, rules, ADRs, selectors, schema, migrations, dependencies, env, auth, CI or Finance Gate were edited. Empty exploratory analytics files were not retained: a draft contract/reader was discarded before any action or route was connected because its source completeness was not proven. Its transient lint findings are not represented as a passing implementation.

## B01 — a selected snapshot is not a confirmed-transfer chronology

Affected requirement: P1 contract D/E/G and the funding/confirmed-decision foundation for P4. The full source proof must attest to the original saved confirmation, not merely a coherent selected state, metadata or the first history page. This distinction is already enforced by the existing history SOURCE reader.

Existing boundaries:

| Request / proof stage | Existing implementation | What it establishes |
|---|---|---|
| Session → owned account | Existing history actions and auth boundary | Existing ownership path; no new analytics action is connected |
| Captured index Basis → owned selected batch | History index/detail | Retained anchor/cut and typed source membership, not full original proof |
| One scoped H/K → state | `readProjectionContext` and existing selectors | Checkpoint/vector, selected identities and full state; not every cash-only transition's original confirmation |
| Aggregate batch → original confirmation proof | `originalEvidence` | Original payload hash/receipt/review, reconstructed pre-state and result, proposal/decision/transfer mapping |
| Legacy transition → original proof | Private `legacyProof` in history detail | Its own per-batch legacy confirmation/proposal/decision proof |
| Immutable report → original proof | Existing report reader | Report-specific source/version/chain proof and its separate operation budget |
| New analytics DTO | Not delivered | Completeness must not be claimed until B01 is resolved |

Exact reuse points:

- [Projection loader](../../src/infrastructure/db/projection-reader.ts): loads decisions/audits once, but only supplies a decision to funding-proof validation when a lifecycle event references it. A cash-only FRESH_START has no FUNDING_TRANSFER event to drive that proof.
- [Original aggregate verifier](../../src/infrastructure/db/budget-update-repository.ts): `originalEvidence`, two unconditional `readProjectionContext` calls (pre-command and result), followed by per-batch decision/transfer/proposal checks. Its public signature has no shared source context/cut cache or cumulative resource budget.
- [History detail](../../src/infrastructure/db/financial-history-detail.ts): explicitly invokes `originalEvidence` before SOURCE disclosure; `legacyProof` is private and also selected-batch oriented. Metadata is explicitly insufficient.

### Minimal executed reproduction

New [PG feasibility test](../../tests/integration/analytics-feasibility.test.ts):

1. Create a fresh child DB under a verified owned disposable PG18; apply existing migrations. Create a synthetic owner/account and genuinely confirm an aggregate bank check: previous month B/A=10000 EUR cents.
2. Genuinely confirm cash-only FRESH_START: actual B=8000, current A=8000, no obligations/savings/funding events. Old-period A/R/S/F is 0 on the new state; a future empty period is also proved 0 through existing `projectPeriod`, with no closing-only option.
3. Through a separate SELECT-only login, verify ordinary context and full SOURCE. All 20 public-table snapshots remain identical before/after reads.
4. In a separate privileged synthetic fixture transaction only, change the saved BUDGET_UPDATE_REVIEW command reason while retaining the original payload identity. `SET LOCAL session_replication_role='replica'` permits this deliberate corruption; the setting returns to `origin` on exit. This is fixture corruption, not a production write or weakened runtime grant.
5. The same ordinary context returns an identical snapshot. History metadata still reports `sourceValidity=VALID`. The full SOURCE reader correctly refuses `HISTORY_SOURCE_INVALID`. All 20 table snapshots remain unchanged after successful and refused reads. Foreign-owner access to the same account is refused.

**Observed:** a coherent snapshot plus VALID metadata cannot safely label that cash-only decision as a proven original confirmation. This is not a defect claim against projection, whose contract is selected state. Analytics would weaken evidence scope if it reused that projection as a complete source-proof contract.

### Resource evidence and why this stops the proposed reuse

The test instruments real `pg.Client.query` calls with a pass-through Vitest spy; no result is mocked. It restores the spy before leaving the measurement section. Counts include transaction commands:

| Actual operation, same tiny fixture | Measured SQL |
|---|---:|
| Original proof of one selected aggregate batch | 57 |
| Original proofs of two batches inside one read-only transaction | 111 |

Two proofs repeat four projection-context loads; one repeats two. The observed increment is 54 queries on this fixture, not a universal worst-case formula. Each context repeats its own preflight, source materialization and historical validation. A loop over every saved update/decision would reintroduce the explicitly prohibited per-update fan-out, and the existing per-reader guards would not themselves prove an aggregate request budget. Fetching all history pages/details in a client, passing partial proofs as totals, or wrapping the existing DB API to pretend multiple reads share a context would not resolve this boundary.

No mathematical impossibility of analytics is claimed. **The tested unchanged-reader composition does not meet the authorized no-fan-out/full-proof contract.** A new port and checked grouping alone do not supply the missing bulk original-confirmation proof. The work therefore stops at this source-proof boundary instead of shipping an incomplete reader or weakening SOURCE admission.

### Decision needed after independent review

Review whether the owner permits a narrowly scoped refactor/extraction of the existing original-confirmation verifiers into a transaction-local bulk proof API with a shared retained-source context, cut cache and one cumulative admission budget. Preserve existing semantics, receipts, source/legacy/report verification and selectors; no new assembler, formula, schema or increased guard. This changes the existing verified-reader boundary beyond merely adding a port/grouping and must be explicit under the current prohibition on changing existing source selectors/bypassing read boundaries.

Alternatively, the owner may explicitly reduce the first scope to selected-state analytics plus individually selected original SOURCE details, deferring complete confirmed-transfer chronology. This is a scope change, not silently applied here. Q22-03's approved read-only principle and all other Q22 decisions remain intact.

## Foundation tests and traceability

| Requirement / scenario | Executed evidence | Limit of conclusion |
|---|---|---|
| HB22-01; BR-10 ownership/no-write | New PG test, SELECT-only login, foreign owner refusal, 20-table equality after successful/refused existing-reader operations | No new action/session or analytics cursor endpoint exists; that coverage is NOT EXECUTED |
| HB22-02/09; BR-01/08/11 correction at K before H/range | New unit test moves a real logical check beyond H using existing confirmation/selectors; original K remains observed, later K has no observation | Foundation only, not a new analytics page contract |
| HB22-03 stable pages | Existing 17-test history PG regression includes pinned cut, concurrent append, basis/rank refusal | New checkpoint >100 paging/refresh contract NOT EXECUTED |
| HB22-04 immutable reports | Existing history PG regression includes original/later and immutable v1/v2 proof | New analytics report id/version/digest continuation NOT EXECUTED |
| HB22-05 limits/completeness | New unit test checks exact row/byte/work/period guard boundaries and +1; new PG proof-gap; existing history PG admission regressions | No whole-request analytics budget is proved; identity/wire/chain stress fixtures for the new port NOT EXECUTED |
| HB22-07 bank/transfer distinction | New PG cash-only FRESH_START plus original proof; new unit nonadjacent comparison uses NOT_AVAILABLE operations | No complete transfer chronology DTO; this is the blocked foundation |
| HB22-08 auxiliary same-day ordering | New unit: two actual equal same-day checks, retained order, absent observedAt preserved | No intraday state picker or chart introduced |
| HB22-11 UNKNOWN/zero; BR-01/03 | New unit distinguishes NO_OBSERVATION from observed zero and queries proved empty old period; existing history PG verifies zero/full R/S versus unknown | New analytics UNKNOWN DTO NOT EXECUTED |
| HB22-12 / D36 | Existing selected forecast regression suites, including unchanged safe-main integer oracles | No alternative daily limit or new formula |
| HB22-16 past/empty/future reachability | New PG verifies old and future zero rows after FRESH_START with ordinary context/projectPeriod | Full HB22-16 earmarked fixture not added; preserved existing tests supply regression evidence only |
| HB22-17 grouping/filter/page independence | NOT EXECUTED for new analytics | No filtered U[p] totals or partial grouping shipped |

The new unit test also proves nonadjacent D=-3000 via `reconcileInterval`, known/unexplained=null, no fabricated bank flow. Boundary function calls are admission tests, not proof of a fully materialized 20,000-row/8MiB worst case.

## Resource model: known bounds and unproved obligations

| Path / resource | Existing bound or behavior | P1 observation |
|---|---|---|
| Ordinary projection sources | 20,000 rows, 8MiB, selected identities 1000, periods 1200; W²≤4,000,000 | Guard acceptance at rows20000/bytes8388608/W2000/periods1200 and independent +1 refusals executed; no limits changed |
| Ordinary period reachability | Owner/account-scoped period census; no closing-only flag used in new tests | Past and future zero rows reachable on the tested complete state |
| Projection work | Repeated existing chronological/lifecycle validation, bounded per context | No cumulative new-port budget or instrumented worst-case traversal guarantee claimed |
| Original aggregate SOURCE | Two context loads plus batch/proposal/decision/transfer proof per call | 57 / 111 real SQL measurements; no shared budget/cache input |
| History SOURCE/detail wire | Existing 1MiB response and 100-evidence pages | Existing regression passes; not a new analytics paging contract |
| Reports | Existing chain≤1000, canonical work≤4M, document≤8MiB, chunk131072, version page50 | Existing regression only; no aggregate analytics/report budget proved |
| PostgreSQL | READ ONLY REPEATABLE READ, existing timeout/admission on actual readers | New direct context probe sets timeout10s; original SOURCE/index retains existing reader admission/timeout; no new analytics runtime reader |
| UX hypotheses | Window≤12 months, chart100/details20, initial3 months, older windows accessible | Not performance guarantees; new contract and measurements remain NOT EXECUTED |

## Commands and actual results

No dotenv, real credential file, OAuth, Neon, production service, real financial data or provider API was used. Test DB variables were explicitly overridden to the verified synthetic loopback target; credential URLs are intentionally omitted below.

```text
node node_modules/vitest/vitest.mjs run tests/analytics-feasibility.test.ts --maxWorkers=2
node node_modules/vitest/vitest.mjs run tests/analytics-feasibility.test.ts tests/financial-history-feasibility.test.ts tests/checkpoints.test.ts tests/checkpoint-reconciliation.test.ts tests/forecast.test.ts tests/forecast-oracles.test.ts --maxWorkers=2 --reporter=default --reporter=json --outputFile=tmp/hb22-p1-review/unit.json
node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts tests/integration/analytics-feasibility.test.ts --maxWorkers=1 --reporter=default --reporter=json --outputFile=tmp/hb22-p1-review/pg.json
node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts tests/integration/financial-history.test.ts --maxWorkers=1 --reporter=default --reporter=json --outputFile=tmp/hb22-p1-review/history-regression-pg.json
node node_modules/eslint/bin/eslint.js tests/analytics-feasibility.test.ts tests/integration/analytics-feasibility.test.ts --max-warnings=0
node --max-old-space-size=4096 node_modules/typescript/bin/tsc -p tmp/hb22-p1-review/tsconfig.json --pretty false
node node_modules/vitest/vitest.mjs run tests/analytics-feasibility.test.ts --maxWorkers=2 --reporter=default --reporter=json --outputFile=tmp/hb22-p1-review/foundation-unit-final.json
git diff --check
```

| Check | Actual result |
|---|---|
| Preliminary new unit feasibility | 4/4, exit0 |
| Final selected unit regressions including new tests | 174/174, 6 files, exit0; JSON retained |
| New isolated PG feasibility | 1/1, exit0; JSON retained; SQL counts57/111 |
| Existing history PG regression | 17/17, exit0, 100.87s; JSON retained |
| Scoped ESLint after self-review | exit0; first lint caught one unused test import, corrected only in the new test |
| `git diff --check` | exit0 |
| Initial whole-project `tsc --noEmit --pretty false` | exit1, Node heap OOM at ~2GiB, not PASS; no assertion or timeout was changed |
| Retry `node --max-old-space-size=6144 node_modules/typescript/bin/tsc --noEmit --pretty false` | Interrupted after several minutes without completion, exit1; NOT PASS |
| Scoped strict typecheck of both new tests and imported sources, existing compiler options | Final exit0 with temporary config under ignored tmp; initial scoped attempt caught TS2556 in the new boundary-test tuple spread, corrected with explicit destructured arguments |
| Final rerun of the changed new unit file | 4/4, exit0; `foundation-unit-final.json`; final scoped ESLint also exit0 |
| Full unit/integration/build, browser/OAuth/AT, Finance Gate | NOT EXECUTED for this P1 review; targeted results do not substitute |

The repository tsconfig includes `**/*.ts`/`**/*.tsx` and excludes only `node_modules`, so ignored tmp checkouts are part of its broad input pattern. No repository config was changed to hide failures. The temporary scoped config extends the existing strict compiler options, sets incremental=false, and includes just the two new test files (plus TypeScript's normal import closure). Scoped typecheck is not claimed as whole-project typecheck. The final boundary-test correction changes argument syntax only; the affected new unit file was rerun. Earlier regression JSONs remain their actual executions, not fresh Finance Gate receipts or a claimed new source fingerprint. Host Node v22.23.0, installed TypeScript6.0.3, Vitest5.0.5.

## Isolation, setup attempts and cleanup

Own PG image `postgres:18` was already present; no image pull or dependency installation. Final container ID `0314b6ddf5d7b17c0736def6b90456a9256dc3feb35b4e2e25f1bca887c5d77a`, label `home-budget.task=hb22-p1-20261116`, tmpfs512MiB, loopback-only published port53198. The separate task network disables IP masquerading; this is not claimed to be a network namespace without a default route. Only explicit synthetic loopback DB URLs are supplied to the host Vitest commands.

Setup failures are retained honestly: initial sandbox denial on Docker daemon/config was resolved with an empty task-specific Docker config and authorized elevation. The first empty PG container used network=none and could not attach to an internal network; the second internal-network container ran but published no usable host port. Both were checked by exact ID/label and removed before seeding any test data. The final local task network provides the loopback port. One diagnostic Go-template command failed due to shell quoting; no product source or data changed. No foreign Docker object was stopped or removed.

The new test creates/drops its UUID child DB and uses a separate SELECT-only runtime login; the privileged synthetic corruption connection is never passed to the existing read adapter. The existing regression creates its own synthetic child DB as usual. Cleanup verified exact IDs/labels before stopping/removing: own containers created3/removed3; own networks created2/removed2; remaining task-labelled containers/networks0. The existing regression's child DB disappeared with the disposable PG, not claimed as a separately executed DROP. No production object or original user file was removed. Read-only host process diagnostics encountered sandbox access denial; no process outside the tool-owned compiler session was stopped.

## Review scope and handoff

P1 adds exactly two test files and this report. The ZIP includes these plus the ten pre-existing DOC-HB22-01 documents as explicitly labelled context, complete status, baseline hashes, original JSON test reports and checksums. Source/test originals are not replaced with archive reconstructions.

Clean-code-ts-react was applied to the new tests. Code-simplifier readability review covered only these new hunks: named fixture steps, explicit guards, no nested ternaries, unchanged test meaning and no old-test cleanup. No independent reviewer approval is claimed. Stop on REVIEW with B01 open; no commit/push/PR/merge/deploy or automatic P2 transition.

Final `git status --short` (ten pre-existing DOC-HB22-01 documents, then three P1 additions):

```text
 M docs/ARCHITECTURE.md
 M docs/DATA_MODEL.md
 M docs/DECISIONS.md
 M docs/IMPLEMENTATION_PLAN.md
 M docs/TASKS.md
 M docs/planning/hb-019-2-financial-history.md
 M docs/planning/hb-019-2-verification.md
 M docs/planning/hb-020-first-run-and-recurring-templates.md
 M docs/planning/hb-020-implementation-verification.md
?? docs/planning/hb-022-analytics.md
?? docs/planning/hb-022-p1-verification.md
?? tests/analytics-feasibility.test.ts
?? tests/integration/analytics-feasibility.test.ts
```

No tracked diff was added by P1; `git diff` still contains only the preserved DOC-HB22-01 changes. The P1 additions are untracked and are included in full in the review ZIP, not omitted from its manifest or patch. The Git index is unchanged/empty. Baseline rehash and scoped Markdown/whitespace/conflict-marker checks are included in the packaging verification; the archive SHA-256 is supplied separately to avoid self-referential hashes.

## Reduced-scope P1 gate — 2026-11-16, after D61

**Reduced P1 gate passed in the targeted checks below; implementation remains REVIEW, not Owner Acceptance.** This dated addition does not replace or erase B01/57/111 above. The deleted command chronology is not implemented under another name. The new reader provides only selected checkpoint/state/report/funding data and metadata choices for explicit H/K/version selection. No originalEvidence/legacyProof/selector/engine/writer/test/config file was changed.

- New `domain/analytics` contracts strictly copy/validate private bodies before async ownership; `features/analytics` authorizes each open/read/choices operation. Basis declares account, captured index anchor/cut, selected state anchor/cut, H, Berlin today/capture time, and pinned report id/batch/version/digest. Cursor membership is checked on the complete deterministic set and bound to owner/account/basis/view/filter/comparison; explicit refresh opens a new basis.
- Daily operations use one ordinary `readProjectionContext`, preserving existing assembly/selectors/funding checks; no closing-only opt-in. New read-layer bank/vector/order typed audit-field validation follows the existing history-detail evidence fields over the same captured source set, without reconstructing/listing original cash-only commands. A corrupt displayed bank proof is refused, not ignored. Funding uses complete selected identities and checked grouping reconciled with the same snapshot's existing R[p]; totals/counts precede filters/paging.
- REPORT delegates to existing owned immutable-report/original proof with its own `ClosingReadBudget`; opening a metadata choice validates the selected version and pins the resulting digest immediately. Continuation requires that digest and H/K. Report-only closing reconstruction stays inside the existing report verifier; daily reads never enable it.
- Source admission counts whole sets before materialization, retains all existing row/byte/identity/period/W²/wire limits and adds a cumulative conservative model for source traversal/index/lifecycle/canonical/output work. No per-update SOURCE loop or browser archive fetch-all. Explicit metadata choices are 20 retained updates per page, not financial totals or full source proof.

Actual gate evidence in `tmp/hb22-readonly-review/`: contract unit4/4; initial complete PG gate7/7; targeted report/future2/2; explicit report-choice1/1; resource fixtures4/4 (1200 accepted /1201 refused, >20k source rows, W>2000 and >8MiB bytes refused). Targeted commands filter other cases, which remain skipped in those JSONs and are not counted as passes. A final full run is required in the final verification report. The 101-checkpoint fixture returned pages100+1, remained stable after fixture append K+1, and used45 SQL on both full and last pages. Funding fixture24 identities produced pages20+4, full100020 and origin/funding subtotals30010/60010/20005 with invariant counts/groups. All20 public tables were equal before/after successful/error/filter/page/refresh reads under a separate SELECT-only login. Unknown/observed zero, signed future deficit, correction beyond H, old zero periods after FRESH_START and immutable v1/v2 were exercised. New test setup failures (batch-size limit7, reused test role, missing synthetic period ID) were corrected only in the new fixture; their failed JSONs remain preserved. Scoped strict typecheck/lint passed before proceeding to UI. P2/P3/P4 and final UI/browser evidence are recorded in the separate reduced-scope final report, not claimed here in advance.
