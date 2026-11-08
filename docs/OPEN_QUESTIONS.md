# Remaining implementation-level questions

## History implementation questions — 2026-11-08

All four product choices are **resolved by owner D46–D49**: complete MVP history,
HB-019.2 P0, three H/K/report perspectives, and a separate fingerprint stage.
[Decision](DECISIONS.md#saved-financial-history-and-evidence-scope--2026-11-08); [history plan](planning/hb-019-2-financial-history.md).
No implementation, schema or new financial algorithm is approved here.

| ID | Remaining technical design | Gate |
|---|---|---|
| Q-HB192-01 | Complete index of all saved C/V/lifecycle/funding facts, including legacy transitions; bounded consistent pagination/cursor expiry and resource admission | Reviewed HB-019.2 read contract before implementation; never silently truncate to latest ten |
| Q-HB192-02 | Accessible selection and display of valid original/later knowledge cuts and confirmed same-day positions under existing state(H,K) semantics | HB-019.2 screen/read-contract review; no invented dates/order or new selector policy |

D41–D42 makes intentional FRESH_START primary; no mode has an automatic domain
default. CARRY/DEFER remain additional explicit actions. D44 remains binding.
The dated HB-017 and earlier stages below retain their historical statuses;
[TASKS](TASKS.md) is the current delivery register. Their old no-runtime statements
are not current implementation claims. Multi-source CARRY/overdraft/historical
overspend remain outside approval. [Fingerprint plan](planning/finance-fingerprint-follow-up.md)
tracks D49; no context-hash refresh or receipt reuse is authorized in this stage.

## HB-017 planning review — 2026-11-03

**Resolved by owner on 2026-11-03.** The original questions are retained as history;
the dispositions below finalize HB-017 MVP scope, not new HB tasks.
See [accepted decisions](DECISIONS.md#hb-017-scope-decisions--2026-11-03).
See [HB-017 plan](planning/hb-017-update-budget.md) and
[scenarios](../tests/scenarios/phase-01/hb-017-update-budget.md).

| ID | Original question (history) | Accepted disposition — 2026-11-03 |
|---|---|---|
| Q-HB17-01 | Must one update support lifecycle edit/payment/release and funding transfer of the **same** obligation/saving? Current HB-013 excludes this compound; strict predecessor order and one new position per day prevent two dependent revisions at one position. | **Resolved — option A.** Lifecycle edits and funding transitions share one atomic update for disjoint identities only. Same-identity combination at one position receives typed refusal, zero partial financial writes and retained draft. No automatic split commits, fake positions/dates or weakened SQL/ordering. This is accepted MVP scope; same-identity compound support is not implemented or required. |
| Q-HB17-02 | Include auth diagnostic UX in HB-017 or approve a separate change set? | **Resolved — included in HB-017 as an isolated change set**, no new HB-ID, independent financial/auth test evidence. A01–A07 are mandatory. Safe RU/DE/EN diagnostics, no membership/existence oracle through messages/statuses/redirects/cookies; preserve fail-closed/OAuth/JWT/CSRF/ownership and test actual callback/session boundaries. |
| Q-HB17-03 | Is memory-only draft plus navigation guard sufficient, with explicit loss limits on reload/crash/full OAuth redirect? | **Resolved — memory-only.** Retain input on ordinary errors/conflicts and navigation within the mounted form; warn on unsaved changes. No financial localStorage/sessionStorage/IndexedDB/offline persistence or recovery promise after reload/crash/OAuth redirect. Unknown commit outcome uses original requestId and safe result checking, without automatic new financial action. |

Owner reports independent ChatGPT plan review **APPROVED**, Critical0/High0/Medium0.
Implementation still requires separate owner authorization; HB-017 remains Planned.
Existing accepted financial rules and all other questions below are unchanged.

Owner D32..D35 fixes actual-money allocations:A>=0,sum(A)=observed B>=0. Negative F=A-R-S from full obligations/savings remains valid. Expected income is excluded;an actual receipt can be allocated after a real checkpoint without a separate income operation. [Decision record](DECISIONS.md#actual-money-allocation-correction--2026-11-01). ADR0001/0002 are re-Accepted for corrected D32..D35 after owner-reported repeated independent review;original acceptance is historical. ADR0003 Accepted,HB-003 Done after owner-reported final independent review.

## Resolved by owner clarification

- Actual bank balance/date plus complete nonnegative distribution is sufficient;no mandatory purchases,income entries,categories,net explanation or suspense.
- Paid/reserve/savings/detail/transfer actions never auto-debit the observed bank balance. Full R/S persist even when F<0.
- Explicit nondefault CARRY/FRESH_START/DEFER;one fresh actual-check update after missed months;no invented end-month observations. History and report versions remain immutable.
- No app or real financial records exist;no legacy migration/repair subsystem is needed. Prior signed examples are archived documentation/rejection fixtures,not valid new input.

## HB-001 approval register — unresolved, no business rule changed

This historical heading is retained for existing links. D32..D35 changes the former signed-A rule; items marked Resolved, including Q-HB1-03 on 2026-11-04, are no longer open. Other listed items remain as shown.

| ID | Decision | Gate |
|---|---|---|
| Q-HB1-01 | Resolved:Accepted ADR0003 covers exact D36 safe-main formula and D37..D39 UX after owner-reported final independent review | HB-003 Done;runtime proof remains implementation work |
| Q-HB1-03 | **Resolved 2026-11-04, owner D45:** include HB-020 in MVP as P0; add first-run owned-account onboarding to confirmed recurring templates. Original P1-vs-MVP question is closed. | [D45](DECISIONS.md#hb-0191-budget-update-ux-and-hb-020-first-run-scope--2026-11-04); implementation still separately authorized |
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
