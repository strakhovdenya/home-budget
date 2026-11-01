# Remaining implementation-level questions

Owner D32..D35 fixes actual-money allocations:A>=0,sum(A)=observed B>=0. Negative F=A-R-S from full obligations/savings remains valid. Expected income is excluded;an actual receipt can be allocated after a real checkpoint without a separate income operation. [Decision record](DECISIONS.md#actual-money-allocation-correction--2026-11-01). ADR0001/0002 are re-Accepted for corrected D32..D35 after owner-reported repeated independent review;original acceptance is historical. ADR0003 Accepted,HB-003 Done after owner-reported final independent review.

## Resolved by owner clarification

- Actual bank balance/date plus complete nonnegative distribution is sufficient;no mandatory purchases,income entries,categories,net explanation or suspense.
- Paid/reserve/savings/detail/transfer actions never auto-debit the observed bank balance. Full R/S persist even when F<0.
- Explicit nondefault CARRY/FRESH_START/DEFER;one fresh actual-check update after missed months;no invented end-month observations. History and report versions remain immutable.
- No app or real financial records exist;no legacy migration/repair subsystem is needed. Prior signed examples are archived documentation/rejection fixtures,not valid new input.

## HB-001 approval register — unresolved, no business rule changed

This historical heading is retained for existing links. D32..D35 changes the former signed-A rule;the following decisions remain open.

| ID | Decision | Gate |
|---|---|---|
| Q-HB1-01 | Resolved:Accepted ADR0003 covers exact D36 safe-main formula and D37..D39 UX after owner-reported final independent review | HB-003 Done;runtime proof remains implementation work |
| Q-HB1-03 | Recurring-template MVP membership:keep HB-020 P1 or explicitly promote into baseline | Owner M2 scope |
| Q-HB2-01 | Resolved by re-Accepted corrected ADR0002 and owner-reported repeated independent review | HB-002 Done;runtime proof remains later |
| Q-HB2-02 | Simultaneous multi-source CARRY proposal composition only | Before generalized A;not a FRESH_START gate |
| Q-HB3-02 | Real negative bank observations/overdraft scope;no credit capacity inferred | Before any B<0 allocation feature |
| Q-HB3-03 | Separate historical-overspend feature if desired:baseline,evidence,presentation,and any later planning effect | Before such a feature;no automatic debt/carry mechanism |

Q-HB1-02 suspense/residual-source policy remains retired. Negative new A is forbidden by owner clarification,not a new product choice. Signed-source/target carry questions are retired below.

## HB-003 owner decisions

[D36](DECISIONS.md#all-period-safe-main-daily-limit--2026-11-01) selects option B:main safe daily guidance protects all existing selected reserves/savings across all periods regardless of due date,and preserves money allocated to other months. The budget guideline can be secondary only. These scope/display decisions are settled;do not ask the owner to choose warning-only main guidance or a shorter protection horizon again.

[Accepted ADR0003](adr/0003-daily-forecast-and-liquidity.md) derives T=E[current]+sum(max(A[p],E[p])) over other periods,L=B-T,safeAvailable=max(0,L),mainDaily=safeAvailable div remainingDays. Owner confirms final independent review and acceptance of this exact formula/proof/DTO and [liquidity scenarios](../tests/scenarios/phase-01/hb-003-safe-liquidity.md);the final owner acceptance now includes the mathematics. At B10000,A Nov10000/Dec0,R Dec20000,obligation shortage10000 and main daily0 are owner-confirmed behavior.

[D37..D39](DECISIONS.md#hb-003-stale-data-and-informational-warnings--2026-11-01) resolves the final owner UX choices:display old valid-state safe estimates with true dates/old-data labels;warnings are informational,no acknowledgment/view blocking/repeated consent;reminder iff Berlin civil age>=7. Equal overlapping shortage amounts are grouped once with their meanings,different comparisons are not added. Financial actions retain explicit consent.

Q-HB1-01 is resolved within HB-003:the formula,proof,contract and scenarios are Accepted after owner-reported final independent review;HB-003 is Done. No owner product question remains within this completed scope. Multi-source CARRY,overdraft allocation and historical-overspend questions stay outside this scope. No new data/push/background infrastructure is needed;HB-004 not started.

## HB-002 review questions

| ID | Current disposition |
|---|---|
| Q-HB2-01 | Resolved:corrected contracts re-Accepted after owner-reported repeated independent review. Original acceptance and immutable reports/cutoffs are preserved. |
| Q-HB2-02a | Multiple-source CARRY composition remains open. Reject unsupported requests atomically with OWNER_POLICY_REQUIRED;never auto-select B. |
| Q-HB2-02b | RETIRED:negative source A is invalid new cash input,not an eligible future signed-carry policy. Negative source F alone does not block ordinary carry. |
| Q-HB2-02c | RETIRED:negative target/unrelated A is invalid anywhere in a new vector. It cannot be preserved as valid cash because it is outside the write set. |

FRESH_START remains explicit and available after several missed months,preserving every unpaid/savings identity and all historical revisions. New vectors must be nonnegative and sum to fresh actual B;no expected-income or historical-deficit posting. Invalid sums,authorization,stale revisions,omitted earmarks and negative A still reject without partial writes. [HB2 scenarios](../tests/scenarios/phase-01/hb-002-month-closing-and-corrections.md).
