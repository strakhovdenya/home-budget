# HB-009 — Event/audit storage and idempotent updates

Status: Done. Owner accepted HB-009 on 2026-11-02.
Branch: feat/hb-009-audit-idempotency. Independent re-review completed; owner acceptance recorded.

## Authority and scope

Sources: [BR-02/08/10/11](../BUSINESS_RULES.md), [TASKS](../TASKS.md),
[architecture](../ARCHITECTURE.md), [layer declarations](../architecture.json),
[DATA_MODEL](../DATA_MODEL.md), [DATABASE](../DATABASE.md),
[conventions](../conventions.md), Accepted ADRs
[0001](../adr/0001-checkpoints-and-allocations.md),
[0002](../adr/0002-month-closing-and-corrections.md),
[0003](../adr/0003-daily-forecast-and-liquidity.md),
[HB-006 evidence](hb-006-verification.md) and [HB-008 evidence](hb-008-verification.md).

Extend HB-006 commitBatch, its Drizzle transaction and account row lock.
Reuse HB-007 authorization and HB-008 Result/bigint/Berlin dates. No new event
store, transaction manager, queue, dependencies, migration or arbitrary-event
endpoint. No checkpoint/payment/savings/allocation/forecast/UI implementation.
Existing HB-006 financial fixtures remain storage tests, not new product commands.

## Files and layers

- domain/updates/contracts.ts: readonly command/receipt/audit/error/port types.
- domain/updates/canonical-value.ts: bounded snapshot and legacy canonical encoding.
- domain/updates/validation.ts: command/receipt validation and private WeakSet
  provenance for newly normalized commands; no financial state is stored there.
- features/budget-updates/execute-update.ts: copy before await, authorize, injected
  repository, safe Result errors.
- infrastructure/db/commit.ts: existing transaction extended; no second transaction
  engine. audit-writer.ts validates descriptors and serializes bigint snapshots.
- infrastructure/db/update-repository.ts: Result adapter for the private primitive.
- app/budget-update-boundary.ts: server-only factory composes requireOwnedAccount
  and lazy DB adapter. No use-server directive, route or registered business action.
- tests/fixtures/legacy-commit.ts: HB-006 test adaptation supplies audit explicitly;
  it is never imported by production code and is not a fallback audit behavior.

Features depends on a domain port, never infrastructure. Domain has no external
package, React, framework, Node, SQL or network dependency. Infrastructure imports
only domain/shared-pure and existing allowed packages. App allowlist adds only the
already installed server-only marker. ARCHITECTURE and architecture.json record
the same boundary. No money/date types or Outcome variants are duplicated.

## Command and API contract

prepareCommand(unknown) returns Result<PreparedCommand, INVALID_INPUT>.
Fields are requestId, expectedRevision, effectiveDate, reason, payload; extra
fields such as actorId/ownerUserId/accountId reject. UUID is exact length; revision
is a bigint or canonical integer string in 0..signed-int64-max, never number.
effectiveDate uses HB-008 validation. Reason is nonblank, at most 1000 code units.
No implicit today is inserted into a request.

The raw command is copied once into a fresh recursively frozen graph before
authentication yields. The same PreparedCommand is passed into identity encoding
and the trusted handler context. WeakSet provenance prevents a forged frozen
object from bypassing this constructor at the private writer. It is in-memory,
per module instance and not a serialized authorization capability.

createUpdateExecutor({authorize, repository}) produces the application executor.
createBudgetUpdateBoundary(kind, writer) is server composition only.
createUpdateRepository(database, kind, writer) implements the domain port.
commitBatch(db, {scope, kind, command}, writer) remains infrastructure-private.
writer(tx, context) returns a nonempty readonly AuditDescriptor list.

Trusted scope derives from requireOwnedAccount. The client account selector is
not authority. Owner/account strings are validated and normalized to lowercase
before hashing; actor always comes from the authorized owner. The SQL query
rechecks ownership under lock before searching saved requests.

PreparedCommand, AuthorizedScope, CommitReceipt, AuditDescriptor and
UpdateErrorCode use the shared Result shape. A receipt has exactly updateId,
recordedSeq and aggregateRevision; counters are canonical decimal strings.
Stored JSON is parsed and checked against its budget_update ID, seq and expected
revision before replay. It is never returned through an unchecked assertion.

## Identity and bounded inputs

Legacy canonical bytes remain unchanged for supported null/string/boolean,
safe-integer number, bigint, dense arrays and plain enumerable data objects:
bigint:1 differs from string "1" or object {$bigint:"1"}; keys sort, arrays retain
order. Golden unit vectors pin these representations; SHA-256 remains unchanged.

Normalization rejects sparse arrays, undefined/functions/symbols, accessors,
symbol keys, hidden own data, array extra properties, unsupported prototypes,
cycles and limits exceeded. Getters are not invoked. Depth <=32, visited nodes
<=4096 and a conservative encoded-size budget <=65536 UTF-16 code units bound
work/output. Shared references are copied as ordinary repeated data; __proto__
is defined as a data property and cannot change the copy's prototype.

Identity includes owner/account, server-bound kind, expectedRevision, payload,
explicit effectiveDate and reason. Including the newly required audit semantics
is intentional: changing them with the same key conflicts. Historical HB-006
private batches lacked this envelope, so this does not claim cross-contract replay
of old synthetic rows. No authenticated financial API previously wrote such
commands. Existing rows remain immutable; unsupported/mismatching legacy requests
are never silently re-executed. No real legacy financial-data migration is added.

## Atomic algorithm and concurrency

1. Snapshot/validate raw input. Authenticate via HB-007 before repository access;
   invalid commands also produce no repository call.
2. Capture trusted scope/kind, encode identity from the prepared graph.
3. Begin existing READ COMMITTED transaction; SELECT owned account FOR UPDATE.
4. Look up scoped request in a separate statement after lock acquisition.
5. Replay matching stored receipt, or return REQUEST_PAYLOAD_CONFLICT.
6. Only new requests check expected revision and next int64 counters.
7. Capture DB clock_timestamp after lock. Convert to Berlin date for future-date
   rejection; recorded UTC timestamp remains separate from effectiveDate.
8. Insert budget_update with server actor, identity and stable receipt. Run trusted
   handler using the same tx and prepared command.
9. Validate/insert all audit documents, then advance counters once.
10. Return success only after the outer Drizzle transaction promise completes,
    including deferred constraints and COMMIT.

The row lock serializes one account. Identical concurrent requests run the handler
once; different keys sharing one version have one winner; failed transactions
consume no key/version. No automatic stale rebase or new-request-ID retry.
All future financial handlers must follow this same lock discipline. Cross-account
transactions and nontransactional external effects are outside the contract.

## Audit and history

Audit descriptors must come from actual state read under the account lock by the
trusted handler; the framework cannot prove arbitrary JSON's business meaning.
Before/after is never accepted from client command fields as authoritative state.

Each immutable audit_events row contains event kind, explicit effective date and
reason. before_after contains schemaVersion=1, eventIndex, entity {type,id}, before,
after. Null denotes absent state. Bigints are checked int64 and encoded as decimal
strings. Actor/request/recorded timestamp are inherited by scoped FK/join from
budget_updates; eventIndex orders entries inside the shared recorded_seq batch.

Audit validation or insertion failure rolls back state, facts, receipt and counters.
No successful new update may omit audit. Existing SQL triggers reject UPDATE/DELETE
of audit/batches/facts. Failed attempts are not fabricated financial events.
Selected reserves, bank balance and historical reports are never changed by this
foundation itself. Domain-specific before/after validation belongs to HB-010+.

## Outcomes

- UNAUTHORIZED / FORBIDDEN: safe authorization errors, no receipt disclosure.
- INVALID_INPUT / INVALID_AUDIT / REVISION_RANGE: rejected before successful commit.
- STALE_REVISION: new request expected a different account revision.
- REQUEST_PAYLOAD_CONFLICT: existing key has different semantic identity.
- TRANSACTION_FAILED: callback failed or PostgreSQL gave a confirmed rejecting
  SQLSTATE (including deferred FK/constraint failures).
- RETRYABLE_STORAGE_ERROR: confirmed serialization/deadlock/lock timeout/cancel error.
- COMMIT_OUTCOME_UNKNOWN: callback completed but commit acknowledgement was lost or
  another unclassified completion failure occurred; do not claim rollback.
- STORAGE_ERROR: malformed stored receipt or unexpected adapter initialization error.

Errors expose only codes; no raw SQL, payload, URLs, tokens or driver messages.
Drizzle error cause chains are inspected. Drizzle can lose the original COMMIT
error if its ROLLBACK also fails, so uncertain completion is classified
conservatively. On unknown outcome, resubmit exactly the same key/content;
idempotent lookup resolves whether it committed. No automatic financial retry
or new key is generated.

## Database versus application guarantees

Existing 19 tables and migrations suffice. No schema.ts/SQL/meta changes.
DB: transaction rollback, composite scope/FKs, request/seq uniqueness, actor-owner
CHECK, immutable history triggers, existing deferred finance constraints.
Application: authentication, normalized semantic identity, revision comparison,
counter prechecks, audit completeness through the writer, receipt validation and
safe error translation. Direct arbitrary SQL with privileged credentials is not
an application authorization boundary; JSON business semantics are not SQL-proven.

## Test and acceptance blocks

[HB9 scenarios](../../tests/scenarios/phase-01/hb-009-audit-idempotency.md) map to
unit/integration tests. Work is divided into four reviewable blocks, each with
at most five gates and seven grouped cases:

1. Command/identity: bounded data-only input, one frozen copy, legacy bytes,
   exact revision/date parsing, explicit scope/actor policy.
   Cases: legacy bytes/types; key/array order; malformed objects; graph limits;
   mutation; field/UUID/date/counter rejection; type-level checks.
2. Transaction/replay: same existing lock/transaction, one increment, persisted
   receipt, no response before commit, auth before replay.
   Cases: first commit; replay; response loss; changed identity; same-key races;
   same-version races; stale rejection.
3. Audit/rollback: nonempty descriptors, factual before/after, separate effective/
   recorded coordinates, atomicity, retained originals.
   Cases: complete audit; handler error; descriptor error; audit SQL error;
   deferred commit rejection; immutable UPDATE/DELETE; foreign owner/actor.
4. Errors/environment: int64 counters, safe outcomes, local password-only DB,
   no new endpoint/finance operations, actual evidence.
   Cases: counter endpoints; corrupt receipt; unknown COMMIT acknowledgement;
   future date; wrong password; app composition; lint/types/tests/build/architecture.

The test-only handler changes synthetic account metadata and inserts a synthetic
historical position, then audits both. It implements no bank/obligation/savings/
allocation operation. Existing HB-006 fixtures are adapted but their assertions
remain. New concurrency tests use barriers and PostgreSQL pg_stat_activity/
pg_blocking_pids to prove the second real connection is waiting before release.

## Tooling and review gate

CI service changes from trust/static host port to password/automatic loopback port
so the new wrong-password test has the same contract as local verification.
Only a clearly synthetic CI credential is tracked. Local password is generated,
not printed, and temporarily stored in ignored node_modules cache, never env files.
No other Docker container is changed.

See [executed verification](hb-009-verification.md) for commands, all outcomes,
skill instruction mapping, failures corrected, limitations and reviewer checklist.
HB-009 accepted after independent re-review on 2026-11-02.
