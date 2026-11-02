# HB-010 — implementation verification

Date: 2026-11-02. Branch: `feat/hb-010-bank-checkpoints`.
Status: **Done**. Codex self-review and independent implementation review completed; owner accepted HB-010 on 2026-11-02.
The owner's supplied independent approval concerns the plan and technical
clarifications; independent implementation review completed and owner acceptance recorded on 2026-11-02.
No commit, push, PR, merge or deployment was performed.

Contract: [implementation](hb-010-bank-checkpoints.md),
[scenarios](../../tests/scenarios/phase-01/hb-010-bank-checkpoints.md),
[Accepted ADR0001](../adr/0001-checkpoints-and-allocations.md),
[Accepted ADR0002](../adr/0002-month-closing-and-corrections.md).

## Implemented behavior and invariant evidence

| Requirement / authority | Executable assertions |
|---|---|
| BR-01/03/05 exact B>=0,A>=0,sum(A)=B; no operations required | HB10-V tests, DB02/03/04, retained HB8 money tests: zero empty vector, MAX, negative/fractional/number input, duplicate month, under/over allocation, intermediate overflow |
| BR-06 future period separate | V complete Oct6000/Dec4000 at B10000; no forecast or income inference |
| BR-02/07 full earmarks, no automatic debit | DB24 retains full R20000/S5000 despite B15000; retained persistence DB08; no lifecycle mutation API |
| ADR0002 chronological head / F-010 | H and DB06/07/08/12/13: C7 insertion, C10/V10 retained exactly, historical anchor conflict rejects every affected cut, not just current head |
| ADR0002 correction before H / immutable history | H tests; DB10/11/25: same-position amount correction, changed-date and same-day order correction, tip/fork rejection, old K reproduction, old manifests intact |
| BR-08 dates / precise order | T tests and DB09: years0001/0099, leap rules, DST offsets, UTC Berlin-date mismatch, invalid local formats and precision, SQL microsecond round-trip |
| BR-09 history / affected reports | DB22/23: unchanged v1 payloads and versions, only affected Sep head pending, Oct unaffected, audit rollback; unsupported report contracts explicitly refuse |
| BR-10 authorization / idempotency / atomicity | DB05/14..18/20/21 plus retained HB9 suite: auth before replay, locked ownership, mutable input isolation, controlled real-connection concurrency, post-write domain rollback, deferred error, audit failure, lost COMMIT acknowledgement |
| BR-11 optional reconciliation / F-011/F-018 | R01..09 and DB19: D only in production; explicit future evidence scope/current revision/interval validation, duplicate identity once, K+U=D, no gross completeness assertion, checked K/U overflow |
| SQL boundary | SQL01/02/03 direct parameterized INSERTs bypass application validators: position dates, predecessor day/scope/strict seq, unique root and child; existing immutable facts tests retained |
| Pure layer / strict types | Architecture fitness test; TypeScript compiles checkpoint-types.ts with @ts-expect-error checks for number cents, mutable vector, raw unvalidated instant and failure receipt access |

The F-010 fixture shifts November dates to October to remain past on the actual
verification date. F-011/F-018 supplied operations are pure synthetic evidence,
not implemented operation persistence, imports or PDF workflows. R/S and closing
fixtures test storage compatibility; they do not implement HB-011/012 or closing.

## Skill-driven implementation and self-review

Read AGENTS.md, CODEX_WORKFLOW.md, AGENT_FACTORY.md, PRD, BUSINESS_RULES,
IMPLEMENTATION_PLAN, TASKS HB-010/dependencies, ARCHITECTURE and architecture.json,
DATA_MODEL, DATABASE, conventions, OPEN_QUESTIONS, ADR0001/0002, HB-009 contract/
verification and linked F/HB1/HB2 scenarios. Read actual SKILL.md instructions,
not only the catalog. Next.js server-security references were consulted for the
server authorization/input/SQL/logging/error boundary. This pass is not an
independent quality or functional review.

| Skill | Applied? | Concrete use, files/rules, findings |
|---|---|---|
| verify-financial-invariants | Yes, implementer self-check | BR mapping above; checkpoint/vector sum, all-cut anchors, R/S unchanged, F-010/011/018, failure rollback. No extrapolated future-feature success claims. |
| define-architecture | Yes | Pure checkpoints/shared instant, features ports, app composition and infrastructure adapters; ARCHITECTURE.md + architecture.json synced; existing seven layer directions/allowlists unchanged; architecture test passed. |
| define-conventions | Yes | Existing Result and HB8 money codecs, prepared command, exact key sets, throw-on-refusal and lossless microsecond convention; conventions.md updated. No framework-driven refactor. |
| create-scenarios | Yes | New HB10 markdown has explicit synthetic GIVEN/WHEN/THEN or equivalent labeled clauses, grouped max seven scenarios, exact amounts/dates and negative assertions; executable V/T/H/R/DB/SQL mapping. |
| configure-project | Yes | Existing package/lock/config/scripts/migrations/CI inspected; no dependency/script/environment changes. PROJECT_CONFIG and DATABASE record actual commands, custom migration ownership and isolated PG18 proof. |
| security-best-practices | Yes | Next server NEXT-AUTH-001, INPUT-001, INJECT-001, LOG-001, ERROR-001 applied to private boundary/readers/writer: HB7 auth, locked scope, bounded copied input, parameterized SQL, sanitized errors, no financial/credential logs or generic endpoint. DB16/17 and retained HB9 auth tests. OAuth unchanged. |
| vercel-react-best-practices | No | No component, page, data-fetching UI, bundle or rendering change. Its React performance workflow is outside this domain/storage task. |
| web-design-guidelines | No | No UI, layout, interaction or accessibility changes to inspect. |

Self-review tightened deterministic provenance under shuffled DB row order,
rejected duplicate independent facts at one position, validated empty-day ordering
chains, rejected unknown intra-day cutoff IDs and conservatively blocked moving
positions with other-stream edges. Regressions cover those cases. A single ordered
sweep checks all candidate bank/vector cuts instead of rebuilding the entire
history index once per position. Report impact also checks pinned ordering IDs and
refuses unexplained unflagged prior basis drift. No unresolved confirmed defect
is being knowingly accepted; this is not a claim of independent zero-findings review.

Final self-review also found and fixed **HB10-SR01 (Medium)**: the future pure
evidence contract could count lowercase/uppercase spellings of one UUID operation
as separate identities. Scope/endpoint/operation/revision comparisons now use UUID
case-insensitive identity; R04 verifies a mixed-case duplicate contributes once.
The full final checks below were repeated after this fix, including both unit runs,
integration, build, architecture, both TZ sets and migration replay. Runtime case
counts remain unchanged because the regression extends the existing R04 test.

## Actual checks

PowerShell blocks the `pnpm.ps1` shim in this environment. All executable checks
below used `pnpm.cmd`, the same installed package manager/scripts, without changing
execution policy. Typegen/build used approved access for the existing Windows
Next/SWC native cache limitation; no global permissions/configuration changed.

| Exact command / environment | Final result |
|---|---|
| `pnpm.cmd lint` | exit 0, zero errors/warnings |
| `pnpm.cmd typecheck` | exit 0; next typegen and tsc --noEmit, including static-error assertions |
| `pnpm.cmd test` — run 1 | exit 0; **441/441**, 20 files |
| `pnpm.cmd test` — run 2 | exit 0; **441/441**, 20 files |
| `pnpm.cmd exec vitest run tests/architecture.test.ts` | exit 0; **1/1**, 1 file |
| `pnpm.cmd test:integration` | exit 0; **97/97**, 4 files; 44 new HB10 + 53 retained integration cases |
| `pnpm.cmd db:migrate` | exit 0; local target guards and all three migrations applied |
| `pnpm.cmd db:migrate` — repeat | exit 0; same isolated database; no pending version reapplied |
| `pnpm.cmd build` | exit 0; production compile, TypeScript, 8 route entries generated; no financial endpoint added |
| `$env:TZ='UTC'` then calendar command below | exit 0; **203/203**, 5 files |
| `$env:TZ='America/Los_Angeles'` then same calendar command | exit 0; **203/203**, 5 files |
| `git diff --check` | final exit 0; separate full-file check includes all task untracked files |

Calendar command in both separate process environments:

```powershell
pnpm.cmd exec vitest run tests/shared/pure/calendar.test.ts tests/shared/pure/berlin-date.test.ts tests/domain/period.test.ts tests/checkpoints.test.ts tests/checkpoint-reconciliation.test.ts
```

Additional targeted V/T/H/R runs passed (initial 64, final 68 runtime tests).
These are subsets of the 441 unit cases, not additional unique tests. Architecture
and TZ repeats likewise do not increase the unique full-suite count. Pure test
fixtures additionally loop over six historical insertion permutations and exact
cut/sum assertions without claiming each assertion as a separate Vitest test.

Earlier non-final failures are retained honestly:

- Initial literal `pnpm` invocation failed at the PowerShell script policy; switched
  to pnpm.cmd. No verification success is attributed to that failed invocation.
- Intermediate tsc found table-specific filter column types and test-only evidence,
  UUID-default/query-overload typing mistakes; fixed, final typecheck/build pass.
- Initial lint found two test-only unused-expression/import errors; fixed.
- First integration run: 95 passed, 1 failed. Foreign-scope predecessor was rejected
  by the existing scoped FK before the new trigger; test now asserts that actual
  FK constraint. A subsequent full run passed 96/96; after another same-day
  correction regression was added, the final full run passed 97/97.
- Initial full-file formatting check caught a missing final newline in new custom
  snapshot metadata; corrected without changing JSON values, final check repeated.
- The first one-off Markdown link scanner misread timestamp notation inside inline
  code as a link; it was corrected to skip code. Final relative-link check passed.

## Database isolation and lifecycle

Created two new disposable containers, each image postgres:18, task label
home-budget.task=HB-010 and a distinct home-budget.run label matching its name:

| Name / run label | Dynamic loopback binding | Purpose |
|---|---|---|
| hb010-pg-98094661a5c3 | 127.0.0.1:63116 | Initial implementation/integration and migration verification |
| hb010-pg-f9f4e8b2a6b8 | 127.0.0.1:55958 | Fresh final full recheck after mixed-case UUID evidence regression |

For each, a separate generated random password was supplied
through process environment; no trust host-auth mode. Retained HB9 TCP wrong-password
integration test passed. No database URL/password is recorded in this report.

Every database invocation checked the saved container ID, both labels and current
loopback binding, then overrode DATABASE_URL, DATABASE_URL_UNPOOLED and
TEST_DATABASE_URL to its new local admin database. Explicit flags:
HB_DATABASE_TARGET=isolated-development and
HB_TEST_DATABASE_TARGET=disposable-local-container. Each integration suite created
its own uniquely named fresh child database; no old database was reset/truncated.
The migration runner's env-file loader could not override these process targets.

After each PostgreSQL verification cycle, only its newly created container was
stopped and its exited state verified. The ignored temporary
node_modules/.cache/hb010-db.json password cache was deleted after each cycle.
The first stopped container was not restarted/reused for the final recheck.
Other containers, Neon, old test databases and OAuth were not accessed or changed.
The two stopped synthetic containers were not removed.

## Changed files and final documentation/Git checks

Existing files: docs/ARCHITECTURE.md, docs/DATABASE.md, docs/DATA_MODEL.md,
docs/PROJECT_CONFIG.md, docs/TASKS.md, docs/architecture.json, docs/conventions.md,
drizzle/meta/_journal.json, src/domain/updates/contracts.ts,
src/infrastructure/db/commit.ts.

New files:

- docs/planning/hb-010-bank-checkpoints.md; docs/planning/hb-010-verification.md;
- tests/scenarios/phase-01/hb-010-bank-checkpoints.md;
- drizzle/0002_checkpoint_positions.sql; drizzle/meta/0002_snapshot.json;
- src/shared/pure/instant.ts;
- src/domain/checkpoints/contracts.ts, validation.ts, history.ts, confirmation.ts,
  reconciliation.ts;
- src/features/bank-checkpoints/read-state.ts;
- src/infrastructure/db/checkpoint-history.ts, checkpoint-writer.ts,
  checkpoint-reader.ts;
- src/app/bank-checkpoint-boundary.ts;
- tests/fixtures/checkpoints.ts; tests/checkpoints.test.ts;
- tests/checkpoint-reconciliation.test.ts; tests/checkpoint-types.ts;
- tests/integration/bank-checkpoints.test.ts.

Final full-file checks cover **31 task files**, including UTF-8 decoding, no BOM, final newline, trailing
whitespace and bare CR for changed plus untracked task files, independent of
git diff. Documentation relative links, code fences, scenario IDs, architecture
JSON and migration journal/snapshot continuity are checked: **70 relative links**
and **27 unique scenario IDs**. Only HB-010 changes
in TASKS; accepted SQL migrations 0000/0001, dependencies, OAuth, .env.local and
the pre-existing untracked .vscode/extensions.json are untouched. Final git status
is presented to the owner; nothing is staged or committed.

## Remaining limits and independent review checklist

- Independently inspect historical anchor conflict rejection, microsecond order,
  correction-before-H semantics, co-located full companion and SQL/runtime boundary.
- Verify domain refusal after writes really rolls back, receipt replay precedes
  stale checks, auth precedes replay, audit/unknown-COMMIT handling remains intact.
- Review affected-report selection v1 and pinned source/order validation, pending
  flags under the account lock and unchanged immutable v1 payloads. Other selection
  versions or unprovable historical state fail explicitly; no generic closing engine.
- Other-stream position dependencies requiring reconfirmation are conservatively
  refused during reposition, pending their own workflows. Existing pre-HB10 facts
  without valid manifests are not silently imported/reordered.
- In-memory full-history loading remains; no production-volume performance proof.
  HB9 payload/audit node/depth/size bounds still apply and reject atomically.
- K/U operation evidence is pure future infrastructure only; production K/U remains
  unavailable. No completed operation/PDF/transfer/forecast/lifecycle/UI claim.
- Migration verified only on fresh disposable local PostgreSQL18. No hosted CI,
  Neon, deployed application or browser/e2e check was run for this task.
- Plan approval did not constitute implementation acceptance. HB-010 remained in Review until
  independent implementation review and explicit owner acceptance.

## Final independent review and owner acceptance (2026-11-02)

- Independent implementation review completed; no confirmed open findings: Critical 0, High 0, Medium 0, Low 0.
- Reviewed H/K history selection, corrections, active-head protection, SQL migration, transactional rollback, idempotency and reconciliation boundaries.
- Codex reported 441 passing unit tests on each of two runs, 97 PostgreSQL integration tests, 203 timezone checks in each TZ, plus successful lint, typecheck, architecture checks, migration replay and build.
- The independent reviewer did not rerun the PostgreSQL integration suite.
- Owner explicitly accepted HB-010 on 2026-11-02.
- Commit, GitHub CI, PR and merge are subsequent workflow steps.
