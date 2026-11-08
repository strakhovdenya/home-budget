# HB-019.2 — Complete saved financial history

**Status:** Planned P0; owner scope approved 2026-11-08, implementation NOT authorized.
The owner reports independent ChatGPT approval of the documentation-audit plan;
this is not review or execution of the future history implementation.
**Depends on:** HB-010, HB-013, HB-014, HB-017, HB-018, HB-019, HB-019.1.
HB-020 independently follows HB-019.1; HB-021 requires both HB-019.2 and HB-020.
Sources: [D46–D49](../DECISIONS.md#saved-financial-history-and-evidence-scope--2026-11-08),
[BR-01/05/08/10/11](../BUSINESS_RULES.md), Accepted
[ADR0002](../adr/0002-month-closing-and-corrections.md),
[task](../TASKS.md#hb-0192--complete-saved-financial-history),
[scenarios](../../tests/scenarios/phase-01/hb-019-2-financial-history.md).

## Goal and boundaries

Provide user-accessible history of ALL saved bank checks and financial states in
current and past months, including revisions and explicit allocation/funding and
lifecycle changes. A latest-ten list is not complete history. Do not create a
daily bank ledger, infer unobserved spending or require closing before browsing.
Future allocations remain visible inside their confirmed complete vector; this
does not make a future bank observation. Current money remains separately dated.

HB-019.1 owns HBUX-001–036: update/transition interactions, historical input preview
and saved result, and correct presentation of already available month/report data.
HB-019.2 owns HBH-001–007 below: complete navigation and the three perspectives.
HB-019 retains closing/correction writes and immutable report readers. HB-020 owns
onboarding/recurrence. HB-021 reuses these contracts for integrated browser proof;
HB-022 owns additional comparisons, charts and analytical grouping, not basic history.

## Three explicitly labelled perspectives

| Perspective | Basis | Required distinction |
|---|---|---|
| As known then | Selected effective through-date/confirmed position H and pinned original account knowledge cut K | Preserve original facts/ordering visible at K, even when later corrected |
| With later corrections | Same H, explicitly identified later captured K | Resolve corrections at K before historical selection; never silently change a pinned view |
| As closed | Explicit immutable report version with its own H/K, source and selection versions | Latest accepted version defaults only in report context; explicit old-version selection persists |

H/K express confirmed information, not a claim that unknown bank cash was observed.
Show observation date/optional time precision, effective date/position, recorded
date, funding/origin and correction lineage with accessible user labels; technical
IDs need not dominate the screen. No live historical daily forecast.

## Proposed implementation slices, pending technical review

1. Inventory retained sources: C/V, ordering revisions, full obligation/savings
   revisions and evidence, transitions, HB-017 reviews and HB-019 snapshots.
   The existing budget-update history reader limits to ten and skips some legacy
   transitions without aggregate review; do not present it as a complete index.
2. Specify an authorized bounded read port and complete index/paging contract:
   one captured owner/account/H/K/order basis, stable continuation, no omissions
   or duplicate rows, explicit safe expiry/refresh and source/work/wire limits.
   Reuse existing selectors and evidence validators. No generic event endpoint.
3. Implement timeline/detail and perspective selection only after separate
   authorization; preserve scopes, immutable refs, unknowns and source completeness.
4. Prove the seven scenario contracts with unit/component, isolated PG and browser
   evidence. Record missing browser/physical AT checks as NOT EXECUTED.

No schema, library, new financial algorithm or public arbitrary-history API is
selected by this plan. A proven need for a new shared read contract, persistence
or import-boundary change requires a reviewed amendment before implementation.
Auth is checked for every list/detail/page/version read; no finance in URLs/logs
or persistent browser storage. Source loss/corruption or resource refusal is an
explicit error, not an empty complete history. No writes on navigation.

## Acceptance criteria

1. All saved checks and financial states are reachable across current/past months,
   including more than ten updates, legacy transition facts and retained revisions;
   paging is complete and consistent at its pinned knowledge cut.
2. The three perspectives explicitly identify their H/K or report version and
   preserve observed/effective/recorded ordering and correction provenance.
3. Unknown cash/end balances differ from observed zero; historical R/S/F and
   full vectors retain identity/funding, never infer flows or duplicate money.
4. Every read remains owned, bounded and read-only; later writes never change a
   selected immutable version or mix pages from different cuts.
5. RU/DE/EN, 320px/desktop/200% zoom, keyboard and screen-reader navigation explain
   the basis; PG and browser evidence are reported separately before HB-021 signoff.

## Remaining technical questions

[Q-HB192-01/02](../OPEN_QUESTIONS.md#history-implementation-questions--2026-11-08)
cover complete indexing/cursor admission and user selection of unambiguous H/K.
These are implementation design gates, not permission to reduce D46 MVP scope.
