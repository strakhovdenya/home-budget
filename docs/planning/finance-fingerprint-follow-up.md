# Finance fingerprint — separately authorized technical follow-up

**Status:** Done within HB-019.1 — independent repeat APPROVED 0/0/0/0 and Owner Acceptance 2026-11-08. The original planning-stage authorization text below is retained as history.
This document authorizes no implementation, test-code, manifest, SQL or CI edit.
No additional HB ID is allocated. Schedule a separately reviewed narrow change
before HB-021 final evidence; current documents do not claim the defect fixed.
Source: [D49](../DECISIONS.md#saved-financial-history-and-evidence-scope--2026-11-08).

## Final acceptance — 2026-11-08

The separately authorized implementation and regressions are accepted with
HB-019.1 after owner-reported independent repeat ChatGPT APPROVED 0/0/0/0.
SQL migration bytes and file-set changes are covered; only pure administrative
reports are excluded, while mixed normative documents remain protected.
Final task/decision/plan edits therefore require fresh reports/receipts and a new
finance fingerprint. Exact commands and outcomes remain in the
[gate verification](hb-019-1-finance-gate-verification.md). No SQL/schema/dependency
change, browser PASS, merge or deployment is implied by this acceptance.

## Authorized implementation candidate — 2026-11-08

The owner separately authorized this technical block in the unified HB-019.1
request. The checker now covers every regular file in src/tests/drizzle/scripts,
including SQL and unknown extensions, plus explicit significant configuration.
Aliases/junctions are refused. Only the two pure administrative verification
reports are declared report-only; mixed task/decision/planning files remain
whole-file protected. UX and HB-019.1/FPG contracts are additional contexts.
No SQL, schema or dependency is changed. Actual results and fresh evidence are
recorded in [gate verification](hb-019-1-finance-gate-verification.md); historical
Planned/NOT EXECUTED labels below record the specification stage, not new PASS.

## Inspected baseline and risk

`scripts/check-finance-coverage.mjs` has two bindings: normalized whole-file
`sourceContexts()` hashes validated against `tests/finance/coverage.json`, and
raw-byte `fingerprint()` over selected files checked against `run.json`.
The fingerprint walks src/tests/drizzle/scripts with extension filter
`mjs|ts|tsx|json|md|yml`, plus explicit root inputs and normativeContexts.
**SQL migration contents are omitted** even though drizzle metadata JSON is included.
Changing SQL alone can leave the run fingerprint unchanged; no runtime exploit
or failing financial result is asserted by this static finding.

TASKS, IMPLEMENTATION_PLAN and OPEN_QUESTIONS are mixed administrative/normative
contexts; the HB-019 plan also embeds status/acceptance reports. DECISIONS and
other plans contain binding contracts alongside chronology. HB-019 verification
and QA reports under docs/planning are not directly included; Markdown links are
not followed transitively. Scenario Markdown under tests is fingerprinted even
when not registered in the scenario-definition inventory.

## Proposed slices and acceptance

1. **Complete financially significant inputs.** Include drizzle SQL contents and
   file additions/removals; review significant root configuration inputs as well
   as rules, ADRs, scenarios, contracts, source, tests, migrations, manifest,
   checker, dependencies and CI. No blanket docs/drizzle/script exclusion.
2. **Separate administration safely.** Inventory unique acceptance/policy content
   before removing a mixed file. Relocate binding clauses into protected contracts,
   cross-check equivalence, then exclude only pure task status/work reports from
   both applicable input sets. Initially retain ambiguous mixed files conservatively.
   Keep prior decisions/evidence archived. Do not strip lines by words such as
   Status/Done/PASS or ignore scenario preambles/shared GIVENs.
3. **Bind fresh evidence.** Checker/policy/manifest/input changes require a new run,
   reports and receipts; do not alter original receipts or copy old PASS into a new
   run. Keep root/job/runId/report-digest/timing/status/UTC-LA checks fail-closed.
4. **Prove the checker.** Add actual file-set/CLI fingerprint regression tests,
   not only pure receipt comparisons. Separate the groups below (at most seven
   cases each), then run the full gate in an approved isolated synthetic environment.
5. **Publish exact evidence after review.** Record covered inputs, exclusions,
   fresh executed commands and limitations; update tooling documentation only
   after implementation. HB-021 requires completion of this stage.

## Regression group A — input sensitivity (Planned / NOT EXECUTED)

| ID | Change | Required outcome |
|---|---|---|
| FPG-001 | Pure administrative status/report after approved separation | Same finance digest; no binding clause excluded |
| FPG-002 | BR/ADR/financial contract | New digest; old run refused |
| FPG-003 | Shared scenario GIVEN/legend outside individual ID definition | New digest; stale context rejected |
| FPG-004 | Domain/app source or executable test | New digest; old run refused |
| FPG-005 | Existing SQL bytes, unchanged journal | New digest; old run refused |
| FPG-006 | Added/deleted SQL migration | New digest; old run refused |
| FPG-007 | Manifest/checker/covered configuration/lockfile/CI | New digest; old run refused |

## Regression group B — current evidence (Planned / NOT EXECUTED)

| ID | Attempt | Required outcome |
|---|---|---|
| FPG-008 | Financial change between init and record/check | Mismatched-run refusal |
| FPG-009 | Receipt from another run/job/root | Safe refusal |
| FPG-010 | Changed report digest or forged/missing receipt | Safe refusal |
| FPG-011 | Missing/duplicate/extra normative context | Safe refusal |
| FPG-012 | Absent/failed/skipped/pending test assertion | Safe refusal |
| FPG-013 | Different UTC/LA test identities | Safe refusal |
| FPG-014 | Archive receipts after fingerprint policy change | Safe refusal; new execution required |

## This documentation stage

Current normative documents change without refreshing coverage.json or receipts.
The existing manifest therefore has stale context hashes and is expected to
refuse validation. This is disclosed pending maintenance, not a passing gate and
not a reason to weaken the checker or reuse archived HB-019 implementation PASS.
