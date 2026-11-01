# HB-003 — actual-money allocation correction scenarios

**Status:** Corrected D32..D35 contract and four review fixes re-accepted by the owner after owner-reported repeated independent review,2026-11-01. Original analysis/verification history is preserved below. Ordinary A>=0,sum(A)=B>=0;R/S may exceed cash and F may be negative. HB-001/002 Done;ADR0001/0002 Accepted. HB-003 Done,ADR0003 Accepted,Q-HB1-01 resolved for D36..D39,overdraft allocation and historical-overspend features unapproved. All fixture money is integer EUR cents;calendar Europe/Berlin. No runtime tests or new local independent review are claimed.

## HBA-001 — matching sum does not validate negative cash

GIVEN Nov28 B10000,draft A={Nov:15000,Dec:-5000},R=S=0.
WHEN validate a new actual-money distribution.
THEN NEGATIVE_CASH_ALLOCATION despite sum10000;no committed vector,forecast or liquidity cap offered as a repair. Existing checkpoint/history are not changed by validation.

## HBA-002 — negative free remains valid

GIVEN Nov28 actual B10000,confirmed A={Nov:10000},R[Nov]=20000,S0.
WHEN calculate.
THEN F=-10000,deficit10000,n3,q0,r0;reserve20000 and bank10000 retained. No partial reservation,automatic payment or savings release.

## HBA-003 — existing cash may fund future months

GIVEN Nov28 actual B10000,A={Nov:5000,Dec:5000},R=S=0.
WHEN read current/future estimates.
THEN Nov F5000,n3,q1666,r2;Dec F5000,n31,q161,r9;no expected income needed or current credit from future allocation.

## HBA-004 — unreceived income has no cash effect

GIVEN Nov28 B10000,A={Nov:10000},R=S=0 and an expectation of50000 inDecember.
WHEN expectation is described without a new actual observation.
THEN confirmed B remains10000,A unchanged,Nov F10000,q3333,r1,Dec allocated/free0,preview0;no income/checkpoint/allocation write inferred. No expected-income feature is implemented by this fixture.

## HBA-005 — actual receipt without required income operation

GIVEN HBA-004 confirmed state.
WHEN Nov29 actual check B60000 and user confirms A={Nov:10000,Dec:50000} with no operations/categories.
THEN sum60000,Nov F10000,n2,q5000,r0;Dec F50000,n31,q1612,r28. No extra50000 posting or claim that interval net proves gross income.

## HBA-006 — optional split funding does not require negative cash

GIVEN Nov28 B32000,A={Nov:2000,Dec:30000},R=S=0.
WHEN Nov29 actual B28500 and complete A={Nov:0,Dec:28500} confirmed;optional one payment-3500 described as Nov-2000/Dec-1500.
THEN bank28500,Nov F0,q0,Dec F28500,n31,q919,r11;detail sum-3500,not a second debit. All remaining-cash allocations nonnegative.

## HBA-007 — normal CARRY permits negative source free

GIVEN Nov28 B10000,A={Nov:10000},one o unpaid20000 fundedNov,S0.
WHEN Dec1 explicit transfer-only confirms A={Nov:0,Dec:10000},same o fundedDec.
THEN B10000,bank dateNov28,count1,R[Dec]20000,F[Dec]=-10000,deficit10000,q0 over31 days;no automatic bank debit or reserve release. New vector and funding history are retained once.

## HBA-008 — fresh start from valid past cash

GIVEN Nov20 B10000,A={Nov:10000},R=S=0,no December visit.
WHEN Jan5 real B8000 and explicit FRESH_START confirm A={Jan:8000}.
THEN F8000,n27,q296,r8;past active A0,prior vector preserved,count2,no fictitious December check or intermediate close. Net-2000 is not confirmed spending.

## HBA-009 — immutable actual-money revisions survive later update

GIVEN Nov20 B10000,A={Nov:4000,Dec:6000},R=S=0,an original historical snapshot with immutable source refs and bytes.
WHEN Jan5 explicit fresh actual B8000 and A={Jan:8000} confirmed under FRESH_START.
THEN original vector/snapshot bytes unchanged,old Nov4000/Dec6000 retained,Jan F8000,n27,q296,r8. No old allocation is added again,no historical free deficit becomes debt,no December check/end balance is invented. This tests ordinary immutable history,not migration of nonexistent signed user data.

## HBA-010 — fresh start preserves real obligations and savings

GIVEN HBA-008 past state plus unpaid o9000 fundedNov and saving s2000 fundedNov.
WHEN Jan5 actual B8000,FRESH_START confirms A={Jan:8000} with same full o/s fundedJan.
THEN R9000,S2000,F=-3000,deficit3000,n27,q0,r0;no cancellation/payment/release. Any separate requested lifecycle change requires its own visible event.

## HBA-011 — liquidity question survives without negative allocations

GIVEN Nov28 B10000,A={Nov:10000,Dec:0},R[Dec]=20000,S0.
WHEN calculate secondary base budget and accepted option-B all-period protection.
THEN current F10000,n3,q3333,r1,Dec F=-20000,deficit20000,global earmark shortage10000. Accepted H/T20000,L=-10000,safeAvailable0,main safe q0. Owner selected this safe-main behavior;the exact max formula is Accepted (SAFE_ESTIMATE) after owner-reported final independent review. No allocation invalidity or automatic priority among obligations follows.

## HBA-012 — no clipping or inferred overspend ledger

GIVEN new draft B10000,A={Nov:15000,Dec:-5000},no accepted vector or purchase/baseline evidence for this draft.
WHEN validation or a proposed repair merely clips Dec to0.
THEN original draft rejects NEGATIVE_CASH_ALLOCATION;clipped total15000 mismatches B by5000. No debt,reserve,expense or historical-overspend record is inferred. User may explicitly submit a valid new full vector;no auto-selection of replacement amounts.

## HBA-013 — reserves and savings carry fully despite negative free

GIVEN Nov28 B10000,A={Nov:10000},R[Nov]9000,S[Nov]2000,F=-1000.
WHEN Dec1 ordinary transfer-only explicitly confirms A={Dec:10000},same full identities fundedDec.
THEN bank10000,dateNov28,count1,R9000,S2000,F=-1000,deficit1000,daily0 over31 days;no partial reserve,savings release or duplicate debit.

## HBA-014 — overdraft is not automatically credit

GIVEN asOfNov28,scoped observation C observedNov28/B=-100,kind=NEGATIVE_BANK_OBSERVATION,with no allocations,allocationRevisionId,anchorCheckpointRevisionId or allocationEffectiveDate.
WHEN forecastBudget or forecastCurrentLiquidity validates this branch.
THEN UNAVAILABLE/OVERDRAFT_POLICY_REQUIRED or LIQUIDITY_UNAVAILABLE/OVERDRAFT_POLICY_REQUIRED respectively;no sum check or A/F/deficit/daily/cap is produced. C retains balance-100,dateNov28,revision and identity;no credit or bank0 is invented.
WHEN raw input instead supplies ACTIVE_COMPLETE with B=-100,or negative-observation kind with B0,THEN INVALID_OBSERVATION_KIND. WHEN negative branch includes even allocations=[],THEN INVALID_STATE_SHAPE;omitting A entirely is valid. WHEN C is observedNov29 with asOfNov28,THEN STATE_AFTER_AS_OF. None of these validation/read calls writes or changes financial/history data;no overdraft product policy is selected.

## HBA-015 — historical free deficit is not charged twice

GIVEN Nov20 B10000,A={Nov:4000,Dec:6000},o unpaid5000 fundedNov,S0;historical Nov F=-1000.
WHEN Jan5 actual B8000,FRESH_START confirms A={Jan:8000},same o R5000 fundedJan.
THEN Jan F3000,n27,q111,r3,deficit0;not F2000 from subtracting old deficit again. Original Nov A4000/R5000/F-1000 remains in retained history,with no inferred income/expense.

## HBA-016 — possible claim reservation is explicit and all-or-none

GIVEN Nov28 B10000,A={Nov:10000},S0,one claim o revisionv0,statusUNPAID,isPossible=true,outstanding/original20000,fundedNov,reserveFull=false.
WHEN calculate without any reservation decision.
THEN o contributes0,R0,F10000,deficit0,n3,q3333,r1;possible/pending alone never reserves automatically.
WHEN user explicitly elects full reservation,creating v1 for the same o with reserveFull=true and otherwise unchanged state.
THEN R20000,F=-10000,deficit10000,q0/r0;B/A stay10000. History at v0 still has reserveFull=false,R0;v1 retains full20000. No partial amount,bank debit,identity replacement or automatic S change. Ordinary unpaid isPossible=false/reserveFull=false rejects INVALID_EARMARK;PAID/CANCELLED with reserveFull=true also rejects. Later CARRY/FRESH_START funding updates preserve each claim's selected flag and prior versions rather than automatically electing an unreserved claim.

## Archived earlier documentary evidence

This record describes the earlier proposal before authorization to edit Accepted ADRs. Its unchanged-file claims/counts are historical,not current validation.

## Verification evidence

Executed locally2026-11-01 using a PowerShell here-string piped to `node` (no checker file or runtime implementation added):

- 49 exact BigInt/boolean assertions passed:9 quotient/remainder fixtures with3 assertions each,10 full-vector sums,4 signed-free identities,4 clipping/detail/liquidity identities and4 negative-allocation detections. Conservation of an invalid signed vector was checked deliberately:passing its sum does not establish validity.
- 12 unique sequential HBA IDs each include GIVEN/WHEN/THEN. Checked45 local file links and8 anchors across the6 new/annotated documents,balanced code fences,new-file unique headings/table widths/trailing whitespace,and unchanged Proposed/Review status gates.
- `git diff --exit-code --` for Accepted ADR0001/0002,BUSINESS_RULES,DECISIONS,core-rules and HB1/HB2 scenario files returned0:these protected source/acceptance texts are unchanged. Header notices on ADR0003 and its scenario draft retain the prior body and earlier verification record.
- `git diff --check` passed;both new documents passed separate `git diff --no-index --check -- NUL <path>` checks without whitespace diagnostics. Git emitted expected LF→CRLF notices. Git history/source inspection supports the provenance table in the amendment;it does not establish access to the original interview.

No runtime/domain/DB/UI tests,Python-script execution,Markdownlint pass or independent review claimed. No dependencies,migrations,commit,push or PR. Accepted ADR0001/0002 and original HB1/HB2 scenarios remain unchanged;ADR0003 stays Proposed,HB-003 Review. Earlier HB-003 arithmetic evidence remains historical evidence for the earlier draft,not validation against the corrected cash requirement.

## Previous amendment verification — before four review fixes

Executed locally2026-11-01 with Node v22.23.0,after owner authorization to amend all affected documents:

- `node .tmp-doc-check.cjs` passed471 exact BigInt/boolean assertions:62 valid full-vector fixtures (sum/nonnegativity),55 quotient/remainder fixtures,56 free/deficit fixtures,6 unapproved candidate rows,4 matching-sum invalid signed vectors and8 delta/detail/total identities. These check the current numeric examples,not an implemented finance API. Candidate calculations remain research outputs,not an accepted cap.
- All142 active scenario IDs are sequential and unique:F18,HB1 20,HB2 46,HB3 43,HBA15. All124 non-core scenarios include GIVEN/WHEN/THEN. All9 explicit negative-vector literals in active scenario bodies have NEGATIVE_CASH_ALLOCATION assertions. Old signed inputs remain only in rejection cases or clearly archived earlier text;new accepted cash fixtures are nonnegative.
- Checked31 Markdown files,121 relative file targets,17 heading anchors and balanced fences. Full repository text search/manual review covered negative/signed/advance wording,all three ADRs,source rules,PRD/model/UX,architecture metadata,task/workflow/planning and scenario sets. Archived DECISIONS/proposal/verification records are explicitly separated from current requirements.
- Architecture JSON parses as version3;all7 layer definitions/dependency rules are unchanged. Both ADR statuses are Amendment Review,original Accepted metadata retained;expected income is not distributable,negative free remains allowed,default transition is null. HB-001/002/003 are Review;ADR0003 Proposed. Node bootstrap equivalents passed18 required documents and10 skill frontmatters.
- ICU/Intl checks passed Berlin2026 spring missing hour/autumn repeated hour,UTC Nov30 23:30 becoming Dec1,2026/2028 February lengths and inclusive calendar day counts. No system-clock-derived money calculation or synthetic bank observation was introduced.
- `python3 scripts/check_agent_docs.py` could not launch because python3 is absent. Python/py,Markdownlint/markdownlint-cli2 and tsc were not found in PATH. No Python-script,full Markdownlint,TypeScript compilation or hosted-CI success is claimed.
- `git diff --check` and separate new-file whitespace checks passed. `.vscode/extensions.json` SHA256 remains `84055C05ECC09BEF488B9AD1BEAA4351F2A8196E8A827F65A4888A9E29D0FA80`;it was already untracked and is untouched. Git warns about LF→CRLF normalization and inaccessible global ignore configuration;repository diff/status checks completed.

Temporary editing/checking scripts were removed after final verification. No app,dependencies,migrations,background tasks,real data,commit,push or PR. No runtime/domain/DB/UI tests or renewed independent review performed. This is the handoff for independent review:owner-approved corrected requirement is documented,but amended contracts have not been re-Accepted. Historical completion evidence remains archived;Git history and immutable-report requirements are preserved.

## Four-review-findings recheck — 2026-11-01

Independent review of hb-003-review.patch was reported by the owner and confirmed the core D32..D35 correction,with four requested fixes. Those fixes now distinguish unfunded R/S requirements from actual A,possible-claim reservation selection,January-origin February previews,and negative bank observations without an allocation vector. No liquidity or overdraft policy is selected;another independent review is pending.

- `node .tmp-review-check.cjs` passed187 exact BigInt assertions:55 quotient/remainder fixtures (165 assertions),8 free/deficit fixtures (16 assertions),6 selected-reserve contributions. Includes R>A/B and S>A/B without trimming,and both February quotient/remainder sets.
- Passed32 additional documentary contract/calendar assertions:9 reservation truth-table rows,6 observation-kind/shape/date cases,January31→February28/29 chronology and DTO declarations. These checks exercise the written specification,not implemented domain functions or a TypeScript compiler. Ordinary unpaid cannot deselect reservation;possible unpaid contributes0 or full outstanding;terminal status cannot retain an active reserve.
- All143 current scenario IDs are unique/sequential:F18,HB1 20,HB2 46,HB3 43,HBA16. All125 non-core cases include GIVEN/WHEN/THEN;negative new-vector literals retain rejection assertions. Updated HB3-025/026,expanded HBA-014 and added HBA-016. Earlier completion and arithmetic evidence above is preserved as dated history.
- References/fences passed across31 Markdown files:121 relative targets,17 anchors. Architecture JSON,7 layers,18 bootstrap files,10 skill frontmatters and unchanged review-status gates passed. Berlin spring/autumn DST and UTC month-boundary checks passed;January-origin February snapshots retain real observation dates and stale notices. Repository text search found no remaining positive assertion that R/S must fit inside A in the active definitions.
- `git diff --check` and separate untracked-document whitespace checks passed. `.vscode/extensions.json` SHA256 still matches the preceding evidence. Python/python3/py,Markdownlint/markdownlint-cli2 and tsc are unavailable in PATH;no Python,full Markdownlint,TypeScript compilation,hosted CI or runtime test success is claimed.

The temporary checker was removed after final verification. Only the10 related definition/contract/scenario documents changed during this review-fix pass;other existing working-tree changes predate it. D32..D35,formulas,consent/history/CARRY/FRESH_START,original evidence and Q-HB1-01 remain intact. HB-001/002/003 Review,ADR0001/0002 Amendment Review,ADR0003 Proposed. No app,dependencies,migrations,commit,push or PR;handoff for repeated independent review.

## Owner re-acceptance record — 2026-11-01

The owner confirms repeated independent review and resolution of all four findings,and re-accepts corrected ADR0001/0002 under D32..D35. HB-001/002 are Done as documentation/scenarios. Pending-review/status statements in the previous dated evidence describe earlier stages only;they are preserved as history. HB-003 liquidity remains undecided. No runtime test success,commit,push or PR.

Local status-only recheck:PowerShell here-string piped to Node passed31 Markdown files,123 local file targets,19 anchors and balanced fences;Accepted/Done versus unchanged Proposed/Review/Open gates;DECISIONS consistency;architecture JSON/7 layers;bootstrap equivalents for18 required files/10 skill frontmatters;5 BigInt sanity assertions for full-reserve deficits,vector sum and January forecast. `.vscode/extensions.json` SHA256 remains unchanged. `git diff --check` and separate new-document whitespace checks passed. Python/Markdownlint remain unavailable;no Python-script,full Markdownlint,hosted CI or runtime test execution is claimed. Independent review completion is owner-reported,not a newly performed local review. No implementation work or new policy was added.
