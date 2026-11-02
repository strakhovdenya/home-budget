# HB-012 — implementation verification

Date: 2026-11-02. Branch: feat/hb-012-savings.
Status: Done. Approved technical plan implemented; independent implementation
review completed; owner accepted HB-012 on 2026-11-02. CI/merge pending.
Contract: [HB-012](hb-012-savings.md).
Scenarios: [S01–S43/E01–E10/O01–O08](../../tests/scenarios/phase-01/hb-012-savings.md).

## Implemented assertions

| Requirement | Executed evidence |
|---|---|
| BR-07 voluntary full savings | CREATE/INCREASE/PARTIAL/FULL release, terminal/no zero ACTIVE, explicit title-only AMEND; S above A, signed F arithmetic, duplicate identity and total overflow |
| No cash posting/fake freshness | F-008 exact B40000/R20000/S5000→S3000/F17000; standalone bank head/count/date retained; optional actual same-B check creates one C/V at shared position |
| Immutable evidence | Exactly one SAVINGS_STATE audit per revision; exact scope/revision/batch/seq/predecessor/canonical amounts/full snapshots; both PARTIAL/FULL direct-SQL missing/malformed/mismatching/duplicate evidence refuse runtime reads and writes; INCREASE missing evidence also refuses |
| S26 | Insert increase alone fully rolls back; reviewed increase+late release correction succeeds with2 savings revisions,2 distinct savings audits,1 new position; confirmed increase3000/release2000 retained; all9 H/K cuts and original rL/audit checked |
| Whole suffix | Original and resolved lifecycle validated, exact predecessor/before preserved; altered confirmed release or insufficient historical predecessor refuses; no automatic rebase |
| Ordering | One NEW position/day/batch; same-day existing corrections reuse positions; same-batch strictly ordered predecessors accepted; reversed/same-position history refuses; second new position rolls back co-located bank/vector/savings |
| Independent streams | Ordinary checkpoint retains S even above B; obligation AMEND retains savings revision; same-day obligation/savings positions, DST and Berlin month-boundary cuts retain funding |
| Closed reports | Immutable v1 bytes/source/cutoff; post-H change does not mark old report; historical correction marks October only, September unaffected; unsupported manifest and unflagged basis drift refuse |
| Self-review regression | Original report pending flags captured before sibling writes; a bank writer's newly set pending flag cannot hide pre-existing unexplained savings drift |
| Atomicity/security | Exact replay before stale; key conflict; real concurrent release; scoped foreign refs; actual audit INSERT failure and deferred SQL failure; full contents of17 scoped tables plus account heads/counters compared on rollback |
| SQL | Full chain and replay,19 tables/5 migrations; legacy nonempty savings refuse0004 without backfill; direct SQL title/action/state/before/date/lineage/funding/terminal negatives; retained HB-009–HB-011 integration suites |
| Layers/types | Architecture fitness, strict typecheck and negative static assertions; unchanged import directions/allowlists and dependencies |

Direct SQL evidence fixtures bypass application validators and are deliberately
permitted to persist incomplete evidence by the relational schema. Tests assert
HISTORICAL_SAVINGS_CONFLICT from the historical reader and subsequent trusted
writer, with no fallback inference. This is not SQL audit-completeness proof.

## Exact completed command results

| Command | Result |
|---|---|
| pnpm.cmd test | exit0;479/479 tests,22 files; final rerun after self-review |
| pnpm.cmd test:integration | exit0;202/202 tests,6 files:60 HB12 and142 retained |
| pnpm.cmd lint | exit0;zero errors/warnings |
| pnpm.cmd typecheck | exit0;Next route typegen and tsc, including tests/savings-types.ts |
| pnpm.cmd build | exit0;production compile/types/page generation,8 existing route entries |
| pnpm.cmd exec vitest run tests/architecture.test.ts | exit0;1/1 |
| pnpm.cmd db:migrate | exit0;complete0000–0004 applied to new local admin database |
| pnpm.cmd db:migrate, repeat | exit0;no pending migration reapplied |
| TZ=UTC with command below | exit0;230/230 tests,6 files |
| TZ=America/Los_Angeles with same command | exit0;230/230 tests,6 files |
| git diff --check | exit0;final documentation/hygiene check recorded below |

```powershell
pnpm.cmd exec vitest run tests/shared/pure/calendar.test.ts tests/shared/pure/berlin-date.test.ts tests/domain/period.test.ts tests/checkpoints.test.ts tests/obligations.test.ts tests/savings.test.ts
```

TZ/subset/architecture reruns are not additional unique full-suite tests. Unit
tests require no DB. Integration tests run real PostgreSQL, not ORM/SQL mocks;
each suite creates a new uniquely named child database and applies all migrations.
The concurrency case uses two real commits with the first holding the account
lock; retained HB9 tests additionally prove waiting through PostgreSQL diagnostics.
Unknown-COMMIT recovery remains the existing HB9 implementation/retained tests.

Final file hygiene passed for37 tracked/new task files: strict UTF8, no BOM,
final newlines, no trailing whitespace/bare CR, valid JSON,6 new-document relative
links,0003→0004 snapshot/journal continuity, unchanged protected/old SQL/dependency
paths and absence of the temporary password cache. git diff --check exited0.
Git's global-ignore permission and LF→CRLF notices do not indicate failed checks.

## Earlier non-final failures and corrections

- First red savings unit invocation failed because the domain module did not yet
  exist; no tests passed in that invocation.
- Sandboxed typecheck could not materialize the existing Windows SWC native
  binding/cache; approved-access typegen/build succeeded, without cache/config or
  dependency changes.
- Initial shared placement extraction had a CRLF anchor mismatch and produced a
  syntax error; extraction was corrected from the original HEAD file. Subsequent
  static/full HB11 regression tests passed.
- Initial integration source had await inside a non-async test callback; fixed
  before its first36-case green run. Later TypeScript fixture/data/scope annotations
  were corrected. Intermediate lint reported two imports reserved for later report/
  legacy tests; final lint has no findings.
- First full PostgreSQL run:177 passed,1 failed. HB10's old synthetic saving lacked
  newly mandatory evidence. The fixture now records the exact full-state audit;
  storage-only HB6 fixture adds the required synthetic title.
- Initial report test selected the October state when asking for the later November
  release; corrected its historical read. Expanded54-case savings run passed.
- Full integration reached201/201; self-review then added the report pending/basis
  drift regression and original-flag guard. Final full integration is202/202.

No failed/interrupted invocation is counted as successful evidence.

## Isolation and cleanup

Created only new container hb012-pg-313a01b3d2ff, image postgres:18, labels
home-budget.task=HB-012 and home-budget.run=hb012-pg-313a01b3d2ff.
Dynamic binding:127.0.0.1:55067. Random generated password authentication; no
trust authentication and no credential/connection URL recorded here.

Before every DB invocation, checked this container's saved ID/name/task label and
loopback port. DATABASE_URL, DATABASE_URL_UNPOOLED and TEST_DATABASE_URL were all
explicitly overridden in the process; HB_DATABASE_TARGET=isolated-development and
HB_TEST_DATABASE_TARGET=disposable-local-container were set. Existing env-file
values could not override those destinations. Only synthetic child databases
inside this new container were used. No old container/database was inspected for
data or changed; no Neon connection. Migration legacy test used its own new child
database and deliberately did not apply0004 successfully.

After verification, only this new task container was stopped and its stopped
state checked. The ignored node_modules/.cache/hb012-db.json temporary password
cache was removed. The stopped synthetic container was retained, not restarted.
No .env.local/.vscode/extensions.json/OAuth change; no commit/push/PR/merge.

## Skills and reviewer focus

create-planning-doc: approved scoped contract and reviewable groups, no milestone
expansion. create-scenarios: exact synthetic S/E/O oracles with time/scope/storage
assertions. verify-financial-invariants: BR mapping, no repeated cash debit, full
S/R and historical preservation, deficit/overflow tests. define-architecture:
pure domain/ports/private server composition, existing transaction/order reuse.
define-conventions: existing checked cents/Result/frozen command and throw-on-refusal;
canonical evidence and immutable before/after. configure-project: existing scripts,
lock/config/CI/local-target guards reused, isolated PG18 verification. Server
security skill/reference applied to HB7 auth, bounded input/evidence, parameterized
SQL, server-only imports and sanitized errors/no sensitive logging. No React UI or
web-design change, new package or public endpoint.

Independently review exact evidence identity/scope/amount checks, raw versus
resolved suffixes,2 audits in b12, SQL correction CREATE and historical ordering,
original report pending flags, typed refusals after writes and retained bank heads.
This report is implementer verification/self-review, not independent review.

Limits: full account histories/audits are materialized in memory, no production
scale benchmark. HB9 bounded payload/audit limits remain. Strict action-preserving
same-position corrections and terminal identities deliberately refuse unsupported
reopen/reposition semantics. No funding move/CARRY/FRESH_START/forecast/UI/report
version creation, hosted CI, deployment, browser/e2e or Neon result is claimed.

## Changed-file inventory for independent review

Existing files:

- docs/ARCHITECTURE.md, docs/DATABASE.md, docs/DATA_MODEL.md,
  docs/PROJECT_CONFIG.md, docs/TASKS.md, docs/architecture.json, docs/conventions.md;
- drizzle/meta/_journal.json;
- src/domain/updates/contracts.ts;
- src/infrastructure/db/checkpoint-writer.ts, obligation-writer.ts, schema.ts;
- tests/integration/bank-checkpoints.test.ts, persistence.test.ts.

New files:

- docs/planning/hb-012-savings.md, hb-012-verification.md;
- drizzle/0004_savings_lifecycle_guards.sql, drizzle/meta/0004_snapshot.json;
- src/app/savings-boundary.ts;
- src/domain/savings/contracts.ts, evidence.ts, history.ts, lifecycle.ts, ports.ts,
  proposal.ts, validation.ts;
- src/features/savings/read-savings.ts;
- src/infrastructure/db/historical-placement.ts, report-impact.ts,
  savings-compatibility.ts, savings-history.ts, savings-reader.ts, savings-writer.ts;
- tests/integration/savings.test.ts, tests/savings.test.ts, tests/savings-types.ts;
- tests/scenarios/phase-01/hb-012-savings.md.

The pre-existing untracked .vscode/extensions.json is excluded from this task.
Old SQL migrations0000–0003, dependencies/lockfile and OAuth are unchanged.

## Final independent review and owner acceptance — 2026-11-02

- Independent static review completed; no open findings.
- Owner accepted HB-012 on 2026-11-02.
- Implementer verification: 479/479 unit and 202/202 PostgreSQL integration tests.
- Independent reviewer inspected code and tests but did not rerun them.
- Commit, push, CI and merge follow acceptance.
