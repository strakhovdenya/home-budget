# ADR 0001 — Checkpoint-first balances and complete month allocations

**Status: Accepted** — owner approved the checkpoint-first model after independent review of revision 2 and HB1-001..020; final observation-date/statistics clarifications incorporated. HB-001 is Done as a documentation/scenario task.

**Date:** 2026-11-01. Revision 2 incorporates the owner's explicit requirement clarification. The product decisions below supersede conflicting assumptions in the first local draft. Acceptance follows owner-reported independent review and the local verification recorded in the scenario document; it does not accept the remaining HB-002/HB-003 contracts.

**References:** [Business rules](../BUSINESS_RULES.md), [decision log D21..D25](../DECISIONS.md), [HB1-001..HB1-020 scenarios](../../tests/scenarios/phase-01/hb-001-checkpoints-and-allocations.md).

## Context: the user confirms a state

The complete ordinary workflow is: check card in banking app → enter actual balance/date → confirm how the WHOLE balance is distributed among financial months → save. Purchases, income, categories and explanations are optional. Lack of bank details never blocks this workflow.

Example, all amounts in EUR cents: C0 B=80000, November=80000; C1 B=77000, November=75000, December=2000. Bank net D=-3000, allocation changes are -5000/+2000. Neither allocation change is automatically an expense/income, and the user need not allocate D separately.

Statistics must not label allocation deltas as actual spending or confirmed income without operation evidence. Missing operation detail means incomplete activity statistics, not confirmed zero spending; budget-state history and evidence-backed activity remain distinct.

## Alternatives and decision

| Model | Benefits | Limitations / outcome |
|---|---|---|
| Complete transaction ledger drives bank and budget | Familiar bookkeeping; gross reports | Requires missing details, contradicts authoritative irregular observations; reject as primary model |
| Checkpoints plus mandatory allocation of interval residual sources | Formal conservation of explained/unexplained flows | Forces allocation of a difference, complicates later gross decomposition; previous draft used this, now superseded |
| User-confirmed complete balance allocation snapshots with revisions; optional independent bank-detail reconciliation | Minimal user input; direct sum invariant; supports redistribution and incomplete history | Snapshot changes cannot prove income/expenses; reports must state this limit; **selected** |
| Full event-sourced double-entry framework | General transfers and replay | Unnecessary complexity for v1; retain append-only audit without adopting this framework |

## Primary model and exact equalities

A checkpoint is an immutable user-confirmed bank observation. An allocation revision is an immutable COMPLETE vector A[p] of signed month balances, anchored to a checkpoint revision. Each new checkpoint commits its complete vector atomically. One active head is selected for the account's current budget; historical checkpoint vectors remain available, never summed together.

```text
B = balance of the checkpoint anchoring the selected allocation revision
sum_p A[p] = B
D = B_new - B_old
sum_p (A_new[p] - A_old[p]) = D
```

Missing rows mean zero. No suspense month or unassigned user category exists. A draft may be incomplete while editing, but confirmation requires the exact sum, integer cents and explicit user approval of each month's final amount (one review/confirm action may approve the whole vector). A suggested vector is never committed automatically.

A same-balance redistribution creates a new complete allocation revision anchored to the existing checkpoint, not a fabricated new bank observation. A transfer-only confirmation reuses the already confirmed unchanged balance without requiring its re-entry. If the balance has changed, a new checkpoint and complete allocation vector can be saved in the same transaction. Paid status still requires a fresh balance affirmation and the unchanged-balance warning (BR-02); this is not bypassed by a transfer action.

All amounts are bounded integer EUR cents with checked range and exact integer arithmetic. Month/date semantics are Europe/Berlin; recorded timestamps are UTC. Domain is pure TypeScript with injected clock, independent of UI, network and persistence; existing shared-pure boundaries and Neon/Drizzle selection remain unchanged.

## Negative budgets, earmarks and optional operation funding

A[p] may be negative for an approved advance. With B=8000, November=9500 and December=-1500, the vector still sums to 8000; the advance does not create bank money. A later confirmed B=128000 can be distributed November=9500/December=118500. Do not subtract that advance again from the confirmed December amount.

```text
R[p] = sum of full outstanding active obligations funded by p
S[p] = voluntary savings assigned to p
F[p] = A[p] - R[p] - S[p]
sum_p F[p] = B - sum_p R[p] - sum_p S[p]
```

Earmarks are subsets of the allocated balance, not extra cash allocations. Each active obligation/saving contributes once. Reserve is 100% of unpaid outstanding even with insufficient funds; partial payment reduces outstanding, full payment permits zero outstanding. Paid/cancelled active reserve is zero. Cancellation is distinct from payment. Neither payment status, reserve creation/release nor savings release changes B.

A purchase may optionally have signed financing-detail rows split across months; their sum must equal the one described operation, e.g. -3500=-2000-1500. These rows are metadata, NOT primary A rows, and are never automatically applied to an already confirmed balance/vector. A user can approve a separate proposed full-vector edit together with the detail, without a second debit. Without optional detail, confirm the resulting vector directly; its differences are not proof of individual purchases.

## Current forecast: normal case versus unresolved liquidity edge

For an ordinary fully funded current month, eligible free derives from the confirmed current A minus its full reserves and savings; future A is excluded. Older-month cash contributes only after the user confirms a transfer into the current month. Already reflected advances are not subtracted a second time. Inclusive remaining days and floor integer division follow BR-04; future preview uses all days of its month.

The former draft's `E=min(G,L)` liquidity cap is withdrawn as a recommendation/acceptance oracle. Where a negative future month or other constraints make the current budget exceed physical liquidity, **HB-003 must present and obtain a decision**: (A) keep the budget-based guideline with a separate liquidity warning; (B) cap the spending guideline using a separately approved liquidity computation, showing planning and liquidity separately. Warning behavior, reserve coverage across periods and the final edge-case formula remain open. No numerical daily oracle for that edge is accepted in this ADR.

## Month opening and user-confirmed transfer — option A selected

Calendar opening is automatic; moving money is not. On next open, propose transfer of remaining completed-month allocations to the new month and let the user confirm with one button. Before confirmation, existing A stays unchanged and no old free money is silently added to the new forecast. Deferring confirmation must not erase the old allocation or release earmarks.

For the approved ordinary example, B=90000, A[Nov]=40000, A[Dec]=50000, Nov unpaid reserve=30000, S=0. Confirmation creates A'[Nov]=0, A'[Dec]=90000; the same obligation retains identity/origin, its 30000 full reserve follows funding into December, and December free=60000. Existing December money is retained once, not transferred again. Savings persist with their identities/amounts; transfer their funding association where applicable, not by recreating them.

If the latest bank check was Nov 28 and transfer is confirmed Dec 1 without a new check, last confirmed bank date remains Nov 28, checkpoint identity/count stay unchanged and no Dec 1 bank observation or trend point is created. Transfer confirmation is shown only as a budget action; it does not refresh bank-data freshness.

```text
transfer-only: B'=B; sum(A')=sum(A)=B
confirmed Nov->Dec transfer: delta A[Nov]=-40000, delta A[Dec]=+40000
sum(delta A)=0; sum(R')=sum(R); sum(S')=sum(S)
```

Store confirmation date/time, source/target month, before/after vector revisions, carried obligation/savings funding associations, unchanged bank anchor and audit metadata. A retry returns the same result. Reopening an already confirmed proposal cannot repeat it; later proposals must be based on the current revision. General proposals spanning multiple old/negative months and conflicts need HB-002/HB-003 specification, not an invented policy here.

## No required month-end checkpoint; honest historical reports

Suppose Nov 20: B=80000, A[Nov]=60000/A[Dec]=20000, R[Nov]=30000. Next observation is Dec 2: B=75000; user confirms the update and transfer, resulting A[Nov]=0/A[Dec]=75000, same R funded in Dec=30000, free Dec=45000. Do not require Nov 30 input. The net -5000 over Nov 20..Dec 2 cannot be assigned to November expenses without evidence.

Manual November close must work with either (1) a user-confirmed end-of-month observation or (2) incomplete bank data. In (2), store `end_balance_cents=null/unknown`, completeness flag, latest available observation at/before the historical cutoff with its actual date/revision, known historical allocation revision and its effective date, historical obligation/savings states, recorded cutoff and closure version. A Nov 20 balance is last known, never the Nov 30 balance; Dec 2 data is never relabelled Nov 30. A known closing-date observation still need not imply a complete transaction list.

A historical view uses the effective allocation/earmark revisions for that period and records what was known when the report was produced. Current active A[Nov]=0 after transfer does not erase November's earlier distribution. Reports may show later transfer lifecycle separately. Later historical observations, PDF evidence or corrections can produce a new reviewed close version; original v1 remains inspectable. HB-002 owns the full cutoff, ordering, backdated correction and closing-version contract.

| Time/period | Meaning |
|---|---|
| observed_date / optional observed_at | When the user actually checked bank balance |
| recorded_at | When this fact/change was entered in the app |
| financial period YYYY-MM | Month owning a budget allocation/funding association; not bank date |
| transfer_confirmed_at | Actual consent to budget transfer; never an inferred month-end observation |
| allocation effective date / revision | When that budget state applies, distinct from when recorded |
| closure recorded cutoff / version | Evidence and historical state used when the immutable report was created |
| occurred_date of optional bank operation | Actual bank activity date when known; not confirmation or funding date |

## Optional operations and later PDF reconciliation

Confirmed bank movements remain OPTIONAL explanatory records with stable identity, account, signed amount, optional bank date and evidence revisions. An optional interval read model may compute:

```text
D = B1 - B0
K = sum(distinct confirmed explanatory operations assigned to that interval)
U = D - K
K + U = D
```

U is only a derived signed unexplained net, not a financial source/entity that users must allocate. U=0 does not prove gross completeness (offsetting missing operations can cancel). Interval assignment must be unambiguous; otherwise evidence stays pending, without blocking budget confirmation.

PDF upload/parsing yields proposals. Approval links evidence to an existing operation or adds a distinct explanatory operation; recompute K/U only. B and all confirmed A remain unchanged unless the user separately approves a budget-state correction. File/row identity handles identical retries; movement-level matching handles overlapping PDFs and manual duplicates. Ambiguous equal payments need review. Partial explanation is allowed and not a budget error. Optional financing details cannot silently overwrite A, and parser data never becomes a fake checkpoint. Historical report revisions remain explicit.

## Revision, concurrency and storage boundary

Atomic budget update: validate owner/account + expected revision + request identity; save checkpoint if genuinely observed, full allocation revision, earmark changes and audit together. Reject a sum mismatch, fractional cents, overflow or unauthorized account with no partial write. For redistribution/transfer, save a revision against the existing observation. Stale conflicts require review of the new state. Same id/same payload is idempotent; same id/different payload is rejected. Views/caches may be rebuilt; historical records are retained.

Use immutable allocation-set revisions containing the complete vector, not mandatory source movement postings. Store references to checkpoint, predecessor revision, change kind, effective date, recorded time, actor and consent. A separate transfer event records internal budget action and funding associations; it is not a cash movement. Final SQL/locking choices await implementation tasks and HB-002, not this documentation change.

## What changed from the first local draft

- Removed mandatory opening/movement/residual allocation sources and source-ledger conservation as the primary model; replaced by complete checkpoint-anchored state vectors.
- Removed user suspense and residual allocation sets. Unexplained net survives only as optional reconciliation metadata.
- Reworked confirmed movements as optional evidence, with optional financing detail separate from active cash distribution.
- Kept allocation revisions, now COMPLETE state snapshots with explicit consent, not source decomposition/replacement.
- Replaced automatic carryover / implicit eligibility of old cash with confirmed transfer option A.
- Removed the recommended liquidity cap; HB-003 decides the remaining edge case.
- Added incomplete-data closing without a forced final-day checkpoint; HB-002 specifies implementation detail.
- Retained audit, idempotency, account authorization, exact cents, full earmarks, immutable reports and PDF deduplication.

## Invariants and review gates

1. Every confirmed allocation revision sums exactly to its anchoring bank balance; no user suspense exists.
2. Allocation changes need not be income/expenses; only optional evidence can describe gross activity.
3. Payment, transfer, redistribution and PDF detail cannot automatically debit the checkpoint balance.
4. Transfer changes total allocated cash by zero and retains each obligation/saving once; consent precedes active change.
5. Reserves equal full unpaid outstanding; earmarks are subtracted once; negative periods create no cash.
6. Future allocations do not automatically increase current budget; liquidity-edge forecast awaits HB-003.
7. Missing bank observations remain unknown; old report versions and actual observation dates survive all later changes.
8. Optional reconciliation preserves K+U=D and unique operation identity, independently of A.

Owner reports independent review of revision 2 and all 20 scenarios completed and approves this model. The final clarifications explicitly retain Nov 28 as last bank check after a Dec 1 transfer and prohibit actual-spending/income statistics inferred from allocation deltas without operation evidence. Local arithmetic and document checks passed; see the scenario verification record. HB-002 must detail closing/history, transfer lineage and ordering; HB-003 must finalize forecast and remaining liquidity edge. Acceptance is limited to this architecture/specification; no finance runtime tests are claimed.
