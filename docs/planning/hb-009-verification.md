# HB-009 — Verification and review handoff

Date: 2026-11-02. Branch: feat/hb-009-audit-idempotency.
Status: Done. Independent re-review confirmed the Medium fix; open findings 0/0/0/0. Owner accepted HB-009 on 2026-11-02.
[Contract/API](hb-009-audit-idempotency.md) ·
[HB9 scenarios](../../tests/scenarios/phase-01/hb-009-audit-idempotency.md).

## Scope and implemented result

Extended the existing HB-006 commitBatch and account row lock; no replacement
transaction engine, separate event store, dependency, schema.ts change or new
migration. HB-007 authorization is composed in a server-only factory; the factory
is not a Server Action/route and registers no arbitrary client event endpoint.
No HB-010+ financial operation was added. HB-008 money/date implementations and
Google OAuth are unchanged.

Commands are copied/frozen once before async auth. A private runtime provenance
guard rejects forged frozen commands. Canonical identity and the trusted handler
use the same graph. Audit descriptors are mandatory and include actual before/
after supplied by the handler from locked state. Replay validates persisted
receipt content against its row, before checking stale revision. Both counters
are checked before incrementing. SQLSTATE/cause inspection separates explicit
transaction rejection from an unknown COMMIT outcome.

## Original implementation checks — before independent review

Node v22.23.0 / pnpm 12.16.1, Windows. Commands use pnpm.cmd in PowerShell.

| Command / check | Actual result |
|---|---|
| pnpm.cmd lint | PASS, exit 0, zero warnings |
| pnpm.cmd typecheck | PASS, exit 0, Next route typegen and strict TypeScript |
| pnpm.cmd test — first requested final run | PASS, exit 0, 18 files / 368 tests |
| pnpm.cmd test — second requested final run | PASS, exit 0, 18 files / 368 tests |
| pnpm.cmd build | PASS, exit 0; production compile, TypeScript, page-data collection and 8 static-generation entries, routes dynamic |
| pnpm.cmd exec vitest run tests/architecture.test.ts | PASS, exit 0, 1 file / 1 test |
| pnpm.cmd test:integration | PASS, exit 0, 3 files / 52 tests |
| pnpm.cmd test:integration -t HB9 | PASS, exit 0, 30 passed / 22 skipped by filter; fresh schema initialized independently |
| pnpm.cmd db:migrate, run twice | Both PASS, exit 0, existing migrations applied/replayed only on new local HB-009 admin DB |
| Workflow YAML parse and password/port checks via installed yaml parser | PASS; no package installed. Hosted GitHub Actions not executed |
| git diff --check | PASS, exit 0 |
| Separate tracked + untracked file check | PASS: 30 task files, including all 19 new files; UTF-8/BOM, trailing whitespace/final newline, new document links/fences, architecture JSON and 27 unique sequential scenario IDs |
| git status --short --untracked-files=all | Inspected; only listed HB-009 files plus pre-existing untracked .vscode/extensions.json |

368 is the full unit count (312 preceding + 56 new HB-009 cases). 52 is the
separate integration count (19 persistence + 3 auth + 30 HB9). Repeated/full/
filtered runs overlap and are not added together as distinct cases.
The three additional @ts-expect-error assertions in tests/types/hb-009.ts are
checked by TypeScript, not counted as Vitest cases.

Typecheck/build and local DB commands used approved sandbox escalation for
existing Windows SWC/system/Docker access. No global permissions, cache policy,
dependency or env-file changes. All DB-capable commands explicitly overrode
DATABASE_URL, DATABASE_URL_UNPOOLED and TEST_DATABASE_URL with the same new
password-authenticated 127.0.0.1 destination. No Neon production/development/
hb006-test connection was opened. Build loads the existing env file but its DB
values are overridden in the process and no values were printed.

## Isolated PostgreSQL and reproducibility

Created only container hb009-pg-57d061cb664844898b414a3b3879d656,
label home-budget.task=HB-009, image postgres:18, dynamically assigned binding
127.0.0.1:50739 -> 5432/tcp. No existing container was started/reconfigured/stopped.
The password was randomly generated, passed through a process environment
variable to docker --env POSTGRES_PASSWORD (not embedded in command arguments),
and temporarily retained only in ignored node_modules/.cache/hb009-db.json.
No trust mode was set. HB9-021 demonstrated wrong-password TCP rejection 28P01.

After verification, the exact saved new container ID/label was checked again,
only that container was stopped and its state verified as exited. The ignored
temporary credential cache was deleted. Synthetic databases remain in the stopped
container for inspection; no pre-existing database/container was removed.

Each suite created a new uniquely named synthetic child database and migrated it
before running. The admin DB was separately migrated twice. No existing database
was truncated, dropped or reset. DB clients/pools were closed after suites.

Creation command pattern actually used (values generated at execution):

~~~powershell
$hb009Name = 'hb009-pg-' + [guid]::NewGuid().ToString('N')
$hb009Password = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$env:POSTGRES_PASSWORD = $hb009Password
docker run --detach --name $hb009Name --label home-budget.task=HB-009 --publish 127.0.0.1::5432 --env POSTGRES_USER=hb009_test --env POSTGRES_DB=hb009_admin --env POSTGRES_PASSWORD postgres:18
docker port $hb009Name 5432/tcp
~~~

Before every DB-capable verification process, the saved new container ID's label
was checked with docker inspect --format '{{json .Config.Labels}}'. The command
process then assembled a local URL from the generated password and verified port
without printing it, and assigned all three URL variables plus
HB_DATABASE_TARGET=isolated-development and
HB_TEST_DATABASE_TARGET=disposable-local-container. These process variables did
not alter .env.local or the parent IDE environment.

CI's existing disposable service was changed from trust/static loopback port to
synthetic password/automatic loopback port to keep HB9-021 runnable in CI.
The URL step receives job.services.postgres.ports[5432], includes PGPASSWORD and
masks the URL before export. The checked-in CI password is explicitly synthetic,
not a real/deployed credential. YAML parses locally; hosted service provisioning
is a remaining CI verification, not claimed as executed.

## Scenario proof

| Scenarios | Executed proof |
|---|---|
| HB9-001 | First state/fact/update/audit commit; actor/request/sequence links; backdated effectiveDate differs from recordedAt; factual Before/After |
| HB9-002/003 | Same receipt after response loss and a later account revision, with no callback replay or extra events |
| HB9-004 | Changed payload/reason/effectiveDate/expectedRevision conflicts under same key |
| HB9-005/006/007 | Four controlled interleavings: identical replay, different-key stale, changed-payload conflict, first rollback then second success |
| HB9-008..012 | Stale, handler error, absent descriptors, deferred-FK failure at COMMIT and real audit INSERT rejection all preserve the original state/counters and leave no partial facts/receipt/audit |
| HB9-013/014/022 | UPDATE/DELETE rejection for audit/batches; foreign owner denied before replay; forged actor rejected by existing SQL CHECK |
| HB9-015/016 | MAX/MAX-1 revision and sequence; final valid value replays; malformed receipt and well-shaped wrong ID/seq/revision reject |
| HB9-017/018/020 | Original mutation cannot affect prepared execution; future effective date rejects; a forged frozen object fails provenance |
| HB9-019 | Actual PostgreSQL COMMIT executes, test pg.Client wrapper loses its acknowledgement; API reports COMMIT_OUTCOME_UNKNOWN; original key recovers persisted receipt, one batch/two audits |
| HB9-021 | Wrong TCP password fails against the new isolated server |
| HB9-023..027 | Canonical legacy bytes and unsafe-value rejection; normalization/validation, error classification, actual app/HB-007 composition and compile-time checks |

Races use two real transaction connections. T1 pauses while holding its lock,
T2 starts, and a third connection observes wait_event_type=Lock with nonempty
pg_blocking_pids before T1 is released. Promise.all timing alone is not the oracle.
The COMMIT acknowledgement harness forwards the real query before throwing a
synthetic ECONNRESET; it does not pretend a rolled-back/mock transaction committed.
A separate deferred-constraint test lets the callback finish before PostgreSQL
rejects COMMIT. Test-only audit failure trigger exists only inside the fresh child
database, not in source schema/migrations.

The synthetic handler changes only account metadata and inserts a dated test
position, then audits both. It creates no financial checkpoint/allocation/reserve/
payment/saving/report. HB-006 integration assertions remain, with their callbacks
adapted through a test-only helper that supplies explicit audited counter facts.

## Skills applied

Read AGENTS.md, CODEX_WORKFLOW, AGENT_FACTORY and actual SKILL.md instructions.
This is implementer self-review, not independent review.

| Skill | Instructions actually used | Concrete outcome |
|---|---|---|
| verify-financial-invariants | BR/scenario review, assertion mapping, cents/date/range/rollback/retry/foreign account checks, exact evidence, synthetic data | Checked atomic infrastructure invariants and preserved financial-use-case exclusions; full HB-006/007 regressions plus HB9 tests |
| define-architecture | Inspect source/imports, keep ports and DB boundary, distinguish observed money from derived/metadata events, fitness test, synchronize human/machine docs | No new layers or directions; domain repository port, feature executor, app composition; ARCHITECTURE and architecture.json agree; server-only added only to app's existing external allowlist |
| define-conventions | Pure TypeScript, named functions, typed validation, simple error patterns, no sensitive logging, enforceable rules | Shared Result; frozen command; validated receipt; static error codes; conventions now describes actual dependency-free runtime validators instead of requiring absent Zod |
| create-scenarios | Unique IDs, GIVEN/WHEN/THEN, synthetic values, negative assertions, explicit gaps | 27 HB9 scenarios and test mapping; no fictional bank balances or claims that later financial flows are implemented |
| security-best-practices | Next server reference AUTH-001, INPUT-001, INJECT-001, LOG-001, ERROR-001, server/client boundary | HB-007 reused before repository/replay; ownership rechecked under SQL lock; actor server-derived; bounded hostile inputs; parameterized SQL; server-only factory; sanitized errors; no new endpoint |
| configure-project | Inspect scripts/config/CI/lockfile/DB guards; execute real checks without changing dependencies or developer settings | Existing commands reused; integration alias configured; dedicated password-authenticated dynamic-loopback Docker; CI aligned; no dependency installation |

React/performance and web-design skills were not applied: no React/UI changes.
Security scope was the new server write boundary, not an OAuth redesign or an
unrelated application-wide vulnerability audit.

## Initial failures and corrections

- Sandbox docker version could not access Windows Docker config/pipe. Scoped
  approved escalation created the new container; no passing DB check is claimed
  for the failed attempt.
- Initial Docker label template lost quotes under Windows PowerShell. The guard
  rejected before tests/connection; changed to JSON-label parsing and reran.
- First targeted unit run collected two suites unsuccessfully because Vitest %j
  test names cannot serialize bigint. Replaced names with %s; cases then ran.
- TypeScript rejected inferred heterogeneous audit fixture objects with optional
  undefined properties. Added an explicit readonly AuditDescriptor array.
- First architecture run rejected the app server-only import. Added that existing
  marker to app's explicit allowlist, preserved the server guard, documented the
  human/machine architecture and reran successfully.
- Self-review tightened UUID/kind/entity newline rejection, enforced command
  constructor provenance, checked audit bigint range, guarded prior receipt
  increment and sanitized unexpected lazy adapter errors before final runs.

All final code checks listed above ran after these fixes. Only documentation,
status and cleanup checks followed the successful final code runs.

## Risks and independent reviewer checklist

- All protected future business handlers must use this account lock, same tx and
  context.command; they must validate their own payload semantics and derive
  actual snapshots. The infrastructure validates envelope/provenance/shape, not
  arbitrary JSON's financial truth. No client-callable generic handler exists.
- Runtime WeakSet provenance is local to one module instance; prepared commands
  are not transport objects or reusable across processes. Each incoming raw DTO
  must pass prepareCommand again. Brands/readonly alone are not runtime validation.
- Legacy canonical bytes are preserved for supported data, while the hash envelope
  now includes required effectiveDate/reason. This is not an assertion that old
  HB-006 synthetic private batches support the new command contract; mismatches
  fail closed rather than repeat effects. No live financial command existed.
- Privileged direct SQL can bypass application auth/audit completeness. Existing
  triggers/FKs protect retained relationships/history, not the truth of arbitrary
  JSON, role grants or production operator behavior. No new DB role policy was added.
- COMMIT_OUTCOME_UNKNOWN is deliberately conservative if Drizzle loses an original
  completion error during rollback; retry exactly the same command/key. No automatic
  rebasing/new-key retry or external side effects are implemented.
- Counter exhaustion rejects; no reset/wraparound. Effective date has no implicit
  today default; recorded_at is DB time and recorded_seq is ordering authority.
- Verify CI dynamic-port syntax/service startup in actual GitHub Actions, inspect
  new app composition and audit contracts, repeat hostile-input, interleaving and
  unknown-outcome tests in an independent context.
- Local tests are Windows/Node22/PostgreSQL18 evidence. No hosted CI, deployment,
  live OAuth, Neon, browser UI or complete HB-010+ flow verification is claimed.
- No commit, push or PR. HB-009 remains Review; owner acceptance is still required.

## Changed files

Modified tracked files (11):

~~~text
.github/workflows/ci.yml
docs/ARCHITECTURE.md
docs/DATABASE.md
docs/PROJECT_CONFIG.md
docs/TASKS.md
docs/architecture.json
docs/conventions.md
src/infrastructure/db/commit.ts
tests/architecture.test.ts
tests/integration/persistence.test.ts
vitest.integration.config.ts
~~~

New task files (19):

~~~text
docs/planning/hb-009-audit-idempotency.md
docs/planning/hb-009-verification.md
src/app/budget-update-boundary.ts
src/domain/updates/canonical-value.ts
src/domain/updates/contracts.ts
src/domain/updates/validation.ts
src/features/budget-updates/execute-update.ts
src/infrastructure/db/audit-writer.ts
src/infrastructure/db/update-repository.ts
tests/audit-serialization.test.ts
tests/budget-update-boundary.test.ts
tests/canonical-payload.test.ts
tests/execute-update.test.ts
tests/fixtures/hb-009.ts
tests/fixtures/legacy-commit.ts
tests/integration/audit-idempotency.test.ts
tests/scenarios/phase-01/hb-009-audit-idempotency.md
tests/types/hb-009.ts
tests/updates-validation.test.ts
~~~

The pre-existing untracked .vscode/extensions.json is not a task change.
No .env.local, OAuth, schema/SQL/meta, package.json or lockfile changes.
Git emits global-ignore permission/LF-to-CRLF notices; these did not prevent
successful status/diff checks.

## Independent review correction — Medium audit key collision (2026-11-02)

Status remains Review. The owner reported one confirmed Medium finding from
independent review. The correction below is locally verified; independent
re-review of the fix and explicit owner acceptance are still pending. This entry
does not mark the independent review finally accepted or the task Done.

### Finding, impact and minimal correction

Original location: src/infrastructure/db/audit-writer.ts, original lines 18..23.
Joining sorted property names with a comma was not an injective key-set check.
The descriptor with own keys 'after,before', entityId, entityType matched the
joined expected names while providing neither before nor after. jsonValue then
received undefined and JSON serialization omitted both mandatory snapshots.
A successful batch could therefore retain state changes with an incomplete audit.

The current check at audit-writer.ts:20 requires both:
- exactly four own enumerable keys after the existing data-only normalizer;
- Object.hasOwn for each of before, after, entityId and entityType.

No property-name concatenation is used for audit shape validation. Before/after
must be actual own properties; undefined remains rejected by the existing
normalizer. Explicit null remains valid and survives JSON serialization.
The only production change in this correction pass is this audit key-set check.

### Regression evidence: failure before fix, success after fix

- HB9-R01: exact reviewer descriptor rejects with INVALID_AUDIT.
- HB9-R02: separately absent before and absent after each reject (two cases).
- HB9-R03: valid before:null and after:null both remain own JSON fields.
- HB9-R04: all six adjacent required-key merge collisions across command and
  receipt guards reject, despite producing the same joined-key strings.
- HB9-R05: real handler first writes account metadata and a historical position,
  then returns the malformed descriptor. INVALID_AUDIT must roll back all changes:
  no budget_update, audit_event or historical_position, unchanged account name,
  aggregateRevision=0 and recordedSeq=0. A subsequent valid attempt with the
  same request ID succeeds, proving the failed batch did not consume its key.

Before the fix, the targeted unit run had 1 failure / 33 passes: HB9-R01 did not
throw. The PostgreSQL HB9-R05 run also failed: actual account name became After,
both counters became 1, and a batch/position/audit without before/after persisted.
This was a genuine failing regression, not a mock-only reproduction.

After the fix, the same unit selection passed all 34 tests and the independently
filtered HB9-R05 passed (1 passed, 52 skipped). Each integration invocation used
a fresh migrated synthetic database, so the intentionally bad pre-fix rows were
never reused as a successful post-fix oracle.

### Other joined-key comparisons inspected

| Location | Assessment and action |
|---|---|
| domain/updates/validation.ts:25, prepareCommand | The ambiguous name comparison is followed by independent checks of requestId, expectedRevision, effectiveDate and reason. A key merge that removes payload necessarily also removes a checked neighbour; any other merge removes checked fields. All four adjacent-pair collision fixtures reject. No corresponding contract bypass confirmed; production code left unchanged as requested |
| domain/updates/validation.ts:38, parseReceipt | All three required values are independently checked (UUID and counter strings). Both adjacent-pair collisions remove a checked field and reject. No corresponding bypass; production code unchanged |
| domain/updates/canonical-value.ts, encoder | Keys are JSON-quoted/escaped before delimiters are joined. This is serialization rather than a joined-name set comparison; unchanged to preserve canonical bytes |
| tests/updates-validation.test.ts, HB9-R04 | Intentional joined comparison establishes that the hostile names collide, while asserting the actual validators reject them |

Search covered src and tests. No unrelated refactoring, schema/migration changes,
OAuth modifications, new dependency or HB-010+ behavior was introduced.

### Exact repeated checks after correction

| Command / check | Actual result |
|---|---|
| pnpm.cmd exec vitest run tests/audit-serialization.test.ts tests/updates-validation.test.ts | PASS, 2 files / 34 tests |
| pnpm.cmd test:integration -t HB9-R05 | PASS, 1 passed / 52 skipped; fresh schema |
| pnpm.cmd lint | PASS, exit 0, no warnings |
| pnpm.cmd typecheck | PASS, exit 0, Next typegen + strict tsc |
| pnpm.cmd test, first final run | PASS, exit 0, 18 files / 373 tests |
| pnpm.cmd test, second final run | PASS, exit 0, 18 files / 373 tests |
| pnpm.cmd build | PASS, exit 0, production compile/typecheck and 8 generated entries; routes dynamic |
| pnpm.cmd exec vitest run tests/architecture.test.ts | PASS, exit 0, 1 test |
| pnpm.cmd test:integration | PASS, exit 0, 3 files / 53 tests |
| git diff --check | PASS, exit 0 |
| Formatting and new-file check | PASS: all 30 task files, including 19 existing untracked files; UTF-8/BOM, whitespace/final newline and new-document links/fences checked |
| git status --short --untracked-files=all | Inspected; HB-009 remains Review, no new files created in this correction pass |

373 includes five added unit cases; 53 includes one added integration case.
Repeated selections overlap and are not added together as distinct tests.
The first strict typecheck of the new malformed-fixture test reported TS2322
because Object.fromEntries inferred only the original valid value types.
Explicit Record<string, unknown> fixed the test-fixture type; strict typecheck,
both final unit runs and build then passed. No runtime production change was
needed for that compiler finding.

Typecheck/build used approved Windows SWC access outside the sandbox. All
DB-capable commands had DATABASE_URL, DATABASE_URL_UNPOOLED and TEST_DATABASE_URL
explicitly set to the new isolated local password-authenticated server. No Neon
production/development/hb006-test connection was made. No env file was edited or
printed. Existing migrations were applied only by the integration setup to fresh
child databases; no new migration or schema change.

### Isolation, changed files and remaining gate

This pass created a new container
hb009-review-8b57b634c1ba4db8951cff06293fd650,
label home-budget.task=HB-009-review-fix, postgres:18, dynamic loopback port
127.0.0.1:64892. A random password was generated and temporarily stored only in
ignored node_modules/.cache/hb009-review-db.json. Every DB command verified the
container ID/label and current loopback port before constructing the URL.
The previous HB-009 container and all other Docker containers were untouched.
After all checks, only this new review-fix container was stopped, its exited state
was verified and the temporary ignored password cache was removed.

Applied verify-financial-invariants to the BR-02/10 rollback and complete-audit
contract. This correction pass changed only:
- src/infrastructure/db/audit-writer.ts;
- tests/audit-serialization.test.ts;
- tests/updates-validation.test.ts;
- tests/integration/audit-idempotency.test.ts;
- docs/planning/hb-009-verification.md.

No files were newly created in this correction pass; existing untracked HB-009
files are still checked separately from git diff. Historical checks above describe
the original implementation and do not replace the repeated results in this section.
The inherited limitations of trusted-handler snapshot semantics, privileged SQL,
COMMIT uncertainty and hosted CI remain; no new acceptance is inferred.


## Final independent review and owner acceptance (2026-11-02)

- Independent re-review confirmed the Medium audit-validation fix.
- Final open findings: Critical 0, High 0, Medium 0, Low 0.
- Codex reported 373 passing unit tests and 53 PostgreSQL integration tests.
- The independent reviewer verified the fix but did not rerun the full PostgreSQL suite.
- Owner accepted HB-009 as Done on 2026-11-02.
- Commit, PR, hosted CI and merge are subsequent Git workflow steps.
