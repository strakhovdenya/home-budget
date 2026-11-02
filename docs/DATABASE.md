# HB-006 database runbook and physical contract

Status: HB-006 Done after independent review and owner acceptance. No financial API is exposed. The shell
does not import a database client, run migrations or require a connection.

## Driver and runtime

Stable registry tags checked for this task: drizzle-orm 0.45.4, drizzle-kit
0.31.11, pg 8.23.1, @types/pg 8.23.1, tsx 4.23.15, server-only 0.0.1.
Exact direct versions and resolved transitive versions are pinned.

Use Drizzle's node-postgres adapter in Next.js **Node.js** runtime on Vercel,
with a Neon pooled TLS DATABASE_URL. This supports interactive multi-statement
transactions on one checked-out connection, account row locks and commit/rollback.
No HTTP-only driver, Edge runtime or session-dependent advisory locks are used.
The environment factory lazily retains one pool per module instance, max 3
connections, 10-second idle/connect limits. Deploy near the database and size
the aggregate connection budget for function concurrency. This is not a verified
Vercel deployment or a Neon connectivity test.

Remote URLs must specify sslmode=require or verify-full. No insecure custom TLS
override is installed. Do not log driver exceptions, SQL parameters or URLs.
The migration runner suppresses driver details. Runtime application error
translation and authenticated commands belong to subsequent tasks.

Official references consulted:
[Drizzle node-postgres](https://orm.drizzle.team/docs/get-started-postgresql),
[Neon connection choices](https://orm.drizzle.team/docs/connect-neon),
[Drizzle transactions](https://orm.drizzle.team/docs/transactions),
[Drizzle migrations](https://orm.drizzle.team/docs/migrations),
[Neon pooling](https://neon.com/docs/connect/connection-pooling).
Current documentation also shows prerelease RC installation examples; this task
deliberately pins the compatible stable npm tags instead.

## Explicit migration workflow

1. Provision a separate empty PostgreSQL database in a local Docker container,
   published exclusively on 127.0.0.1. The shipped migration/test commands reject
   remote destinations, including Neon production, development and hb006-test.
   External provisioning or migrations require a separately reviewed workflow.
2. Put private values in ignored .env.local, or inject environment variables.
   DATABASE_URL is for the eventual server runtime; DATABASE_URL_UNPOOLED is the
   direct connection for explicit migrations. For local verification explicitly
   override DATABASE_URL, DATABASE_URL_UNPOOLED and TEST_DATABASE_URL in the
   command's process environment; do not rely on values in .env.local.
   Node's env-file loader preserves those already-set environment variables.
   Only placeholders are tracked.
3. Set HB_DATABASE_TARGET=isolated-development after checking the destination.
   Run `pnpm db:migrate`. Repeat safely: the Drizzle journal applies only pending
   versions. The runner never calls push, drops tables or repairs conflicts.
4. Change schema.ts, run `pnpm db:generate`, inspect the SQL and metadata. For
   triggers/deferrable relationships use a reviewed custom SQL migration:
   `pnpm exec drizzle-kit generate --custom --name=descriptive_name`.
5. Commit reviewed SQL and meta snapshots together only when separately authorized.
   Already deployed versions must never be edited; add a forward migration.
   No automatic down migration is supplied because financial history must survive.

Files: drizzle/0000_foundation.sql creates the tables and ordinary constraints;
drizzle/0001_integrity.sql adds custom scoped foreign keys, indexes, deferred
cross-row checks and append-only triggers. drizzle/meta contains the journal and
schema snapshots. Custom SQL constraints are deliberately owned by the second
migration, not inferred by drizzle-kit; "no schema changes" verifies the generated
portion only. Always test the entire migration chain against fresh PostgreSQL.

## Safe integration tests

The runner requires TEST_DATABASE_URL,
HB_TEST_DATABASE_TARGET=disposable-local-container, and explicit local overrides
of DATABASE_URL and DATABASE_URL_UNPOOLED. Both the migration runner and the
integration setup invoke requireLocalDatabaseTargets before opening a connection.
All three variables must specify PostgreSQL, exactly 127.0.0.1, an explicit port
and database name. Host/database redirect query parameters are rejected; errors
do not expose input values. It uses a dedicated disposable container and a user permitted
to CREATE DATABASE. It creates a uniquely named database for each invocation,
then applies the actual migration chain in beforeAll before any test body.
The separate DB01/02 test reapplies migrations and compares the table inventory.
Every filtered invocation also prepares its own fresh schema independently.
Existing databases are never
deleted, truncated or reset. Test databases remain inside the disposable container
until the owner/container operator removes it.

Example PowerShell, replacing the private URL locally:

```powershell
$env:DATABASE_URL='<private connection to local Docker runtime database>'
$env:DATABASE_URL_UNPOOLED='<private connection to local Docker migration database>'
$env:TEST_DATABASE_URL='<private connection to disposable localhost PostgreSQL>'
$env:HB_TEST_DATABASE_TARGET='disposable-local-container'
pnpm.cmd test:integration
# Run one persistence test without executing DB01/02:
pnpm.cmd test:integration -t DB17
```

Integration tests fail if configuration is missing; there is no silent skip or
mock fallback. `pnpm test` intentionally runs only the existing shell/i18n/
architecture tests. The integration configuration maps server-only to that
package's actual empty server entry; all database/transaction code runs normally.
No ORM or PostgreSQL behavior is mocked.

Variable consumption: db-migrate.ts uses only the validated DATABASE_URL_UNPOOLED;
integration setup uses the validated TEST_DATABASE_URL to create a uniquely named
local child database; databaseFromEnvironment uses DATABASE_URL for the future
application runtime. The generation config has no connection credentials and
db:generate does not open a database connection. Runtime Neon compatibility is
unchanged, but the migration/test entry points are intentionally local-only.

## Physical tables

All scoped rows have id, owner_user_id and account_id. Composite foreign keys
reject cross-owner/account references; financial periods are unique per account.
Facts additionally reference budget_updates by scope, update ID and recorded_seq,
so they inherit that batch's recorded_at/actor/request. No destructive cascades.

| Table | Stored contract |
|---|---|
| users | UUID identity, optional unique Google subject, locale/theme, verified flag; OAuth deferred |
| accounts | Owner, EUR, display name, aggregate revision, recorded sequence, active vector pointer |
| budget_periods | Scoped YYYY-MM identity; calendar availability, no automatic cash operation |
| budget_updates | Scoped unique request, canonical payload hash, expected revision, result JSON, actor/time/sequence |
| historical_positions | Stable dated position identity and batch provenance |
| ordering_revisions | Immutable day manifest, dependency manifest, previous ordering revision |
| balance_checkpoints | Logical identity, correction predecessor, real date/optional instant, BIGINT balance, position/reason |
| allocation_revisions | Logical identity/correction, checkpoint, predecessor vector, effective date/position, consent, transaction seal |
| period_allocations | Unique vector/period, nonnegative BIGINT amount; missing row means zero |
| obligations | Stable identity and origin period; current state is not stored over history |
| obligation_events | Full status/possible/reserve/outstanding/original/funding state, before-state JSON, predecessor/correction, bank/effective/consent coordinates |
| savings_goals | Stable identity and origin period |
| savings_events | Full retained amount/status/funding state, before-state JSON, predecessor/correction, effective/consent coordinates |
| transfer_proposals | Immutable scoped base checkpoint/vector/revision, one source and target, exact draft manifest and payload identity |
| transition_decisions | Explicit CARRY/FRESH_START/DEFER, observation mode, before/after vector, position, consent/reason and reviewed manifest |
| budget_transfers | Unique proposal and decision, scoped before/after vectors, source/target, immutable funding manifest |
| month_closings | Immutable version/predecessor, historical date, knowledge cut, exact bank/vector refs and copied facts, nullable end balance, A/R/S/F, completeness, snapshot/manifest/version metadata |
| report_heads | Scoped unique period head plus external correction-pending flag; report payload stays immutable |
| audit_events | Immutable batch, event kind, effective date, reason and payload/result provenance |

JSON money is serialized as decimal strings. Drizzle BIGINT columns use bigint
mode without Number conversion; PostgreSQL enforces the signed 64-bit range.
SUM uses PostgreSQL numeric internally for exact aggregate comparison.

## Database and transaction enforcement

| Invariant | Enforcement |
|---|---|
| B>=0, A>=0, full reserve flags, valid paid/unpaid states, S>=0 | PostgreSQL CHECK; no partial-reserve amount exists |
| ΣA=B for every vector, including zero balance | Deferred constraint triggers on revision and allocation insertion; failure rolls back the entire transaction |
| New checkpoint plus full vector together | Deferred checkpoint trigger requires a vector in the same update |
| No later mutation/addition to a complete vector | Immutable revision/row triggers and allocation insert transaction seal; no persisted draft flag |
| Historical facts never overwritten/deleted | BEFORE UPDATE/DELETE rejection on facts, updates, proposals, identities, periods and audit |
| Scope and uniqueness | Composite FK, UNIQUE period/vector/request/proposal; retained immutable references |
| Correction chains | Same logical fact, earlier recorded_seq predecessor, unique root and unique correction child; prevents forks/cycles |
| Actual optional observation instant | PostgreSQL Europe/Berlin date consistency CHECK; date-only remains NULL |
| Transition/transfer lineage | Deferred scoped refs; CARRY transfer matches proposal/decision; REUSE retains checkpoint and exact source-to-target cash delta |
| Unknown month end and closing versions | Closing trigger validates period end, nullable observation branches, copied C/V facts, same-period contiguous version predecessor and nonempty reason/evidence; immutable old reports |
| Report pointer | Same period, initial v1 or direct successor; caller must audit changes through the batch boundary |
| Idempotency, expected revision, recorded sequence | Private commitBatch transaction locks authorized owner/account, checks replay before stale revision, writes result/facts/audit/counters together |
| Atomic rollback | Drizzle transaction on a pg connection; callback or COMMIT constraint error rolls back facts, result, audit and counters |

The account lock at READ COMMITTED serializes writes routed through commitBatch.
No automatic retry/rebase is performed. Canonical hash covers scope, command kind,
expected revision and typed payload; object keys are sorted, bigint is distinguished
from strings/objects, unsupported/fractional values reject. Payload must include
all reviewed business inputs; the adapter cannot infer omitted consent.
The server-authenticated owner must come from HB-007, not a client parameter.
No public read/write endpoint is added.

## Explicit application gaps and release gates

This is a persistence contract, **not a completed finance engine**. JSON manifests
preserve reviewed content but are not a substitute for the following domain
validators, which must exist before financial commands become callable:

- Historical state(H,K), confirmed same-day placement/ordering, future-date checks,
  correction selection before date filtering, active chronological head selection
  and historical/current anchor conflict review. The primitive does not choose heads.
- Complete ordering/source-manifest closure and copied R/S against the selected
  historical lifecycle states. Closing SQL validates scalar bank/vector provenance
  and F=A-R-S, but does not implement the selector or validate every JSON revision ref.
- Transfer proposal preview/status/cancellation workflow, target current-month check,
  complete-vector/funding dependency review, full earmark preservation, explicit
  FRESH_START not-carried manifest and BR-02 payment affirmation. Single-source
  proposal shape excludes generalized multi-source CARRY; no composition policy exists.
- Lifecycle amount/payment/savings commands and audited head/pending-flag changes.
  Full state storage exists; no payment or automatic balance debit is implemented.
- Authenticated server reads/writes, allowlist, production roles/RLS/access policy,
  deployment/pool lifecycle validation. Composite FKs protect relationships, not
  unauthorized SQL reads by a credential holder.

These gates belong to HB-007..HB-014/HB-019 and remain acceptance work there.
No future income/operation posting, PDF, recurring templates, overdraft allocation,
historical debt mechanism, UI wizard or production data is introduced.
