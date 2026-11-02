# HB-011 — implementation verification

Date: 2026-11-02. Branch: `feat/hb-011-obligations`.
Status: **Done**. Independent review reported one Medium; the fix and
repeat verification are recorded below. Independent re-review was successful; owner acceptance
was confirmed on 2026-11-02. As of this report no commit, push, PR,
merge, deployment or Neon access had been performed.

Contract: [HB-011](hb-011-obligations.md).
Scenarios: [HB11](../../tests/scenarios/phase-01/hb-011-obligations.md).

## Implemented proof

| Requirement | Executed assertions |
|---|---|
| BR-03 full reserve and deficit | Ordinary/possible on/off, strict reservedAmount rejection, remaining reserve after partial, R>A/B, multiple identities/funding periods, duplicate identity rejection, MAX/overflow |
| BR-02/06 no double debit | Atomic actual-check partial/PAID, F-001/F-002 exact5400 payment fixtures, B42000/R15000/F27000, unchanged-B acknowledgment, OUTSIDE_TRACKED_CARD audited confirmation, cancellation preserving outstanding |
| AMEND/metadata | Settled amount preserved, title Unicode code-point boundary, dueDate/null/invalid date, metadata history and terminal refusal |
| ADR0002 historical consistency | 20a/22a full rollback;20b/22b reviewed dependent corrections in one batch; earlier K reproduces original confirmed amount/states; late PAID not automatically recalculated |
| SQL | Empty full-chain migration/replay, legacy unnamed event refuses0003 without mutation/backfill, correction CREATE and positive same-batch corrections; direct negative INSERTs for state/title/action/lineage/before/date/terminal rules; immutable UPDATE/DELETE |
| BR-08 reports | Original October v1 payload/manifest/cutoff unchanged, later November payment alone does not mark it, historical payment correction marks affected head with audit, unsupported manifest refuses atomically |
| BR-10 authorization/atomicity | Foreign scope/state refs, stale and request conflict/replay, two real connection writes, post-write rejectBatch, empty audit, actual audit INSERT failure and deferred SQL failure rollback |
| HB-010 extraction | Complete retained checkpoint integration suite and pure history/instant/reconciliation tests pass; standalone correction of attached obligation checkpoint refuses conservatively |
| Berlin dates | New real PG DST checks at Oct25 00:30Z/01:30Z and Oct31 23:30Z→Nov01; retained HB8/HB10 leap/local-time tests; pure suites repeated under two TZ values |
| Layers/types | Architecture fitness test; strict tsc and negative hb-011.ts assertions; no new external package or import direction |

No savings/funding transfer/forecast/closing-version/PDF implementation is claimed.
Closing fixtures are synthetic compatibility/effect tests, not a closing API.

## Initial implementation command results (before Medium fix)

PowerShell uses pnpm.cmd because the .ps1 shim is restricted. Typecheck/build
needed approved access to the existing Windows SWC native cache. All tests used
existing pinned dependencies; none were installed or updated.

| Command | Result |
|---|---|
| `pnpm.cmd lint` | exit0, zero errors/warnings |
| `pnpm.cmd typecheck` | exit0, Next typegen + strict tsc, including static assertions |
| `pnpm.cmd test`, final observed run1 | exit0, **463/463**,21 files |
| `pnpm.cmd test`, final observed run2 | exit0, **463/463**,21 files |
| `pnpm.cmd exec vitest run tests/architecture.test.ts` | exit0, **1/1** |
| `pnpm.cmd test:integration`, final run | exit0, **136/136**,5 files:39 HB11 and97 retained tests |
| `pnpm.cmd db:migrate` | exit0, four versioned migrations applied to the new local admin database |
| `pnpm.cmd db:migrate`, repeat | exit0, no pending migration reapplied |
| `pnpm.cmd build` | exit0, production compile/types/page generation,8 route entries |
| Calendar/history command below with TZ=UTC | exit0, **225/225**,6 files |
| Same command with TZ=America/Los_Angeles | exit0, **225/225**,6 files |
| `git diff --check` | exit0; no whitespace diagnostics |
| Full-file hygiene including untracked task files |31 files: valid UTF8/no BOM/final newline/no trailing whitespace or bare CR; JSON valid;5 local links and41 unique scenario IDs; journal/snapshot continuity and protected paths verified |

```powershell
pnpm.cmd exec vitest run tests/shared/pure/calendar.test.ts tests/shared/pure/berlin-date.test.ts tests/domain/period.test.ts tests/checkpoints.test.ts tests/checkpoint-reconciliation.test.ts tests/obligations.test.ts
```

Subset/TZ reruns do not increase the unique full-suite count. Direct SQL cases
use real PostgreSQL; storage/transaction behavior is not mocked. Concurrency uses
two real writes with an account-lock holder gate; retained HB9 cases additionally
prove waiting with PostgreSQL blocking diagnostics. Unknown COMMIT recovery is
covered by retained HB9 tests, not a new HB11 transport implementation.

## Earlier failures and interruptions

- First red run failed to import the not-yet-created lifecycle module; no tests
  passed in that run.
- Initial typecheck could not load the sandboxed Windows SWC native cache.
  Approved-access typegen succeeded; intermediate TypeScript errors in union
  inference, extracted helper and fixtures were fixed.
- Initial lint found two unused/useless assignments/imports; corrected.
- A custom drizzle-kit generation attempt failed at uv_os_get_passwd/ENOMEM.
  No extra migration was generated. The reviewed custom0003 snapshot explicitly
  carries forward0002 metadata plus the two added columns; custom SQL stays owned
  by the migration, as in0001/0002.
- First HB11 PG run:26 passed,1 failed due to a test assuming query row order;
  assertion now sorts observations by their actual dates.
- First full integration run:127 passed,1 failed because HB10's journal assertion
  expected3 migrations. It now expects4. A later full run passed132/132; after
  additional exact F-001/F-002/16 cases135/135 passed. The final direct SQL
  correction-fork/self-reference/reserve-bypass control increased this to136/136.
- An intentional conversation interruption lost some process-session handles.
  Those incomplete outputs are not counted; full unit runs/typecheck were repeated
  and their completed results observed.
- After interruption, one orchestration attempt lacked the in-memory DB prefix
  and failed before any DB command. Prefix was restored, container identity checked
  again, and final integration/migration commands completed successfully.

## Isolation

Created only `hb011-pg-e58f496165b6`, image postgres:18, labels
home-budget.task=HB-011 and home-budget.run=hb011-pg-e58f496165b6.
Dynamic binding:127.0.0.1:55849. A generated password was passed via environment,
not trust authentication; no credential/URL is recorded here. Every DB command
verified the saved ID, labels and current loopback binding, then explicitly
overrode DATABASE_URL, DATABASE_URL_UNPOOLED and TEST_DATABASE_URL with local
targets plus the required isolation flags. The env-file loader could not override
those process values. Retained HB9 wrong-password TCP test passed.

Each integration invocation creates a uniquely named fresh child database and
applies the real full migration chain. The legacy test creates a separate new
child database, applies0000–0002 and proves0003's refusal. Existing databases were
not reset/truncated/dropped. No other container was inspected for data or changed.
After final verification, only this task's container was stopped and its exited
state verified. The ignored node_modules/.cache/hb011-db.json password cache was
deleted. The stopped synthetic container was not removed.

## Skill application and reviewer focus

Read project AGENTS/specs/ADRs, approved plan/amendments and actual skills.
create-planning-doc/create-scenarios supplied scoped contract and grouped exact
oracles. verify-financial-invariants mapped BR assertions and adverse histories.
define-architecture kept pure domain/ports/private composition and a single tx.
define-conventions reused Result, exact codecs, frozen commands and typed rollback.
configure-project reused existing scripts/lock/CI and validated local target guards.
security-best-practices applied Next AUTH/INPUT/INJECT/LOG/ERROR guidance to HB7
ownership, bounded DTO copying, parameterized SQL, safe errors and no credential
or financial logging. This is implementer self-review, not independent review.

Independent review should inspect original payment evidence versus corrected
predecessors, full suffix consistency, same-batch SQL dependencies, correction
CREATE, strict canonical beforeState, terminal guard and unchanged reserve rules.
Review unknown report-contract refusals, exact pinned revisions and unchanged v1.
Complete JSON/order/consent/history/audit semantics are runtime-owned; SQL alone
does not prove them. Large histories remain materialized in memory. One new
position/day/batch, same-position action-preserving corrections and original bank
checkpoint reuse are deliberate conservative boundaries; unsupported moves refuse.
No production/hosted CI/browser/e2e verification is claimed.

## Medium correction and repeat verification — 2026-11-02

Independent review found that a new OUTSIDE_TRACKED_CARD payment could confirm
a changed B:50000→42000,partial5000. The writer previously checked acknowledgment
only when amounts were equal. This violated BR-03's fresh unchanged-card-balance
rule. The finding was fixed and accepted after independent re-review.

The new guard is inside the existing new-bankCheck branch, after resolving the
chronologically preceding active observation at the reviewed position and before
checkpoint persistence. OUTSIDE_TRACKED_CARD requires an existing preceding
observation, exact B equality and unchangedBalanceAcknowledged=true. Any failure
throws PAYMENT_CONFIRMATION_REQUIRED through rejectBatch. Acknowledgment cannot
override unequal balances. TRACKED_CARD still accepts changed actual B; neither
source subtracts payment from B. Reviewed historical correction behavior is unchanged.

Added PostgreSQL A–F cases:

| Case | Input | Observed result |
|---|---|---|
| A | External,B50000→42000,paid5000,ack=false | Refusal,full rollback |
| B | Same unequal B,ack=true | Refusal,full rollback |
| C | External,B50000→50000,paid5000,ack=true | Success,B50000,R15000,outstanding15000 |
| D | Same equal B,ack=false | Refusal,full rollback |
| E | Tracked card,B50000→45000,paid5000 | Success,B45000,R15000,no repeated debit |
| F | External,no preceding B,proposed first B50000,ack=true | Conservative refusal,full rollback |

For every refusal the test reads real SQL counts for budget_updates (including
receipts), obligation_events, balance_checkpoints, allocation_revisions,
period_allocations, historical_positions, ordering_revisions and audit_events.
It also compares aggregate revision, recorded sequence and active head with the
pre-request values. Successful cases assert the selected real B, reserve/outstanding,
new checkpoint count and correct account counters/head.

Red/green evidence: before the fix A/B/F failed because the requests committed;
C/D/E passed. After the guard all six pass. A first combined regex filter was
misinterpreted by the Windows package-script shell before tests ran; the rerun used
separate -t filters, with the completed results below. No result is attributed to
that failed filter command.

| Repeated command | Actual result |
|---|---|
| `pnpm.cmd test:integration tests/integration/obligations.test.ts -t HB11-Medium` | exit0,6/6 selected cases;39 unrelated cases intentionally filtered |
| `pnpm.cmd test:integration tests/integration/obligations.test.ts -t HB11-20a` | exit0,1 selected grouped test containing20a/20b/21/22a/22b;44 unrelated cases filtered |
| `pnpm.cmd test:integration` | exit0,**142/142**,5 files;45 HB11 and97 retained tests, no skipped cases |
| `pnpm.cmd test` | exit0,**463/463**,21 files, including pure H/K assertions |
| `pnpm.cmd exec vitest run tests/architecture.test.ts` | exit0,1/1 |
| `pnpm.cmd lint` | exit0,zero errors/warnings |
| `pnpm.cmd typecheck` | exit0,route typegen and tsc |
| `pnpm.cmd build` | exit0,production compile/types and8 route entries |
| `git diff --check` | exit0,no whitespace diagnostics |
| Full-file hygiene |31 tracked/untracked task files:valid UTF8,no BOM,final newline,no trailing whitespace/bare CR,JSON valid |

Repeat PostgreSQL verification used only new postgres:18 container
`hb011-r2-pg-319aea5574b2`, labeled home-budget.task=HB-011-R2 and
home-budget.run=hb011-r2-pg-319aea5574b2, at127.0.0.1:61959 with generated password
authentication. Each invocation checked ID/labels/loopback binding and explicitly
overrode all three database URLs and isolation flags. Each suite used a new child
database. No Neon, existing database or other container was changed. After checks,
only this new container was stopped and its exited state verified; its temporary
ignored password cache was removed. The stopped synthetic container was not removed.

Scope of this correction: one writer guard, six integration cases plus allocation
row counts, and contract/scenario/evidence documentation. No migration, dependency,
OAuth, .env.local or .vscode/extensions.json change. No commit, push or PR.

Re-review package: `hb-011-review-r2.tar.gz`, a290-file repository source snapshot
including current implementation, tests, specifications and this evidence. It
excludes .git, .env.local, IDE settings, dependencies, caches and prior archives.
Packaging verifies the entry list against an explicit manifest and the five
correction-related source/test/document files against their current bytes.
Companion SHA-256 file: `hb-011-review-r2.sha256`.

## Final independent review and owner acceptance — 2026-11-02

- Independent implementation review completed.
- Initial finding: one Medium affecting OUTSIDE_TRACKED_CARD payment confirmation.
- R2 independently reviewed: corrected writer guard, PostgreSQL scenarios A-F, rollback assertions and absence of unrelated changes.
- Final open findings: Critical 0, High 0, Medium 0, Low 0.
- Codex verification: 463/463 unit tests, 142/142 PostgreSQL integration tests, successful lint, typecheck, architecture checks and build.
- The independent reviewer inspected the code and tests but did not rerun PostgreSQL integration independently.
- Reviewed R2 archive SHA-256: dbcd81473a59854da9e44ef045fa44322d6bf738b25700a1f448b392b103ce21.
- Owner explicitly accepted HB-011 on 2026-11-02.
- Git commit, CI, PR and merge follow as separate workflow steps.
