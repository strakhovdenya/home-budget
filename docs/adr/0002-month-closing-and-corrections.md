# ADR 0002 — Immutable month closing and backdated corrections

**Status: Accepted** — corrected D32..D35 contract re-accepted by the owner after owner-reported repeated independent review;original acceptance history retained.

**Re-acceptance — 2026-11-01:** the owner confirms repeated independent review of the D32..D35 amendment and resolution of all four review findings,and approves the corrected contract. This acceptance supersedes the erroneous signed actual-allocation interpretation;it does not imply that the original model was always correct. Earlier acceptance and evidence remain archived below and in Git. Scope:B>=0,A[p]>=0,sum(A)=B,F=A-R-S,deficit=max(0,-F);full R/S may exceed A/B,expected income is excluded,and ordinary CARRY/FRESH_START/history/no-double-debit remain intact. See [owner re-acceptance](../DECISIONS.md#corrected-adr-0001-and-0002-re-acceptance--2026-11-01). HB-003 liquidity,multi-source CARRY,overdraft and historical-overspend features are not accepted by this entry. No runtime tests are implied.

**Date:** 2026-11-01. **Requirements:** BR-01/02/03/05/06/07/08/09/10/11, HB-002, F-009/010/013/018.

References: [Accepted ADR 0001](0001-checkpoints-and-allocations.md), [business rules](../BUSINESS_RULES.md), [logical model](../DATA_MODEL.md), [HB2 scenarios](../../tests/scenarios/phase-01/hb-002-month-closing-and-corrections.md), [owner questions](../OPEN_QUESTIONS.md#hb-002-review-questions).

## Context and scope

Irregular bank checks leave genuine gaps. A report must preserve both the historical facts and what was known when it was closed. A December transfer changes the active allocation, not November history. This ADR refines ADR 0001 without replacing complete checkpoint-first allocations, optional operations, full earmarks or one-button transfer consent.

Only documentation and scenario specifications are delivered. No SQL, migrations, app, packages, external service or forecast formula. All examples are synthetic integer EUR cents. Neon/Drizzle and the existing layer boundaries remain unchanged.

**Current amended scope:** preserve historical selection/ordering, incomplete closing, immutable versions, explicit corrections, ordinary CARRY and FRESH_START after missed months. Every new cash allocation is nonnegative and sums to actual B>=0. Negative F does not block ordinary CARRY. Complex simultaneous multi-source CARRY remains excluded under Q-HB2-02; negative A instead fails validation and is not an open signed-carry product option. Original [HB-002 acceptance](../DECISIONS.md#hb-002-acceptance--2026-11-01) remains historical; the corrected amendment is now re-accepted after owner-reported repeated independent review.

### Owner clarification: one ordinary budget update

The ordinary month-transition visit is: actually check the card → enter observed balance/date → explicitly choose A CARRY or B FRESH_START and review the complete new distribution → confirm once. Neither A nor B is preselected or inferred from signs/elapsed months. The same atomic budget update records the real checkpoint, full vector, explicit transition decision, existing obligation/savings funding revisions and audit. No preliminary affirmation of the old balance, separate mandatory transfer screen or second bank update is required. DEFER remains available as a distinct decision to update without either transition; it does not mean fresh start.

Example: Nov28 C0 B=90000,A={Nov:40000,Dec:50000},o R[Nov]=30000,S=0. On Dec2 the user actually checks B=84000 and confirms A'={Nov:0,Dec:84000},same o R[Dec]=30000,F[Dec]=54000. One transaction saves C1 observed Dec2, one final vector and transfer/funding history. D=-6000 is an unexplained interval net, not November/December spending. Do not persist an artificial B=90000 December check, an intermediate vector or a synthetic source amount for the -6000. Before/after lineage identifies the confirmed state transition, not an exact transferred amount independently known from that net.

A new real check with B still 90000 also creates a new Dec2 checkpoint; equal amounts do not mean the bank was not checked. Request retries of that same observation do not duplicate it. In contrast, an explicit redistribution/transfer-only action reuses a previously confirmed checkpoint and does not claim a new check. Both technical modes survive; only the combined mode is the main month-transition UX.

On website open, compute the current Berlin month and show the new period/update proposal. Auto-opening a calendar period is calendar availability (an optional period record may be created idempotently on access), not background financial work. Without confirmation no checkpoint, allocation, funding change, transfer or close is committed. No scheduler, background worker, PWA or service worker is required.

**Relationship to ADR 0001:** ordinary transition combines actual balance, full distribution and explicit consent; transfer-only remains a technical alternative. Both ADRs now contain the owner-authorized A>=0 correction and are re-accepted after owner-reported repeated independent review. Their earlier acceptance history is retained; no new runtime layer is introduced.

### Explicit fresh start after one or several missed months

D29..D31 preserves explicit FRESH_START: the user may decline to carry past allocated cash while keeping all history and full unpaid/savings earmarks. D32..D35 corrects the examples to nonnegative actual-cash allocations. A historical negative free budget is not itself another liability or an amount automatically debited in the next period. No separate historical-overspend accounting mechanism is selected.

Example: Nov20 2026 C0 B=10000,V0={Nov:4000,Dec:6000},R=S=0; no December visit/check. Jan5 2027 actual C1 B=8000 and explicit FRESH_START produces V1={Nov:0,Dec:0,Jan:8000},F[Jan]=8000. D=-2000 remains interval net only. C0/V0 stay immutable; November last confirmed A=4000 and December A=6000 effective Nov20 survive in history. Last historical observation remains Nov20/B10000 and actual Dec31 balance is unknown. No December checkpoint,intermediate close or income is invented.

FRESH_START contract:

1. Requires ACTUAL_CHECK with actual current balance/date and explicit final full vector. A same-amount real check is valid. Preview lists the complete set of elapsed periods represented by past active allocations or active earmark funding, exact before/after amounts and explicit `not_carried_period_ids`. In this mode those past allocation rows become zero (zero rows may be omitted in the vector, but IDs and prior allocation values must remain in the decision manifest). Current/future amounts are user-confirmed; preserve untouched future allocations unless a separate visible edit is confirmed. The example with no future allocation assigns all 8000 to January. No reset equation adds old allocations or subtracts historical free deficits again from fresh B.
2. Record a FRESH_START transition decision, selected not-carried periods, immutable before/after vectors and bank anchors, request/payload identity, actor, confirmation/effective positions, recorded sequence and explanation of non-carry. This is a separate kind from CARRY, with no invented transferred-money amount. Historical deficit remains inspectable; no operation or write-off entry is posted. Selecting neither A nor B cannot silently become B.
3. Enumerate ALL still-active unpaid obligations and savings across the affected old funding periods, including older months with zero cash. Their identities, origins, outstanding/earmark amounts and statuses survive unchanged; preview explicitly proposes their funding in the current period and confirmation records immutable full before/after funding states once. Retain existing current/future earmarks once. Omission of an old outstanding identity is an invalid reset, not implied cancellation. Paid/cancelled identities keep their existing status/history; reset creates no new paid/cancelled state.
4. Full reserves remain even when they exceed fresh B. At B=8000,R=9000,S=2000,January F=-3000; no reserve cap, partial reserve, automatic payment or savings release. Only separately explicit normal lifecycle/savings edits, visibly reviewed and audited in the same update, may change those amounts/statuses. BR-02 fresh-payment affirmation remains mandatory for any separately requested payment; FRESH_START alone is never that affirmation or payment.
5. Handle the entire missed interval in one preview and one atomic transaction anchored to the current head. No per-month transfer confirmations, fictitious intervening updates or prerequisite month closes. Number of elapsed periods or negative historical free values does not produce OWNER_POLICY_REQUIRED for FRESH_START. Calendar gaps and missing bank data are not blockers. Genuine authorization, invalid sum, stale dependencies, ambiguous actual observation order or omitted earmarks still reject atomically.
6. Store checkpoint, one final allocation revision with `change_kind=FRESH_START`, transition decision, preserved/explicitly amended funding states, audit and idempotency result together. Request retries return that result; same key/different A/B mode conflicts; competing stale CARRY/FRESH_START previews require review, never fallback to the other mode. Current historical reports/heads remain unchanged; later close/correction uses its own historical cut and knowledge boundary.

FRESH_START preserves explicit consent,full earmarks and history without requiring old free deficits to be carried as cash or debt. The owner-authorized amendment changes cash validity to A>=0; the multiple-source CARRY exclusion remains separate. No legacy data conversion is required: the app has no real financial records yet.

## Alternatives considered

| Approach | Consequence | Proposal |
|---|---|---|
| Require a final-day checkpoint or statement | Blocks normal irregular use | Reject |
| Copy last/later balance to month end, interpolate daily values | Fabricates financial facts | Reject |
| Rebuild every report from current mutable rows | December payment/transfer changes November retrospectively | Reject |
| Keep only latest corrected report | Loses the original evidence and approval | Reject |
| Full event-sourced accounting engine | Unneeded ledger/replay complexity; conflicts with ordinary complete-state input | Reject |
| Append-only fact revisions, explicit historical positions, immutable report snapshots with evidence cutoffs | More references and explicit ambiguity handling; reproducible reports | Selected |

## Time, knowledge and deterministic ordering

These are independent coordinates; a financing month never substitutes for an effective date.

| Field | Logical type | Meaning |
|---|---|---|
| `observed_date` | Berlin calendar DATE, required on checkpoint | Actual day the card was checked |
| `observed_at` | UTC instant, nullable | Actual check instant only if known; its Berlin date must equal `observed_date` |
| `effective_date`, `effective_order` | Berlin DATE, positive integer within that account/day | Confirmed historical position of a budget state or lifecycle change |
| `observation_order` | Positive integer within account/observation day | Confirmed order of bank observations on that day |
| `financial_period_id` | Scoped YYYY-MM identity | Month owning allocation/funding, regardless of observation day |
| `confirmed_at` / `transfer_confirmed_at` | Server UTC instant | Consent, never an inferred debit/check time |
| `bank_date` | Berlin DATE, nullable | Optional evidence-backed payment date; not guessed from confirmation |
| `recorded_at`, `recorded_seq` | Server UTC instant, strictly increasing account commit sequence | When the app accepted facts; all rows of one atomic update share a sequence |
| `historical_through_date` | Berlin DATE | Last calendar day included in a historical query/report |
| `evidence_recorded_cutoff_seq` | Account commit sequence | Inclusive committed knowledge boundary, independent of historical date |

An account lock/serializable equivalent assigns `recorded_seq` transactionally. Timestamps may tie; sequences do not. A cutoff captures whole committed batches, never half a payment/update. Report creation uses the prior committed sequence as its cutoff, then receives its own sequence. Preview includes the cutoff and account revision; any intervening relevant write requires refreshed review. Do not order financial facts by UUID, timestamp of entry, lexical ID or database return order.

1. Different historical days sort by actual observation/effective date. Current bank is the latest chronological non-superseded observation, not the most recently entered row.
2. Within a day, known instants constrain observation order. Date-only entries retain null instants. Existing same-day chronological append is confirmed as “after the previous check”; importing/backdating into a day with other observations requires explicit placement before/between/after. Mixed date-only/timed entries also need placement if their relative position is unknown. Reject contradictory placement and instants.
3. Budget states have explicit day positions. For ordinary updates, the reviewed predecessor establishes the next position; insertions specify historical neighbors. Stable position IDs are immutable. Each change to a day's order appends an ordering revision containing the complete ordered list of position IDs; existing report manifests pin their ordering revision. The integer is a display ordinal within that ordering revision, not a mutable identity or invented clock time. This avoids integer-gap exhaustion and never renumbers old manifests. At knowledge cutoff K use the latest accepted ordering revision visible at K. Its list includes observation and effective-state positions, with atomic-batch dependency links; observation_order/effective_order are their respective list ordinals.
4. A checkpoint and its complete vector are atomic. Multiple vectors reusing that checkpoint have their own confirmed effective positions. On the same day, C1+V1 followed by redistribution V2 selects C1/V2. A fresh C2+V3 after payment selects C2/V3 and that batch's full remaining reserve. No processing order debits C2 again.
5. A dependent allocation cannot precede its anchor observation; a transfer cannot precede its reviewed source state. Cross-stream same-day dependencies must be explicit in the position manifest. Ambiguous relative placement that could change the selected bank/vector/earmarks blocks confirmation of that historical candidate until the user places it; missing bank detail does not.
6. Corrections replace a logical fact at its historical position, keeping prior revisions. Changing the date/order is an explicit correction with before/after positions and reason; validate dependencies again. Two competing corrections of one revision conflict; a second correction must reference the current correction tip. Never resolve forks by entry time.
7. New transfers take effect on the actual Berlin confirmation day, never silently on the previous month-end. `transfer_confirmed_at` remains its UTC instant. Historical corrections of transfer facts are reviewed corrections, not ordinary backdated transfers.

Historical positions express confirmed order, not exact time. A query “through Nov 30” includes all accepted positions on Nov 30; intra-day queries require a position or a known instant with unambiguous placement. Future-effective observations/updates are rejected; allocation to a future financial month is valid.

UTC instants convert using Europe/Berlin rules. Do not add 24 hours to calculate a calendar day/month. The two local 02:30 occurrences on 2026-10-25 require offset/instant if time is supplied (00:30Z and 01:30Z); date-only remains date-only. Reject nonexistent local 02:30 on 2026-03-29; never guess an offset. A supplied local time without enough offset information stays unresolved until clarified. Nov 30 23:30Z is Dec 1 in Berlin and is not a November observation.

## Historical selection and immutable fact revisions

Define `state(H, K)` where H is the historical through-date (optionally a position) and K is the inclusive account knowledge sequence. It means “confirmed state effective through H, using only facts known by K”; it is not proof of actual unobserved cash at H.

Selection is deterministic:

1. Restrict to authorized account facts committed at `recorded_seq <= K`. Pending drafts, unapproved PDF candidates and later evidence are excluded.
2. Resolve each logical fact's correction chain to the terminal revision visible at K, then apply the historical cutoff to that resolved fact. Resolve before date filtering so moving a corrected fact beyond H removes it rather than resurrecting its old date. Reject correction forks/cycles; superseded rows remain readable by exact revision ID.
3. Select checkpoint C with maximal eligible `(observed_date, observation_order)` and the confirmed complete allocation V with maximal eligible effective position. Select full lifecycle/funding state of each obligation/saving at its maximal eligible effective position, with correction chains resolved at K. Do not replay payment deltas against today's outstanding. Use immutable full before/after state revisions, including zero/paid/cancelled states.
4. V must be anchored to C as resolved at this knowledge cut, and its dependency positions must be coherent. A historical checkpoint insertion can expose a later old-anchor redistribution; never silently rebase its vector. Require an explicitly reviewed historical vector/correction for that cut, or report `HISTORICAL_STATE_CONFLICT` and keep existing reports. No guessed allocation is permitted. A genuine initial period with no observation may close as `NO_OBSERVATION`, with null bank/vector/free fields; known earmarks may still be reported.
5. Read R/S from historical full states and funding associations,not mutable current pointers. Each identity has exactly one funding period. R sums full outstanding only for UNPAID reserveFull=true,including explicitly selected isPossible claims;unselected possible and paid/cancelled contribute0. Preserve possible/reservation flags in the historical source manifest. A later payment or reservation-selection change does not release/rewrite a historical reserve. R+S can exceed A/B;this is negative free,not additional cash. Inconsistent lifecycle facts require explicit review,not automatic double application.
6. Snapshot C, V, ordering revisions and all selected lifecycle/evidence revision IDs. Preserve effective dates and bank dates separately. Later lifecycle can be linked as a separate view with its own as-of date; it cannot alter the as-closed snapshot.

The active bank/vector head is separately protected by `aggregate_revision`. An older historical insert with its complete vector does not promote itself to the active head or rewrite newer checkpoints/vectors. Later confirmed full states remain authoritative; a historical delta is not replayed through them. Corrections that would change the latest bank amount/active anchor require a separately reviewed complete current vector in the same transaction, or remain an unapplied proposal. Earmark corrections that affect the active full state similarly require explicit current-state review. Every accepted write increments account revision, even if the current financial head is unchanged, invalidating stale previews.

## Logical closing record and constraints

`month_closings` is immutable,scoped by owner/account/period,not only a global period ID. Fields below retain the historical closing contract with the allocation amendment under review,not a migration;`Money` is bounded signed integer EUR cents,with allocated cash nonnegative and historical free possibly negative;`Id` a scoped UUID,`Seq` a nonnegative integer,`Instant` UTC. Report rows/child snapshots are append-only. Active report pointers and notification/read-model state may change with audit.

| Field | Type / nullability | Constraint or semantics |
|---|---|---|
| `id`, `owner_user_id`, `account_id`, `period_id` | Id, required | All references same owner/account; period belongs to this scope |
| `version` | Integer >=1 | UNIQUE(account, period, version); contiguous confirmed chain |
| `previous_version_id` | Id nullable | Null iff v1; otherwise immediate preceding confirmed version of same account/period |
| `historical_through_date` | DATE required | Last Berlin day of period; close allowed only after that day ends |
| `closed_at`, `closed_by`, `recorded_seq` | Instant, actor Id, Seq | Actual report commit/actor; not observation time |
| `evidence_recorded_cutoff_seq`, `evidence_recorded_cutoff_at` | Seq, Instant | Inclusive committed boundary and captured server time; seq governs ties |
| `reason` | Nonempty text | Initial close basis or correction explanation; mandatory for every version |
| `change_evidence_refs` | List of typed immutable revision refs | Empty allowed for v1; later version needs changed fact/evidence refs |
| `last_historical_checkpoint_revision_id` | Id nullable | C selected by state(H,K), including pre-period C if no newer observation exists |
| `last_bank_observed_date`, `last_bank_observed_at` | DATE nullable, Instant nullable | Actual date/time of C; date null iff C absent; time may independently be null |
| `last_observed_balance_cents` | Money nullable | Equals C balance; null iff C absent; never labelled end balance |
| `historical_allocation_revision_id`, `allocation_effective_date` | Id nullable, DATE nullable | Exact V and date; both null only for NO_OBSERVATION; full vector stored |
| `end_checkpoint_revision_id`, `end_balance_cents` | Id nullable, Money nullable | Both present iff C.observed_date is period's last day; balance equals C, including real zero |
| `bank_data_completeness` | Enum required | `END_DATE_OBSERVED`, `INCOMPLETE`, `NO_OBSERVATION`; first means observed on final day, not certified at 23:59:59 |
| `operation_detail_status` | Enum required | `NOT_PROVIDED`, `PARTIAL`, `USER_CONFIRMED_COMPLETE`; independent of end-date observation; U=0/PDF alone cannot promote completeness |
| `historical_allocated_cents`, `historical_reserved_cents`, `historical_savings_cents`, `historical_free_cents` | Money; A/F nullable only without V | For this period; R/S remain computable from selected states, A/F unknown without V; F=A-R-S when known |
| `snapshot_schema_version`, `selection_contract_version` | Positive integers | Pin serialization and selection rules; a future algorithm must not rewrite this payload |
| `snapshot_json`, `source_manifest`, `ordering_revision_refs` | Required structured values | Complete vector, lifecycle/funding states, provenance, evidence/detail status and exact revision IDs; snapshot includes copied display facts, not current-row joins |

No observation is fabricated when C predates month end. In `INCOMPLETE`, end checkpoint/balance must both be null, even if last balance happens to be zero. END_DATE_OBSERVED permits using the last confirmed final-day observation as the reported end-date balance per D24; retain its actual instant/precision, do not claim the card was checked at midnight or no later spending occurred. With multiple final-day checks, explicitly confirmed order chooses the last one. Known operation totals must be labelled partial when appropriate; absent totals are unknown, not confirmed zero spending.

Foreign keys must reference retained immutable revisions; no destructive cascade. Enforce matching scopes, contiguous version predecessor, correction-tip uniqueness, revision-chain acyclicity, source-manifest closure and vector sum equality transactionally. Snapshot money must match referenced revisions and satisfy sum(A)=anchoring B, F=A-R-S, sum(F)=B-sum(R)-sum(S). Historic A/F are labelled “last confirmed allocation state, effective DATE”, not observed final-day free cash when bank data is incomplete.

## Closing, correction and report-head transitions

Calendar state and report state are distinct: current period is OPEN; after its end it is AWAITING_CLOSE until v1. Later it is CLOSED with latest confirmed report head. A correction candidate is separate pending work, not a reopening or an automatically current v2. Cash may remain in an already closed month's active allocation until explicitly transferred; closing does not sweep it.

1. Preview close: fix H, K, selection version, account revision and current report head; materialize state(H,K), incompleteness flags and source manifest. No final-day checkpoint/PDF is required. Ambiguous accepted data needs explicit placement/correction before a coherent report can be confirmed; lack of final-day data alone never blocks close.
2. Confirm close: authorize owner/account; validate preview and idempotency; lock account + period/report head; verify expected revisions/cutoff; atomically append report v1, audit and head pointer. B/A/R/S current financial heads are unchanged. This includes no hidden transfer or payment.
3. Late historical checkpoint requires its own confirmed complete vector. Append facts and audit; keep original report and newer active financial states. Offer correction review for affected closed periods. Mark an external `correction_pending` read-model flag; never mutate v1 or silently publish another version. A PDF may affect evidence/detail only, not confirmed cash or allocation.
4. Correction preview compares current confirmed report head with recomputed state(H,new K). Show changed fields, before/after source revisions, reason, current-state impact (normally none) and what remains unknown. It may change evidence metadata alone. If canonical financial/evidence content is identical, return `NO_REPORT_CHANGE`; a different cutoff alone is not a meaningful correction.
5. Explicit confirmation creates v(n+1) with `previous_version_id=v(n)` and nonempty reason/evidence refs. UNIQUE predecessor prevents competing children. The latest confirmed version is the report default; users can explicitly select any older version. Reject stale head; refresh and review, never overwrite the winner. Draft/rejected/failed requests consume no version number.
6. A correction of a correction appends another fact revision, then may yield v3 after review. Original fact revisions and reports remain accessible. Returning to older values still creates a new revision with explanation; no rollback/delete of history. Reports of other months are only offered for review, never cascaded automatically.

### November examples

Incomplete: Nov 20 C0 B=80000, V0={Nov:60000,Dec:20000}, o outstanding/R[Nov]=30000, S=0. Dec 2 C1 B=75000 plus confirmed transfer yields active V1={Nov:0,Dec:75000}, same o R[Dec]=30000, F[Dec]=45000. November close after transfer selects C0/V0, R[Nov]=30000, historical F[Nov]=30000 effective Nov20, end_balance=null, INCOMPLETE. Neither 80000 nor 75000 is the Nov30 balance. D=-5000 spans months and is not November spending.

Complete end-date observation: Nov30 C2 B=76000, V2={Nov:56000,Dec:20000}, o R[Nov]=30000. November report selects C2/V2, end_balance=76000, END_DATE_OBSERVED, F[Nov]=26000. Without operation entry, detail status is NOT_PROVIDED. A later Dec2 C1 remains current B=75000; its vector/reserve/free remain 75000/30000/45000. If C2 is entered Dec3 after incomplete v1, only explicit correction publishes v2 using C2/V2; v1 still says unknown.

## Transfer proposal and confirmation contract

Ordinary case: one explicitly reviewed completed source month to current month, with nonnegative A for all periods and all source funding identities carried intact. Negative F from full reserves does not block this ordinary path. The main path is combined actual-check/update; transfer-only is a technical alternative. Simultaneous multiple-source CARRY remains an owner gate; negative source/target A is invalid new input, not another carry option.

Eligibility is scoped to the transfer's source,target,funding identities and revision dependencies,while whole-vector nonnegativity and sum equality are mandatory. Preserve unchanged valid allocations and funding outside the write set. Example B=89000,A={Nov:40000,Dec:48000,Jan:1000},R[Nov]=30000,S=0 → {Nov:0,Dec:88000,Jan:1000},same R fundedDec,F[Dec]=58000,F[Jan]=1000,sum(F)=59000. January cash and earmarks remain untouched; any edit expands the reviewed dependency set. No unknown income or bank debit is inferred.

Required proposal fields: `id`, owner/account, `created_at`, `target_period_id`, `source_period_ids`, `expected_aggregate_revision`, `base_allocation_revision_id`, `base_checkpoint_revision_id`, exact base/full proposed vectors, carried obligation/savings IDs + full before/after funding-state revision refs/amounts, source lineage refs, `payload_identity`, `status`, `confirmed_budget_update_id` nullable. Proposed funding states can be draft values until commit; committed transfer points to immutable resulting revisions. Amounts, deficits, existing target funds and last bank observation date are visible in the one-button review.

Also require `observation_mode` (ACTUAL_CHECK or REUSE_CONFIRMED), draft `new_observation` (date, optional actual instant, confirmed balance and observation identity; required iff ACTUAL_CHECK), `transition_mode` (CARRY, FRESH_START or DEFER; INCLUDE from the earlier draft is now explicitly CARRY), and exact affected-period/funding dependencies. There is no default A/B mode. FRESH_START uses the separate transition-decision manifest above, not a budget transfer row. A new checkpoint ID exists only at commit after actual-check confirmation. Base checkpoint is prior-state provenance, not a demand to reconfirm the old amount. The committed update links the actual new checkpoint, or explicitly reused anchor for a technical CARRY/DEFER action, plus one final vector; payload identity covers these choices. Do not choose mode by comparing amounts.

- Initial state PROPOSED; opening/editing/abandoning the draft changes no financial state. CARRY on valid confirmation becomes CONFIRMED and points to one committed update. FRESH_START instead confirms its own non-carry decision with preserved earmarks. DEFER may accompany an ordinary actual-check update: no transition/funding move is recorded, and a new proposal needs the newly committed base before later confirmation. A/R/S change only as explicitly confirmed in that ordinary update. Existing month amounts may remain identical only when their sum equals the new observed B; if B changed, user must review a valid complete vector without an automatic source sweep. Superseded proposals are STALE; cancelled proposals have no financial effect. These are audited control records; confirmed financial facts remain immutable.
- Transfer-only uses base observation C unchanged. For full source s to target t: A'[s]=0, A'[t]=A[t]+A[s], all other A unchanged. Move each source-funded obligation/saving once to t, preserving identity, origin, full outstanding/earmark and status. Existing target identities/amounts are retained once. Source free may be negative because of full reserves; carry full R/S and display resulting deficit, never trim reserves.
- Confirmed at Berlin day D, allocation/funding changes take effect at the reviewed position on D. Store before/after vectors, exact carried funding-state refs, source/target and transfer confirmation time. Record explicit source lineage: this is a transfer of the source's confirmed allocation, not proof of receipt/expense origin or individual fungible euros.
- Editing the draft's new balance before its first confirmation refreshes that draft's complete-vector proposal and requires final review; it is not an intervening committed update or a preliminary checkpoint. If a different update commits before confirmation, the old proposal becomes stale, including when that other real check has the same amount. Refresh against the new head/vector/earmarks. A new observation + complete vector + transfer is the main single-batch path; show old base and final vector without an intermediate allocation of the bank delta. In the 90000->84000 example, sum(A'-A)=-6000 belongs to the observed update, while transfer is an internal action and not a second -40000 debit. For transfer-only, sum(A'-A)=0.
- Delayed proposal remains valid only if its exact revision dependencies still match AND target is still the current Berlin month. Month change invalidates it even without an intervening write; refresh and review. Unrelated account write may conservatively stale it via aggregate revision.
- Lock account and proposal; check expected revision, base checkpoint/vector/funding revisions, target calendar and payload before commit. Confirming two proposals from the same base concurrently: one succeeds, the other is stale. Do not auto-rebase the second click or silently add new source amounts.
- UNIQUE(proposal_id) on committed transfer plus scoped request idempotency prevents double transfer. Same request/payload returns original result; same request/different payload rejects. A new request for an already confirmed proposal returns its existing committed result only if confirmation payload matches; otherwise rejects. Later newly allocated source cash needs a new proposal against its new revision; “already transferred” is not a permanent ban on that period.
- Transfer-only checkpoint ID/count/date and B do not change. A combined actual-check update creates exactly one real observation, even at unchanged B; its date/freshness comes from that check, never the carry event. Neither mode posts a bank movement. Paid changes included in either batch still require fresh bank affirmation and unchanged-balance warning under BR-02.

### Multiple old months: owner gate

Q-HB2-02 concerns simultaneous multiple-source CARRY proposal composition only. Reject unsupported A requests with OWNER_POLICY_REQUIRED and zero financial writes until separately approved; do not auto-select B. Explicit FRESH_START remains available after any number of missed months, preserving all full earmarks and history. Ordinary negative source F does not trigger this gate.

Negative A anywhere in a new complete vector instead rejects NEGATIVE_CASH_ALLOCATION even when the sum equals B. Former signed-source/target/untouched-negative exceptions are superseded, not pending choices. A negative real B/overdraft remains separately undecided, with no inferred credit capacity. Historical negative A examples exist only in archived documentation/Git, not user data; no migration/table/automatic conversion is introduced.

## Persistence boundary, security and invariants

Pure domain selection/validation accepts explicit dates, ordering manifests, facts and injected clock. Application use cases authorize and orchestrate preview/confirm; repository adapters implement immutable storage, account/period locks and atomic commits. No domain import changes are needed. Candidate PDF evidence remains outside the confirmed state.

All mutation types use UNIQUE(owner, account, request_id) and canonical typed payload identity, including dates, positions, scope, expected revisions and complete vectors. Authorize before returning an existing idempotent result; validate identity before stale checks so an authentic retry returns its original result after the head moves. Same id/different payload is a conflict. Unknown/foreign IDs reject without data leakage. Failed validation writes no financial rows, report head, committed request result or partial audit batch. No destructive history cascade.

1. Every new complete vector has A>=0 and sums to its own immutable checkpoint B>=0; historical sets are selected, never summed.
2. Current B is latest chronological observation, with explicitly resolved same-day order. An older fact cannot replace it by being recorded later.
3. Paid/cancelled/transfer/savings/detail actions do not debit B; fresh payment affirmation remains mandatory.
4. R sums full UNPAID reserveFull=true outstanding,including elected possible claims,even in deficit;unelected possible claims contribute0. sum(F)=B-sum(R)-sum(S);each identity/funding association counts once. R+S may exceed A/B without reserve trimming or automatic S reduction.
5. Transfer-only has zero net allocation delta; target preexisting cash survives once; bank observation freshness does not change.
6. Historical selection uses both H and K, full historical funding/status states and pinned ordering; later lifecycle cannot edit the snapshot.
7. Missing end balance is null, observed zero is zero. No invented daily balances, operations, month attribution or gross completeness.
8. Versions, immutable references, original snapshots and correction explanations survive every later change. Current report head changes only on explicit confirmed close/correction.
9. Concurrent/stale/repeated requests never partially apply or repeat transfer/close; amendments require reviewed current dependencies.
10. Expected income is excluded and actually funded future allocations stay separate; HB-003 owns final forecast/liquidity behavior.
11. FRESH_START requires explicit non-carry consent; all past actual allocations and free deficits survive in history and all active full unpaid/savings identities remain accounted for. No historical free deficit is automatically recharged as a liability. Missing months require no invented observations or intermediate transitions.

## Verification and approval boundary

Original independent review and acceptance of46 HB2 cases remain historical. The owner now confirms repeated independent review of D32..D35 and resolution of all four findings,and re-accepts the corrected contract;HB-002 is Done as documentation/scenarios. Current local evidence is in the correction-regression record,with earlier evidence retained separately. No runtime finance/DB/UI success is claimed.

The updated [HB2 scenarios](../../tests/scenarios/phase-01/hb-002-month-closing-and-corrections.md) retain history,ordering,atomicity and full funding; formerly signed active inputs now reject or use actual nonnegative cash. Current documentary verification is recorded with the correction regressions. Complex multiple-source A remains excluded; B stays available.
