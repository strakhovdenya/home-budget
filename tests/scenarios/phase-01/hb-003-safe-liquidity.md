# HB-003 — accepted all-period safe daily limit

**Status:** Accepted ADR0003 / HB-003 Done after owner-confirmed final independent review of D36..D39;all scenarios are specification oracles,not runtime results. [Formula and proof](../../../docs/adr/0003-daily-forecast-and-liquidity.md#accepted-all-period-protection-formula),[owner decision](../../../docs/DECISIONS.md#all-period-safe-main-daily-limit--2026-11-01). No runtime tests or financial writes are claimed.

All fixtures are synthetic integer EUR cents,one card,Europe/Berlin. Unless stated otherwise,asOf=2026-11-28,n3,observation/effective dateNov28,Nov=current,Dec=2026-12,Jan=2027-01. A is one complete nonnegative vector summing to B;unlisted A/R/S are0 only in that complete state. Ordinary UNPAID defaults isPossible=false/reserveFull=true. Possible claims contribute their full outstanding iff explicitly selected;PAID/CANCELLED contribute0. Retained S is never auto-released. Every result preserves all input arrays,identities,funding/due dates,checkpoint/report revisions and amounts. L/T/safe amounts are derived diagnostics,not bank observations or new reservations.

Accepted formula E=R+S,H=sum(max(A[p],E[p])) over noncurrent periods,T=E[current]+H,L=B-T,safe=max(0,L),main=floor(safe/n),remainder=safe mod n. Budget F=A[current]-E[current],budget=floor(max(0,F)/n) is secondary. Shortages:O=max(0,sum(R)-B),Eshort=max(0,sum(E)-B),Pshort=max(0,T-B). These overlap and must not be added. No due-date filtering,expected income or implicit previous-month funding.

## HBL-001 — owner-confirmed shortage example

GIVEN B10000,A={Nov:10000,Dec:0},R[Dec]20000,S0.
WHEN project safe funds.
THEN H/T20000,L=-10000,safe0,main0,r0;O/Eshort/Pshort10000. Budget F10000,budget3333,r1 remains secondary. Display obligation shortage100 EUR and safe available/main daily0. No automatic November expense,December funding move or reserve cut.

## HBL-002 — funded other-month reserve overlaps its cash

GIVEN B50000,A={Nov:40000,Dec:10000},R Nov30000/S Nov5000,R Dec2000/S Dec1000.
WHEN calculate.
THEN E Nov35000/Dec3000,H10000 (not13000),T45000,L/safe5000,main1666,r2. Budget F5000,budget1666/r2;all shortages0. Future allocated10000 and its included earmarks are protected once.

## HBL-003 — underfunded positive future allocation

GIVEN B20000,A={Nov:15000,Dec:5000},R[Dec]10000,S0.
WHEN calculate.
THEN H/T10000,L/safe10000,main3333,r1;budget F15000,budget5000/r0,budgetSafeGap5000,all shortages0. Protect10000,not15000 or5000;full reserve and future allocation unchanged.

## HBL-004 — shortage across two different future months

GIVEN B30000,A={Nov:15000,Dec:5000,Jan:10000},R Dec20000/Jan25000,S0.
WHEN calculate despite both later due dates.
THEN H/T45000,L=-15000,safe0,main0/r0,totalReserved45000,O/Eshort/Pshort15000. Budget F15000,budget5000/r0;each obligation counts once. Do not report summed local deficits30000 as aggregate physical shortage;period deficits15000+15000 coexist with current allocation15000.

## HBL-005 — combined reserves and savings over several periods

GIVEN B30000,A={Nov:10000,Dec:10000,Jan:10000},R Nov3000/Dec4000/Jan14000,S Nov2000/Dec1000/Jan1000.
WHEN calculate.
THEN E Nov5000/Dec5000/Jan15000,H25000,T30000,L/safe0,main0/r0. Total R21000,S4000,all shortages0;budget F5000,budget1666/r2,budgetSafeGap5000. Existing allocations still constrain discretionary funds even though B covers all25000 earmarks.

## HBL-006 — positive past allocation does not become current cash

GIVEN B10000,A={Oct:5000,Nov:5000},R=S=0,no transfer consent.
WHEN calculate.
THEN H/T5000,L/safe5000,main1666/r2,budget F5000/budget1666/r2,all shortages0. Opening/reading never silently transfers old5000.

## HBL-007 — distinguish protection shortage from obligation shortage

GIVEN B10000,A={Nov:2000,Dec:8000},R[Nov]5000,S0.
WHEN calculate.
THEN H8000,T13000,L=-3000,safe0,main0/r0;O0,Eshort0,Pshort3000,budget F=-3000/deficit3000/budget0. Warn about preserving other-month allocations plus reserves,not that obligations alone exceed bank cash or a new debt3000 exists.

## HBL-008 — possible claim included only by explicit full selection

GIVEN B10000,A={Nov:10000},possible UNPAID o20000 fundedDec,reserveFull=false,S0.
WHEN calculate,then separately explicitly elect full reservation in a new immutable revision.
THEN before:R0,H/T0,L/safe10000,main3333/r1,O/Eshort/Pshort0. After:R Dec20000,H/T20000,L=-10000,safe0,main0/r0,O/Eshort/Pshort10000. Same o identity,old revision remains unselected;no partial reserve or bank debit. Reading cannot elect reservation;terminal status never keeps an active reserve.

## HBL-009 — retained savings in current and future periods

GIVEN B20000,A={Nov:15000,Dec:5000},R0,S Nov2000/Dec8000.
WHEN calculate.
THEN E Nov2000/Dec8000,H8000,T10000,L/safe10000,main3333/r1. Budget F13000,budget4333/r1,budgetSafeGap3000,O/Eshort/Pshort0. S10000 remains unchanged;no automatic release or double protection of future5000.

## HBL-010 — savings exceed card without unpaid obligations

GIVEN B10000,A={Nov:10000},R0,S[Dec]15000.
WHEN calculate.
THEN H/T15000,L=-5000,safe0,main0/r0,O0,Eshort/Pshort5000,budget F10000/budget3333/r1. Warn about combined earmarks/protection rather than unpaid-obligation shortage. Retain S15000 fully;no free money or automatic S reduction.

## HBL-011 — partial/full payment never posts another bank debit

GIVEN B50000,A={Nov:40000,Dec:10000},o R[Dec]3000,S0;main13333/r1 from safe40000.
WHEN later Nov28 actual check B49000 with reviewed A={Nov:39000,Dec:10000} and explicit partial payment1000;then another real ordered check B47000,A={Nov:37000,Dec:10000},full payment2000.
THEN partial outstanding/R2000,H/T10000,L/safe39000,main13000/r0;full outstanding/R0,H/T10000,L/safe37000,main12333/r1. Bank stays49000 then47000,not48000/45000. New actual checks/order and paid events retain history;the read model adds no debit. Future cash10000 stays protected after reserve release.

## HBL-012 — cancellation and savings release are explicit actions

GIVEN B10000,A={Nov:10000},R[Dec]4000,S[Dec]2000,safe4000/main1333/r1.
WHEN explicitly cancel o without changing B/A,then explicitly release1000 of the saving in a separate reviewed action.
THEN cancellation R0,S2000,H/T2000,L/safe8000,main2666/r2;release R0,S1000,H/T1000,L/safe9000,main3000/r0. Bank10000 throughout;no payment expense,implicit release,identity replacement or report overwrite.

## HBL-013 — stale safe estimate never falls back to a larger budget

GIVEN Nov20 actual B10000,A={Nov:10000},R[Dec]6000,S0,readNov28.
WHEN calculate under confirmed D37 dated-display behavior.
THEN age8,H/T6000,L/safe4000,main1333/r1;secondary budget3333/r1. Display actual observationNov20,EARLIER_OBSERVATION/reminder and data-based estimate,not today's confirmed cash. D37 keeps the safe estimate visible;D38 requires no warning acknowledgment;D39 keeps the reminder at age8. Never display main3333 as fallback or fabricate a new check.

## HBL-014 — missing/negative/future data never fabricate safe cash

GIVEN NO_OBSERVATION,INCOMPLETE_STATE,or valid NEGATIVE_BANK_OBSERVATION B=-100 with no A.
WHEN forecastCurrentLiquidity validates.
THEN LIQUIDITY_UNAVAILABLE with corresponding NO_OBSERVATION/INCOMPLETE_STATE/OVERDRAFT_POLICY_REQUIRED,no numeric0 or credit. Separately valid B10000,A={Nov:4000,Dec:6000},R[Dec]3000 targetingDec gives NOT_CURRENT_PERIOD;Dec budget preview F3000,n31,q96/r24,not a physical safe-bank forecast.

## HBL-015 — exact one-cent floor and remainder

GIVEN Nov28 B1,A={Nov:1},R=S=0.
WHEN calculate Nov28 then Nov30 without a new actual observation/update.
THEN safe1 both times,Nov28 main0/r1 over3 days,Nov30 main1/r0 over1 day;B/A stay1,last checkNov28,count1. Later result is an older-data estimate,not proof no spending occurred;no rounding debit or daily synthetic checkpoint.

## HBL-016 — due date,funding period and bank debit remain distinct

GIVEN B10000,A={Nov:10000},reserved UNPAID o20000 fundedDec,dueDec15,actualBankDebitDate=null.
WHEN readNov28,then consider a separately confirmed due-date amendment toJan15 without changing funding/status/amount/reservation.
THEN both snapshots give H/T20000,L=-10000,safe0/main0,O10000;funding remainsDec,bankDebitDate remainsnull. Due-date history is retained;neither protection nor due-date editing creates November payment/expense or moves the obligation.

## HBL-017 — no hypothetical future receipt enters safe funds

GIVEN B10000,A={Nov:10000},R[Dec]20000,S0,an unreceived50000 expected receipt.
WHEN compute without a new actual bank checkpoint.
THEN B10000,T20000,L=-10000,safe0/main0,O10000. No expected-income addition,mandatory income/expense entry or explanatory operation can change this confirmed state. The actual-receipt path remains a separately confirmed checkpoint/full vector.

## HBL-018 — CARRY and FRESH_START are alternatives from one base

GIVEN original revisionr,C0 observedNov28/B10000,count1,A={Oct:5000,Nov:5000},o UNPAID R[Oct]5500,s S[Oct]500,currentNov28. T6000,L/safe4000,main1333/r1,Oct F=-1000;original identities/origins/reports are retained.
WHEN alternative A independently starts from r and user confirms requestqA:ordinary transfer-only A={Oct:0,Nov:10000},same o/s fundedNov.
THEN A-branch B10000,C0/count1/dateNov28 unchanged,R5500/S500,H0,T6000,L/safe4000,main1333/r1;one vector/funding update and consent,no bank debit. RetryqA returns that same result.
WHEN alternative B instead independently starts from the original r (not A's result),user actually checks B8000 and explicitly confirms requestqB:FRESH_START A={Oct:0,Nov:8000},same o/s fundedNov.
THEN B-branch C1/count2/dateNov28,B8000,R5500/S500,T6000,L/safe2000,main666/r2;one fresh checkpoint/vector/decision with distinct consent,no automatic release or historical-deficit subtraction. RetryqB creates no duplicate. Both alternatives preserve original o/s identity/history and original report bytes. They are separate scenario branches,not sequential actions in the same transition. If submitted competitively against r,only one commits;the other is stale and cannot silently consume the winner's result.

## HBL-019 — fresh real check keeps the main estimate visible

GIVEN actual Nov28 C0 B10000,A={Nov:10000},R[Dec]4000,S0,readNov28.
WHEN project using current Berlin date.
THEN age0,showReminder=false,T4000,L/safe6000,n3,main2000/r0;actual dateNov28,count1,no older-data notice. The estimate is based on this check,not a guarantee against later activity;viewing writes nothing.

## HBL-020 — six-day-old estimate remains visible without reminder

GIVEN Nov20 actual C0 B10000,A={Nov:10000},R[Dec]4000,S0,no later update.
WHEN readNov26.
THEN age6,showReminder=false,T4000,safe6000,n5,main1200/r0. Display last checkNov20,explicit older-data label and gentle Update balance action;do not hide the number or claim today's bank10000. C0/count1 and financial state remain unchanged.

## HBL-021 — reminder begins exactly on day seven

GIVEN HBL-020's original confirmed Nov20 state.
WHEN readNov27.
THEN age7,showReminder=true,REMINDER_DUE,safe6000,n4,main1500/r0. Continue showing older-data estimate/Nov20 date;no mandatory bank check,acknowledgment,push,operation or new checkpoint.

## HBL-022 — reminder persists on day eight and repeated visits

GIVEN the same original Nov20 state,without any subsequent check.
WHEN readNov28 twice.
THEN age8,showReminder=true,safe6000,n3,main2000/r0 on both reads. Keep older-data label and update action;no repeated confirmation,acknowledgment record,financial write or freshness reset.

## HBL-023 — informational overlapping warnings without duplicate amounts

GIVEN Nov20 actual B10000,A={Nov:10000},R[Dec]20000,S0,readNov28.
WHEN compute O/Eshort/Pshort10000 and budgetSafeGap10000,then open and reopen the view without acknowledging anything.
THEN safe0/main0,age8/reminder true. One financial coverage group shows100 EUR once with combined obligations/earmarks/protection meanings;budget-gap wording does not repeat that numeric shortage. Older-data/reminder is a provenance notice. No «Понятно»,blocking modal,view restriction or mutation;real financial changes still require explicit confirmation.
GIVEN separately B10000,A={Nov:8000,Dec:2000},R Nov9000/Dec3000,S Nov2000.
WHEN display O2000,Eshort4000,Pshort4000.
THEN group4000 once for its two meanings and separately qualify2000 for obligations alone,with «Эти суммы не складываются». Do not show a combined6000 shortage;current budget deficit3000 remains a different field,not an added warning amount.

## HBL-024 — real update after stale period refreshes provenance once

GIVEN original Nov20 B10000,A={Nov:10000},R[Dec]4000,S0,Nov28 stale read safe6000/main2000,age8.
WHEN user actually checks Nov28 B9000 and explicitly confirms full A={Nov:9000},same R4000,requestq against current revision.
THEN one new C1/count2,last checkNov28,age0,showReminder=false,safe5000,n3,main1666/r2;older-data/reminder notices no longer apply. C0/vector/history remain unchanged;net-1000 is not automatically an expense. Retrying q returns C1/count2;merely reading or dismissing a warning cannot create this observation.

## HBL-025 — spring DST uses civil dates for reminder and divisor

GIVEN actual Mar22 2026 B10000,A={Mar2026:10000},R[Apr2026]4000,S0,no later check.
WHEN readMar28,Mar29 andMar30 in Europe/Berlin.
THEN ages6/7/8,showReminder false/true/true,safe6000 throughout;remaining days4/3/2 give main1500/r0,2000/r0,3000/r0. Last bank date staysMar22,count1;all are visible old-data estimates. Mar29's23-hour day counts once. Example actual instants Mar22 11:00Z and Mar29 10:00Z are both local12:00 on their respective Berlin dates:calendar age7 despite167 elapsed hours. No age computation divides those elapsed hours by24.

## HBL-026 — autumn DST uses civil dates across the long day

GIVEN actual Oct18 2026 B10000,A={Oct2026:10000},R[Nov2026]4000,S0,no later check.
WHEN readOct24,Oct25 andOct26 in Europe/Berlin.
THEN ages6/7/8,showReminder false/true/true,safe6000;remaining days8/7/6 yield main750/r0,857/r1,1000/r0. Old-data dateOct18/count1 retained;no warning acknowledgment. Oct25's25-hour day counts once. Oct18 10:00Z and Oct25 11:00Z are local12:00 on their respective dates:age7 despite169 elapsed hours;no elapsed-day shortcut or duplicated budget day.

## HBL-027 — no valid confirmed snapshot means unavailable,not zero

GIVEN NO_OBSERVATION or a partially loaded/invalid unconfirmed draft,even if the UI has a remembered amount10000.
WHEN request a safe current forecast.
THEN NO_OBSERVATION/INCOMPLETE_STATE returns LIQUIDITY_UNAVAILABLE without numeric safe/main fields;malformed confirmed input returns its typed validation error. Do not turn missing facts into safe0/main0 or use the draft as confirmed data. Offer Update balance;there is no fake observation date,age0 or confirmation dialog just to view missing data. A genuine valid zero-funded state is separately a known0,not this absence case.

## HBL-028 — month change uses only already confirmed distribution

GIVEN actual Nov20 B10000,A={Nov:4000,Dec:6000},R[Nov]2000,S0,no subsequent check,transition consent or close.
WHEN Dec1 andDec2 website access resolve current Berlin month.
THEN R staysNov and A stays4000/6000;Dec H/T4000,L/safe6000. Dec1 age11,n31,main193/r17;Dec2 age12,n30,main200/r0. Display Nov20 bank date,older-data/reminder and month-review notices without blocking;checkpoint count1. No auto CARRY/FRESH_START,funding movement,operation or close. Separately a valid complete {Nov:10000} with no Dec allocation yields known Dec safe/main0 (all old cash protected),not automatic10000 eligibility or a missing-observation state.

## Final acceptance evidence — 2026-11-01

The owner confirms final independent review and acceptance of ADR0003/D36..D39;HB-003 Done,Q-HB1-01 resolved within scope. The three final editorial corrections are incorporated:HB3-010's accepted safe1666/r2,accepted-policy heading C01..C08 and F-003's real received1200 EUR inside confirmed B1230 EUR. Earlier drafts,corrections,reviews and local checks remain preserved below as history;no earlier mistake is retroactively validated.

- `node .tmp-hb003-accept-check.cjs` passed143 exact arithmetic/boolean assertions over15 accepted financial-state fixtures plus future-preview,deficit and full/zero selected-reserve checks. F-003 confirms sum123000 cents,Nov safe3000/main1000,Dec preview967/r23;HB3-010 confirms safe5000/main1666/r2 and secondary budget3333/r1. All A>=0,full R/S and source history remain intact.
- Repeated27000 bounded allocation/earmark states with351000 property assertions for equivalent formulas,bounds,coverage,integer remainder and monotonicity. Passed14 civil-age/reminder assertions and separate ICU/Intl Berlin DST/month-boundary checks. These are specification checks,not runtime finance tests.
- 171 scenario IDs checked unique/sequential:F18,HB1 20,HB2 46,HB3 43,HBA16,HBL28;all153 non-core cases retain GIVEN/WHEN/THEN and negative new-A fixtures reject. References/fences passed across32 Markdown files:134 local file targets,22 anchors,including renamed accepted-policy/formula headings. Static scan found no active assertion that safe-main policy is undecided or awaits owner selection;historical records remain clearly archived.
- Status checks passed:all3 ADRs Accepted,HB-001/002/003 Done,HB-004 Planned/not started. Architecture JSON parses with7 layers and Accepted ALL_PERIOD_MAX_V1;Q-HB1-01 resolved,other4 question IDs remain open. Bootstrap REQUIRED now includes ADR0003 and its3 scenario documents for later CI;Node equivalents passed22 required files/10 skill frontmatters. `.vscode/extensions.json` SHA256 remains `84055C05ECC09BEF488B9AD1BEAA4351F2A8196E8A827F65A4888A9E29D0FA80`.
- `git diff --check` and separate untracked-document whitespace checks passed. Python/Markdownlint/tsc remain unavailable;no Python-script,full Markdownlint,TypeScript compilation,hosted CI or domain/DB/UI runtime success claimed. Temporary edit/check scripts were removed after final verification. Independent review/acceptance is owner-reported,not an additional local reviewer run.

No app,migrations,dependencies,background tasks,commit,push or PR. Other future questions (recurring-template MVP membership,multi-source CARRY,overdraft allocation,historical-overspend feature) remain outside this completed specification. HB-003 is ready for a documentation commit/PR when separately authorized;none is created here.

## Archived formula-check evidence before final UX decisions

Executed locally2026-11-01 using `node .tmp-liquidity-check.cjs` (temporary checker removed after verification):

- 333 exact BigInt assertions passed over25 dated-state fixtures,including all numeric HBL states,payment/release sequences,the future-preview quotient/remainder and5 full/zero possible-claim contributions. This verifies written arithmetic,not a financial runtime API.
- 27000 bounded nonnegative allocation/earmark combinations passed351000 property assertions:13 per state for equivalent L derivations,safe/budget/cash bounds,full earmark coverage,shortage-case zero,quotient/remainder and non-increasing safe funds when any current/other earmark increases. Bounds tested:A in0..4 per each of3 periods,E in0..5 per period. This supports but does not replace the general algebraic proof or independent review;it does not prove arbitrary runtime implementation.
- 161 active scenario IDs checked unique and sequential:F18,HB1 20,HB2 46,HB3 43,HBA16,HBL18. All143 non-core cases have GIVEN/WHEN/THEN. C01..C08 now use option B's proposed formula rather than an undecided display choice. HBA-011/014 preserve corrected cash/negative-observation behavior with the updated result contract.
- Checked32 Markdown files,128 local file links,20 anchors and balanced backtick/tilde fences. JSON parses with7 unchanged layers,Accepted ADR0001/0002 and Done HB-001/002;ADR0003 Proposed/HB-003 Review/HB-004 Planned. Q-HB1-01 records product choice resolved/exact formula review Open;no further financial feature is approved. Node bootstrap equivalents passed18 required files and10 skill frontmatters.
- Berlin spring/autumn DST,UTC month boundary and leap/nonleap February checks passed. `.vscode/extensions.json` SHA256 still matches `84055C05ECC09BEF488B9AD1BEAA4351F2A8196E8A827F65A4888A9E29D0FA80`. `git diff --check` and separate untracked-document whitespace checks passed. Python/Markdownlint/tsc remain unavailable in PATH;no Python-script,full Markdownlint,TypeScript compilation,hosted CI or runtime/domain/DB/UI test result is claimed.

Product choice B is owner-confirmed;the exact max formula/DTO/warnings remain Proposed pending independent review. Earlier decision/review evidence is preserved as history. No application,dependencies,migrations,background tasks,automatic financial changes,commit,push or PR;no new local independent review claimed.

## Final specification checks after D37..D39 — 2026-11-01

The owner confirms D37 old-state display,D38 informational warnings and D39 Berlin civil-age>=7 reminder. HBL-018 now has two alternative requests from the same original revision,not a CARRY result reused as FRESH_START input. Its full requirement6000 is explicit R5500 plus S500 so both obligation and savings identities are exercised while the existing T/safe/quotient values remain unchanged. A and B branches have separate consent,retry/count assertions and stale competing-request protection.

- `node .tmp-hb003-final-check.cjs` passed389 exact BigInt assertions across29 financial-state fixtures and6 spring/autumn quotient/remainder pairs. Includes preserved max-protection formula,all shortages,old-data readouts,real update from10000 to9000,month change,and independent CARRY/FRESH_START results. No production financial function is implemented or tested.
- Passed30 civil-date/reminder/grouping assertions:14 age cases with age/threshold checks,and2 equal-amount grouping fixtures. Civil ordinals use Gregorian year/month/day arithmetic without dividing elapsed instants by24 hours. Explicit Berlin examples prove calendar age7 across167 spring hours and169 autumn hours;both reminders show. Zero acknowledgment/view-blocking requirements are checked in specification text,not a rendered UI.
- Repeated27000 bounded allocation/earmark combinations with351000 property assertions for equivalence,bounds,coverage,rounding and monotonicity. This supports the preserved general proof,not runtime correctness or a new product policy.
- 171 active IDs are unique/sequential:F18,HB1 20,HB2 46,HB3 43,HBA16,HBL28. All153 non-core scenarios have GIVEN/WHEN/THEN. Updated HB3-035 and old-data cases;added HBL-019..028 for the12 requested coverage topics together with existing HBL-013/014/018. Adjacent HBL-011 sequential partial/full payments and HBL-012 explicit cancellation/release are legitimate separate lifecycle actions,not alternate transition modes. HB2-043 already uses separate alternatives;HB2-044/045 retains explicit mode/stale-request rejection. No analogous sequential same-transition choice remains in those cases.
- Checked32 Markdown files,128 relative links,21 anchors,balanced fences;architecture JSON/7 unchanged layers;bootstrap equivalents18 required documents/10 skill frontmatters. Accepted ADR0001/0002,Done HB-001/002,Proposed ADR0003,Review HB-003 and Planned HB-004 gates passed. `.vscode/extensions.json` SHA256 remains `84055C05ECC09BEF488B9AD1BEAA4351F2A8196E8A827F65A4888A9E29D0FA80`.
- `git diff --check` and separate untracked-document whitespace checks passed. Python/python3/py,Markdownlint/markdownlint-cli2 and tsc remain unavailable in PATH;no Python-script,full Markdownlint,TypeScript compilation,hosted CI or runtime/domain/DB/UI success claimed. Temporary edit/check scripts were removed after verification. Git may warn about LF→CRLF/global ignore configuration;repository checks completed.

No owner product question remains blocking this HB-003 scope;only final independent review/acceptance remains. Other future features are excluded,not silently accepted. Earlier acceptance/verification history is retained above. No app,migrations,dependencies,background tasks,push system,financial mutations,commit,push or PR. ADR0003 remains Proposed and HB-003 Review for the final independent-review handoff.
