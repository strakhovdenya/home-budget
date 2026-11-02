# HB-013 — Verification and source review handoff

Date:2026-11-02. Branch:feat/hb-013-period-allocations.
Base:e59082a, merged HB-012/PR12. Status:Done; owner accepted HB-013 on2026-11-02.
Independent static source and calendar-fixture review completed; the original High
was corrected, re-reviewed and accepted. Open findings Critical/High/Medium/Low:
0/0/0/0. See Owner Acceptance below. Original implementation and R2 results remain
historical evidence. No commit, push, PR, merge, deployment or hosted CI is claimed.

[Implementation contract](hb-013-period-allocations.md) ·
[Acceptance mapping](../../tests/scenarios/phase-01/hb-013-period-allocations.md).

## R2 — Independent review High: calendar-dependent integration fixtures

Finding: HB-013 integration tests hard-coded2026-11-02 and required PostgreSQL's
actual Berlin date to match it. On any later day the entire suite would fail in
beforeAll. Historical fixture dates/periods and month-close dates were also fixed.
This is a regression-test reproducibility defect, not an approved financial limit.

Correction scope (exact four files relative to the reviewed working-tree baseline):

- [tests/integration/transitions.test.ts](../../tests/integration/transitions.test.ts)
  — derive the calendar from a real PostgreSQL Europe/Berlin date before each test;
  replace every fixed date/period, parameterize legacy SQL fixture dates and use
  explicit position placement for the same-day suffix case.
- [tests/fixtures/transition-calendar.ts](../../tests/fixtures/transition-calendar.ts)
  — new test-only helper using existing validated Gregorian date/period primitives.
- [tests/transition-calendar.test.ts](../../tests/transition-calendar.test.ts)
  —17 injected-date unit cases for first/last day, January1, December/January,
  leap February, spring/autumn DST months and invalid/unrepresentable calendars.
- [docs/planning/hb-013-verification.md](hb-013-verification.md)
  — this review correction and repeat evidence; original evidence is retained below.

The helper takes an explicit Berlin civil date. target=current month,
past=target-1, older=target-2 and future=target+1 through shiftPeriod, including
year changes. Checkpoint/obligation/savings dates lie in completed past months;
the missed-month fixture uses older days20..26. Closing H is endOfMonth(past),
including February28/29 and December31. Transition date is actual today.
No host Date.now or elapsed-hour arithmetic determines the fixture calendar.

The suffix test now covers both month-start and explicit same-day placement.
On day one, candidate and later suffix share the current date and the candidate
is explicitly placed before the retained suffix position, preserving the intended
HISTORICAL_PAYMENT_CONFLICT assertion instead of an accidental ordering error.
That adds one PostgreSQL test (76 HB13 instead of75); financial assertions remain
unchanged. The hard-coded date guard is removed, with no fixed fallback date.

### R2 repeat verification

| Command/check | Actual result |
|---|---|
| pnpm.cmd exec vitest run tests/transition-calendar.test.ts | exit0;17/17,1 file |
| pnpm.cmd test | exit0;533/533,25 files |
| pnpm.cmd test:integration tests/integration/transitions.test.ts | exit0;76/76,1 file |
| pnpm.cmd test:integration | exit0;278/278,7 files:76 HB13 +202 retained |
| pnpm.cmd lint | exit0;zero errors/warnings |
| pnpm.cmd typecheck | exit0;Next typegen and strict TypeScript |
| pnpm.cmd build | exit0;production compile/types and8 route entries |
| pnpm.cmd exec vitest run tests/architecture.test.ts | exit0;1/1 |
| TZ=UTC calendar/history subset including new helper tests | exit0;281/281,8 files |
| TZ=America/Los_Angeles same subset | exit0;281/281,8 files |
| pnpm.cmd db:migrate | exit0;unchanged0000–0005 applied to new local admin DB |
| pnpm.cmd db:migrate repeated | exit0;idempotent replay |
| Baseline hashes of production, migrations and protected files | PASS;no changes relative to reviewed working tree |
| git diff --check and final cleanup | exit0;new R2 container stopped;password cache/helper removed |

The subset command is the original seven-file timezone command below plus
tests/transition-calendar.test.ts. Repeated/subset counts overlap; they are not
summed. Native typegen/build and tsx migration commands used approved access to
the existing system/SWC cache, without dependency or configuration changes.

Only a new isolated password/SCRAM-authenticated postgres:18 was used:
hb013-r2-pg-a2935130b34e, dynamic127.0.0.1:54670. Labels identify taskHB-013,
reviewR2 and that unique run. All three database URLs were explicitly overridden
and validated by the existing local-only guard. No Neon access or changes to
existing containers. After all checks, exact container ID/labels were revalidated,
only this R2 container was stopped and its stopped state verified. The temporary
node_modules/.cache/hb013-r2-db.json password cache and hb013-r2-run.cjs helper
were removed; their absence was checked. The stopped synthetic container is retained.

Limitations: the real PostgreSQL run uses its actual current date, not simulated
January/DST dates. Those boundaries are exercised by injected-date helper tests
in both host timezone environments; the same-day ordering path is also exercised
in real PostgreSQL. A real month change during one in-flight scenario can still
legitimately invalidate its proposal; production stale/future-date validation is
intentionally unchanged. The next independent test refreshes the database date.
The helper requires two previous and one future month within the existing
Gregorian years1..9999 range and explicitly rejects unrepresentable extremes.

Production code, business rules, all migrations0000–0005, migration metadata,
dependencies, OAuth and protected files are unchanged by R2. Static Nov/Dec/Jan
examples in earlier documents/pure tests remain illustrative; their old fixed-PG
date instructions are superseded by this R2 fixture contract. HB-013 stays Review,
awaiting repeated independent source review and owner acceptance. No Git write
workflow (commit/push/PR/merge) or Done transition was performed.

The following sections preserve original implementation evidence/counts and its
45-file inventory before R2; they are not the R2 change list or repeat results.

## Delivered behavior and invariants

Private initial/actual checking reuses HB-010. New allocation-only redistribution
retains checkpoint/funding and requires explicit review. Single-source CARRY,
FRESH_START and DEFER use one existing HB-009 financial commit with full vector,
decision/funding history/audit/report impact/receipt/counters. ACTUAL creates one
real checkpoint even at equal B; REUSE creates none. No intermediate vector,
inferred operation, repeated debit/credit, expected-income posting or reserve cap.

FUNDING_TRANSFER preserves identity/origin/full outstanding or savings/status/
metadata/selection. Mandatory canonical before-state and decision/audit evidence
are checked at the same K by existing readers. Full history resolves corrections
before H and validates the suffix. Existing target/future earmarks count once;
terminal identities do not reopen. FRESH_START preserves untouched future A,
requires exact explicit edits for changed future periods and rejects insufficient
preserved cash atomically. B/A stay nonnegative,sum(A)=B; F=A-R-S may be negative.

Immutable proposals support prepare/read/confirm/cancel. Canonical cross-request
replay proves original scope/actor/update/receipt and exact committed mapping,
before new-action stale/calendar checks; changed payload cannot replay by proposalId.
Cancellation has a separate immutable scoped control identity and no financial
counter/receipt. Account-lock races produce one outcome. Lost real COMMIT
acknowledgement returns COMMIT_OUTCOME_UNKNOWN and identical retry recovers result.

Closed snapshots/H/K/source refs are unchanged. Final-candidate report coordination
checks original pending flags and pinned basis; only affected heads are marked and
audited, with no automatic v2. Unknown report contracts cause full rollback.

## Commands actually executed

Windows, Node22.23.0; installed pnpm12.16.1. No dependencies installed/updated.

| Command | Observed result |
|---|---|
| pnpm.cmd lint | exit0; zero errors/warnings, final run |
| pnpm.cmd typecheck | exit0; Next type generation and strict TypeScript |
| pnpm.cmd test | exit0;516/516,24 files, final run |
| pnpm.cmd exec vitest run tests/architecture.test.ts | exit0;1/1 |
| pnpm.cmd build | exit0; production compile/types/page generation,8 route entries |
| pnpm.cmd db:migrate | exit0;0000–0005 on the new local admin database |
| pnpm.cmd db:migrate repeated | exit0; idempotent journal replay |
| pnpm.cmd test:integration | exit0;277/277,7 files:75 HB13 +202 retained |
| Target transitions integration file, earlier checkpoint | exit0;70/70; later5 added cases passed in final full277 run |
| TZ=UTC calendar/history/transitions subset | exit0;264/264,7 files |
| TZ=America/Los_Angeles same subset | exit0;264/264,7 files |
| Old SQL/dependency/protected extension and migration metadata checks | PASS;0000–0004 unchanged,20 tables,6 journal entries,correct snapshot predecessor |
| git diff --check | exit0 |

Database commands were invoked through an ignored task-local helper that sets all
three explicit loopback URL overrides and both isolation markers before running
the unchanged package scripts. No credential values are printed or recorded here.

Timezone subset command:

```powershell
pnpm.cmd exec vitest run tests/shared/pure/calendar.test.ts tests/shared/pure/berlin-date.test.ts tests/domain/period.test.ts tests/checkpoints.test.ts tests/obligations.test.ts tests/savings.test.ts tests/transitions.test.ts
```

Filtered/subset/architecture runs overlap full runs; their counts are not added
as unique tests. Scenario mapping groups multiple assertions per executable test.
No browser/E2E, hosted CI, Neon or deployment result is claimed. UI is out of scope.

## PostgreSQL evidence

Only new password-authenticated postgres:18 container
hb013-pg-4d096d2c017c, dynamic127.0.0.1:56234. Labels:
home-budget.task=HB-013 and home-budget.run=hb013-pg-4d096d2c017c.
Container ID/labels/loopback port were checked before URL construction.
Retained HB9 wrong-password TCP test passed in the full regression suite.

Every integration suite creates its own new child DB and applies the actual
migration chain. Fresh0000–0005 and repeat migration succeed. The explicit upgrade
test applies0000–0004, inserts a real synthetic checkpoint/vector/allocation and
account head, then applies0005 and compares original rows unchanged. Custom SQL
metadata continuity is checked separately from generated schema metadata.

Direct SQL tests bypass transition validators for both event streams: missing/
foreign decision, wrong position/funding/predecessor/before-state/title/amount/
status, incorrect decision mode/position, duplicate per-identity funding and
simultaneous confirmation/cancellation. They assert PostgreSQL rejection and real
rollback. Valid relational funding without mandatory audit is deliberately allowed
by SQL and refused by runtime readers; this is not claimed as SQL audit enforcement.
Normal application CARRY/FRESH_START serve as positive SQL controls, including
multiple co-located identities, partial-payment remainder and unselected possible
claims. New flags never alter reservation selection.

Three lock-barrier tests use actual concurrent transactions and pg_stat_activity/
pg_blocking_pids to observe two blocked connections before releasing the account
lock: same proposal, different proposals and cancel/confirm. Exactly one financial
commit or cancellation wins. Real pg.Client acknowledgement-loss injection executes
COMMIT first and then loses its response; retry returns the one persisted result.

Adversarial replay mutates amounts, funding before/after refs, consent, observation,
placement/base or reason under the same proposal ID and checks zero writes.
Original mapping/evidence/receipt corruption gives STORAGE_ERROR. Confirmed replay
does not even query today's clock; a test rejects any such clock query without
changing the PostgreSQL server date. A distinct aged-target test proves stale
unconfirmed proposals refuse without account changes.

PG-R/F/P cases and T01–T68 are mapped in the scenario document, including explicit
reuse of unchanged HB9–HB12 money/calendar/SQL tests. Exact owner B90000/R30000
REDISTRIBUTE and CARRY alternatives are additionally exercised in PostgreSQL.

## Failures encountered and corrected

- Initial new unit invocation was red because the new domain module did not exist.
  Final unit516 passes; the red run did not execute passing assertions.
- First PG funding writes inherited the predecessor's budget_update_id through a
  spread; scoped FK rejected them. New events now explicitly use the current batch.
- Cancellation replay initially returned PostgreSQL's timestamp text format,
  differing from the original UTC response. All control results now use the same
  SQL microsecond UTC formatter.
- A test selected an unordered day manifest with array.at(-1); changed to validated
  indexHistory day selection. Production ordering never uses insertion/UUID order.
- First full regression had222 passes/1 inventory failure: old HB10 expected19
  tables. Inventory/journal assertions now explicitly expect20/6; final277 passes.
- Sandboxed drizzle/tsx encountered uv_os_get_passwd profile denial; SWC typegen/
  build could not materialize its existing native cache. Scoped approved execution
  succeeded without changing dependencies, profiles, permissions or developer files.
- Intermediate TypeScript/lint errors in new code/tests were corrected; final
  lint/typecheck/build and all runtime suites pass.

- Final self-review separated feature storage initialization errors from authorization
  failures. Added a boundary regression; final unit516, lint/typecheck/build pass.
  Database code was unchanged after the successful full277 integration run.
- Generated Drizzle metadata lacked final newlines; hygiene caught this and the
  two new/changed metadata files were normalized. Final45-file hygiene passes.

## Self-review, skills and residual limits

This is implementer self-review, not independent source review.
Financial-invariants skill checked BR mappings, exact bigint arithmetic, full
earmarks, future isolation and historical preservation. Architecture skill checked
pure domain/ports/private composition, shared transaction/history helpers and import
fitness. Scenario skill mapped synthetic oracles to real assertions. Security skill
checked authorization before storage/replay, locked scope, server actor, bounded
data-only input, parameterized SQL, sanitized errors and no public event endpoints.
Conventions/configuration skills checked unchanged scripts/dependencies, safe
local-only DB guards, immutable identity/evidence and actual verification commands.

The five owner-authorized scope limits are implemented: details pure only;
append-only cancellation; no same-identity payment/release+funding compound;
unsupported joint historical corrections refuse; oversized sets refuse without
truncation. No multi-source carry/overdraft/forecast/UI/closing/operation/PDF feature.
Transitions require an existing coherent checkpoint/vector; initial checking uses
the retained HB-010 boundary. Full histories/audits are materialized in memory;
no production-scale performance benchmark or deployment/role audit is claimed.
Privileged SQL cannot prove genuine consent or full JSON/history/audit semantics.
Original limitation, superseded by R2: fixed current-period fixtures required
calendar review after2026-11-02. Independent source review classified this High;
the replacement calendar above removes that requirement without a clock override.

Old SQL0000–0004, package/lockfile, OAuth and protected settings were not changed.
The pre-existing untracked .vscode/extensions.json matches its recorded baseline
SHA256; it is excluded from HB-013. No command writes .env.local or credentials
to tracked files. No Neon connection was opened. Existing containers were not
started, stopped or modified. Task-container cleanup is recorded below.

## Original implementation inventory and cleanup (before R2)

See the generated exact file inventory below. Git shows only HB-013 files plus the
pre-existing untracked .vscode/extensions.json. No commit/push/PR/merge/Done action.

Cleanup completed: only hb013-pg-4d096d2c017c was stopped after exact ID/label checks.
Its stopped state was verified. node_modules/.cache/hb013-db.json and hb013-run.cjs
were removed and their absence checked. The stopped synthetic container is retained;
no other container was changed.

### Original changed/new file inventory (45, before R2)

- [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [docs/DATABASE.md](../../docs/DATABASE.md)
- [docs/DATA_MODEL.md](../../docs/DATA_MODEL.md)
- [docs/TASKS.md](../../docs/TASKS.md)
- [docs/architecture.json](../../docs/architecture.json)
- [docs/conventions.md](../../docs/conventions.md)
- [docs/planning/hb-013-period-allocations.md](../../docs/planning/hb-013-period-allocations.md)
- [docs/planning/hb-013-verification.md](../../docs/planning/hb-013-verification.md)
- [drizzle/0005_period_transfers.sql](../../drizzle/0005_period_transfers.sql)
- [drizzle/meta/0005_snapshot.json](../../drizzle/meta/0005_snapshot.json)
- [drizzle/meta/_journal.json](../../drizzle/meta/_journal.json)
- [src/app/period-transition-boundary.ts](../../src/app/period-transition-boundary.ts)
- [src/domain/obligations/contracts.ts](../../src/domain/obligations/contracts.ts)
- [src/domain/obligations/history.ts](../../src/domain/obligations/history.ts)
- [src/domain/obligations/lifecycle.ts](../../src/domain/obligations/lifecycle.ts)
- [src/domain/savings/contracts.ts](../../src/domain/savings/contracts.ts)
- [src/domain/savings/evidence.ts](../../src/domain/savings/evidence.ts)
- [src/domain/savings/history.ts](../../src/domain/savings/history.ts)
- [src/domain/savings/lifecycle.ts](../../src/domain/savings/lifecycle.ts)
- [src/domain/transitions/contracts.ts](../../src/domain/transitions/contracts.ts)
- [src/domain/transitions/financing-detail.ts](../../src/domain/transitions/financing-detail.ts)
- [src/domain/transitions/funding.ts](../../src/domain/transitions/funding.ts)
- [src/domain/transitions/planning.ts](../../src/domain/transitions/planning.ts)
- [src/domain/transitions/ports.ts](../../src/domain/transitions/ports.ts)
- [src/domain/transitions/validation.ts](../../src/domain/transitions/validation.ts)
- [src/domain/updates/contracts.ts](../../src/domain/updates/contracts.ts)
- [src/features/period-transitions/use-cases.ts](../../src/features/period-transitions/use-cases.ts)
- [src/infrastructure/db/allocation-writer.ts](../../src/infrastructure/db/allocation-writer.ts)
- [src/infrastructure/db/commit.ts](../../src/infrastructure/db/commit.ts)
- [src/infrastructure/db/funding-evidence.ts](../../src/infrastructure/db/funding-evidence.ts)
- [src/infrastructure/db/obligation-history.ts](../../src/infrastructure/db/obligation-history.ts)
- [src/infrastructure/db/redistribution-writer.ts](../../src/infrastructure/db/redistribution-writer.ts)
- [src/infrastructure/db/savings-history.ts](../../src/infrastructure/db/savings-history.ts)
- [src/infrastructure/db/schema.ts](../../src/infrastructure/db/schema.ts)
- [src/infrastructure/db/transfer-proposal-repository.ts](../../src/infrastructure/db/transfer-proposal-repository.ts)
- [src/infrastructure/db/transition-reports.ts](../../src/infrastructure/db/transition-reports.ts)
- [src/infrastructure/db/transition-state.ts](../../src/infrastructure/db/transition-state.ts)
- [src/infrastructure/db/transition-writer.ts](../../src/infrastructure/db/transition-writer.ts)
- [tests/integration/bank-checkpoints.test.ts](../../tests/integration/bank-checkpoints.test.ts)
- [tests/integration/persistence.test.ts](../../tests/integration/persistence.test.ts)
- [tests/integration/savings.test.ts](../../tests/integration/savings.test.ts)
- [tests/integration/transitions.test.ts](../../tests/integration/transitions.test.ts)
- [tests/scenarios/phase-01/hb-013-period-allocations.md](../../tests/scenarios/phase-01/hb-013-period-allocations.md)
- [tests/transition-boundary.test.ts](../../tests/transition-boundary.test.ts)
- [tests/transitions.test.ts](../../tests/transitions.test.ts)

### Original git status (before R2)

```text
 M docs/ARCHITECTURE.md
 M docs/DATABASE.md
 M docs/DATA_MODEL.md
 M docs/TASKS.md
 M docs/architecture.json
 M docs/conventions.md
 M drizzle/meta/_journal.json
 M src/domain/obligations/contracts.ts
 M src/domain/obligations/history.ts
 M src/domain/obligations/lifecycle.ts
 M src/domain/savings/contracts.ts
 M src/domain/savings/evidence.ts
 M src/domain/savings/history.ts
 M src/domain/savings/lifecycle.ts
 M src/domain/updates/contracts.ts
 M src/infrastructure/db/commit.ts
 M src/infrastructure/db/obligation-history.ts
 M src/infrastructure/db/savings-history.ts
 M src/infrastructure/db/schema.ts
 M tests/integration/bank-checkpoints.test.ts
 M tests/integration/persistence.test.ts
 M tests/integration/savings.test.ts
?? .vscode/extensions.json
?? docs/planning/hb-013-period-allocations.md
?? docs/planning/hb-013-verification.md
?? drizzle/0005_period_transfers.sql
?? drizzle/meta/0005_snapshot.json
?? src/app/period-transition-boundary.ts
?? src/domain/transitions/contracts.ts
?? src/domain/transitions/financing-detail.ts
?? src/domain/transitions/funding.ts
?? src/domain/transitions/planning.ts
?? src/domain/transitions/ports.ts
?? src/domain/transitions/validation.ts
?? src/features/period-transitions/use-cases.ts
?? src/infrastructure/db/allocation-writer.ts
?? src/infrastructure/db/funding-evidence.ts
?? src/infrastructure/db/redistribution-writer.ts
?? src/infrastructure/db/transfer-proposal-repository.ts
?? src/infrastructure/db/transition-reports.ts
?? src/infrastructure/db/transition-state.ts
?? src/infrastructure/db/transition-writer.ts
?? tests/integration/transitions.test.ts
?? tests/scenarios/phase-01/hb-013-period-allocations.md
?? tests/transition-boundary.test.ts
?? tests/transitions.test.ts
```

## Owner Acceptance - 2026-11-02

HB-013 is Done. The owner officially accepted the implementation on 2026-11-02
after completed independent static review of the source code and calendar
PostgreSQL fixtures. The calendar-fixture High finding was corrected, re-reviewed
and accepted; all findings are closed. Review completion and acceptance are
owner-confirmed. No independent PostgreSQL/Vitest execution is attributed to the
reviewer; executed test evidence above belongs to the implementer.

| Final acceptance evidence | Result |
|---|---|
| Critical / High / Medium / Low | 0 / 0 / 0 / 0 |
| Unit tests | 533/533 |
| PostgreSQL integration | 278/278 |
| HB-013 PostgreSQL subset | 76/76 |
| Timezone subset, TZ=UTC | 281/281 |
| Timezone subset, TZ=America/Los_Angeles | 281/281 |
| Lint / typecheck / build / architecture | PASS |
| Migration0005 and repeated migration run | PASS |

Original implementation results and R2 evidence remain unchanged above as history.
Earlier Review/pending statements describe those earlier handoffs and are superseded
as current status by this acceptance. The architecture contract and agreed scope
limits remain unchanged. This finalization changes only TASKS, the HB-013 contract
and this verification document; no code, test, migration or dependency is changed,
and no tests/database are rerun during documentation finalization.

No commit, push, PR or merge was performed. No HB-013 publication, hosted CI,
merge or deployment result is claimed; the owner handles publication separately.

### Final changed/new file inventory (47)

45 original files plus 2 calendar test files added in R2 = 47. The final set was
checked for exact equality with the modified/untracked file paths from Git,
including expanded untracked directories. The pre-existing untracked
.vscode/extensions.json is excluded and unchanged.

- [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [docs/DATABASE.md](../../docs/DATABASE.md)
- [docs/DATA_MODEL.md](../../docs/DATA_MODEL.md)
- [docs/TASKS.md](../../docs/TASKS.md)
- [docs/architecture.json](../../docs/architecture.json)
- [docs/conventions.md](../../docs/conventions.md)
- [docs/planning/hb-013-period-allocations.md](../../docs/planning/hb-013-period-allocations.md)
- [docs/planning/hb-013-verification.md](../../docs/planning/hb-013-verification.md)
- [drizzle/0005_period_transfers.sql](../../drizzle/0005_period_transfers.sql)
- [drizzle/meta/0005_snapshot.json](../../drizzle/meta/0005_snapshot.json)
- [drizzle/meta/_journal.json](../../drizzle/meta/_journal.json)
- [src/app/period-transition-boundary.ts](../../src/app/period-transition-boundary.ts)
- [src/domain/obligations/contracts.ts](../../src/domain/obligations/contracts.ts)
- [src/domain/obligations/history.ts](../../src/domain/obligations/history.ts)
- [src/domain/obligations/lifecycle.ts](../../src/domain/obligations/lifecycle.ts)
- [src/domain/savings/contracts.ts](../../src/domain/savings/contracts.ts)
- [src/domain/savings/evidence.ts](../../src/domain/savings/evidence.ts)
- [src/domain/savings/history.ts](../../src/domain/savings/history.ts)
- [src/domain/savings/lifecycle.ts](../../src/domain/savings/lifecycle.ts)
- [src/domain/transitions/contracts.ts](../../src/domain/transitions/contracts.ts)
- [src/domain/transitions/financing-detail.ts](../../src/domain/transitions/financing-detail.ts)
- [src/domain/transitions/funding.ts](../../src/domain/transitions/funding.ts)
- [src/domain/transitions/planning.ts](../../src/domain/transitions/planning.ts)
- [src/domain/transitions/ports.ts](../../src/domain/transitions/ports.ts)
- [src/domain/transitions/validation.ts](../../src/domain/transitions/validation.ts)
- [src/domain/updates/contracts.ts](../../src/domain/updates/contracts.ts)
- [src/features/period-transitions/use-cases.ts](../../src/features/period-transitions/use-cases.ts)
- [src/infrastructure/db/allocation-writer.ts](../../src/infrastructure/db/allocation-writer.ts)
- [src/infrastructure/db/commit.ts](../../src/infrastructure/db/commit.ts)
- [src/infrastructure/db/funding-evidence.ts](../../src/infrastructure/db/funding-evidence.ts)
- [src/infrastructure/db/obligation-history.ts](../../src/infrastructure/db/obligation-history.ts)
- [src/infrastructure/db/redistribution-writer.ts](../../src/infrastructure/db/redistribution-writer.ts)
- [src/infrastructure/db/savings-history.ts](../../src/infrastructure/db/savings-history.ts)
- [src/infrastructure/db/schema.ts](../../src/infrastructure/db/schema.ts)
- [src/infrastructure/db/transfer-proposal-repository.ts](../../src/infrastructure/db/transfer-proposal-repository.ts)
- [src/infrastructure/db/transition-reports.ts](../../src/infrastructure/db/transition-reports.ts)
- [src/infrastructure/db/transition-state.ts](../../src/infrastructure/db/transition-state.ts)
- [src/infrastructure/db/transition-writer.ts](../../src/infrastructure/db/transition-writer.ts)
- [tests/fixtures/transition-calendar.ts](../../tests/fixtures/transition-calendar.ts)
- [tests/integration/bank-checkpoints.test.ts](../../tests/integration/bank-checkpoints.test.ts)
- [tests/integration/persistence.test.ts](../../tests/integration/persistence.test.ts)
- [tests/integration/savings.test.ts](../../tests/integration/savings.test.ts)
- [tests/integration/transitions.test.ts](../../tests/integration/transitions.test.ts)
- [tests/scenarios/phase-01/hb-013-period-allocations.md](../../tests/scenarios/phase-01/hb-013-period-allocations.md)
- [tests/transition-boundary.test.ts](../../tests/transition-boundary.test.ts)
- [tests/transition-calendar.test.ts](../../tests/transition-calendar.test.ts)
- [tests/transitions.test.ts](../../tests/transitions.test.ts)
