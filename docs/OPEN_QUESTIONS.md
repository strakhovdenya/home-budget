# Remaining implementation-level questions (not blockers for planning)

Owner clarification 2026-11-01 resolves the primary product model; see [D21..D25](DECISIONS.md) and [Accepted ADR 0001](adr/0001-checkpoints-and-allocations.md). Do not reopen settled decisions as implementation assumptions.

## Resolved by owner clarification

- Ordinary input is actual balance/date plus the COMPLETE user-confirmed month distribution. No required purchases, income, categories, net-delta assignment or explanations; no user suspense.
- Primary equality is sum(month balances)=confirmed balance. Differences in month states are not inferred bank operations. Optional K/U reconciliation is separate.
- Calendar opens automatically; cash carryover is proposed at next open and applied only after one-button confirmation (option A). Obligations and savings persist with full earmarks/identity; no duplicated target cash or bank movement. Unchanged confirmed balance need not be re-entered for transfer alone.
- D26..D28 clarify the ordinary UX: a fresh real check, full distribution and carry/funding consent share one update. A real same-amount check is new; reuse is an explicit technical mode. No background financial work; untouched negative unrelated months are not carry errors. See [owner clarification](DECISIONS.md#hb-002-owner-ux-clarification--2026-11-01).
- D29..D31 resolves B FRESH_START: explicitly decline past positive/negative planning balances, confirm fresh B/full vector once even after several missed months, preserve history and all full unpaid/savings earmarks. Neither A CARRY nor B is default. No per-month carry/close chain is required. This option is approved product behavior, not a pending generalized-carry policy.
- No final-day observation required. Close may retain unknown actual end balance with incomplete bank data, last historical observation/date, known allocation/earmark states and immutable versions. A later transfer never erases old history.
- Neon is selected PostgreSQL provider. Fully paid outstanding may be zero. Domain/UI separation and prior HB-004/HB-015/HB-016 review gates remain in place.

## HB-001 approval register — unresolved, no business rule changed

This heading retains existing cross-document links. Product clarifications above ARE owner decisions; ADR 0001 is Accepted after owner-reported independent review. Only these decisions remain open:

| ID | Decision / contract needed | Options or scope, no automatic acceptance | Gate |
|---|---|---|---|
| Q-HB1-01 | Forecast/warning where planning budget exceeds physical liquidity | HB-003 must compare budget-based daily guideline plus separate liquidity warning versus a liquidity-aware capped guideline with planning displayed separately. Exact available-liquidity computation and warning behavior need approval; no preferred formula/cap is selected by ADR 0001. | HB-003 before edge-case implementation |
| Q-HB1-03 | MVP membership of recurring templates | Existing conflict remains: PRD/HB-020 P1 versus original M2 inclusion. A: P0 through HB-021 baseline with templates post-MVP; B: include templates, promote HB-020 and add HB-021 dependency. D13 behavior remains agreed. | Owner M2 scope signoff |
| Q-HB2-01 | Resolved by Accepted ADR 0002 | Owner reports independent review of ADR/all46 scenarios completed and approves historical ordering/cutoffs,immutable reports and explicit corrections. [Accepted ADR 0002](adr/0002-month-closing-and-corrections.md) is normative within its stated scope. | Resolved2026-11-01;runtime proof remains implementation work |
| Q-HB2-02 | Remaining detailed proposal semantics for A CARRY | Final signed/multiple-source carry proposal composition remains for review. B FRESH_START is now approved across missed months and must not be blocked by these A-only questions. Consent, history, full earmarks and no automatic A/B selection are fixed. | Before generalized A proposal implementation; not a B gate |

Q-HB1-02 (suspense and residual-source allocation policy) is RETIRED, not pending: full distribution without user suspense resolves it; PDF evidence cannot silently rewrite allocations. The former recommended `min(G,L)` cap is withdrawn; Q-HB1-01 stays open.

Other future setup work is not a current product ambiguity: verify current Auth.js identity/session handling and Neon provisioning/plan limits during implementation; keep Europe/Berlin semantics, revisit timezone change only if multi-user support is requested; templates require accept/edit/skip and deduplication already. Any NEW owner product decision must be recorded in [DECISIONS.md](DECISIONS.md) with scenario coverage before implementation.

## HB-002 review questions

The history contract is accepted after owner-reported independent review;only Q-HB2-02 complex A remains open. B FRESH_START,including signed past balances and missed months,is accepted and cannot be blocked by that exclusion. Ordinary carry/incomplete closing under ADR 0001 remain intact. No runtime behavior is implemented here.

| ID | Decision needed | Concrete options and consequences |
|---|---|---|
| Q-HB2-01 | Resolved;not an open gate | Accepted explicit same-day placement,historical/knowledge cuts,immutable versions and no-observation close with null cash/free. HB2-019/021/023/026/027/030 specify ordering/anchor conflicts. No fabricated time/balance or entry-time financial ordering. |
| Q-HB2-02a | Detailed multiple-source proposal under A CARRY | Source-selection and lineage/presentation for A remain reviewable choices. B FRESH_START already permits one full reset after several missed months, preserving full earmarks; never require serial confirmations through every skipped month. No automatic choice of A or B. |
| Q-HB2-02b | Detailed signed-source carry proposal under A | A's signed-carry composition remains for review. The former question whether a past planning deficit MUST survive actively is resolved: user may choose B,old deficit stays historical,not liability forgiveness. Example fresh B=80000 permits Oct/Nov0,Dec80000 under B,with full R/S retained. |
| Q-HB2-02c | Negative target within an A proposal | A's proposal may need signed-amount review;B instead confirms the new full vector against fresh B and preserves full earmarks. At fresh B=8000,B may confirm Nov0/Dec8000;this is not paying a debt. HB-003 liquidity behavior remains separate;unchanged unrelated negative future months remain valid under D28. |

Implementation boundary:reject complex A CARRY with several past months or affected negative allocations using OWNER_POLICY_REQUIRED and no financial writes until Q-HB2-02 is explicitly decided and covered by approved scenarios. No new algorithm is accepted. This restriction cannot block FRESH_START for old signs/count,nor an ordinary carry solely because an untouched unrelated month is negative. B still validates authorization,actual observation/full sum,preserved identities and revisions. B records explicit non-carry consent/lineage;it is never an automatic fallback. Invalid payloads reject without cancellation,reserve trimming or savings release.

A's remaining proposal detail must fit the ordinary actual-check update. Overall transition choice is already settled: A carry or B fresh start,neither default. B handles the entire missed interval in one preview/confirmation and preserves past signed states without inventing intervening observations. Scoped dependency validation and untouched Jan=-1000 rule still apply;explicitly edited months expand the affected set. Forecast/liquidity presentation remains HB-003. Evidence: [HB2-039..046](../tests/scenarios/phase-01/hb-002-month-closing-and-corrections.md), [owner decision D29..D31](DECISIONS.md#hb-002-fresh-start-owner-decision--2026-11-01).
