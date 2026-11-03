# HB-015 — Owner Acceptance and documentation finalization

**Owner Acceptance: 2026-11-03. HB-015: Done.** The owner reports independent
ChatGPT repeat review R1 **APPROVED**, with open findings
**Critical/High/Medium/Low: 0/0/0/0**. This supersedes the pending Review/acceptance
statuses in the historical delivery records below. Publication remains a separate
owner decision; no commit, push, PR, merge or deploy is authorized by acceptance.

## Acceptance and evidence provenance

| Source | What it establishes |
|---|---|
| Owner's 2026-11-03 finalization instruction | Implementation acceptance and permission to mark HB-015 Done. |
| Owner-reported independent ChatGPT R1 review | APPROVED; zero open findings. This is independent review, not Codex self-approval. No new Vitest/PostgreSQL execution by ChatGPT is claimed or inferred. |
| Codex's recorded R1 execution below | Actual historical 729 unit /302 PostgreSQL /509 LA results, 84 checker tests, finance gate and lint/typecheck/build/architecture/migrations/DB17. These reports belong to R1 and are not fresh finalization reports. |
| Codex's documentation-finalization checks below | Fresh normative manifest validation, hash-only mapping preservation, CLI initialization and fail-closed evidence checks on the final documentation. No fresh full runtime gate PASS is claimed. |

## Documentation finalization scope

Five files change relative to the accepted R1 working tree:

- `docs/TASKS.md`: Done, acceptance date, review verdict and evidence provenance.
- `docs/planning/hb-015-verification.md`: this acceptance/finalization record;
  R1 and R0 execution records remain explicitly historical.
- `docs/planning/hb-015-finance-tests-ci.md`: acceptance metadata and actual
  `init/record/timezone/check` CLI syntax/order, consistent with the unchanged
  checker and CI. The initial planning audit remains historical; G1/G2/G3,
  financial guarantees and deferred scope are preserved.
- `tests/scenarios/phase-01/hb-015-finance-tests-ci.md`: acceptance metadata in
  the preamble only; no scenario definition or GIVEN/WHEN/THEN assertion changes.
- `tests/finance/coverage.json`: only the three corresponding whole-file context
  hashes. Definitions, obligations, dispositions, references and TZ list remain
  unchanged. This follows the existing fail-closed whole-file hashing contract.

Reread AGENTS.md, all six requested project-local skills and HB-015 documents.
Applied create-planning-doc/create-scenarios to lifecycle metadata and retained
acceptance definitions; verify-financial-invariants to unchanged coverage claims
and evidence provenance; define-architecture to unchanged layer/schema boundaries;
security-best-practices/configure-project to bounded built-in Node validation
without framework env loading, secret access, database or dependency changes.

No finance/auth/UI code, executable tests/assertions, checker implementation,
architecture, database, dependencies or CI changed. Existing local R0/R1 changes
and `.vscode/` are preserved. No PostgreSQL, Docker, Vitest, build or framework
env loader runs are required for these metadata/hash changes. No production/Neon,
user env files or real financial data are accessed.

## Finalization checks and limits

The fresh finalization validator loads all 34 fixed actual normative files and
uses the unchanged checker exports. Before refreshing hashes it requires the
old manifest to reject the changed documents; then it recomputes the context
records, requires all remaining manifest data to match the accepted R1 byte-for-
byte JSON structure and validates all 498 definitions. Only TASKS, the approved
contract and the HB-015 scenario preamble have changed normative hashes.

Executed from `D:\projects_js\home-budget` on `feat/hb-015-finance-tests-ci`.
In the commands below, `$finalization` is exactly
`C:\Users\Denys\AppData\Local\Temp\hb015-finalize-FLanS7` and `$run` is
`$finalization\fresh-run`.

| Exact PowerShell command | Exit | Actual finalization result |
|---|---:|---|
| `node "$finalization\validate-finalization.mjs"` | 0 | Actual checker exports validate all 34 contexts/498 scenarios; 680 obligations/951 references, dispositions442/54/2. Old hashes reject with `NORMATIVE_CONTEXT_MISMATCH`; exactly three context hashes refreshed. All other manifest data and all scenario definition hashes unchanged. This temporary Node harness uses only built-in modules and the actual checker; it creates no fake runtime report. |
| `node scripts/check-finance-coverage.mjs init "$run"` | 0 | New current-source run context created; no copied historical receipts. |
| `node scripts/check-finance-coverage.mjs check "$run"` | 1, expected | `HB015_GATE_REJECTED (manifest, current-run evidence or executed assertions invalid)` because fresh runtime reports/receipts are absent. This is a passing fail-closed check, not a successful full runtime gate. |
| `node scripts/check-finance-coverage.mjs record "$run" integration` | 1, expected | Same safe rejection for absent report; no receipt manufactured. The directory contains only the newly created `run.json`. |
| `git diff --check` | 0 | No tracked whitespace errors. |
| `git diff --cached --name-only` | 0 | Empty; no files staged. |
| `git branch --show-current`; `git status --short` | 0 / 0 | Correct feature branch; existing R0/R1 work retained, plus documentation finalization. |

`finalization-results.json` beside the temporary validator records its outputs.
Whole-working-tree snapshot comparison and explicit new-file whitespace/local-link
checks verify that only the five listed files changed during finalization.
Production sources, existing executable tests, CI and `.vscode/` were not edited.

Historical JSON reports are neither copied nor re-recorded with new receipts.
A complete current-run U/P/Z gate needs newly executed unit/PostgreSQL/LA reports
after the documentation/hash fingerprint change; it is not replaced by these
bounded documentation checks. Hosted GitHub Actions/Node24/Linux and required
status/branch protection remain unverified. These are evidence limitations,
not open independent-review findings or a reversal of owner acceptance.

**Stop after finalization verification. Await owner review of the documentation
and a separate publication instruction.**

---

# Historical R1 correction and execution record — accepted 2026-11-03

Pending statuses below describe the pre-acceptance handoff, not current status.

Date: 2026-11-03. Branch: `feat/hb-015-finance-tests-ci`.
Owner-supplied independent review: **CHANGES REQUESTED, C0/H0/M2/L0**.
This section supersedes the R0 evidence retained below. **Review; awaiting renewed
independent ChatGPT review and separate owner acceptance.** No Done, commit, push,
PR, merge or deployment. `docs/TASKS.md` retains its pre-acceptance Planned value.

## R1 scope and skills

Only four files differ from the saved pre-R1 working-tree snapshot:

- `scripts/check-finance-coverage.mjs`
- `tests/finance/coverage.json`
- `tests/finance-coverage.test.ts`
- this report

All six current project-local SKILL.md files were reread before corrections:

| Skill | Application in R1 |
|---|---|
| create-planning-doc | Keep corrections within the two reviewed Medium findings and approved HB-015 plan. |
| create-scenarios | Add shared-context and compound-coverage rejection cases without changing normative financial scenarios. |
| verify-financial-invariants | Inspect original GIVEN/WHEN/THEN against existing pure/PG assertions, distinguish equivalent guarantees from exact oracles, retain runtime references and rerun finance regressions. |
| define-architecture | Preserve all layers, production sources and schema; rerun the architecture fitness test in the full unit suite. |
| security-best-practices | Bound context input, retain exact paths/identities and fixed diagnostics; use synthetic local PG and an env-file-free verification copy. |
| configure-project | Verify actual installed commands, migration reapply, isolated DB17, report identities and current-run receipts. |

Production finance/auth/UI, schema/migrations, architecture, dependencies, package
scripts and Vitest configs are unchanged. SHA-256 comparison with the pre-R1
snapshot confirms unchanged G2 workflow, G3 forecast tests, seven authorized
title-only fixes and HB-015 scenario specification. Existing local changes and
`.vscode/` are preserved; no unrelated files were staged.

## Medium-1: whole normative context is pinned

The old checker was reproduced against its saved R0 manifest: changing HB12's
shared `B=A[Oct]=40000` to `50000` left all individual definitions unchanged and
`validateManifest()` accepted 498 scenarios. R1 rejects the same mutation with
`NORMATIVE_CONTEXT_MISMATCH`.

Manifest version 2 adds an exact set of **34 whole-file context hashes**:
13 scenario files plus 21 fixed external contracts. External contracts comprise
BUSINESS_RULES, DECISIONS, accepted ADR0001–0003, ARCHITECTURE/architecture.json,
DATA_MODEL, conventions, PRD, TASKS, OPEN_QUESTIONS, IMPLEMENTATION_PLAN and the
HB-008–HB-015 approved contract plans. Exact paths are exported as
`normativeContexts` and recorded in `coverage.json.contexts`.

Whole files include shared GIVENs, legends, inter-row qualifications, closing
prose and linked contract terms outside individual definitions. Only CRLF→LF is
normalized; even incidental wording/status edits conservatively require manifest
review. Definition locators/body hashes, exact ID inventory and report identity
checks remain enforced. Unknown/missing/duplicate context records fail. CLI loads
the fixed real source paths, rather than trusting the manifest to choose sources.
Limits: at most 64 context files, 16 MiB per file and 64 MiB total UTF-8 input;
fingerprinting also includes the normative contexts with bounded input.

New negative cases mutate HB12 common GIVEN, legend and inter-row release rule,
HB13 common table baseline, HB14 observation default, and every scenario preamble
and external contract while keeping individual definitions unchanged. Additional
cases cover context record integrity and input bounds; a positive test preserves
CRLF/LF portability. There is no CLI bypass for excluding context files.

## Medium-2: compound claims match bounded guarantees

Reviewed the 171 original F/HB1/HB2/HB3/HBA/HBL definitions against their
GIVEN/WHEN/THEN and the existing executable assertion areas. Runtime obligations
now state the concrete assertion, its references, a per-reference guarantee and
`exact-oracle` or `equivalent-guarantee`. Exact-original claims are restricted to
the actually supported F-001/F-002 and six HB15 monotonicity cases. Other numeric
fixtures are explicitly qualified; passing a reference alone cannot establish
semantic equivalence, which remains a human review responsibility.

### F-009

Original F-009 combines B60000/R50000/F10000, unconfirmed carry, confirmed carry
and historical closing. It is now **partial**, with four separate obligations:

| Obligation | Exact existing test references / actual guarantee |
|---|---|
| confirmed-carry | `tests/integration/transitions.test.ts` → `HB13 T13..T16/T19/T39/T41/T51..T53 CARRY full histories and unchanged bank date`; `tests/integration/budget-projection.test.ts` → `HB14-015/016/017/041/061 PG genuine HB13 CARRY full lineage`. Full vector/funding identities and retained bank observation; fixture B89000/O30000/S5000/future1000. |
| unconfirmed-state | `tests/integration/transitions.test.ts` → `HB13 T29/T68 prepare and preview persist only immutable control review`: prepare/preview compares financial rows before consent. `tests/integration/budget-projection.test.ts` → `HB14-054 F-009 PG immutable report bytes/head/flags survive repeated projection`: separate past-only allocation baseline B10000, current safe0, unchanged report and financial rows on reads. |
| historical-selection | Confirmed CARRY references above select old O/S histories; `tests/integration/transitions.test.ts` → `HB13 T44 later CARRY leaves original closing bytes, pinned K and pending flag unchanged` preserves a pre-existing closing. `tests/integration/persistence.test.ts` → `DB20 closing an older observation keeps end NULL and validates copied checkpoint/vector facts` verifies storage constraints and absent fabricated end balance. |
| manual-close-workflow | Deferred to **HB-019**: user-confirmed close/correct, preview/consent and report-version publication. Existing closings in these tests are synthetic setup or low-level persistence fixtures. |

These references establish equivalent individual guarantees, **not execution of
the exact original F-009 numeric oracle or the complete close workflow**. The
checker independently requires the three runtime keys, their minimum exact
path/fullName bindings, and the HB-019 deferred branch. Substituting an after-carry
test for before-confirmation evidence fails.

### Analogous composites

- CARRY families separate confirmed transfer, unconfirmed state and historical
  selection. FRESH_START families separate confirmed action, full preserved
  earmarks and historical selection. Their limitations explicitly distinguish
  old-H obligation selection under FRESH_START from separate CARRY O/S/report
  history assertions; they do not claim one complete legacy workflow fixture.
- Partial/paid scenarios separate lifecycle/reserve state from the observed
  checkpoint (no automatic second debit). HBL-012 separates cancellation from
  voluntary savings release. Existing actual PG writers supplement pure-only
  references where necessary; financial assertions themselves are unchanged.
- Persisted optional-operation/category branches of F-004/011/015,
  HB1-001/003/006/010/013 and HBA-006 explicitly belong to **HB-024**. Pure
  explanatory evidence supplied to a function is not persisted operation approval.
- Manual closing branches of F-009, HB2-012/016 and HB3-028 belong to **HB-019**.
  Conversely HB1-016, HB2-003 and HB2-005 lose erroneous HB-019 exemptions: their
  WHEN does not close a month, or their GIVEN already supplies a closing. Their
  implemented guarantees remain required.
- HB1-011/012 and HB2-020 reporting belongs to **HB-022**; HB1-014 separately
  identifies **HB-016** UI and HB-022 reporting. HB2-033/044 user update interaction
  belongs to **HB-017** alongside the existing HB2-043 deferral. HB2-044 current
  typed command refusal is not relabeled as the exact old UI error-code oracle.
- HBL-013/019–026/028 presentation branches explicitly belong to **HB-016**.
  Required current financial calculations remain mapped. Existing recurrence/PDF
  deferrals retain their individual task assignments; there are no prefix waivers.

An independent minimum-key policy protects the audited compound groups; explicit
future-task policy requires each actual deferred branch. New negative tests reject
F-009 missing-before, pretend-complete, closing-as-runtime, after-test-as-before,
false-exact and wrong-evidence, false-complete F-011/HB1-011/HB2-016/HB3-028/HBL-023,
and replacing the statistics task with HB-019.

| Manifest measure | R0 (historical) | R1 |
|---|---:|---:|
| Scenarios | 498 | 498 |
| Obligations | 527 | 680 |
| Runtime / typecheck / deferred obligations | 495 / 1 / 31 | 622 / 1 / 57 |
| Catalog references | 926 | 951 |
| Required / partial / deferred scenarios | 467 / 29 / 2 | 442 / 54 / 2 |
| Whole-file normative contexts | 0 | 34 |

All old per-scenario runtime references remain present (checked by set inclusion).
The 25 new catalog references are checker cases. No financial test assertions were
rewritten and no new financial feature was added to turn a partial claim green.

## Fresh R1 execution evidence

All final commands ran from a dedicated source/dependency copy without user
`.env*` files, `.vscode/`, `.codex/` or `.aws/`. Auth variables and NODE_OPTIONS
were blanked; non-DB commands also blanked all database URLs. DB commands supplied
only generated disposable loopback credentials. Hash comparison verified **72
workspace/copy source and configuration files** identical, covering every context,
every catalog test path, checker, CI and package/Vitest configuration.

Preliminary limitation: the first targeted workspace Vitest run preceded
inspection of Vite's automatic env loader. Vite defaults can open `.env.local`,
so that preliminary run cannot substantiate the requested no-env-file guarantee.
No contents were directly read or printed. Its results are excluded from the
final evidence below; all final framework checks were repeated in the env-free
copy. No Neon/production connection or real financial dataset was used.

New PostgreSQL container: `postgres:18`, actual **18.6
(Debian 18.6-1.pgdg13+2)**; ID
`3ac56ac3133627d5578a3e03575a204d0fe7d66eeab3d09bca34ee04e2410c61`.
Identity/owner/task labels and **127.0.0.1:58499 → 5432** were checked.
Only synthetic fixtures were migrated/tested. No existing database was reused.

Commands use `pnpm.cmd --config.verifyDepsBeforeRun=false` to run installed
dependencies without incidental auto-install; this does not change repository
configuration. Report elapsed times below are computed from JSON timestamps,
not copied from R0. Every row reports an actual fresh successful exit code.

| Command / gate | Exit | R1 result |
|---|---:|---|
| `pnpm lint` | 0 | Clean; shell elapsed 5.91s. |
| `pnpm typecheck` | 0 | Clean, including compile-time money contract; 13.85s. |
| `pnpm build` | 0 | Successful Next build, eight existing dynamic routes; 17.07s. |
| `TZ=UTC pnpm test --reporter=default --reporter=json --outputFile.json=<run>/unit.json` | 0 | **729/729**, 29 files; JSON elapsed 9.60s. Includes **84 checker cases (59 original +25 R1)**, architecture **1**, forecast **71** with six paired G3 cases and the original 27,000-state sweep. |
| `node --conditions=react-server --import tsx scripts/db-migrate.ts` twice | 0 / 0 | Fresh isolated migration and reapply; combined shell elapsed 2.97s. Underlying migrator avoids the package wrapper's user-env loading. |
| `TZ=UTC pnpm test:integration --reporter=default --reporter=json --outputFile.json=<run>/integration.json` | 0 | **302/302**, eight files; JSON elapsed 105.45s. |
| `pnpm test:integration -t DB17` | 0 | **2 passed, 300 filtered**, eight discovered files; final explicit confirmation 8.33s. Filtered cases are not counted as coverage passes. |
| `TZ=America/Los_Angeles node scripts/check-finance-coverage.mjs timezone <run>` | 0 | **509/509**, fourteen manifest-selected files; JSON elapsed 5.57s. Exact UTC/LA path/fullName sets match. |
| `node scripts/check-finance-coverage.mjs init <run>` and three `record <run> unit/integration/timezone` commands | 0 | New run identity, source fingerprint and SHA-256-bound report receipts. |
| `node scripts/check-finance-coverage.mjs check <run>` | 0 | **498 scenarios, 680 obligations, 951 references; unit729/PG302/TZ509**, dispositions442/54/2. |
| Actual CLI mutation experiments in disposable copy | expected 1 ×4; restored 0 | Changed shared GIVEN, missing before-confirmation branch, false-complete F-009, missing context record all reject with fixed safe CLI diagnostic. Restoring exact bytes restores the positive gate. |
| `git diff --check`, source/scope and snapshot hash comparison | 0 | No whitespace errors; G2/G3 and previous local work retained. |

G2 still uses the existing full unit/full PG jobs and exactly one LA subset;
G3 remains byte-for-byte unchanged from R0. No extra DB service or CI matrix was
introduced. **No actual GitHub Actions run or branch-protection verification**;
local Node22/Windows evidence does not establish a Node24/Linux hosted run.

## R1 handoff

Current evidence is in the private temporary `hb015-r1-WYi01F/run/` directory:
fresh JSON reports/receipts and `r1-cli-experiments.json`. Review archive
`hb-015-r1-review.zip`, SHA-256 and entry list are delivered alongside this report.
No credentials, env files, production exports, node_modules or `.vscode/` belong
in the archive. The disposable container, its anonymous volume, generated local
credential file and verification copy are removed after checking evidence.

Remaining review risk is semantic: hashes prove source stability and exact report
execution, not that prose and assertions are equivalent. The explicit qualifiers,
per-reference claims and future obligations are provided for renewed independent
review. No additional production defect or scope extension is claimed.

---

# Historical R0 evidence — superseded by R1 above

The following original implementation record is retained for traceability only.
Its manifest counts, broad coverage claims and test runs do not prove R1.

Date: 2026-11-03 (owner authorization). Branch: `feat/hb-015-finance-tests-ci`.
Baseline: `649ce69`, fetched `origin/main`; `main...origin/main` was `0 0` before
creating the branch. **Review; implementation acceptance is pending. No commit,
push, PR, merge or deployment. TASKS.md remains at its pre-acceptance Planned status.**

## Implemented scope

The independently approved [plan](hb-015-finance-tests-ci.md) supplies G1/G2/G3.
The initial untracked plan is preserved. Production finance/auth/UI code, database
schema/migrations, architecture.json, dependencies, lockfile, package scripts and
Vitest configurations are unchanged. No other HB feature is implemented.

G1 adds `tests/finance/coverage.json`, `scripts/check-finance-coverage.mjs` and
`tests/finance-coverage.test.ts`. Normative definitions are read from the actual
heading/table/list positions, not ID mentions in arbitrary text. Source locators
and SHA-256 hashes of definition bodies make changed GIVEN/WHEN/THEN require
mapping review even when a heading stays unchanged. Namespace/range normalization
handles HB11 a/b and Medium cases, HB12 S/E/O, HB13 T/PG groups and HB14 table IDs.
Historical narration outside the definition sections does not count as a case.

The manifest catalog contains exact normalized repo paths and expanded Vitest
fullNames, referenced one-to-many by obligations. It never resolves a template,
substring, scenario ID or regular expression against a passing report. Manifest
reference identities and actual report identities must both be unique. HB-006
DB01–23, HB-007 AUTH and HB-008 primitives are explicit supporting executable
references; no normative files were invented for those tasks. Compile-time proof
is a separate typecheck gate, including HB9-027, never a fake Vitest case.

G2 narrowly extends the existing workflow: explicit UTC for full unit, built-in
default + JSON reporters on the existing unit/integration commands, exactly one
LA subset step reading its fourteen files from the manifest, and the checker.
Node24/pnpm12.16.1/PG18, existing triggers/permissions, frozen install, lint,
typecheck, build, migration/reapply, full integration and isolated DB17 remain.
There is no extra DB service/build or a second complete CI matrix. Timeout remains
20 minutes. GitHub Actions and branch protection have **not** been run/verified.

G3 adds exactly six HB15-M01–M06 paired cases in `tests/forecast.test.ts`. Each
calls real `projectAccount` twice and asserts both exact safeAvailable, daily and
remainder results, nonincrease, unchanged checkpoint/A/date/funding coordinates,
and deep input immutability. R and S, current and other-period max boundaries, and
MAX_INT64 are separate cases. The original 27,000-state sweep is retained. Pure
calls cannot persist financial facts; the unchanged architecture fitness test
continues to prohibit domain DB dependencies. Existing PG read/rollback/replay
baselines still verify full scoped rows and counters, not counts alone.

New specifications are in `tests/scenarios/phase-01/hb-015-finance-tests-ci.md`.
The only edit to the old HB10 scenario document is the approved six-line crosswalk.

## Inventory and semantic limits

| Normative family | Definitions |
|---|---:|
| F | 18 |
| HB1 | 20 |
| HB2 | 46 |
| HB3, including C01–08 | 43 |
| HBA | 16 |
| HBL | 28 |
| HB9 | 27 |
| HB10 | 27 |
| HB11, including a/b, metadata, Medium | 47 |
| HB12 S/E/O | 61 |
| HB13 T + PG-R/F/P | 93 |
| HB14 | 63 |
| HB15 G/M | 9 |
| Total | 498 |

Dispositions: **467 required, 29 partial, 2 deferred**. Obligations: **527**
(495 runtime, one typecheck, 31 explicitly deferred workflow obligations).
Reference count: **926**, including all seven subsequently authorized title
template corrections. The manifest and final reports have no duplicate identities.

Partial cases retain mandatory implemented storage/domain assertions and name the
future task/reason separately. F-012 PDF and F-016 recurrence are wholly deferred.
Historical close/correction *use cases* belong to HB-019; immutable storage,
unknown-end rules, historical selection and pending flags are already required.
F-014's operation/category persistence belongs to HB-024; checkpoint-without-detail
validation stays required. PDF matching/persistence belongs to HB-026. HB2-043's
same-identity release+funding compound flow is not claimed: accepted HB-013 excludes
that compound command; separate savings release and funding retention remain
required, with the joint user flow identified under HB-017. This is an explicit
scope annotation, not a newly approved compound algorithm.

Earlier F/HB1/HB2 oracles sometimes combine future workflows and use different
synthetic amounts/dates from current domain/PG fixtures. `fixtureBasis` and the
individual obligations disclose composed foundation-equivalent proof. Exact F-001/
F-002 paid-flag fixtures and all six new pairs are identified separately. A passing
reference proves that the named assertion executed; it does not automatically prove
semantic equivalence to all original prose. Independent review must inspect these
associations and partial boundaries. No future UI, reports/PDF or live OAuth flow
is represented as an executed foundation feature.

### HB10 crosswalk and the review Low note

- Normative DB02 concurrency → executable **HB10-DB20** (real waiting connection).
- Normative DB03 lost COMMIT acknowledgement → executable **HB10-DB21**.
- Executable DB02/03 mean first confirmation/int64 endpoints, respectively.
- Normative DB01 retains the historical 19-table/three-migration statement. Current
  accepted schema regression checks **20 tables and six migrations**. The manifest
  explicitly records this difference; no original historical evidence or migration
  was rewritten to manufacture a failure.

## Fresh-run evidence protocol

The implemented CLI makes the plan's report pseudocode concrete:

```sh
node scripts/check-finance-coverage.mjs init "$RUNNER_TEMP/hb015"
# Existing test commands produce unit.json / integration.json with both reporters.
node scripts/check-finance-coverage.mjs record "$RUNNER_TEMP/hb015" unit
node scripts/check-finance-coverage.mjs record "$RUNNER_TEMP/hb015" integration
# One LA-only subprocess, fourteen files from the manifest:
node scripts/check-finance-coverage.mjs timezone "$RUNNER_TEMP/hb015"
node scripts/check-finance-coverage.mjs record "$RUNNER_TEMP/hb015" timezone
node scripts/check-finance-coverage.mjs check "$RUNNER_TEMP/hb015"
```

`init` exclusively creates a random run context: root, start, CI job/run/attempt
identity and a source fingerprint (src/tests/migrations/scripts, package/lock,
Vitest/workflow, business rules/decisions/ADRs/architecture contract). `record`
requires new successful schema-valid JSON, timestamps within the current run and
the correct unit/LA TZ; its receipt binds report SHA-256 to the run nonce. `check`
rechecks source/job identity and every receipt before validating all required
runtime references and exact UTC/LA identities. Freshness is bounded to 30 minutes;
the workflow timeout is still 20. Old or changed reports, source edits after init,
duplicate identities, missing/failed/skipped/todo tests, incomplete inventories,
invalid deferrals or extra/missing TZ cases fail closed. The CLI emits a fixed
rejection diagnostic or counts-only summary, never financial/SQL/driver contents.

The adapter was checked against the installed Vitest5.0.5 JSON declarations and
actual report output. `pnpm ... --reporter=default --reporter=json
--outputFile.json=...` forwards to the existing script and retains its exit code.
Local runs use `--config.verifyDepsBeforeRun=false` to prevent pnpm's unrelated
pre-script dependency revalidation/store-lock attempt; packages/lock are unchanged.
CI still performs its explicit frozen install before ordinary pnpm test commands.

This protocol is an orchestration detail within the approved checker/workflow
files; it adds no application layer, dependency, schema or alternative finance
transaction manager. Reports/receipts and disposable DB credentials are outside Git.

## Executed checks and environment

Local Node22.23.0, pnpm12.16.1, Vitest5.0.5; Docker29.8.0; PostgreSQL18.6
(Debian18.6-1.pgdg13+2). CI remains Node24, which was not executed remotely.
All numbers below are actual local executions, not reused HB-014 evidence.

`$e` below denotes the private temporary evidence directory; `$r` is its fresh
`final-run` child. Shell commands set TZ on the child process only. No raw
runtime JSON is committed. Test counts from overlapping runs are not added.

| Command / execution | Result | Duration / scope |
|---|---|---|
| `pnpm.cmd exec vitest run tests/forecast.test.ts -t HB15-M` | exit0, 6 passed / 65 intentionally filtered | 537ms Vitest; verifies six exact pairs |
| Targeted `tests/finance-coverage.test.ts` | exit0, 59/59 | Last targeted run717ms; full run also executes them |
| `TZ=UTC pnpm.cmd --config.verifyDepsBeforeRun=false test --reporter=default --reporter=json --outputFile.json="$r/unit.json"` | exit0, 704/704, 29 files | 8.72s Vitest; unit+record9.740s |
| `pnpm.cmd --config.verifyDepsBeforeRun=false test:integration --reporter=default --reporter=json --outputFile.json="$r/integration.json"` | exit0, 302/302, 8 files | 115.25s Vitest; integration+record116.229s |
| `node scripts/check-finance-coverage.mjs timezone $r`, TZ=LA; then `record $r timezone` | exit0, 509/509, 14 files | 6.60s Vitest; subset+record7.686s |
| `pnpm.cmd --config.verifyDepsBeforeRun=false lint` | exit0, no warnings | 4.157s final run |
| `pnpm.cmd --config.verifyDepsBeforeRun=false typecheck` in clean mirror | exit0 | 5.975s |
| `pnpm.cmd --config.verifyDepsBeforeRun=false build` in clean mirror | exit0; eight dynamic routes | 10.828s final measured build |
| `pnpm.cmd exec vitest run tests/architecture.test.ts` | exit0, 1/1 | 1.06s; also included in full unit |
| `node --conditions=react-server --import tsx scripts/db-migrate.ts`, twice | exit0/0 | Applies/reapplies only the verified disposable parent DB |
| `pnpm.cmd --config.verifyDepsBeforeRun=false test:integration -t DB17` | exit0, 2 passed / 300 intentionally filtered | 8.56s Vitest |
| `node scripts/check-finance-coverage.mjs check $r` | exit0; all 498 definitions/527 obligations/926 references, U704/P302/Z509 | 246ms; exact 509-case identity parity |
| `git diff --check` | exit0 on tracked changes | Repeated before handoff; new files also require explicit whitespace checks |

The original finite sweep remains one Vitest case containing 27,000 states; it is
not reported as 27,000 test cases. The 509-case timezone subset overlaps full unit.
Expected `HB015_GATE_REJECTED` lines in checker unit tests and `AUTH_REQUEST_FAILED`
lines in existing auth negative tests are deliberate rejected fixtures.

Earlier diagnostic runs are not substituted for those final results: checker
discovery initially returned exit1 (49 passed/one failed because the manifest did
not yet exist); the first sandbox `pnpm.cmd typecheck` returned exit1 on the known
SWC cache restriction; the initial elevated typecheck returned exit2 for the new
fixture's inferred `never[]` ancestor list, corrected to `string[]`. The first
env-free mirror build returned exit1 for the external node_modules junction.
Later complete report validation returned exit1 first for duplicate identities,
then for the two host-dependent Date-rendering titles. Each was resolved as
described here, with owner authorization before extending the file boundary and
new reports after source changes. No earlier failed report receives a success receipt.

### Proven execution-identity issues and scope authorization

The first strict gate rejected existing duplicate fullNames even while assertions
passed. The owner explicitly authorized *titles only* in five additional files:

| File / group | Correction |
|---|---|
| `tests/audit-serialization.test.ts`, HB9-U16 | Append `[case %#]` |
| `tests/canonical-payload.test.ts`, HB9-U03 | Append `[case %#]` |
| `tests/updates-validation.test.ts`, HB9-U07 | Append `[case %#]` |
| `tests/domain/money.test.ts`, rejects non-bigint | Append `[case %#]` |
| `tests/integration/bank-checkpoints.test.ts`, executable HB10-DB18 | Append `[case %#]` |

Only those five literal title lines changed; their 42 parameterized cases retain
every fixture and assertion. Manifest references were expanded to the new exact
names. The fresh unit/PG/LA report indexes now have no duplicate identities.

The following independent gate check found two more identities that differ by TZ:
`Date(0)` is interpolated into `%s` in the invalid-input titles in
`tests/shared/pure/berlin-date.test.ts` and `tests/shared/pure/calendar.test.ts`.
UTC prints Jan01 1970 GMT+0000; LA prints Dec31 1969 GMT-0800. Their assertions all
passed; exact identity parity correctly failed. The owner separately authorized
only those two title placeholders to change from `%s` to `case %#` (34 existing
cases). Both literal lines, with all fixtures/assertions retained, were changed;
exact manifest references were updated. No title normalization or weaker identity
comparison was introduced. A completely fresh final U/P/Z run then passed the
real checker. Earlier red runs are historical diagnostic evidence, not final PASS.

### Checker positive/negative proof

The 59 checker tests exercise positive complete synthetic reports and actual
repository definition validation; absent/empty/malformed/unexpected JSON; wrong
counts/schema/path/title/suite; duplicate files/cases/catalog identities; failed/
skipped/todo/pending; missing/extra/renamed TZ identities; source-body changes,
missing/duplicate/nonexistent definitions; namespace/range/suffix normalization;
path traversal/absolute/backslash/NUL cases; bounded source/report work; missing
norms/obligations/references; false deferred/partial declarations; removal of the
implemented obligation from a valid partial; invalid type-only substitution;
run-context reuse; malformed current-run JSON and altered run/digest receipts.
Pure validators throw named safe errors. CLI fixtures explicitly return nonzero;
no nested Vitest or PostgreSQL is spawned from checker unit tests.

After the real gate passed, a standalone local CLI experiment also changed only
temporary reports/context (source untouched). Wrong JSON, changed receipt run ID,
duplicate test, skipped test, missing TZ case, extra TZ case and stale report each
returned **exit1**. For the schema/identity experiments the temporary receipt hash
was deliberately refreshed, proving rejection beyond a simple digest mismatch.
Original bytes were restored in `finally`; the real checker then returned **exit0**
again with the same complete counts. This is actual CLI proof, separately from the
59 unit fixtures and the PostgreSQL suites. These experiments never opened a DB.

## DB isolation, privacy and framework environment limitation

A new container was created for this task, not borrowed from another service:
`394a24fb7167b353d8d3b985080f3560c80c952a205f94d6707129f76b962a3d`,
labels `com.home-budget.task=HB-015`, `com.home-budget.owner=codex-local`.
Actual binding was inspected as **127.0.0.1:52384 → 5432/tcp**; running state,
labels, container ID, pg_isready and server version were verified before DB work.
A new generated password was used and not printed/committed. Existing HB9-021
verifies TCP wrong-password refusal. All three DB URLs were explicitly overridden
to this target; both required HB target flags and `requireLocalDatabaseTargets`
remained enabled. Child databases were generated by the existing integration
suites. No Neon/production connection or modification of another service occurred.

The package `db:migrate` script itself includes `--env-file-if-exists=.env.local`.
For local verification its inspected underlying Node command was executed without
that loader, with all three explicit local URLs. CI's unchanged package command
runs in a checkout without the user's local file.

The **initial stock typecheck** invoked Next's configuration loader before the
automatic local-env loading was noticed; `.env.local` exists (existence only was
checked explicitly). No contents or values were requested/printed, but this means
an absolute claim that no tool ever opened that file would be incorrect. No DB
test used it. All subsequent framework typecheck/build verification used a clean
temporary mirror with **zero env files copied**, the same current source and
installed package versions. It initially failed because Turbopack cannot resolve
dependencies through a node_modules junction outside its root; self-contained
copies of installed dependency files and remapped internal links resolved that
without modifying repository config, packages or lockfile. Final typecheck/build
passed there. The original user env files and `.vscode/` were not edited/moved.

## Skill application and files actually consulted

All six requested current SKILL.md files were reread before implementation.

| Project-local skill | Concrete application |
|---|---|
| `create-planning-doc` | Preserved approved G1/G2/G3; no extra product task; explicitly requested owner permission before extra title-file edits |
| `create-scenarios` | New HB15 G/M specifications with synthetic exact cents, real observation/asOf coordinates and negative assertions |
| `verify-financial-invariants` | Paired production formulas, retained sweep, bigint/calendar/H-K/funding/security/rollback integration regression; exact evidence instead of inherited PASS |
| `define-architecture` | Read ARCHITECTURE/DATA_MODEL/architecture.json; retained layer/allowlist fitness and avoided all production/storage changes |
| `security-best-practices` | Read Next server auth/runtime-validation sections and React/general frontend trust-boundary references; enforce bounded local JSON/path/runtime evidence and fixed diagnostics; preserve authorization-before-replay tests |
| `configure-project` | Inspected package/lock versions, .env.example, Vitest configs, workflow, db-migrate/local-target before execution; real runner forwarding and report schema, isolated PG18, env-free framework verification |

Other consulted sources: AGENTS.md, CODEX_WORKFLOW, PRD, BUSINESS_RULES, DECISIONS,
Accepted ADR0001–0003, OPEN_QUESTIONS, TASKS, IMPLEMENTATION_PLAN, conventions,
AGENT_FACTORY; the actual scenario files, source APIs/fixtures and relevant unit/
integration assertions; installed Vitest reporter declarations and Next config
loader. Security guidance did not cause adding Zod, another auth layer or a new
dependency. No claim of independent implementation review is made here.

## Handoff and remaining checks

Independent source review must inspect the complete manifest associations and
partial exclusions, checker failure behavior/run evidence bounds, preserved CI
gates, source hashes, and six paired production calls. Review the **seven**
separately authorized title-only diffs apart from assertions. There is no outstanding
scope permission request for these corrections.

Current-source unit/integration/LA reports and the real checker succeeded in one
fresh local run. The measured test/record/check phases take about134 seconds when
their durations are added; this is not a measurement of the complete sequential
GitHub job (install, migrations and other checks are separate). There is no evidence
requiring a change to its 20-minute timeout. Real GitHub CI, Node24 remote
execution, required-status settings, independent ZIP/source review and owner
acceptance remain outstanding. No merge/deploy claim follows from local checks.

Final status/diff, explicit new-file whitespace/source-link checks, owned-container
cleanup and review-archive details are recorded below.

### Final source review and file inventory

The final working tree contains ten tracked modified files and six untracked
files; one of the untracked files is the pre-existing approved plan, preserved
without editing. No file is staged. `git diff --exit-code HEAD -- src drizzle
docs/architecture.json package.json pnpm-lock.yaml vitest.config.ts
vitest.integration.config.ts docs/TASKS.md` returned exit0. The seven extra test
files each have exactly one title-line change, authorized in the conversation;
their assertions/fixtures are unchanged.

| File | Final change |
|---|---|
| `scripts/check-finance-coverage.mjs` | New checker, report protocol and manifest-driven TZ runner |
| `tests/finance/coverage.json` | New 498-definition/527-obligation exact-reference manifest |
| `tests/finance-coverage.test.ts` | New 59 checker cases, including adversarial variants |
| `tests/scenarios/phase-01/hb-015-finance-tests-ci.md` | New G1/G2/G3 scenario contracts |
| `.github/workflows/ci.yml` | Report/TZ/checker steps; pre-existing gates retained |
| `tests/forecast.test.ts` | Six paired production projection cases; original sweep retained |
| `tests/scenarios/phase-01/hb-010-bank-checkpoints.md` | Six-line normative/executable crosswalk only |
| `tests/audit-serialization.test.ts` | Authorized indexed title only |
| `tests/canonical-payload.test.ts` | Authorized indexed title only |
| `tests/updates-validation.test.ts` | Authorized indexed title only |
| `tests/domain/money.test.ts` | Authorized indexed title only |
| `tests/integration/bank-checkpoints.test.ts` | Authorized indexed title only |
| `tests/shared/pure/calendar.test.ts` | Authorized stable indexed title only |
| `tests/shared/pure/berlin-date.test.ts` | Authorized stable indexed title only |
| `docs/planning/hb-015-verification.md` | This actual-evidence and review handoff report |
| `docs/planning/hb-015-finance-tests-ci.md` | Pre-existing untracked approved plan, unchanged |

The owned PostgreSQL container/anonymous volume was removed after rechecking its
exact ID, both labels and loopback binding. A label-filtered container listing
then returned no HB-015 container. Its generated credential file was deleted.
The named clean verification mirror and copied dependencies were also removed
using absolute-path guards and a traversal that unlinks junctions/symlinks without
following them. Other services, original dependency/source trees, user env files,
and `.vscode/` were not removed or edited.

Final `git status --short`, `git diff --check` and unstaged/protected-path review
completed successfully. Explicit checks of all six untracked files found **zero**
trailing-whitespace or missing local Markdown-link issues; tracked-file diff checks
also returned exit0. The staged diff is empty. The implementation remains entirely
uncommitted on `feat/hb-015-finance-tests-ci`.

Review archive: `hb-015-review.zip` in the private temporary HB-015 evidence
directory, containing repository source plus the new planning/verification/test
artifacts. It excludes `.git`, node_modules/build outputs, all env files, `.vscode`,
raw runtime reports, generated DB credentials and the attached user prompt. The
archive is a local review artifact, not a commit or publication. Its final path,
entry validation and checksum are supplied with the handoff.

**Stop: local implementation is ready for independent archive/source review.
Owner acceptance, GitHub Actions/Node24 evidence and any publication remain pending.
HB-015 is not Done.**
