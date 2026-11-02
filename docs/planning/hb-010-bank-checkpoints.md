# HB-010 — Bank checkpoints and reconciliation intervals

Status: Done; independent implementation review completed and owner accepted HB-010 on 2026-11-02.
Branch: `feat/hb-010-bank-checkpoints`. Synthetic data only.

## Authority and approved scope

Implements [HB-010](../TASKS.md#hb-010--bank-checkpoints-and-reconciliation-intervals),
[BR-01/03/05/06/07/08/09/10/11](../BUSINESS_RULES.md), Accepted
[ADR 0001](../adr/0001-checkpoints-and-allocations.md) and
[ADR 0002](../adr/0002-month-closing-and-corrections.md).
The owner's implementation approval selects one forward migration, conservative
historical conflict rejection, co-located checkpoint/companion positions and actual
transaction rollback for typed domain refusals. No product policy is inferred for
overdraft, multi-source carry or future operation evidence.

One actual check confirms B>=0 and a complete vector A[p]>=0 with checked int64
sum(A)=B. Empty A at B=0 is valid. A real same-B check has a new logical identity;
an identical request retry has the original receipt. No income, expense, operation,
reserve reduction, transfer or automatic bank debit is inferred from a difference.
Existing R/S may exceed B and survive unchanged. Future financial months remain
distinct from observation dates. This is server/domain infrastructure without UI,
Server Actions or a public arbitrary-event endpoint.

## Files and contracts

| Layer | Files / responsibility |
|---|---|
| Shared pure | `src/shared/pure/instant.ts`: explicit-offset ISO parser, fixed UTC microseconds, Berlin date conversion |
| Domain | `src/domain/checkpoints/contracts.ts`, `validation.ts`: complete cash input, errors, history and read ports |
| Domain | `history.ts`, `confirmation.ts`: correction tips, ordering validation, state(H,K), proposed immutable facts and protected active head |
| Domain | `reconciliation.ts`: D and explicit future operation-evidence K/U contract |
| Features | `src/features/bank-checkpoints/read-state.ts`: authenticated read orchestration; existing budget-update executor handles writes |
| Infrastructure | `checkpoint-history.ts`, `checkpoint-writer.ts`, `checkpoint-reader.ts` under `src/infrastructure/db/` |
| App | `src/app/bank-checkpoint-boundary.ts`: private HB-007/HB-009 server composition |
| SQL | `drizzle/0002_checkpoint_positions.sql`, journal and custom snapshot metadata |

The existing HB-008 Result form remains `{ok:true,value}` / `{ok:false,code}`.
HB-009's closed error union gains `CheckpointErrorCode`; trusted writers use
`rejectBatch(code): never`, implemented by the existing BatchFailure. No second
transaction manager, generic event API or result hierarchy is introduced.

Public pure functions:

```typescript
parseInstant(unknown): Result<MicrosecondInstant, 'INVALID_INSTANT'>
berlinDateOfInstant(MicrosecondInstant): Result<BerlinDate, 'INVALID_INSTANT' | 'DATE_RANGE'>
parseCheckpoint(unknown): Result<CheckpointInput, CheckpointErrorCode>
correctionTips(facts, knowledgeCut): Result<readonly Revision[], 'CORRECTION_CONFLICT'>
indexHistory(history): Result<HistoryIndex, CheckpointErrorCode>
selectState(history, throughDate, optionalPositionId): Result<SelectedState, CheckpointErrorCode>
validateHistoricalStates(history): Result<true, CheckpointErrorCode>
planConfirmation(history, input, recordedSeq, serverGeneratedIds, today, now): Result<ConfirmationPlan, CheckpointErrorCode>
reconcileInterval(accountId, knowledgeCut, from, to, evidence): Result<Reconciliation, CheckpointErrorCode>
```

The signatures above abbreviate structural return types; source declarations are
authoritative. ConfirmReceipt remains the existing HB-009 decimal-string receipt.
Pure read models use bigint internally; a future JSON endpoint must use HB-008's
lossless decimal-string codec, never numeric coercion.

The existing authenticated update executor accepts a command envelope containing
requestId, expectedRevision, effectiveDate, reason and this payload:

```json
{
  "observedDate": "2026-10-05",
  "observedAt": null,
  "balanceCents": "10000",
  "allocations": [
    { "period": "2026-10", "amountCents": "6000" },
    { "period": "2026-12", "amountCents": "4000" }
  ],
  "correction": null,
  "placement": null
}
```

Money input accepts checked bigint or canonical decimal-cent strings, never number.
Unknown fields, duplicate periods, negative allocations and overflow reject.
`effectiveDate` must equal `observedDate`. Root/child fields are exact key sets.
HB-009 copies/freezes the entire command before asynchronous authorization. Hashing
and the writer use that same prepared graph; typed decoding derives primitive
values from it and cannot consult the original caller object. Identity preserves
HB-009's canonical bytes and typed payload distinctions: reordered allocation
arrays or a different wire representation under the same requestId conflict
rather than silently changing a saved request. Decoded allocations sort by period.

## Transaction and time

1. HB-007 authorizes before storage/replay. HB-009 rechecks owned account under
   its existing PostgreSQL `FOR UPDATE` lock.
2. Validate a saved receipt and identity before stale revision checks. Guard
   aggregateRevision and recordedSeq before incrementing signed int64.
3. Obtain explicit server clock UTC text with six fractional digits. Reject future
   observed dates/instants; allocation to a future financial month remains valid.
4. Decode the prepared payload and load immutable facts at the locked account's K.
   Verify the stored active pointer agrees with chronological selection.
5. Build/validate a pure candidate, historical states and affected report heads.
6. Insert one checkpoint, its complete vector/rows, any new position and immutable
   ordering revisions. Set the active pointer only when selected V changes. Update
   only affected existing report flags; append trusted before/after audit.
7. Kernel writes the receipt, audit and counters atomically. Any expected refusal
   throws inside the transaction, including after writes. Deferred SQL errors
   remain TRANSACTION_FAILED; lost commit acknowledgement remains
   COMMIT_OUTCOME_UNKNOWN. Recovery uses the same requestId and payload.

Instants require `YYYY-MM-DDTHH:mm:ss[.1..6 digits](Z|±HH:MM)` with explicit
offset up to ±14:00; ambiguous local time, leap seconds, unknown `-00:00`, excess
precision and range overflow reject. Offsets describe an instant, not a claimed
Berlin wall clock. Canonical UTC strings have exactly six fractional digits and
compare lexically, retaining PostgreSQL microseconds. SQL explicitly formats UTC
microseconds on reads. Date.parse is used only to convert an explicit instant to
Berlin's civil date, never for observation ordering or calendar-day arithmetic.
Calendar arithmetic uses HB-008 Gregorian years 0001–9999. No hidden Date.now().

## Historical selection, ordering and corrections

`state(H,K)` first restricts whole immutable batches to K, resolves each logical
correction chain to its visible tip, then filters by H. Position order comes from
the latest complete immutable day manifest visible at K, never UUID or entry
sequence. Provenance includes K, H, exact checkpoint/vector and day revision IDs.
Every selected vector must anchor to the selected checkpoint revision. Missing or
inconsistent historical manifests fail closed rather than inventing order.

Ordering JSON contract v1 is `{schemaVersion:1,positionIds:[...]}` plus
`{schemaVersion:1,edges:[{before,after}]}`. Lists contain all positions on that day
at K exactly once, including historical ghost positions of moved corrections.
Day chains have one root/tip, strictly earlier predecessors and no forks. Edges
must reference known positions in the declared order; anchor/predecessor fields
are also checked. Distinct current facts within either stream cannot tie at one
position. A checkpoint and its companion are intentionally co-located, an atomic
dependency needing no fictitious before/after timestamp.

The first position of a day may omit placement. Adding to a nonempty day requires
reviewed `{expectedOrderingRevisionId,afterPositionId,beforePositionId}` with exact
adjacent neighbors (null at an end), including timed/backdated observations.
Known instants constrain placement to nondecreasing microsecond order. Date-only
checks retain null time. New manifests preserve existing relative positions.

C5=50000, C10=45000, then C7=48000 stores C7/V7 and advances revision/seq while
keeping C10/V10 and its predecessor reference unchanged. Every effective cut is
checked: a V8 still anchored to C5 after inserting C7 causes
HISTORICAL_STATE_CONFLICT and rollback, even if C10/V10 is coherent today.

An amount-only correction identifies the current checkpoint/vector tips with
`correction:{checkpointId,allocationRevisionId,reposition:false}`. Date, time and
position stay unchanged; new immutable revisions supersede both tips with the
same logical identities and full new A. Changing date/time/order requires explicit
`reposition:true`, a new position and placement on a populated target day; a date
move also appends the old day's unchanged complete manifest. Old facts/manifests
remain available at earlier K. No stale-tip correction forks or automatic rebase.
Position edges involving a moved fact from another stream require that stream's
explicit correction workflow; HB-010 conservatively refuses such a move with
HISTORICAL_STATE_CONFLICT instead of silently moving its dependencies.

## Read models and closed-report impact

The server reads one owned account row (capturing K once), then only immutable
facts with recordedSeq<=K. Concurrent later commits cannot contaminate that cut.
The reader derives C/V together; it never mixes an independently reloaded mutable
pointer with a newer checkpoint. NO_OBSERVATION differs from an observed zero.
An earlier/later observation is never substituted as the actual balance on H:
endBalanceCents is null unless an actual eligible observation is on that day.

Within the account lock, each existing report head is evaluated using its H and
recorded cutoff. Selection contract v1, exact C/V references and pinned ordering
IDs must reproduce the original basis. Unflagged prior basis drift or unsupported
report contracts reject REPORT_IMPACT_REVIEW_REQUIRED. Compare pre-command and
candidate C/V at that H; mark only changed report heads correction_pending=true,
with mandatory before/after audit. Existing flags remain set, closing IDs/payloads
and versions are untouched. Pure manifest/provenance changes with the same C/V
do not mark an otherwise unaffected report. R/S and their relative positions are
not modified by HB-010, so there is no invented lifecycle recalculation. This is
impact marking only; closing/version creation remains a later task.

## Optional reconciliation

Production read returns adjacent resolved real-checkpoint intervals at one K and
checked D=B2-B1. No real operation tables exist. Its evidence status is explicitly
NOT_AVAILABLE, with K/U null. There is no fallback empty ledger or operation repo.

The pure future CONFIRMED_SET contract requires matching account, endpoint revision
IDs and knowledge cut, plus authoritative currentRevisions and confirmed operations.
Endpoint order/account membership must come from the authorized resolved history,
as in the production interval reader; arbitrary client evidence is not attested
by this pure calculation. Scope/interval mismatch, missing/conflicting current
revision proof or conflicting content for one revision rejects EVIDENCE_CONFLICT.
Duplicate identical operation/revision counts once. With unique authoritative
current revision proof, old revisions never contribute a second time. UUID identity
comparisons normalize case so alternate UUID casing cannot duplicate an operation.
Stable
identity order makes checked intermediate sums deterministic. Signed D/K/U and
all intermediate values use int64 arithmetic. U=0 never asserts gross completeness.
Operations never change B/A or gate checkpoint confirmation.

## SQL guarantee boundaries

The single new forward migration adds deferred coordinate-date and ordering
predecessor checks plus unique partial root/child indexes. Scope is additionally
protected by existing HB-006 scoped FKs. No accepted migration is edited and no
table/column is added. Custom snapshot 0002 carries the unchanged generated schema
forward; trigger/index SQL remains explicitly migration-owned, as for 0001.

SQL guarantees checkpoint-position date and vector-position effective date,
predecessor scope/day/strictly smaller sequence, one root per account/day and one
child per predecessor. Existing deferred vector/companion, correction/no-fork and
append-only guarantees remain. SQL does NOT validate complete JSON manifests,
JSON dependency semantics, historical anchor selection, client confirmation or
mandatory audit existence; those remain trusted application/domain boundaries.
Direct-SQL negative integration cases prove the actual SQL guards.

## Proof and limits

See [HB10 scenarios](../../tests/scenarios/phase-01/hb-010-bank-checkpoints.md) and
[executed verification](hb-010-verification.md). No dependency, OAuth, protected
environment or other task change is required. HB-011/012 lifecycle, standalone
HB-013 redistribution/transition consent, forecasts, close creation/versioning,
PDF ingestion and production operation sources remain unimplemented. Synthetic
future-stream fixtures test compatibility; they do not claim those features.

The loader currently materializes account history and validates it in memory.
Large-history performance/pagination needs a separate bounded optimization with
unchanged H/K semantics; no production-scale benchmark is claimed. Existing
HB-009 canonical/audit size, depth and node budgets apply; oversized confirmations
or audits reject atomically, without silently dropping allocations/history.
Pre-HB-010 facts lacking valid complete ordering manifests require an explicitly
reviewed import/correction, not automatic inferred ordering. Migration deployment
against any existing database requires separate review and authorization.
