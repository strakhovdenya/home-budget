# HB-014 implementation verification and source-review handoff

Date:2026-11-02. Branch:feat/hb-014-daily-forecast.
Base/current HEAD:d0779415d7ee5ab1259acf7476fdde93c124d5bf (HB-013 squash PR13).
No commit/push/PR/CI run/merge performed for HB-014. Owner authorized implementation
after independent PLAN review APPROVED WITH CONDITIONS. The implementation
verification and self-review below are Codex execution evidence, preserved separately
from the subsequently completed independent static review and owner acceptance.
HB-014 is Done following owner acceptance on2026-11-02; see Owner Acceptance below.

## Delivered contract and source inventory

Production private server-only composition: src/app/budget-projection-boundary.ts.
Account/period reads use features/budget-projection/read-account.ts; current
liquidity exposes safe estimate with bank/provenance/freshness. No public HTTP or
Server Action endpoint and no UI imports financial projections.

New domain files under src/domain/forecast:
contracts.ts,ports.ts,validation.ts,assembly.ts,budget.ts,liquidity.ts,warnings.ts,
freshness.ts,serialization.ts. Pure formulas use explicit Berlin H and validated
bigint state; no ORM/auth/Next/React/crypto/Date.now. Ports inject the repository.

New infrastructure files: projection-reader.ts,history-read-context.ts.
Modified infrastructure: obligation-history.ts,savings-history.ts,funding-evidence.ts
accept an optional bulk context. Existing writer/default-reader contracts stay
unchanged. No new transaction manager/history framework.

New tests: tests/fixtures/forecast.ts,tests/forecast.test.ts,
tests/forecast-boundary.test.ts,tests/forecast-oracles.test.ts,
tests/forecast-types.ts,tests/integration/budget-projection.test.ts.

New docs: this verification, hb-014-daily-forecast.md and
tests/scenarios/phase-01/hb-014-daily-forecast.md.
Modified docs: TASKS.md,ARCHITECTURE.md,DATA_MODEL.md,DATABASE.md,architecture.json.
No changes to package/lock/config/scripts/migrations0000–0005/ADRs/owner decisions.

Known pre-existing untracked .vscode/extensions.json is untouched and not staged.
During work .vscode/settings.json was externally changed to add
markdown.validate.enabled=true. That edit was not made/reverted by this task;
it is excluded from the HB-014 implementation inventory. No unrelated file was
overwritten. .env.local/OAuth/private bank data were not modified or disclosed.

## Review conditions: exact implementation points

projection-reader captures scoped account recordedSeq, aggregateRevision and active
allocation pointer inside one REPEATABLE READ READ ONLY transaction, then one
PostgreSQL server instant ->Berlin day. readAt is internal trusted H/K only;
the feature query accepts exactly targetPeriod. Query and repository arguments
are captured before async use. No shared/static cache.

Independent obligations/savings_goals enumeration at K proves identity completeness.
assembly validates root histories/origin/funding period mapping and one state per
identity; existing selectors resolve tips at K before H. Projection requires every
obligation audit as well as existing payment/saving/funding evidence. Invalid
mandatory data refuses, never becomes INCOMPLETE_STATE or monetary0.

Current-pointer comparison is conditional on full captured K and H covering all
financial positions. Historical H/oldK legitimately select old vectors. Unit and
PG tests prove both valid historical selection and a real current mismatch refusal.

Preflight counts/JSON-byte aggregates cover all tables/material read paths at K
before fetching rows; see exact limits/work admission in the implementation
contract. SQL timeout10s. Bulk audit/decision indexes remove projection funding
N+1 SQL and duplicate checkpoint loads. Post-encoder exact UTF8 bytes enforce1MiB.
No limit is implemented as silent truncation/partial success.

## Actual executed commands (last results)

Environment: Windows PowerShell, Node22.23.0, pnpm12.16.1, Vitest5.0.5,
PostgreSQL18.6 (Debian18.6-1.pgdg13+2), Docker29.8.0.
Default local process timezone Europe/Warsaw; finance uses Europe/Berlin explicitly.

| Command / scope | Last exit | Actual result |
|---|---:|---|
| pnpm.cmd lint | 0 | Zero warnings/errors |
| pnpm.cmd typecheck | 0 | Next typegen and strict tsc, including readonly negative type assertions |
| pnpm.cmd test | 0 | 28 files,639/639 tests |
| pnpm.cmd exec vitest run tests/architecture.test.ts | 0 | 1/1 test; unchanged layer/external allowlists |
| pnpm.cmd build | 0 | Production build/typecheck; existing8 dynamic routes, no new endpoint |
| Targeted forecast tests,3 files | 0 | 106/106 tests |
| Targeted HB14 PostgreSQL integration | 0 | 24/24 tests,1 file |
| pnpm.cmd test:integration, full HB006–014 | 0 | 302/302 tests,8 files; final115.55s run includes final multi-month FRESH_START fixture |
| Calendar/history/forecast subset,TZ=UTC | 0 | 14 files,503/503 tests |
| Same subset,TZ=America/Los_Angeles | 0 | 14 files,503/503 tests |
| pnpm.cmd db:migrate, then repeated db:migrate | 0 / 0 | Existing0000–0005 apply/reapply on owned disposable parent DB |
| git diff --check | 0 | No whitespace errors in tracked changes; new text files checked separately |

Timezone subset exact files: forecast.test.ts,forecast-boundary.test.ts,
forecast-oracles.test.ts,checkpoints.test.ts,checkpoint-reconciliation.test.ts,
obligations.test.ts,savings.test.ts,transitions.test.ts,transition-calendar.test.ts,
shared/pure/calendar.test.ts,shared/pure/berlin-date.test.ts,domain/period.test.ts,
domain/money.test.ts,domain/money-codec.test.ts (all under tests/).
Each TZ override ran in its own child command process; parent environment unchanged.

The finite sweep executes27000 A/E combinations with production projection, checks
equivalent L, safe/budget/cash bounds, overlapping shortages, conservation and
q/r; separate tests cover31 divisors, R/S splits, permutations and int64 edges.
The final full unit suite, including sweep, took16.81s. Earlier targeted sweep suite
took approximately5s; no unbounded Cartesian product or new dependency.

## Scenario evidence and exact outputs

Full HB14-001..063 -> real test title/file mapping, plus every HB3-001..035/C01..C08,
HBA001..016,HBL001..028 and F003/006/008/009 reference, is in
[HB14 scenario traceability](../../tests/scenarios/phase-01/hb-014-daily-forecast.md).
Mapping separates retained write-side regression proof from new projection proof.

| Synthetic oracle | Exact observed result |
|---|---|
| D36 B10000,Acur10000,Rfuture20000,n3 | F10000,T20000,L-10000,safe0,main0;ordinary3333/r1;O/E/P10000 |
| Funded overlap B50000,A40000/10000,E35000/3000 | T45000,safe5000,main1666/r2;other protected10000 |
| F003 B123000,A3000/120000,RDec90000 | Current safe3000/main1000;future F30000,967/r23 |
| F006 B15000,R20000 | F-5000,deficit5000,safe0;full R retained |
| F008 B40000,R20000,S5000->3000 | Free/safe15000->17000;B40000 unchanged |
| HBL028 Nov20 state readDec1 | Current F6000,T4000,safe6000,main193/r17,age11;no transition |
| HB13 REDISTRIBUTE persisted B89000,Acur88000/future1000,oldR30000/S5000 | Current F88000,T36000,safe53000;funding remains past |
| Preserved future F fixture B9000,Acur7000/future2000,Rcur4500,Scur700/Sfuture700 | Fcur1800,T7200,safe1800;three retained savings identities,only old funding moved |

PG fixtures use actual server Berlin date and transitionCalendar/civil shifts,
not fixed2026-11-02. Production future-date validation is enabled. Pure fixtures
inject explicit Nov/Dec/Jan,February and DST dates. Controlled concurrency delays
only real SQL scheduling after capture; all data/queries/isolation are genuine.
One read sees entirely precommit bank10000/R2000/S1000/safe7000, next read bank9000.

Each new PG read checks canonical full rows of18 scoped tables plus account
heads/counters. Nonempty closing/report fixture proves original bytes, pinned
metadata and pending flag survive. Actual partial/full payment and saving release
fixtures prove bank30000 then10000 without repeated debit; release increases safe
5000->7000 while bank remains10000. No constraints/triggers are disabled.

## Self-review findings and fixed regressions

1. Added old-K correction test exposed completeness inspecting event revisions
   after K in a fully supplied history. Fixed by filtering events at K before
   completeness, matching selectors. Genuine saving correction and reposition
   tests now prove old/new K and H; PG old-H/old-K selection also passes.
2. Payment audit amounts are persisted decimal strings. Explicit audit comparison
   uses the original amount's canonical wire string, not bigint canonical identity.
   Real PG partial/full payment exercises this path.
3. Initial UTF8 stress fixture was below1MiB; corrected to200 four-byte Unicode
   code points per title across1000 identities. Final test proves real oversized
   wire refusal plus exact3-byte euro limit/limit+1. No production limit weakened.
4. Added early UTF16 title bound before existing Unicode point validation and
   case-insensitive duplicate UUID identity detection. All inputs remain copied,
   deeply frozen and checked before financial formulas.
5. Added complete obligation-state audit checks and indexed bulk context rather
   than trusting event JOIN or independently recapturing stream K.
6. Self-review strengthened the obligation audit envelope to exact schemaVersion1,
   nonnegative integer eventIndex and exact entity/after fields. A genuine SQL
   fixture with correct financial snapshots but schemaVersion2 now refuses.

Initial red test demonstrated the missing forecast module (suite import failure,
zero tests), not a passing/failing financial implementation assertion. Intermediate
lint/type errors were fixed and final commands rerun. Sandboxed Next typegen lacked
access to SWC native cache; typecheck/build succeeded with approved access to the
existing cache, without dependency reinstall or permission/config changes.
PowerShell's older .NET lacked the first RNG API; only the verified owned initial
container was replaced, using RNG.Create/GetBytes. Final container requires random
password authentication over its unique127.0.0.1 port; full HB9 wrong-password
regression remains part of the executed integration suite.

## Safe database environment and limitations

Only newly created hb014 task container, label hb.task=HB-014 plus unique hb.run,
was used. Name/ID/labels/loopback port are checked before each DB command. Each
process explicitly overrides all three database URLs and both local-target markers;
existing guards reject remote targets. Integration creates unique child DBs and
applies real migration chain. No Neon/production/existing foreign DB/container access.
No URL/password is printed in this report or committed. After the last PG run the
own container's ID/name/labels were rechecked, that container alone was stopped
(verified exited), and only its temporary password/state cache files were removed.
Existing containers and databases were not stopped, removed or reset.

Negative bank branch is domain-only because PostgreSQL correctly forbids B<0.
Some impossible persisted invalid states are domain tests or retained SQL refusals;
they are not claimed as successful corrupt SQL fixtures. Production no-observation
supports known earmarks; explicit partial branch is for a deliberately partial
pure caller, never a fallback for corrupt mandatory storage. Work/row/byte limits
can refuse large otherwise valid histories; no scalable pagination is promised.
No browser/UI testing is claimed or needed for this private read layer.
GitHub CI was not triggered; local results are not CI or independent-review evidence.

## Required skills actually applied

All paths are actual repository .agents/skills/<name>/SKILL.md, read in this
conversation; user authorization overrides planning-skill write/test restrictions
from the earlier planning-only stage. Relevant Next.js server security references
were read for auth/input/server-only/cache/resource isolation. No UI skill needed.

| Skill path suffix | Application and verified requirement |
|---|---|
| create-planning-doc/SKILL.md | Scoped contract,seven-case scenario blocks,five review gates,no Done |
| create-scenarios/SKILL.md | Exact cents/GIVEN-WHEN-THEN,Berlin/H/K,negative/read-only traceability |
| verify-financial-invariants/SKILL.md | Full R/S,D36/no double protection/payment debit,27000-state proof |
| define-architecture/SKILL.md | Pure domain/ports,shared history loaders,unchanged imports,architecture test |
| security-best-practices/SKILL.md | HB007 scope,private reads,bounded SQL/DTO,code-only errors,no cache leak |
| configure-project/SKILL.md | Real scripts,Node/pnpm/Vitest,isolated PG18,existing migrations,timezone runs |

## Owner Acceptance

The owner officially accepted HB-014 on **2026-11-02**. Status: **Done**.
Independent static review of the source and tests is complete: **APPROVED**.

| Open findings | Count |
|---|---:|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

Evidence remains explicitly separated:

- **Codex executed verification:** unit639/639 PASS; PostgreSQL integration302/302
  PASS; HB-014 targeted106 unit +24 PostgreSQL; timezone subset503/503 in each TZ;
  lint,typecheck,build,architecture and existing migration apply/reapply PASS.
  The command results, environment, self-review findings and limitations above
  remain the original implementation evidence.
- **Independent static review:** the reviewer inspected source and tests and
  approved the implementation, but did **not** independently run PostgreSQL or
  Vitest. This approval is static-review evidence, not a reviewer test rerun.
- **Owner acceptance:** explicitly confirmed on2026-11-02, following the review.

This finalization changed documentation only; no new test or database execution
is claimed. Commit, push, PR, GitHub CI and merge have not been performed for
HB-014. Git commit/push/PR is the next separately authorized step.
