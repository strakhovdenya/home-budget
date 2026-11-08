# HB-019.2 — Saved financial history scenarios

**Status:** Planned / NOT EXECUTED. Sole owner: HB-019.2.
Sources: [plan](../../../docs/planning/hb-019-2-financial-history.md),
[D46–D49](../../../docs/DECISIONS.md#saved-financial-history-and-evidence-scope--2026-11-08),
[BR-01/05/08/10/11](../../../docs/BUSINESS_RULES.md), Accepted ADR0001–0003.
HBUX-001–036 remain exclusively HB-019.1; HB-021 integrates these contracts
without redefining their oracles. No execution bindings or receipts are added here.

## Shared precise synthetic fixture

All amounts are integer EUR cents; all dates/positions use Europe/Berlin.
Owner/account scopes are synthetic. In pure fixtures, Oct20 C0 has B80000,
V0={Oct:60000,Nov:20000}; ordinary unpaid O has outstanding/reserve20000 funded
Oct, retained saving S10000 funded Oct, so FOct30000 and FNov20000.
No Oct31 observation exists initially. K0 includes these confirmed facts and order.
After October ends, report v1 pins H=Oct31/K0: end UNKNOWN, last check Oct20/B80000,
Oct A60000/R20000/S10000/F30000. Its own commit receives a later sequence.
On Nov04 a separately confirmed FRESH_START creates C1 B100000,
V1={Nov:80000,Dec:20000}, moves O/S funding once to Nov, preserving identity,
origin and amounts: FNov50000, FDec20000. K1 includes the transition.
Let server asOfDate=Nov08; last check remains Nov04. Expected income is absent.
Each scenario starts from this fixture independently unless stated otherwise.
Runtime PG/browser fixtures use equivalent completed server-relative months,
without calendar/auth bypass. Capture exact source IDs, order and actual K values.
U/C=unit/component, P=isolated real PostgreSQL, B=browser, A=physical assistive tech.

## HBH-001 — All saved states beyond the latest ten

GIVEN the fixture and twelve additional explicitly confirmed Nov05–Nov08
same-balance redistribution revisions, each with complete V1, unchanged O/S,
valid confirmed positions and recorded sequences; no new bank checks are claimed.
WHEN page through current and October history, then return to the first page.
THEN every saved check/revision/transition is reachable exactly once in the
appropriate index, with links to before/after full states and preserved corrections.
Include retained legacy transition facts without requiring a HB-017 aggregate
review document. No ten-row truncation or invented empty months/checkpoints.
At the live anchor B100000/RNov20000/SNov10000/FNov50000 stay unchanged.
Proof P/C/B: compare independently enumerated source identities to all pages;
assert no financial/audit/receipt/head writes during reads.

## HBH-002 — As known then versus later corrected knowledge

GIVEN the fixture; a separately confirmed late Oct31 actual C2 B76000 with
V2={Oct:56000,Nov:20000}, O/S still historically funded Oct, is recorded after
C1 at K2 with valid historical placement. Current C1/V1 remain authoritative.
WHEN select HOct31/K0, then the same H at K2.
THEN first view retains Oct20/B80000, Oct A60000/R20000/S10000/F30000,
end UNKNOWN; corrected view selects Oct31/B76000, Oct A56000/R20000/S10000/
F26000, real observed end76000. Label the different knowledge cuts and dates.
No inferred income/expense from -4000 or current cash100000; no automatic v2.
Proof U/P/C/B: original revisions, newer current head and v1 bytes remain intact.

## HBH-003 — Immutable closing is a separate perspective

GIVEN HBH-002's independently prepared corrected fixture; explicitly confirm
report v2 from HOct31/K2 through the existing HB-019 workflow before browsing.
WHEN switch as-known/corrected/report v1/report v2 and reload the selected v1.
THEN v1 still says end UNKNOWN and Oct A60000/R20000/S10000/F30000; v2 has
observed76000/A56000/R20000/S10000/F26000 and its own reason/source/version.
Corrected-state selection alone publishes no report. The report default is the
latest accepted version only when no explicit version is selected. Current B100000
and V1 are secondary dated context, never substituted into either report.
Proof P/C/B: exact v1 bytes/source refs, explicit v2 predecessor and no browse writes.

## HBH-004 — Unknown, observed zero and gaps are distinct

GIVEN an independent Oct31 real check Cz B0 with complete all-zero cash vector,
ordinary unpaid O2000 and S1000 funded Oct: FOct=-3000; a report pins this state.
WHEN view its saved state/report, then independently view a month with no C/V
but known O2000/S1000, and the shared fixture's incomplete October v1.
THEN observed end0 is displayed as zero only in the first branch, retaining full
R/S and deficit3000. No-observation branch has unknown A/F/B/end with known R/S;
v1 has last-known80000 but unknown end. No interpolation across missing dates,
fabricated daily balances, zero spending claim or latest-B fallback.
Proof U/P/C/B: exact null/zero/source facts and no mutation in all branches.

## HBH-005 — Funding and lifecycle history do not repost cash

GIVEN the shared fixture and a later separately confirmed Nov06 payment update
C3 B80000,V3={Nov:60000,Dec:20000}, O PAID/RNov0, retained SNov10000,
FNov50000/FDec20000; payment affirmation and audit are present.
WHEN inspect Oct state, Nov transition and Nov payment in the three perspectives.
THEN O/S identity/origin persist, funding changes Oct→Nov once, O becomes PAID
only at the later confirmed position. October still has full R20000/S10000.
No second20000 bank debit, reserve duplication, automatic savings release,
future-income leakage or rewriting of v1. Allocation deltas are not operations;
future PDF detail cannot repost them. Proof U/P/C/B: full states and audit lineage.

## HBH-006 — Owned, bounded and stable historical reads

GIVEN shared fixture history and a pinned first-page H/K/order basis.
WHEN a later valid update commits between pages, then test a foreign account,
tampered continuation, expired continuation and source/work/wire overflow.
THEN valid continuation retains the original complete cut without missing or
duplicated entries; refresh explicitly selects a new cut. Invalid/foreign/expired
or oversized requests safely refuse, disclose no foreign data and never return
a misleading empty complete history or mix live titles with pinned states.
B/A/R/S, audits, receipts and report bytes remain unchanged by every read.
Proof P/U/C/B: independent connections, scoped exact identities and rollback/no-write checks.

## HBH-007 — Accessible current and past history without a write

GIVEN all three perspectives of HBH-002/003, unknown/zero branches of HBH-004
and a history longer than ten entries. WHEN browse with keyboard and pointer in
RU/DE/EN at320px, desktop and real200% zoom; verify physical screen-reader output.
THEN selected month/perspective, actual check date, effective/recorded provenance,
page progress, correction/version and unknown/zero labels are understandable.
Current money is distinctly dated; past views have no live daily forecast.
No financial data enters URLs/logs or persistent browser storage; navigation,
reload and Berlin month/DST boundaries perform no financial actions.
Proof C/B/A with P no-write checks; report browser and physical AT NOT EXECUTED
when unavailable, never substitute component success for those executions.
