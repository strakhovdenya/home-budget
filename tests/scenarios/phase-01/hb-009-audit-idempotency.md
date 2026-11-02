# HB-009 — Audit and idempotency acceptance scenarios

Status: implemented, Review; independent review and owner acceptance pending.
[Contract](../../../docs/planning/hb-009-audit-idempotency.md) and
[executed evidence](../../../docs/planning/hb-009-verification.md).

Synthetic infrastructure fixtures only. Base fixture: an owned EUR account with
displayName Before, aggregateRevision=0, recordedSeq=0, no updates/audit/positions.
There is no financial checkpoint/vector/obligation/saving/report state: bank B and
budget A/R/S/F are absent, not invented zero. Handler changes synthetic metadata to
After, inserts one synthetic historical position and audits both. It never posts
bank cash, income, payments, reserves, carry or reports.

K is a UUID request, expectedRevision=0, effectiveDate=2020-11-20, nonblank synthetic
reason and payload {name:After}. Recorded timestamp is actual server/DB UTC time;
effective date remains backdated Berlin date. Successful new batch yields one
budget_update, one position, two ordered audit entries and counters +1.
Each test owns a separate account; integration suite owns a fresh migrated local
database. READ COMMITTED account lock and barriers control races.

Rules: BR-02 atomicity/no second effects, BR-08 immutable history, BR-10 exact
types/dates/scope/idempotency, BR-11 retained originals. Earlier accepted financial
scenarios remain unchanged: HB1-007, HB2-014/015/024/028/045 are traced only for
their infrastructure obligations. No claim that HB-010+ business flows are done.

## HB9-001 — First successful batch

GIVEN Base fixture.

WHEN Execute metadata update K.

THEN Name After, revision/seq 1, one update, one synthetic position and two audit rows; receipt matches stored result.

## HB9-002 — Identical replay

GIVEN Committed K.

WHEN Submit identical K.

THEN Return original receipt, execute handler zero additional times, preserve counters and history.

## HB9-003 — Response lost after commit

GIVEN K committed; caller discards response; another key advances revision.

WHEN Retry original K and original expected revision.

THEN Return K receipt before stale check; two total commits/four audit rows, no third write.

## HB9-004 — Changed identity under same key

GIVEN Committed K.

WHEN Change payload, reason, effective date or expected revision and submit K.

THEN REQUEST_PAYLOAD_CONFLICT; unchanged committed rows/counters.

## HB9-005 — Parallel identical requests

GIVEN T1 holds account lock and is paused in handler.

WHEN Start T2 with K; observe real lock wait, then release T1.

THEN Both get same receipt, handler once, one batch/position, two audit rows.

## HB9-006 — Parallel competing versions

GIVEN T1 holds lock at expected revision 0.

WHEN Start T2 with another key at revision 0; prove wait, release T1.

THEN T1 commits; T2 STALE_REVISION; no lost update or partial second batch.

## HB9-007 — Concurrent payload conflict / rollback winner

GIVEN T1 holds lock.

WHEN Queue same-key changed-payload T2, or separately make T1 fail then queue identical T2.

THEN Changed payload conflicts after T1 success; after T1 rollback T2 may commit once. Both cases retain one successful batch.

## HB9-008 — Incorrect expected revision

GIVEN Base revision 0.

WHEN Submit new key expecting revision 1.

THEN STALE_REVISION; full before-state unchanged, zero audit/receipt/position writes.

## HB9-009 — Handler failure

GIVEN Base fixture.

WHEN Handler writes metadata/position then throws.

THEN TRANSACTION_FAILED; name Before, counters 0, no facts/audit/receipt. Same key remains usable.

## HB9-010 — Audit descriptor failure

GIVEN Base fixture.

WHEN Handler writes metadata/position but returns empty descriptors.

THEN INVALID_AUDIT; all writes/counters roll back; no consumed key.

## HB9-011 — Deferred constraint failure at COMMIT

GIVEN Base fixture.

WHEN Handler writes valid state/audit and an ordering revision with nonexistent deferred predecessor.

THEN Callback completes but COMMIT rejects with TRANSACTION_FAILED; no state/facts/audit/receipt survive, including ordering row.

## HB9-012 — Audit SQL insertion failure

GIVEN Local test-only trigger rejects TEST_AUDIT_FAILURE.

WHEN Handler writes state/fact before audit insert.

THEN TRANSACTION_FAILED and complete rollback. Production SQL/migrations are unchanged.

## HB9-013 — Immutable originals

GIVEN Committed K with two audit rows.

WHEN Attempt UPDATE and DELETE on audit_events and budget_updates.

THEN Each statement rejects; original audit/receipt/state are byte/value-equivalent.

## HB9-014 — Foreign account on replay

GIVEN Account A owned by U1 has committed K; U2 exists.

WHEN Call private primitive with owner U2/account A.

THEN FORBIDDEN before receipt lookup; no receipt disclosure or A mutation.

## HB9-015 — Counter boundaries

GIVEN Separate fixtures: revision MAX, seq MAX, or both MAX-1.

WHEN Try next commit; separately replay last valid commit.

THEN MAX fixtures reject REVISION_RANGE without writes. MAX-1 reaches exact MAX and permits replay, no wraparound.

## HB9-016 — Corrupt persisted receipt

GIVEN Test setup inserts a prior row with matching identity but malformed/mismatching result.

WHEN Try replay for shape, ID, seq and aggregate revision corruption.

THEN STORAGE_ERROR, handler not invoked, no replacement or extra audit.

## HB9-017 — Mutable original command

GIVEN Prepare K with payload name After.

WHEN Mutate original payload/reason after preparation, then execute.

THEN Identity and stored state/audit use normalized After/original reason; caller object cannot alter frozen graph.

## HB9-018 — Future effective date

GIVEN Base fixture.

WHEN Submit effectiveDate 9999-12-31.

THEN INVALID_INPUT before writes. This date is valid syntax but future relative to server recorded date.

## HB9-019 — Real COMMIT acknowledgement lost

GIVEN Test uses an isolated pg.Client connected to the local test DB.

WHEN Forward real COMMIT, then deliberately throw ECONNRESET before acknowledgement reaches commitBatch.

THEN COMMIT_OUTCOME_UNKNOWN; DB contains exactly one batch/two audits; same-key retry returns saved receipt without duplicate effects.

## HB9-020 — Forged prepared object

GIVEN Server test creates a shallow-frozen copy without constructor provenance.

WHEN Pass forged command to private writer.

THEN INVALID_INPUT before transaction; zero batches. Freezing alone is not validation.

## HB9-021 — Password authentication

GIVEN New isolated PostgreSQL 18 with generated password and loopback dynamic port.

WHEN Connect over TCP with intentionally wrong synthetic password.

THEN PostgreSQL rejects with 28P01; no trust authentication.

## HB9-022 — Forged actor at SQL boundary

GIVEN U1 owns account; U2 exists.

WHEN Direct test insert attempts a batch for U1 with actor U2.

THEN Existing actor-owner CHECK rejects; zero batch rows.

## HB9-023 — Canonical inputs and bounds

GIVEN Legacy supported values and unsafe graph fixtures.

WHEN Canonicalize dense data; reject sparse arrays, getters, symbols, hidden/extra properties, cycles, depth/node/size excess.

THEN Legacy bytes stay identical; types/order remain distinguishable; getters never execute. Tests canonical-payload.test.ts.

## HB9-024 — Runtime validation and receipts

GIVEN Raw DTO/corrupt receipt fixtures.

WHEN Try forged fields, number/negative/overflow revision, invalid date/UUID/reason; decode exact large receipt.

THEN Invalid values reject; bigint counters remain precise. Tests updates-validation.test.ts.

## HB9-025 — Safe transaction errors

GIVEN SQLSTATE and nested-cause fixtures.

WHEN Classify explicit constraint/deadlock/timeout errors versus unclassified failure before/after callback completion.

THEN TRANSACTION_FAILED, RETRYABLE_STORAGE_ERROR and COMMIT_OUTCOME_UNKNOWN stay distinct; no raw SQL/message in public Result. Tests audit-serialization.test.ts.

## HB9-026 — HB-007 composition and auth mutation

GIVEN Actual app factory with mocked HB-007 authorizer and repository; no endpoint.

WHEN Deny auth, forge actor, throw lazy adapter error; separately mutate original DTO while auth awaits.

THEN No DB/replay before auth; invalid DTO never reaches repository; prepared graph stays unchanged; adapter details become STORAGE_ERROR. Tests execute-update.test.ts and budget-update-boundary.test.ts.

## HB9-027 — Compile-time contracts

GIVEN Existing strict TypeScript includes tests/types/hb-009.ts.

WHEN Typecheck attempts command mutation, number assigned to bigint and repository call missing owner scope.

THEN All three @ts-expect-error assertions are required; valid repository/Result contracts compile.
