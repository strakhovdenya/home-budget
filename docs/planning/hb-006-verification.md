# HB-006 implementation and verification

**Final acceptance — 2026-11-02:** the owner confirms independent review completed,
both findings fixed and HB-006 accepted. TASKS.md now marks only HB-006 Done.
Earlier Review/no-commit statements below retain the historical verification
context; the owner now authorizes the scoped commit, branch push and PR to main.
The PR must not be merged until the final Pull Request check. No additional
database command or cloud migration is part of this finalization.

Review delivery, client date 2026-11-02, branch feat/hb-006-database.
No commit, push, PR, Neon provisioning or production connection.

Scope proposed before implementation: versioned Drizzle/PostgreSQL schema,
immutable revisions and historical storage coordinates, database enforcement
of complete actual-money vectors, private account-locked transaction primitive,
synthetic PostgreSQL integration tests and reproducible migration commands.
Source: Accepted ADRs0001/0002/0003, BR-01/02/03/05/07/08/10/11 and HB-006.

Physical schema, exact dependency versions, driver rationale, environment setup,
database-vs-code enforcement and explicit remaining application gates:
[DATABASE.md](../DATABASE.md). The 19 tables are also listed there.

## Executed evidence

Checks use Node 22.23.0 / pnpm 12.16.1 and a dedicated local Docker
postgres:16-alpine container (synthetic credentials, loopback-only port).
Each integration invocation creates a new uniquely named database.

| Command | Actual result |
|---|---|
| npm view for drizzle-orm/drizzle-kit/pg/@types/pg/tsx/server-only | Stable tags resolved; exact versions pinned in package.json and lockfile |
| pnpm.cmd exec drizzle-kit generate --name=foundation | Created 19-table SQL plus schema metadata |
| pnpm.cmd exec drizzle-kit generate --custom --name=integrity | Created tracked custom-constraint migration |
| pnpm.cmd db:generate | No schema changes; generated schema matches snapshot (custom SQL separately tested) |
| pnpm.cmd db:migrate, repeated on isolated local dev database | Both passed; journal prevents reapplication/duplicate schema |
| pnpm.cmd test:integration | 19 tests passed; requested DB01..17 grouped plus DB18..23 adversarial checks |
| pnpm.cmd test | 3 files, 26 tests passed; shell, i18n and architecture |
| pnpm.cmd lint | Passed, zero warnings |
| pnpm.cmd typecheck | Passed, Next route type generation and strict TypeScript |
| pnpm.cmd build | Passed; six existing dynamic shell routes, no financial endpoint |
| pnpm.cmd exec tsc --noEmit | Final strict compiler check passed |
| git diff --check | Passed |

The final sandbox attempts at typecheck/build could not access the SWC cache;
db:generate/db:migrate could not call Node userInfo (uv_os_get_passwd ENOMEM).
A combined elevated verification request was rejected without running. Subsequent
separately scoped approvals allowed the exact typecheck, build, db:generate and
two db:migrate checks, all successful. Final lint/unit/DB integration tests passed
inside the sandbox. No skipped or blocked check is counted as a passing run.
The final migration CLI runs used a newly created empty local database after the
last SQL changes; the final integration suite independently migrated another
fresh database twice.

Initial integration failures were real and corrected: Vitest resolved the
client-only guard until explicitly mapped to server-only's server entry; PostgreSQL
rejected a polymorphic trigger CASE field access, changed to explicit IF branches.
Final successful checks use real pg connections and constraints, without DB mocks.
On this managed Windows machine Drizzle generation/Next SWC/system access required
approved execution outside the sandbox. No global permissions were changed.

## Assertion mapping

| Requirement/scenario | Actual persistence proof |
|---|---|
| BR-01/05/11; HB1-011/020 | Complete nonnegative vector, exact sum, absent/duplicate/negative rows reject, no mandatory operations |
| BR-02/10; HB1-007; HB2-028 | Whole-batch rollback, idempotent result, payload conflict, stale/concurrent revision, owner checked before replay |
| BR-03/07/11; F-006/008/017 | Full ordinary reserve flags and retained savings may exceed B; negative F remains allowed |
| BR-01/05; HB1-014; HB2-011 | Stored single-source transfer has one unchanged checkpoint/date and retained earlier vector |
| BR-08; HB2-002/006/008/026 | Unknown end NULL, NO_OBSERVATION A/F NULL, report successor preserves original, old report mutation rejects |
| BR-10; HB2-023 | Berlin instant/day consistency across repeated DST hour and UTC month boundary; bigint above safe Number and at int64 max |
| BR-08/10; HB2-022 | Immutable original facts, correction-of-correction, competing child rejects |

These are persistence assertions, not execution of all Markdown scenario flows.
In particular, the transfer test uses an empty earmark set; full funding migration/
preservation and historical R/S selection remain future use-case tests.
Forecast/cents division/calendar reminder and leap-year calculation do not exist
in this adapter and are not claimed as tested. No browser/visual QA is needed
for this storage-only change.

## Self-review and limits

Reviewed generated and custom SQL against the accepted model, then exercised
real constraints, commit failures and competing transactions. Independent review
has not been performed in this run. HB-006 is Review, never Done.

The storage shapes preserve history, positions, sequences, correction lineage,
transition decisions, proposals, report versions and current vector/report pointers.
They do not finish historical selection or semantic manifest validation. The
runbook's explicit application gates are material: no finance command should be
exposed until those validators and HB-007 authorization exist. Neon/Vercel runtime
connectivity and production permission policy have not been tested.

The pre-existing untracked .vscode/extensions.json is preserved; its SHA256 is
84055C05ECC09BEF488B9AD1BEAA4351F2A8196E8A827F65A4888A9E29D0FA80.
Accepted ADRs and docs/architecture.json are unchanged. The architecture test's
infrastructure allowlist is extended only for pg, Drizzle, server-only and node:crypto.

The temporary hb006-pg-isolated container was stopped after verification, retaining
only synthetic test databases for inspection. A failed initial fixed-port Docker
attempt left the stopped/never-started hb006-postgres-test container; neither is
a production resource. No external database was created.

## Changed files and final Git evidence

Nine modified tracked files plus fourteen task-created untracked files:

```text
 M .env.example
 M README.md
 M docs/DATA_MODEL.md
 M docs/PROJECT_CONFIG.md
 M docs/TASKS.md
 M package.json
 M pnpm-lock.yaml
 M tests/architecture.test.ts
 M vitest.config.ts
?? .vscode/extensions.json
?? docs/DATABASE.md
?? docs/planning/hb-006-verification.md
?? drizzle.config.ts
?? drizzle/0000_foundation.sql
?? drizzle/0001_integrity.sql
?? drizzle/meta/0000_snapshot.json
?? drizzle/meta/0001_snapshot.json
?? drizzle/meta/_journal.json
?? scripts/db-migrate.ts
?? src/infrastructure/db/client.ts
?? src/infrastructure/db/commit.ts
?? src/infrastructure/db/schema.ts
?? tests/integration/persistence.test.ts
?? vitest.integration.config.ts
```

The .vscode entry is pre-existing and not part of the task changes; hash unchanged.
Nothing is staged. Standard `git diff --stat` reports tracked changes only:

```text
 .env.example               |    6 +
 README.md                  |   19 +-
 docs/DATA_MODEL.md         |   13 +-
 docs/PROJECT_CONFIG.md     |   28 +-
 docs/TASKS.md              |    3 +-
 package.json               |   13 +-
 pnpm-lock.yaml             | 1097 +++++++++++++++++++++++++++++++++++++++++++-
 tests/architecture.test.ts |    2 +-
 vitest.config.ts           |    1 +
 9 files changed, 1156 insertions(+), 26 deletions(-)
```

New schema, SQL, metadata, adapter, tests and runbook files are listed above and
are intentionally not staged merely to change this statistic. Git's global-ignore
permission and lockfile CRLF notices did not prevent status/diff verification.

## Owner-requested local-only recheck

The owner clarified that .env.local DATABASE_URL points at Neon development and
forbade changes to Neon production, development and hb006-test. The file was not
edited or printed. The earlier rejected command is not evidence of a database
change.

Added requireLocalDatabaseTargets to both connection-opening entry points.
It validates all three URLs before creating a pool: exactly 127.0.0.1, explicit
port/database, PostgreSQL protocol, no host/database redirect query parameters.
Unit tests cover missing overrides, remote values, redirect parameters and
credential-safe errors. Runtime createDatabase retains Neon compatibility;
the migration/test commands now reject remote destinations.

Verified the existing Docker container ID and loopback port binding before
starting it. Created two new empty databases only inside that container.
Every migration/integration/typecheck/build command explicitly assigned:

| Variable | Verified local destination | Consumer |
|---|---|---|
| DATABASE_URL | 127.0.0.1:50667, hb006_local_migration_40c074720a | Future runtime factory; validated even though not used for migration |
| DATABASE_URL_UNPOOLED | 127.0.0.1:50667, hb006_local_migration_40c074720a | Migration runner |
| TEST_DATABASE_URL | 127.0.0.1:50667, hb006_local_test_40c074720a | Test setup/admin connection; tests migrate a generated local child database |

The migrate command still loads .env.local via Node --env-file-if-exists;
explicit process variables take precedence. Its verification message confirmed
all three local destinations after loading, before pool creation. The Drizzle
generation config contains no database credentials and opens no DB connection.

Executed after the protection change:

- pnpm.cmd lint: passed.
- pnpm.cmd test: 4 files, 28 tests passed.
- pnpm.cmd exec tsc --noEmit: passed.
- pnpm.cmd db:generate: no schema changes.
- pnpm.cmd db:migrate: passed twice on the new local migration database.
- pnpm.cmd test:integration: 19 real PostgreSQL tests passed.
- pnpm.cmd typecheck: passed with all three local overrides.
- pnpm.cmd build: passed with all three local overrides.

The local container was stopped again after these checks. No Neon connection
was opened by these commands. No commit, push or PR was performed.

Additional changed files: src/infrastructure/db/local-target.ts and
tests/database-target.test.ts. The runbook, example env and this evidence record
were updated. HB-006 remains Review, pending independent review.

## Independent-review fixes

Reviewed .env.example locally without printing values: all 10 variable
assignments are empty. A whole-file scan found no PostgreSQL URL, Neon endpoint
or password assignment in comments. No credential replacement was needed.
The file is safe to include in the review archive/commit. git check-ignore
.env.local confirmed it is ignored; .env.local was not modified or printed.

Moved initial migrate() into the integration suite's beforeAll, immediately
after creating its fresh local child database. DB01/02 now checks the existing
19-table inventory, reapplies migrations and verifies the inventory is unchanged.
All other tests can now run without executing DB01/02.

Verification used only the existing Docker container published on 127.0.0.1:65127.
DATABASE_URL, DATABASE_URL_UNPOOLED and TEST_DATABASE_URL were all explicitly
overridden with local Docker destinations before DB commands and the production
build/typecheck. The local-only guard ran before database connections.
No Neon production, development or hb006-test connection/migration was performed.

| Command | Exact result |
|---|---|
| pnpm.cmd lint | Passed, zero warnings |
| pnpm.cmd typecheck | Passed, route generation and strict TypeScript |
| pnpm.cmd test | 4 files, 28 tests passed |
| pnpm.cmd test:integration | 1 file, 19 tests passed |
| pnpm.cmd test:integration -t DB17 | 1 passed, 18 skipped by filter; DB01/02 did not run |
| pnpm.cmd build | Passed, six existing dynamic shell routes |
| git diff --check | Passed |

The first attempted filter command used an extra "--", which Vitest interpreted
without filtering and reran all 19 tests. That run is not counted as isolated-test
proof; the corrected command above executed exactly DB17 on another fresh schema.

Files changed for these review fixes: tests/integration/persistence.test.ts,
docs/DATABASE.md and this verification record. .env.example required no edits.
HB-006 remains Review; no commit, push or PR. Final status is recorded below.

```text
 M .env.example
 M README.md
 M docs/DATA_MODEL.md
 M docs/PROJECT_CONFIG.md
 M docs/TASKS.md
 M package.json
 M pnpm-lock.yaml
 M tests/architecture.test.ts
 M vitest.config.ts
?? .vscode/extensions.json
?? docs/DATABASE.md
?? docs/planning/hb-006-verification.md
?? drizzle.config.ts
?? drizzle/
?? scripts/db-migrate.ts
?? src/infrastructure/db/
?? tests/database-target.test.ts
?? tests/integration/
?? vitest.integration.config.ts
```

The local container was stopped after the tests. .vscode/extensions.json retains
its original SHA256 recorded above and remains outside the task changes.

## Basic GitHub Actions CI before PR merge

The owner authorized a CI-only follow-up on the existing HB-006 branch/PR #6.
The workflow runs for pull_request targeting main and push to main. It uses
Ubuntu, Node 24, exact pnpm 12.16.1, frozen-lockfile installation and a disposable,
health-checked PostgreSQL 18 service published only on 127.0.0.1:5432.

Automated steps: lint, typecheck, unit tests, build, two migration CLI runs,
all 19 PostgreSQL integration tests and the independently filtered DB17 test.
Every integration invocation prepares a new database through beforeAll. The
synthetic service user has CREATE DATABASE privileges. All three URLs are
explicit local overrides, masked before export; local-target flags are set.
The service uses ephemeral loopback-only trust authentication, so no password or
real database Secret is present in workflow/service logs.

The earlier executed checks above are local Windows/Node 22/PostgreSQL 16
evidence. Linux/Node 24/PostgreSQL 18 results are reported separately by the
GitHub Actions run associated with the CI commit on PR #6. The workflow does not
deploy or connect to Neon production, development or hb006-test. It grants only
contents: read, avoids pull_request_target, and leaves .env.local and
.vscode/extensions.json untouched. No financial logic or SQL schema changed.

HB-006 remains Done; HB-015 remains Planned. Basic CI does not claim the later
finance/E2E coverage or establish branch-protection required checks.

Pre-publication validation: actionlint successfully checked ci.yml in its official
Docker image (exit 0), with only that workflow mounted read-only and networking
disabled inside the checker. git diff --check passed. Actions are pinned to the
commit SHAs of the official checkout v6, setup-node v6 and pnpm/action-setup v4
tags. No package, application, test or SQL changes were required for this follow-up.

### CI install-policy correction

The first CI run reached dependency installation, then failed with
ERR_PNPM_IGNORED_BUILDS for esbuild 0.18.20, 0.25.12 and 0.28.2; no tests ran.
Per the owner's explicit decision and the official pnpm 12 allowBuilds docs,
pnpm-workspace.yaml now sets esbuild: true while preserving the existing
@swc/core and @parcel/watcher false entries. strictDepBuilds is not disabled;
no wildcard/all-dependency approval is added. The interrupted, uncommitted
esbuild: false attempt was replaced before publication.

No financial logic, SQL migration, scenario, credential file or dependency
version was changed for this correction. The frozen install and new GitHub
Actions run provide separate validation of the approved install policy.

Executed locally: pnpm.cmd install --frozen-lockfile passed with pnpm 12.16.1;
postinstall completed for all three esbuild versions. The lockfile remained
unchanged and dependency resolution was skipped. The initial sandbox attempt
could not open the external pnpm store lock; the scoped approved retry passed.
