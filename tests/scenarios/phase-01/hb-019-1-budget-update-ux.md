# HB-019.1 — product/finance acceptance scenarios (specification only)

**Status:** Planned; no execution, no evidence of passing tests. Synthetic cents;
Berlin calendar. [Owner D40–D45](../../../docs/DECISIONS.md#hb-0191-budget-update-ux-and-hb-020-first-run-scope--2026-11-04),
[plan](../../../docs/planning/hb-019-1-budget-update-ux.md), Accepted D36.
**Ownership clarification — 2026-11-08 (D47):** HBUX-001–036 belong solely to
HB-019.1: update/transition UX, historical input preview/saved result and existing
selected-month/report presentation. None is reassigned or duplicated. Complete
all-state browsing and three-perspective history are solely HB-019.2,
[HBH-001–007](hb-019-2-financial-history.md). HB-021 reuses contracts for integrated
browser verification. Primary explicit FRESH_START and secondary working
CARRY/DEFER retain all existing oracles, consent and no-default semantics.
This documentation adds no execution claim, test binding or receipt.

Use real isolated local PostgreSQL for integration, and user-event/browser for UI.

| ID | Scenario and action | Required oracle |
|---|---|---|
| HBUX-001 | Nov20 actual 100000 Nov A100000; Dec04 choose explicit FRESH_START actual 80000, final Nov0 Dec80000; no funding identities | One real Dec04 C, one full V, one FRESH_START decision; past history intact; Dec date is not Nov30 actual; no invented -20000 November expense |
| HBUX-002 | Nov-origin unpaid O20000 funded Nov before Dec04; choose FRESH_START with actual80000 | Same O identity/title/origin/due/outstanding, full R20000 funded Dec once; no payment, FDec60000 if S0; preview includes source and target |
| HBUX-003 | HBUX-002 with two new explicit savings laptop15000 and buffer15000 funded Dec | B80000,A Dec80000,RDec20000,SDec30000,FDec30000; sum(A)=B, no duplicate finance or automatic saving; D36 safeAvailable30000 when no other A/E |
| HBUX-004 | Same fixture but user opts to protect only S30000 vs S40000 | Free budget follows actual confirmed chosen S; no implicit attribution of "money left from November" |
| HBUX-005 | Existing Nov savings S15000 before FRESH_START | Preserve identity/amount/history, funding moved once to Dec; do not create another savings identity |
| HBUX-006 | Dec10 same-month actual check B60000, Nov-origin O20000 still UNPAID, S30000 | Ordinary update, Dec A60000; O unchanged, R20000,S30000,F10000; no transition selector when no unresolved past funding |
| HBUX-007 | After completed HBUX-002 transition, Dec10 real B60000 plus PAID O20000 | One later separate update, O PAID,R0, no second card debit; preserve S where present, all identities/revisions and history; bankStateAffirmed as required |
| HBUX-008 | User tries to combine Dec04 FRESH_START funding move O + PAID/PARTIAL_SETTLEMENT/CANCELLED O same identity | Typed SAME_IDENTITY_COMPOUND_NOT_SUPPORTED, draft retained, **zero** financial writes, audit, counters or receipt; no automatic split |
| HBUX-009 | User tries FRESH_START funding move S + AMEND/INCREASE/PARTIAL_RELEASE same savings identity | Same typed refusal, zero partial writes; follow-up separate explicitly confirmed edit supported |
| HBUX-010 | FRESH_START moving O1 while editing distinct O2 | Existing disjoint-identity atomic contract preserved; exact identity proof and coherent result |
| HBUX-011 | Dec01 CARRY using REUSE_CONFIRMED from Nov30, no new card check | Only supported single source cash/funding move, B and observedDate unchanged, history intact; dated stale disclosure |
| HBUX-012 | Dec04 CARRY with ACTUAL_CHECK and changed B | One new actual C with final complete V, full source identity move and existing target cash retained once; no intermediate vector or inferred income |
| HBUX-013 | Dec04 explicitly DEFER, fresh B80000 and Nov40000/Dec40000 | No funding transfer, A sums B, Nov old funding remains; D36 protects other-month allocation and earmarks; not treated as verified Nov30 cash |
| HBUX-014 | Change money within same current month and no past residual state | Plain update with no selection of FRESH_START/CARRY/DEFER; new actual check and full vector, no auto transfer |
| HBUX-015 | Old Nov funding remains unresolved although observedDate belongs Dec | UI requires an explicit reviewed disposition; normal update must not silently choose FRESH_START, CARRY or DEFER |
| HBUX-016 | New-month screen opens, user edits draft, navigates away | No financial mutations on load/open/cancel; draft retention within mounted provider only, no persisted browser finance storage |
| HBUX-017 | New-month FRESH_START would violate retained January allocation or stale revision/unknown funding ID | Typed safe refusal; no new bank checkpoint or partial financial writes, preserve exact source/current/future evidence |
| HBUX-018 | Two prior months with active allocations, user chooses FRESH_START actual | Clears both past A in single reviewed update, moves all active old funding once, preserves histories; multi-source CARRY remains separate OWNER_POLICY_REQUIRED gate |
| HBUX-019 | No bank check since Nov20; close November after Dec04 FRESH_START/CARRY | Historical report uses last Nov facts as-at H/K, month-end balance UNKNOWN and incomplete, current Dec allocations not miscast as November bank observation |
| HBUX-020 | Change O from UNPAID to PAID but actual B unchanged; user explicitly affirms new current observation | Required warning/acknowledgement; no implicit bank debit, R released only by event; cannot fake freshness with allocation-only update |
| HBUX-021 | R+S>B after old funding migration, e.g. B80000,R100000,S10000 | Keep entire R/S, show F negative, safeAvailable0; no cap, settlement, credit or automatic savings release |
| HBUX-022 | RU, DE, EN UI at 320px and desktop, keyboard/AT navigation | Understandable action names, before/after sums, debt origin vs current funding, explicit consents/confirm, no raw enum/JSON diff as primary content |
| HBUX-023 | Unauthorized account, stale expected revision, duplicate request/retry/unknown result | Ownership checked before replay; idempotent exact payload; reject cross-account; no double cash, funding identity or event |
| HBUX-024 | Actual B80000 but vector incomplete or includes negative amount, or expected future income | Reject unbalanced/negative/future unobserved cash before commit; no invented pending bucket |
| HBUX-025 | Calendar boundary Berlin DST/leap and month transition | Current period uses server Berlin date; actual instant/date separate from funding date; no mode auto-selection at midnight |

## Dashboard selected-month hierarchy — owner addition 2026-11-04

**HBUX-026–032: Planned / NOT EXECUTED.** Presentation acceptance only;
[plan section 1.1](../../../docs/planning/hb-019-1-budget-update-ux.md#11-dashboard-card-observation-vs-selected-month-budget).
All amounts below are synthetic integer EUR cents. C/V/O/S denote existing
confirmed observations/vectors/obligations/savings, not new writes by navigation.
Use server Berlin asOfDate=2026-11-04 unless explicitly stated. Keep all earlier
HBUX cases, financial invariants and immutable HB-019 versions unchanged.

| ID | GIVEN / WHEN | Required THEN / negative assertions |
|---|---|---|
| HBUX-026 | C observed 2026-11-04 B=100000; complete V={Nov:80000,Dec:20000}; full unpaid RNov=20000, SNov=10000; user views current November | Dated latest card 1000 EUR is primary balance metric; Nov A=80000,R=20000,S=10000,F=50000 remain separately labelled, existing D36 guidance unchanged. Never imply all B is November free cash; no reserve debit, new C/V or audit on view. Repeat with an older C and preserve true date/freshness notices rather than hiding the balance or inventing freshness. |
| HBUX-027 | Oct20 C0 B=80000,V0={Oct:60000,Nov:20000}, ROct=20000,SOct=10000; no Oct31 observation. Later Nov04 C1 B=100000,V1={Oct:0,Nov:80000,Dec:20000}, same O/S funded Nov after an explicit transfer. Select closed October with its existing immutable report pinned to C0/V0 | Selected accepted history is primary: Oct A=60000,R=20000,S=10000,F=30000, with version/historical basis. Any active-distribution context is secondary: Oct A=0,R=0,S=0,F=0 with current anchor, not a replacement report. No misleading "historical report unavailable" claim. Latest-card 1000 EUR / 04.11.2026 is secondary and explicitly not October's balance. Both lack actual Oct31 proof: show "Остаток на конец месяца неизвестен"; neither 80000,100000 nor their 20000 difference is an end balance/income/expense. No live past daily forecast, report overwrite or writes on selection. |
| HBUX-028 | Independent branch: real final-day Oct31 C0 B=0,V0 complete all-zero cash; unpaid ROct=2000,SOct=1000,FOct=-3000; report v1 pins that evidence. Later Nov04 C1 B=100000,V1={Nov:100000}, O/S retained. Select v1, then review an independently confirmed historical correction v2 | Historical budget values including full R/S and negative F are retained; end balance is observed **0**, not unknown or latest 100000. Show actual Oct31 check date/time precision; no claim of midnight. Multiple final-day checks use existing confirmed order; a non-final-day check alone never qualifies. v1 stays unchanged when v2/current B differ. End cash is distinct from F and budget, with no inferred zero payment or bank debit. |
| HBUX-029 | Independent empty-observation branch: no C or V, known full unpaid O=20000 and active S=10000 funded Oct. On Nov04 view October, then November | A/F/card/end amount remain unknown, not fabricated zero or sum(R/S). Known R=20000,S=10000 can be shown for October with their basis; unavailable/contradictory state stays explicit. No fallback to another month's values or client reconstruction. No writes, invented history or double-counted earmarks. |
| HBUX-030 | Same complete current fixture as HBUX-026; RDec=5000,SDec=3000; expected unreceived December income=50000. Select future December | Future selected budget is primary: A=20000,R=5000,S=3000,F=12000; existing future daily preview, if shown, is a full-month budget estimate, not guaranteed spending or bank cash. Latest card 100000 checked Nov04 is secondary, dated and explicitly not December's balance; future card/end balance is unknown. Expected income adds nothing to A/F, Nov guidance or B; no automatic carry, savings, C/V or audit. |
| HBUX-031 | Complete fixture HBUX-026; navigate Oct→Nov→Dec→Oct. Separate calendar branch: server instant 2026-11-30T23:30:00Z is Dec01 Berlin while device still says November; also exercise Berlin DST boundary Oct25 | Heading, primary section and secondary disclaimer follow selected month versus **server Berlin month**, not device or observation month. In the calendar branch Dec is CURRENT and Nov PAST; retained state/freshness is honestly dated. Switching modes does not mutate B/A/R/S/F, D36 results for the same asOfDate, requests/receipts, original v1 or historical refs. No automatic transition/close at midnight. |
| HBUX-032 | Render HBUX-026–030 in RU/DE/EN at 320px, desktop and 200% zoom; keyboard navigation and screen-reader check | Month+budget lead both visual and semantic reading order for PAST/FUTURE; CURRENT retains primary dated card. Date and non-attribution explanation are visible/readable adjacent to secondary card, not tooltip-only; no clipping/horizontal page overflow. Correct UTF-8 labels distinguish bank cash, budget F, unknown and observed zero. Keyboard focus/selected-month announcement remain clear after navigation; meaning does not depend on colour/font size. Actual browser and physical AT execution must be reported separately. |

Future implementation proof: component cases assert labels, source values,
reading order and absence of misleading primary-card treatment; real browser
checks assert visible hierarchy and responsive layout. Existing isolated-PG
history fixtures must prove end-date evidence, H/K/version selection and no
financial writes; mocked UI data alone cannot establish historical correctness.
No new financial computation or selection policy is approved by these cases.

### HBUX-028 correction regression — 2026-11-08

Unclosed-month branch, owned by HB-019.1: Oct31 actual C B=50000,
V={Oct:50000}, R=S=0; asOf Nov04, no later check, selected October.
The existing authoritative reader's selected checkpoint at H/K is sufficient
final-day evidence: show 50000 with its real Oct31 date, neither UNKNOWN nor a
disclaimer denying that observation. Repeat with B=0,V={Oct:0}: observed zero
remains known. This is a final-day observation, not proof of midnight or a closing
report. Active allocation remains labelled as such; no past daily guidance.

With only Oct20/Oct30 evidence, or with the reader selecting a later Nov01/Nov04
checkpoint, show UNKNOWN for October; no backwards attribution or historical
reconstruction from active A/F. Late corrections and same-day ordering use the
existing H/K selector, never array/recorded-order guesses. Pinning an earlier K
preserves its old result. Closed v1/v2 continue to use their immutable report
evidence regardless of the current checkpoint. Navigation causes no writes.
Unit/component proof covers RU/DE/EN, zero, February/leap day, 30/31-day months
and year rollover; isolated PG proves authoritative selection, H/K and no writes.
Full historical browsing remains solely HB-019.2.

**Evidence requirements:** Every integration fixture must name exact before/after
C/V/O/S/funding, H/K, audit/receipt and rollback assertions; test retention of
immutable v1 closing under later update and resource-bound errors. Unit/component
can mock only transport, not finance proofs. Codex must separately report real
executed test numbers and manual browser/AT NOT EXECUTED where applicable.

## Owner QA general UX additions — 2026-11-04

**HBUX-033–036: Planned / NOT EXECUTED.**
[HB19.1-UX-01–05 register](../../../docs/planning/hb-019-browser-qa-findings-2026-11-04.md).
HBUX-026–032 already cover selected-month cash attribution; HBUX-001–025 retain
transition/financial proof. HBUX-027 is clarified for closed-history priority,
not a change to its money, source semantics or prior test results (none claimed).

All new fixtures are synthetic exact EUR cents, Europe/Berlin. Future real
PG/browser uses completed server-relative months per HB19-R06, no calendar bypass;
fixed Oct/Nov 2026 remains a pure/owner-narrative example. U/C/P/B/A means
unit/component/isolated real PG/authenticated app browser/keyboard+physical AT.
Existing owner/account auth, int64 cents, H/K, rollback/replay/resource bounds and
version immutability remain necessary. No database/runtime changes in this task.

### HBUX-033 Overview and Months have distinct purposes

**Planned C/B/A; HB19.1-UX-01, reuse HBUX-026–032 and HB19-Q04.**
GIVEN Nov04 current C B100000,V={Nov:100000},R/S0, saved October v1 unknown
and explicitly confirmed v2 historical B/A/F90000,R/S0 (HB19 Q sequence).
WHEN visit Overview, THEN prioritize current card/check date, Update budget,
D36 safe daily limit and age notices. WHEN visit Months/October, THEN prioritize
selected accepted history, versions and closing/revision context; explicit
transition entry remains separate, no forced fresh bank check to close.
Closed v2 default/explicit v1 retain their meanings; active Oct0 is subordinate,
not a clone of Overview with unexplained conflicting numbers. Shared source
results are unchanged and correctly labelled. Repeat current/future view and
RU/DE/EN mobile/keyboard: logical page purpose remains clear. No finance/audit
writes on page or version navigation; persistence proof is HB19-Q04, not mocks.

### HBUX-034 Backdated proposal and current guideline are separate

**Planned U/C/P/B; HB19.1-UX-03, reuse HBUX-019/026 and HB19-Q02.**
GIVEN Nov04 Cn B100000,Vn={Nov:100000},R/S0, October accepted v1 unknown.
WHEN propose actual Oct31 Co B90000,Vo={Oct:90000} through existing update flow,
THEN primary proposed historical result states Oct31/900 EUR/October allocation;
separate secondary November section identifies Cn's Nov04 date and unchanged
current guideline from the same authoritative D36 calculation. Owner-reported
37,03 EUR is context, not a hardcoded universal expected value. Do not label
November safeDaily as the historical operation's cash/daily result.
After explicit confirmation, actual current head stays Cn/Vn in this valid
fixture, historical state(HOct31,Knew) selects Co/Vo and v1 becomes pending
correction without automatic v2. Independently assert complete source anchors,
audit and current-head parity in PG. Exact rules still permit other historical
commands to require current-state review; if anchors conflict, refuse safely,
never display a fabricated successful no-change promise. No inferred100 EUR
income/expense, fake daily bank balance, current forecast inflation or double debit.

### HBUX-035 One readable saved result and honest recovery

**Planned C/P/B/A; HB19.1-UX-04, reuse HBUX-023 and HB19-Q06.**
GIVEN HBUX-034 command, WHEN a real confirmed receipt and saved history load
successfully, THEN one human success identifies actual Oct31 check900 EUR and
October allocation, distinct from Nov04 current state. Repeated rendering of the
same UUID cannot look like two operations; IDs only optional technical context.
Date/amount/month must come from the verified result, not an unsaved edited form.
Independent saved-but-history-read-failed branch still says saved with explicit
reread, not resubmit as a new mutation. Independent unknown-COMMIT branch makes
no success/rollback assertion until original request status/retry resolves.
PG exact replay confirms one actual update/receipt/audit set, not two. This is
future regression proof, not a conclusion that the owner saw duplicate DB entries.
RU/DE/EN, screen-reader status/focus and small-screen wrapping remain clear.

### HBUX-036 Screen actions map to existing transition intent

**Planned C/B/A; HB19.1-UX-05, financial proof reused HBUX-001–025.**
GIVEN existing HBUX-002/006/008/009/011/013 fixtures with their exact B/A/R/S,
WHEN follow named actions, THEN ordinary same-month goes to one real full budget
update unless past funding requires disposition; FRESH_START explicitly requests
actual bank check/full vector/non-carry/funding review; secondary CARRY permits
ACTUAL or supported REUSE; DEFER leaves funding in place. No mode silently
preselected. For same moving identity plus payment/savings edit, show existing
typed refusal and explain transition first, separately confirmed lifecycle later;
retain draft under current memory rules. No hidden second commit, fake bank
affirmation, default savings, obligation forgiveness or invented cash flow.
Independent different-identity path stays supported. Clearly distinguish closing
and reread navigation from these financial actions; page access alone writes
nothing. Reuse existing PG assertions for atomicity/auth/rollback rather than
claiming component navigation proves financial correctness.
