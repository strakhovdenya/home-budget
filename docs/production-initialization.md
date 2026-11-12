# Reviewed one-time production initialization — proposal, not executed

Owner-authorized operator-tool preparation, 2026-11-12. No new HB task ID, task status, Owner Acceptance, deployment or production write is implied. This separate PR needs independent review and CI before any use. Existing local-only migrator, six financial migrations, application/auth policy and dependencies remain unchanged.

## Exact target and provenance

Only Neon project `cool-bread-39602851` (`home-budget-dev`), production branch `br-cool-lake-ba2lm73t`, database `neondb`, owner `neondb_owner`, direct endpoint `ep-plain-unit-ba3b0mkg`, region `aws-eu-central-1`. No project/branch/database creation. Source application/migration base is checked main `fde8f629a071c745b2a02859208df1f3986eea5e` (PR23). Current source still must match that base for src/drizzle/package/lockfile. The **operator's own** exact reviewed commit is separately bound to approval and a clean checkout.

Direct read-only audit found no user relations/functions/types/journal in production; development and hb006-test also had no user relations. All are existing parent-data branches, not disposable integration targets. A new catalog check at execution time is mandatory; any intervening objects refuse without repair. Production had no runtime role, six-hour PITR, zero snapshots and unprotected branch. These observations are not permission to provision or migrate.

## Prerequisites and single production GO

Before first production DDL or public release, present the owner's full readiness summary: reviewed app/operator SHA and CI, Vercel team/project/host/region, exact Neon target, original SQL/hash chain, role grants, env-present booleans, Google exact callback/origin, Preview isolation, recovery and costs. Obtain the explicit owner production GO from the release handoff. Approval to write this tool/PR is not that GO.

Agree recovery before DDL: configured PITR is six hours, with no existing snapshots or schedule. Do not assume a backup, free snapshot, sufficient personal-data retention or tested restoration. Any snapshot/protection/plan change or charge needs authorization. Never restore/rewind automatically; Vercel rollback does not roll back DB.

Keep Preview/Development without production credentials. Do not use the existing Neon child branches for fixtures or testing. Preserve :3007 and the owner's synthetic local budget.

## Invocation and secret handling

Operator only; never called by app, package build/start, CI migration hooks or Vercel startup. No package-script change, dotenv loader, env pull or secret CLI arguments. From a clean reviewed checkout, run using existing Node/tsx dependencies:

```text
node --import tsx scripts/production-init/operator.ts --initialize
```

Supply through a protected operator environment, never tracked files, chat, command history or generated reports:

- `HB_PRODUCTION_INIT_DIRECT_URL`: exact pinned direct endpoint/database/owner, PostgreSQL TLS URL. Pooled/redirected/localhost/extra-option URLs refuse. Client explicitly verifies server certificates; no rejectUnauthorized=false.
- `NEON_API_KEY`: scoped read access for online project/branch/endpoint/database identity checks, not a database password. API calls are read-only, fixed-origin, no redirects, bounded/time-limited. Do not print or retrieve credentials for this PR.
- `HB_PRODUCTION_INIT_REVIEWED_COMMIT`: full SHA of the independently reviewed operator checkout, not a placeholder or old application-base SHA.
- `HB_PRODUCTION_INIT_GO`: exact string `INITIALIZE:<project-id>:<branch-id>:<database-name>:<reviewed-operator-commit>`, supplied only after actual explicit owner GO. This env guard is a refusal mechanism, not independent proof that consent occurred.

Both `--initialize` and `--verify-empty` require these guards and clean provenance; imports do not run anything. CLI emits only fixed refusal codes or aggregate success counts, never driver/provider response/errors, URLs, secrets, row values or user identity.

## Transaction and refusal behavior

Pinned manifest validates exact six filenames, journal order/timestamps and normalized-LF SHA256 of the original Git SQL blobs. Split only at original Drizzle statement-breakpoints; preserve PL/pgSQL semicolons. Existing local migrator and guard remain byte-identical. Neon migration helpers that split at semicolons are not used.

One direct, authenticated TLS connection, exact SQL database/role/PostgreSQL18 identity, advisory transaction lock and bounded statement/lock/idle times. Provider identity is checked before and after connection. Unknown user schemas/relations/functions/types refuse. Journal schema/table creation, six original migration SQL files, six hash/timestamp records, deferred constraint validation and full catalog verification are **one transaction**. Installed Drizzle's helper creates the journal outside its migration transaction; this operator deliberately keeps it inside.

Before COMMIT, compare the complete fixed catalog reference: 20 application tables /229 columns, 374 constraints,46 explicit triggers,72 indexes,24 functions and92 public relations. Definitions and enforcement flags, not counts alone, must match. All application tables must have zero rows. No financial seed/identity/checkpoint is inserted.

`schema.json` was derived using the unchanged official installed Drizzle migrator on a separately created local PostgreSQL18 reference DB; both source SQL and catalog include reviewable content. Catalog strings normalize Windows CRLF only. PostgreSQL catalog text can differ across server versions: a mismatch must refuse and be reviewed, never be bypassed. Review the explicit reference if provider/server behavior differs. This is not a general migration framework or partial-state reconciler.

Pre-COMMIT failure rolls back. Failure during COMMIT means UNKNOWN, even if server committed. Never retry/clean blindly. `--verify-empty` performs bounded READ ONLY checks of schema and six journal records, and zero application rows, after fresh target/provenance/TLS validation. A lost rollback acknowledgement is separately UNCONFIRMED. If the owner has already logged in/entered real data, empty-verification intentionally refuses; use separately authorized metadata/count-only inspection rather than a repair command.

## Runtime role — proposed grants, not automatic provisioning

The initializer does **not** create a role or handle a generated password. Before first app deployment, provision a separately approved `hb_runtime` with secure owner-controlled password entry. Do not use Neon role creation's default admin membership. Scope: LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS; no membership/ownership inherited from neondb_owner/neon_superuser. Inspect effective PUBLIC grants as well.

Proposed grants for review (execute only after approved schema/role provisioning; placeholders represent identifiers, never passwords): CONNECT on neondb; USAGE on public; SELECT/INSERT on the explicit20 current application tables; UPDATE on users/accounts/report_heads/transfer_proposals. No journal access or schema CREATE, table ownership, DELETE/TRUNCATE/MAINTAIN/TRIGGER/admin privileges. No broad default privileges granting future unreviewed tables.

UPDATE on users is necessary for existing auth LOCK TABLE SHARE ROW EXCLUSIVE and row locks; transfer_proposals SELECT FOR UPDATE also requires UPDATE, despite immutable proposal facts. Do not weaken auth/finance code to avoid these locks. PostgreSQL18 privilege rules: https://www.postgresql.org/docs/18/sql-lock.html . Functions remain original invoker definitions; review effective EXECUTE/public rights. Grants and password entry are separate controlled production operations, not implicit in `--initialize`.

Local synthetic integration proves real Google-subject binding repository and required locks work with this non-owner grant set, while CREATE/ALTER/TRUNCATE/DELETE/journal reads fail. It does not claim a full real OAuth or every financial flow was exercised under production credentials.

## Release handoff and limits

After reviewed tool, owner GO and schema/role provisioning: verify complete journal/catalog/zero rows, configure Production-only Vercel server secrets, exact Google callback and safe Preview isolation, stage the exact checked main production build before promoting. No deployment/public Git-link trigger until ready. Only owner login may create identity; only explicit owner financial confirmation may create initial balance/account/full vector.

No production initialization, role creation, secret retrieval, deployment, OAuth smoke, browser/mobile/AT suite or restoration test was executed by this PR. Verification commands and actual results are recorded in production-init-verification.md. Existing HB020 evidence is historical, not a fresh-source receipt for this tool.
