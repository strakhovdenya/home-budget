# HB-019.2 — Saved financial history scenarios

**Status:** HB-019.2 Review / awaiting Owner Acceptance. Specification and financial/U/C/P owner: HB-019.2; real-browser/AT execution owner: HB-021 (D54).
Sources: [plan](../../../docs/planning/hb-019-2-financial-history.md),
[D46–D49](../../../docs/DECISIONS.md#saved-financial-history-and-evidence-scope--2026-11-08),
[BR-01/05/08/10/11](../../../docs/BUSINESS_RULES.md), Accepted ADR0001–0003.
HBUX-001–036 remain exclusively HB-019.1; HB-021 integrates these contracts
without redefining their oracles. No execution bindings or receipts are added here.

**Dated owner clarification2026-11-09:**
[D50–D53](../../../docs/DECISIONS.md#hb-0192-mvp-boundary--owner-2026-11-09)
preserves every source and the numerical oracles below, while limiting new MVP
state selection to the existing **day H / proven K** precision. Existing confirmed
same-day order/IDs/timestamps remain evidence, not a newly reconstructed state at
every position. Exact generic intra-day before/after is HB-027 after release;
neither its existing-path option A nor separate-assembler option B is selected.
Do not extend readAt/assembleSnapshot for through-position or alter selectors/
formulas/selectionContractVersion. If even a required daily view is not provable,
record the exact blocker and ask the owner before coding; no partial PASS.
The per-case MVP/precision/deferred/tests sections below are the explicit revised
acceptance boundary, not a rewrite of the original D46–D48 decision history.
No HBH runtime binding/CI expansion through MVP; every applicable real proof is
still required and mapped in one main report. All future tests remain NOT EXECUTED.

## Execution ownership amendment — owner 2026-11-11 (D54)

[D54](../../../docs/DECISIONS.md#hb-0192-browser-verification-handoff--owner-2026-11-11)
transfers all outstanding **B/A** portions of HBH-001–007 to **HB-021**, to execute
and record before HB-021 acceptance. Scope: authenticated access/navigation;
current/past and original/later/immutable-v1/v2 views/reload; pagination/filter/
refresh/errors/basis/privacy/read-only browser flows; RU/DE/EN; 320px and desktop;
native 200% zoom; keyboard/focus/announcements; physical screen-reader output.
Every transferred check remains **NOT EXECUTED**, never PASS. The B/A assertions
below are retained unchanged as normative inputs to HB-021, not waived or replaced
with component tests. HB-019.2 keeps all financial/unit/component/isolated-PG
requirements and the numerical oracles below; current execution evidence is in
one [verification report](../../../docs/planning/hb-019-2-verification.md).
HB-019.2 is Review, not Done; owner acceptance is separate. D50–D53/ADRs and
Post-MVP HB-027 (A/B unselected) are unchanged. No new scenario IDs or gate bindings.

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
appropriate index, with typed source details, preserved corrections and links to
provable daily H/K states or existing verified saved reviews. Generic exact
before/after links for every same-day source are not promised in MVP (D50).
Include retained legacy transition facts without requiring a HB-017 aggregate
review document. No ten-row truncation or invented empty months/checkpoints.
At the live anchor B100000/RNov20000/SNov10000/FNov50000 stay unchanged.
Proof P/C/B: compare independently enumerated source identities to all pages;
assert no financial/audit/receipt/head writes during reads.

**MVP:** registry census equals all paged batch IDs/sequences; independent source
census covers legacy, report-only, lifecycle-only and superseded revisions. Missing
mandatory source keeps an explicit error entry, not a hidden batch.
**Current precision:** daily state is labelled “Through day H, as known at K”;
confirmed position/ordering is retained as source evidence.
**Deferred HB-027:** exact reconstructed intermediate before/after for every position.
**Real tests:** U/C normalization/navigation, isolated PG20/20/5 keyset census and
invalid-source cases, B old-state navigation; full amount/no-write oracles above.

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

**MVP:** the exact HOct31/K0 versus HOct31/K2 day amounts above, full provenance
and immutable/current-source assertions remain mandatory; corrections resolve at
K before H even when a correction moves beyond H.
**Current precision:** add same-day multiple positions/batch facts as evidence;
day view must explicitly say day/cut and must not say “after this event”. Original
K comes from verified retained source, not guessed wall-clock time.
**Deferred HB-027:** arbitrary same-day position-state selection/new assembler.
**Real tests:** U/P existing daily selection with exact oracles and same-day label
regression, C basis/date/precision controls, B original/later daily toggle; no new
through-position path. A failure of permitted daily selection is a blocker, not PASS.

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

**MVP:** both immutable versions and their actual H/K/source versions remain fully
selectable/validatable; daily corrected state is separate from publishing a report.
**Current precision:** reports retain existing proved precision; the new daily
state panel cannot infer an intermediate position snapshot from report values.
**Deferred HB-027:** comparing generic newly reconstructed intra-day states.
**Real tests:** isolated P exact original bytes/source digests and no-write checks;
C/B explicit v1/v2 and daily perspective selection, reload v1 by existing report
contract without silent latest-version substitution. No new report writes on browse.

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

**MVP:** every unknown/zero/negative-F oracle above and full R/S/identity evidence.
**Current precision:** observedDate/optional actual observedAt is not an invented
end-of-day balance or proof of all operations; day H/K is labelled separately.
**Deferred HB-027:** any additional exact intra-day reconstruction, not zero/unknown
correctness (which is mandatory now).
**Real tests:** U/P all three branches and retained dates, C/B RU/DE/EN null versus
zero/deficit labels, full no-write comparison. No today's-B fallback.

## HBH-005 — Funding and lifecycle history do not repost cash

GIVEN the shared fixture and a later separately confirmed Nov06 payment update
C3 B80000,V3={Nov:60000,Dec:20000}, O PAID/RNov0, retained SNov10000,
FNov50000/FDec20000; payment affirmation and audit are present.
WHEN inspect Oct state, Nov transition and Nov payment in the three perspectives.
THEN O/S identity/origin persist, funding changes Oct→Nov once, O becomes PAID
only at the later confirmed position in retained event evidence; selected states
use the declared day H/K. October still has full R20000/S10000.
No second20000 bank debit, reserve duplication, automatic savings release,
future-income leakage or rewriting of v1. Allocation deltas are not operations;
future PDF detail cannot repost them. Proof U/P/C/B: full states and audit lineage.

**MVP:** source evidence proves actual funding/payment order and unchanged
identities/origin; existing daily states retain the exact values above and full
October R/S, independent of later PAID state. No financial formula changes.
**Current precision:** same-day transitions/lifecycle events keep their actual
positions/timestamps/audits; their daily aggregate is not labelled “immediately
after each event”. Existing verified reviews can display only what their proof says.
**Deferred HB-027:** generic position-level intermediate reconstruction.
**Real tests:** U/P exact daily amounts, lineage and no duplicate cash/reserve;
C/B separate source chronology/day-state captions, including same-day evidence.

## HBH-006 — Owned, bounded and stable historical reads

GIVEN shared fixture history and a server-captured first-page K_index, filter,
owned retained registry anchor and selected daily H/K/order evidence.
WHEN a later valid update commits between pages, then test a foreign account,
invalid/mismatched K_index/lastSeq/filter/anchors and source/work/wire overflow.
THEN validated20-row keyset pages retain the original cut without missing or
duplicated entries; re-entry/explicit refresh selects a fresh cut and resets the
UI-only page stack. Invalid/foreign/inconsistent or oversized requests safely
refuse, disclose no foreign data and never return
a misleading empty complete history or mix live titles with pinned states.
B/A/R/S, audits, receipts and report bytes remain unchanged by every read.
Proof P/U/C/B: independent connections, scoped exact identities and rollback/no-write checks.

**MVP:** budget_updates-rooted20-row Previous/Next paging, fresh ownership and
retained-anchor/boundary validation per request; no signatures, encrypted cursor,
TTL, server history sessions/tables or new secrets. No arbitrary numeric K authority.
**Current precision:** daily H/K; unsigned page parameters are not credentials.
Server validates membership/adjacent page boundaries; UI compares the entire echoed
basis before combining pages. A whole valid replacement owned cut is a separate
validated read, not proof of a previous UI visit and never an append to the old cut.
**Deferred HB-027:** intra-day reconstruction only; authorization/isolation stays MVP.
**Real tests:** P independent-connection append versus original registry census,
invalid/foreign/range/filter/boundary substitutions, complete valid basis replacement
discarded by C/B, explicit re-entry and unchanged tables. Test invalid parameters
and refresh, not expired encrypted tokens. Existing resource bounds remain unchanged.

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

**MVP:** all stated locale/layout/zoom/keyboard/privacy/no-write proofs and honest
labels distinguishing original/later daily cuts from immutable report versions.
**Current precision:** no position-state picker; confirmed same-day source order
is visibly evidence, day panel does not claim “after this event”. Re-entry clears
page stack and captures new K; no expiry timer or sensitive persistent state.
**Deferred HB-027:** exact intra-day state navigation, not accessibility of current scope.
**Real tests:** C captions/focus/basis mismatch/error handling, real authenticated
B320px/desktop/native200% zoom in RU/DE/EN, A physical screen-reader output and
P no-write checks; missing B/A remains NOT EXECUTED with explicit acceptance status.
