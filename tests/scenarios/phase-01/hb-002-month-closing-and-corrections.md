# HB-002 — month closing and corrections (synthetic specification)

**Status:** Reviewed corrected specification under [Accepted ADR0002](../../../docs/adr/0002-month-closing-and-corrections.md). Owner confirms re-acceptance after repeated independent review of D32..D35 and all four fixes. Original acceptance/evidence remains archived;no runtime tests implied.

Requirements: BR-01/02/03/05/06/07/08/09/10/11. All money below is integer EUR cents, all dates Berlin in 2026 unless specified, account A synthetic. Nov/Dec/Jan mean 2026-11/2026-12/2027-01. Unlisted A/R/S are zero. Every checkpoint includes a confirmed complete vector. `F=A-R-S`; date-only observations have null observed_at. K is inclusive account recorded sequence; H is historical through-date. Financial snapshots and their exact source revision IDs remain accessible after each action. Rejected actions have no partial financial/audit/report writes. No forecast formula is added here.

Owner clarification D26..D28: HB2-031 is the primary ordinary month-transition path; HB2-032 confirms that a same-amount actual check is new. Existing transfer-only scenarios (including HB2-010/011/014/024/029) test an explicit technical mode, not a required separate user visit. A proposed same-balance reuse must never replace a real observation based only on equal amounts. No background financial work is assumed.

Owner D29..D31 adds explicit A CARRY / B FRESH_START with neither default. HB2-039..046 cover B after missed months;it is not blocked by earlier A-only multiple-source proposal questions. Earlier references to INCLUDE denote CARRY;DEFER remains distinct from resetting past balances. Historical evidence counts below are retained as dated revision records,not claims of current runtime coverage.

## HB2-001 — final-day observation, incomplete operation detail (BR-01/08)

GIVEN Nov30 C30 B=76000,V30={Nov:56000,Dec:20000},o unpaid/R[Nov]=30000,S=0, no operation entries; accepted as K=10.
WHEN Dec1 preview H=Nov30,K=10 and confirm close.
THEN v1 has end_checkpoint=C30,end_balance=76000,END_DATE_OBSERVED,NOT_PROVIDED; last date=Nov30,last balance=76000,V30,Nov A/R/S/F=56000/30000/0/26000. Actual observation precision remains DATE, not fabricated midnight. Current bank/vector/earmarks unchanged; no complete-gross-activity claim.

## HB2-002 — close with last observation older than month end (BR-01/08)

GIVEN Nov20 C20 B=80000,V20={Nov:60000,Dec:20000},o unpaid/R[Nov]=30000,S=0; no later bank observation.
WHEN Dec1 close November.
THEN v1 end_checkpoint=null,end_balance=null,INCOMPLETE,NOT_PROVIDED,last checkpoint=C20,date=Nov20,balance=80000,V20 effective Nov20,Nov A/R/S/F=60000/30000/0/30000. F is last-confirmed-state free, not observed Nov30 cash. No final-day input required; current state unchanged.

## HB2-003 — Nov20 to Dec2 combined observation and transfer (BR-01/02/05/08)

GIVEN HB2-002 input; no observations Nov21..Dec1.
WHEN Dec2 observe C2 B=75000 and explicitly confirm full V2={Nov:0,Dec:75000} with transfer of the same o to Dec.
THEN active B=75000,A={Nov:0,Dec:75000},R[Dec]=30000,S=0,F[Dec]=45000; old C20/V20/o state retained. Exactly one new checkpoint, one complete vector/update, one transfer; no invented intermediate vector dividing -5000 between months. D=-5000 is not November expense or confirmed gross spending.

## HB2-004 — transfer before November closing (BR-05/08)

GIVEN completed HB2-003 with current Nov A=0 and o funded Dec.
WHEN close November Dec2 at H=Nov30 and K including the transfer.
THEN v1 still selects C20/V20,Nov A/R/S/F=60000/30000/0/30000,end_balance=null,last date=Nov20; Dec2 position is beyond H. Current B/A/R/F remain 75000/{Dec:75000}/30000/45000. Do not select V2 or current funding for November.

## HB2-005 — transfer after November closing (BR-05/08)

GIVEN HB2-002 v1 closed Dec1; active C20/V20 and o funded Nov.
WHEN Dec2 perform HB2-003.
THEN v1 payload, manifest, cutoff, version and Nov A/R/F=60000/30000/30000 remain byte-for-byte unchanged. Active Dec A/R/F=75000/30000/45000. A separate later-lifecycle view may link the Dec2 transfer, with its own date; that view is not embedded retrospectively in v1.

## HB2-006 — original report and default head survive pending correction (BR-08/10)

GIVEN HB2-004 v1 and stored canonical snapshot bytes.
WHEN a new historical fact is accepted and a correction preview is prepared, then abandoned.
THEN v1 bytes and all immutable fields remain identical; latest confirmed report head remains v1, no v2/version number consumed. Only separately audited pending-correction control state may change; no current financial change is caused by preview.

## HB2-007 — late Nov30 checkpoint is historical, not current (BR-01/05/08)

GIVEN HB2-004 v1 and active Dec2 B=75000,V2={Dec:75000},o R[Dec]=30000.
WHEN Dec3 accept historical C30 B=76000,V30={Nov:56000,Dec:20000},effective Nov30, explicitly placed before Dec2.
THEN current checkpoint remains C2/B=75000 and current V2/R/F remain {Dec:75000}/30000/45000; C30/V30 stored, each vector sums to its own B. v1 still end_balance=null; offer correction. Account revision increases and stale previews invalidate. No bank observation is relabelled.

## HB2-008 — explicit corrected v2 (BR-08/10)

GIVEN HB2-007; old v1 cutoff excludes C30/V30; correction preview at new K includes them.
WHEN owner confirms reason "Added actual Nov30 check" and C30/V30 evidence refs against expected head v1.
THEN append v2,previous=v1,end_balance=76000,END_DATE_OBSERVED,last date=Nov30,Nov A/R/S/F=56000/30000/0/26000,NOT_PROVIDED. Diff: last-known bank 80000->76000,Nov allocation 60000->56000,F 30000->26000,end null->76000; none is automatically gross expense. v2 default, v1 explicitly selectable unchanged; current Dec B/A/R/F unchanged.

## HB2-009 — December pays November obligation (BR-02/03/06/08)

GIVEN Nov30 B=50000,A={Nov:50000},o original/outstanding/R[Nov]=10000,S=0; Dec1 confirmed transfer gives {Dec:50000},same o R[Dec]=10000.
WHEN Dec2 fresh B=40000,A={Dec:40000},o paid outstanding=0, then close November.
THEN current B=40000,R=0,F[Dec]=40000; no second -10000. November snapshot selects Nov30 A/R/F=50000/10000/40000,o UNPAID funded Nov. Optional actual bank_date=Dec2 and confirmed_at/recorded_at remain separate; paid Dec2 never means paid Nov30.

## HB2-010 — technical transfer-only preserves reserves and savings (BR-03/05/07)

GIVEN Nov28 C B=90000,A={Nov:40000,Dec:50000},o R[Nov]=30000,s S[Nov]=5000.
WHEN Dec1 confirm transfer-only.
THEN A'={Nov:0,Dec:90000},same o outstanding/R[Dec]=30000,same s S[Dec]=5000,F[Dec]=55000; sum(F)=90000-30000-5000=55000. Original periods unchanged; source/target funding revisions linked. No release/recreation/duplicate or debit. November close still A/R/S/F=40000/30000/5000/5000 using Nov28 state.

## HB2-011 — technical transfer-only creates no observation (BR-01/05)

GIVEN Nov28 only checkpoint C B=90000,A={Nov:40000,Dec:50000},R[Nov]=30000.
WHEN Dec1 confirm one-button transfer without another bank check.
THEN checkpoint ID/count stay C/1,last_bank_observed_date=Nov28,B=90000; A'={Dec:90000},R[Dec]=30000,F=60000. Consent is Dec1; one new allocation revision, no Dec1 bank dot, no freshness reset or inferred December income.

## HB2-012 — several same-day updates with confirmed order (BR-01/02/10)

GIVEN Nov30 date-only C1 B=50000,V1={Nov:50000},o R=10000 at confirmed position 1.
WHEN same-day redistribution V2={Nov:40000,Dec:10000} at position 2 reuses C1; then fresh C2 B=40000,V3={Nov:30000,Dec:10000},o paid/R=0 at confirmed position 3.
THEN Nov30 selection C2/V3,Nov A/R/S/F=30000/0/0/30000,end_balance=40000; complete sum=40000,bank not 30000 after a second debit. C1/V1/V2 remain. observed_at remains null; sequence/order was confirmed, exact check time was not invented.

## HB2-013 — historical payment entered later (BR-02/03/08)

GIVEN HB2-009 current Dec2 full paid state; v1 November closed while Nov30 o still recorded unpaid/R=10000.
WHEN Dec3 accept evidence-backed historical Nov30 partial payment=2000, with fresh historical Nov30 observation B=48000,V={Nov:48000},full o outstanding=8000 and remaining reserve=8000, explicitly placed after the original Nov30 check and before Dec2. Owner reviews consistency with later full paid state.
THEN new historical November candidate has A/R/F=48000/8000/40000; current Dec2 B/A=40000,R=0,F=40000 unchanged; do not subtract 2000 from later full state. v1 remains unpaid/R=10000 until explicit new report version. Historical payment has Nov30 effective date, Dec3 confirmation/recording, actual bank date only if supported.

## HB2-014 — repeated confirmation of one transfer (BR-05/10)

GIVEN HB2-011 proposal P at base revision r and confirmation request q/payload x already succeeded as update U.
WHEN retry q/x after the account head changed, then submit another request q2 with identical confirmation payload for P.
THEN both return original U after authorization; only one transfer/new allocation revision exists,bank=90000,A={Dec:90000},R=30000,F=60000. q/different payload rejects REQUEST_PAYLOAD_CONFLICT; P with altered payload rejects PROPOSAL_ALREADY_CONFIRMED. No second credit.

## HB2-015 — stale proposal after changed balance/distribution (BR-02/05/10)

GIVEN P based on B=90000,A={Nov:40000,Dec:50000},R[Nov]=30000.
WHEN before confirmation a new B=85000,A={Nov:35000,Dec:50000} commits, then confirm old P.
THEN STALE_PROPOSAL, no transfer, active A/R unchanged. After refreshed explicit review P2 may commit {Dec:85000},R[Dec]=30000,F=55000. Old P cannot be silently rebased; both observations/vectors retained.

## HB2-016 — two old unclosed periods (BR-05/08/10)

GIVEN Dec1 B=90000,A={Oct:10000,Nov:30000,Dec:50000},R[Oct]=5000,R[Nov]=10000,S=0; neither old month closed.
WHEN request generalized combined carry while Q-HB2-02 is unresolved, and separately preview month closes using their own historical cuts.
THEN that unresolved A proposal is held with OWNER_POLICY_REQUIRED and zero financial writes;active F={Oct:5000,Nov:20000,Dec:50000},sum(F)=75000. This does not block B:with an actual Dec1 check of90000 and explicit FRESH_START,user may confirm {Oct:0,Nov:0,Dec:90000},same obligations R[Dec]=15000,F[Dec]=75000 in one update. Each close uses its own historical cut,not a Dec1 observation relabelled earlier. Auto-open alone moves nothing;serial per-month confirmations are not mandatory. Final A proposal composition remains pending.

## HB2-017 — negative new cash input rejects despite exact sum (BR-04/05)

GIVEN Dec2 current confirmed B8000,A={Dec:8000},R=S=0.
WHEN submit new complete draft {Dec:9500,Jan:-1500},or attempt to preserve that negative January outside a carry write set.
THEN NEGATIVE_CASH_ALLOCATION,no financial writes,active A/F={Dec:8000};new negative A is not an open signed-carry policy. Expected income cannot validate it. Negative F from full reserves remains valid separately.

## HB2-018 — later PDF detail does not repost cash or edit v1 (BR-08/09)

GIVEN HB2-004 original v1,active Dec B/A=75000,R=30000,F=45000; optional interval Nov20..Dec2 has D=-5000,K_ops=0,U=-5000 (`K_ops` is known operation net, distinct from knowledge cutoff K).
WHEN Dec5 approve synthetic statement details -3000 Nov25 and -2000 Dec1, then match repeated/overlapping evidence to those same two operations.
THEN K_ops=-5000,U=0,exactly two distinct operations; B/A/R/F unchanged,v1 bytes unchanged. Detail may produce a reviewed evidence-only report version, never automatic v2. November evidence-backed expense subtotal=3000 is labelled partial; U=0 does not establish gross completeness or force optional financing allocations.

## HB2-019 — effective date versus knowledge cutoff (BR-08/10)

GIVEN C20/V20 at seq10,Dec2 transfer/current at seq20,v1 November cutoff=20; C30/V30 entered Dec3 at seq30 as HB2-007.
WHEN query state(Nov30,20),state(Nov30,30) and explicitly load v1.
THEN first returns C20/V20,F[Nov]=30000,end=null; second C30/V30,F[Nov]=26000,end=76000; v1 remains first result. Same H does not imply same knowledge. seq30 never leaks into cutoff20 even if observed_date=Nov30.

## HB2-020 — no inferred expense, income or daily balance (BR-01/05/08/09)

GIVEN only C20 B=80000 and C2 B=75000 with HB2-003 full vectors, no operations.
WHEN render month reports, statistics and checkpoint trend.
THEN trend has exactly two real points on Nov20/Dec2,Nov30 balance unknown,operation_detail_status=NOT_PROVIDED. D=-5000 is interval net only; no inferred November spend=5000,December income=75000,zero gross spending,interpolated daily bank values or transaction requirement.

## HB2-021 — ambiguous date-only bank observations need placement (BR-01/10)

GIVEN Nov30 C1 B=50000,V1={Nov:50000},date-only and no established order for a newly supplied Cx B=48000,Vx={Nov:48000}.
WHEN submit Cx without relative placement.
THEN ORDER_CONFIRMATION_REQUIRED,no accepted checkpoint/vector/head change. WHEN user confirms Cx was after C1 THEN observation order selects Cx,bank/end balance=48000. Confirmation "before C1" instead would leave C1/50000 latest. No arbitrary recorded-time ordering; vector/effective dependencies must match the chosen placement.

## HB2-022 — corrections of corrections and competing report confirmations (BR-08/10)

GIVEN v2 from HB2-008,C30/V30 at correction tip t1; current Dec B=75000.
WHEN reviewed correction t2 replaces t1 with Nov30 B=77000,A={Nov:57000,Dec:20000},then correction t3 replaces t2 with B=76500,A={Nov:56500,Dec:20000}; two v3 confirmations share expected v2.
THEN all t1/t2/t3 retained,current Dec B/A unchanged,latest candidate F[Nov]=26500,R=30000. First v3 confirmation succeeds,second conflicts on report/account head with no v4. v1/v2 bytes unchanged. A competing fact correction referencing t1 after t2 rejects stale tip. Resolving K before t2 still returns t1; a new report requires reason/evidence, not a silent t3 overwrite.

## HB2-023 — DST and month boundary (BR-01/10)

GIVEN synthetic observations with complete one-month vectors: Oct25 C1 B=10000 at 00:30Z and C2 B=9900 at 01:30Z.
WHEN convert to Berlin calendar and select latest.
THEN both dates=Oct25,local 02:30 has respectively +02:00/+01:00 offsets,C2 is later,B=9900. A local ambiguous 02:30 without offset needs clarification; local Mar29 02:30 is rejected as nonexistent. Date-only Oct25 remains null-time. A Nov30 23:30Z observation B=9800 belongs to Dec1; November cannot use 9800 as its end balance. No day is defined by adding 24 hours.

## HB2-024 — two proposals race and month changes while deferred (BR-05/10)

GIVEN two ordinary proposals P/P2 based on HB2-011 r and Dec target.
WHEN confirm P then P2 concurrently against r.
THEN exactly one succeeds,other STALE_PROPOSAL;B=90000,A={Dec:90000},R=30000 once. Independently, if P is deferred unchanged until Jan1,confirming its Dec target rejects TARGET_PERIOD_CHANGED; no financial writes even if aggregate revision had not changed. A refreshed January proposal needs owner review/generalized policy as applicable.

## HB2-025 — negative free does not block ordinary carry (BR-03/05)

GIVEN Nov28 B10000,A={Nov:10000},o unpaid20000 fundedNov,S0,F[Nov]=-10000.
WHEN Dec1 ordinary single-source transfer-only explicitly confirms {Nov:0,Dec:10000},same o fundedDec.
THEN B10000,R[Dec]20000,F[Dec]=-10000,sum(F)=-10000,full reserve retained,count/date unchanged. No OWNER_POLICY_REQUIRED solely for F<0,no bank debit or reserve release. A new negative source/target A instead rejects NEGATIVE_CASH_ALLOCATION. Multi-source A remains gated;explicit FRESH_START is not auto-selected.

## HB2-026 — missing observation, observed zero and early close (BR-01/08)

GIVEN an elapsed November with no checkpoint/vector at any earlier date and known o R[Nov]=1000,S=0.
WHEN Dec1 confirm November close.
THEN NO_OBSERVATION,last/end checkpoint/date/balance=null,V=null,Nov A/F=null,R=1000,S=0; no zero bank/free invented. Separately, a genuine Nov30 observation B=0,A={} with same o has END_DATE_OBSERVED,end=0,Nov A=0,R=1000,F=-1000. A November close attempted on Nov30 before the day ends rejects PERIOD_NOT_ENDED in either case.

## HB2-027 — historical insertion exposes incompatible old-anchor vector (BR-01/05/08)

GIVEN Nov28 C28 B=90000,V28={Nov:40000,Dec:50000}; Nov30 redistribution V30a={Nov:35000,Dec:55000} anchored C28; Dec2 current B=85000,A={Dec:85000}.
WHEN Dec3 insert Nov29 C29 B=88000,V29={Nov:38000,Dec:50000},then preview November correction.
THEN C29 is latest historical observation but V30a references C28; HISTORICAL_STATE_CONFLICT,no report version or implicit vector rebase. Current Dec state unchanged. Explicit reviewed replacement V30b={Nov:33000,Dec:55000} anchored C29 restores coherent historical selection,sum=88000,Nov F=33000 with R=S=0; end_balance still null because observation date=Nov29. Existing closed reports remain unchanged throughout.

## HB2-028 — authorization, request identity and atomic report commit (BR-10)

GIVEN HB2-002 authorized preview for account A and request q.
WHEN another owner tries to load/confirm it or reuse q against another account, or a simulated persistence failure occurs during report append/head/audit commit.
THEN unauthorized calls reveal no existing result; failure rolls back report/head/committed audit/idempotency result together. No v1 partially exists; authenticated retry q/same payload after successful commit returns original v1. q/different cutoff/vector/reason rejects payload conflict. A stale preview rejects without writes; refresh/review required.

## HB2-029 — partial payment, cancellation and savings release stay historical (BR-02/03/06/07/08)

GIVEN Nov30 B=50000,A={Nov:50000},o original/outstanding/R=20000,s S=5000,F=25000.
WHEN Dec1 transfer to Dec;Dec2 fresh B=45000,A={Dec:45000},partial payment=5000;Dec3 cancel remaining o and explicitly release savings=2000 without bank change;then close Nov.
THEN Dec2 o outstanding/R=15000,S=5000,F=25000,bank stays45000. Dec3 CANCELLED reserve=0,same s S=3000,F=42000,B=45000; cancellation is not payment and releases no bank cash. November snapshot remains o unpaid/R=20000,S=5000,F=25000,origin Nov,irrespective of December lifecycle. Each full state and explicit release retained.

## HB2-030 — corrected date filtered after correction resolution (BR-01/08/10)

GIVEN Nov30 C30 B=76000,V30={Nov:56000,Dec:20000},preceding Nov20 C20/V20 as HB2-002,and November v1 based on C30.
WHEN Dec3 correct C30's actual observation date to Dec1 with reviewed paired vector effective-date/position correction;active Dec2 B=75000 remains newer.
THEN state(Nov30,new K) resolves correction first and excludes corrected Dec1 fact; selects C20/V20,Nov F=30000,end_balance=null. Never resurrect superseded Nov30 revision as current evidence; v1 still pins that original revision. Explicit v2 can restore unknown end balance with reason/evidence;active Dec state unchanged.

## HB2-031 — primary Dec2 actual check and carry in one update (BR-01/02/03/05/07/10)

GIVEN Nov28 C0 B=90000,V0={Nov:40000,Dec:50000},same obligation o unpaid/R[Nov]=30000,S=0,Nov F=10000. No later bank check.
WHEN on Dec2 website open detects December and user actually checks B=84000,enters that observation,includes carry and confirms final V1={Nov:0,Dec:84000} with o funded Dec in one primary action.
THEN exactly one new C1 observed Dec2/B=84000,one complete V1,one transfer consent/funding revision set and one atomic audit/update commit; total checkpoints=2,current R[Dec]=30000,F[Dec]=54000. o identity/origin/outstanding unchanged;no duplicate obligation or debit. Before C0/V0 and after C1/V1 are linked. D=-6000 is interval net only;no intermediate B=90000 December check,intermediate vector or inferred expense month. Failed/stale confirmation commits none of that batch; authentic same-request retry returns the original result.

## HB2-032 — new actual check with unchanged amount (BR-01/02/05/10)

GIVEN HB2-031 initial state C0/V0,R[Nov]=30000.
WHEN Dec2 user actually checks the card and confirms B=90000 with carry and full V1={Nov:0,Dec:90000} using ACTUAL_CHECK.
THEN new C1 ID distinct from C0,total checkpoints=2,last_bank_observed_date=Dec2,B=90000,R[Dec]=30000,F[Dec]=60000. Actual check creates a Dec2 bank trend point;carry event creates none of its own. No amount-based dedup to C0,no invented operation from D=0. Retry same observation/request returns C1; it is not a second real check. Contrast explicit REUSE_CONFIRMED in HB2-011 where count stays1/date staysNov28.

## HB2-033 — website open and abandoned draft have no money effect (BR-01/05/08)

GIVEN HB2-031 initial state C0/V0,o R[Nov]=30000,Dec A=50000,F[Dec]=50000.
WHEN Dec2 user opens website,views current-period notice,enters an unconfirmed draft B=84000 and proposed {Dec:84000},then leaves.
THEN confirmed checkpoint remains C0/B=90000,count=1,date=Nov28;A remains {Nov:40000,Dec:50000},R[Nov]=30000,F[Nov]=10000,F[Dec]=50000. No carry,funding move,bank observation or close is committed. December may be available as calendar state only. Advancing time while site is closed does not schedule any financial mutation.

## HB2-034 — actual update with explicitly deferred carry (BR-01/02/05/07)

GIVEN HB2-031 initial C0/V0,o R[Nov]=30000,S=0.
WHEN Dec2 user actually checks unchanged B=90000,chooses DEFER and confirms A={Nov:40000,Dec:50000}.
THEN new C1/count=2/date=Dec2,B=90000;old allocation amounts remain identical,R[Nov]=30000,F[Nov]=10000,F[Dec]=50000. No transfer consent,funding move or recreated obligation;old proposal cannot later execute against the old base. Separately,if actual B=84000,user may defer with reviewed {Nov:34000,Dec:50000},R still Nov,F[Nov]=4000,F[Dec]=50000;sum=84000. Reusing unchanged old amounts summing90000 with B84000 rejects sum mismatch atomically,not a forced carry or auto assignment of -6000 as expense.

## HB2-035 — explicit technical carry after actual update has no second cash effect (BR-01/02/05)

GIVEN HB2-034 changed-balance DEFER branch has C1 observed Dec2 B=84000,A={Nov:34000,Dec:50000},o R[Nov]=30000,count=2.
WHEN user explicitly confirms a refreshed transfer-only proposal on Dec2 using REUSE_CONFIRMED,C1 and current revision.
THEN B=84000,count=2,date remainsDec2;one new vector {Nov:0,Dec:84000},same o R[Dec]=30000,F[Dec]=54000. No new bank checkpoint,movement,second -6000 adjustment or -34000 debit. Original deferred update and technical carry have distinct audit/lineage. This is optional,not the primary two-step month-transition UX. Repeating same proposal/request has no further effect.

## HB2-036 — November close after the primary December update (BR-01/05/08)

GIVEN HB2-031 completed,no Nov30 observation exists;C0/V0 and historical o state retained.
WHEN user manually closes November after the Dec2 update.
THEN v1 selects C0,Nov28,last_observed_balance=90000,V0 effectiveNov28,Nov A/R/S/F=40000/30000/0/10000;end_checkpoint=null,end_balance=null,INCOMPLETE,NOT_PROVIDED. Current C1/B=84000,V1={Dec:84000},R[Dec]=30000,F[Dec]=54000 unchanged. Neither Nov28 90000 nor Dec2 84000 is presented as Nov30 balance. If an original November v1 existed before Dec2,its bytes/cutoff/references remain unchanged instead;later reviewed versions follow HB2-006..008.

## HB2-037 — untouched funded January stays separate (BR-03/05/07/11)

GIVEN Nov28 C0 B89000,A={Nov:40000,Dec:48000,Jan:1000},o R[Nov]30000,s S[Nov]5000,Jan has no earmarks.
WHEN Dec2 actual same B89000 and ordinary carry confirms {Nov:0,Dec:88000,Jan:1000},same o/s fundedDec.
THEN one new actual checkpoint,sum(A)=89000,R[Dec]30000,S[Dec]5000,F[Dec]53000,F[Jan]1000,sum(F)=54000. January remains1000 once;target48000 retained once. With S0,F[Dec]58000,sum(F)59000. No bank operation or automatic forecast cap.

## HB2-038 — full-vector validation and affected dependencies (BR-03/05/07/10)

GIVEN HB2-037 base proposal with reviewed source/target/o/s and unchangedJan1000.
WHEN confirmation drops Jan to0 while keeping Dec88000,omits s,or uses stale funding refs.
THEN reject wrong sum,omitted earmark or stale dependencies with zero financial writes. A separately reviewed Dec89000/Jan0 changes the write set and cannot use the old payload. Any proposed negative January rejects NEGATIVE_CASH_ALLOCATION even outside that set;matching sum alone is insufficient. No silent B fallback.

## HB2-039 — fresh start after missing December (BR-01/02/05/08/10)

GIVEN Nov20 2026 C0 B=10000,V0={Nov:4000,Dec:6000},R=S=0;no visits/checkpoints/updates in December;one real checkpoint exists.
WHEN Jan5 2027 user actually checks B=8000,explicitly chooses B FRESH_START,reviews not-carried Nov/Dec values and confirms V1={Nov:0,Dec:0,Jan:8000} once.
THEN new C1 observed Jan5/B=8000,total checkpoints2,one final V1,F[Jan]=8000. Immutable decision stores modeFRESH_START,not_carried={Nov:4000,Dec:6000},C0/V0->C1/V1,actor/consent/positions/request;no invented CARRY cash amount or bank operation. Old Nov4000 survives historically;D=-2000 is not income/expense. No invented December point,intermediate vector,carry,close,old-allocation credit or repeated historical-deficit debit. No per-missed-month confirmation required.

## HB2-040 — skipped December retains only genuinely known data (BR-01/05/08)

GIVEN HB2-039 complete;no later backdated evidence or December observation exists.
WHEN preview/close November and December with their own H/K after Jan5,or load their preexisting original versions if present.
THEN November known A=4000,December known A=6000,each selected from V0 effectiveNov20;last bank observation for both=C0,dateNov20,B=10000. Both actual month-end balances are null/INCOMPLETE,NOT_PROVIDED;there is no claim that December had a bank check or actual unchanged balance. December is not NO_OBSERVATION merely because its month had no check:an earlier real C0 is available. Jan5 V1 cannot replace either historical vector;current Jan B/A/F=8000 and any preexisting original report bytes/heads unchanged. Historical close remains an explicit separate action,not a prerequisite or side effect of B.

## HB2-041 — real unpaid obligation survives discarded planning deficit (BR-02/03/05/06/08)

GIVEN HB2-039 initial state plus existing o original7000,outstanding5000,statusUNPAID,fundedNov;reserve5000 is already fully recorded before the gap.
WHEN Jan5 actual B=8000 and explicit FRESH_START confirm old Nov/Dec A=0,Jan A=8000 with same o fundedJan.
THEN B=8000,o ID/origin/original/outstanding/status unchanged,R[Jan]=5000,F[Jan]=3000;no paid/cancelled event,new obligation or automatic debit. Historical Nov allocation4000 and reserve5000 (free=-1000) remain separately visible;historical free deficit is not an additional liability to subtract from Jan. Funding event explicitly links Nov->Jan with full before/after state. Any payload omitting o rejects atomically instead of producing free8000.

## HB2-042 — full unpaid reserve and savings persist beyond fresh cash (BR-03/05/07)

GIVEN HB2-039 initial state plus o unpaid/outstanding9000 fundedNov and saving s amount2000 fundedDec,with identities/origins recorded before January.
WHEN Jan5 actual B=8000 and explicit B confirms {Jan:8000},same o/s funding moved into Jan.
THEN same o outstanding/R[Jan]=9000,same s S[Jan]=2000,F[Jan]=-3000,sum(F)=8000-9000-2000=-3000. No partial reserve,automatic payment/cancellation,savings release or extra allocation. Old month allocation rows0 do not erase either identity. Full funding history retained once;UI reports deficit,not hidden free funds.

## HB2-043 — savings change requires its own explicit event (BR-02/03/07/10)

GIVEN HB2-039 initial state plus o unpaid5000 fundedNov,s amount3000 fundedDec.
WHEN Jan5 actual B=8000 and B alone confirms {Jan:8000} with all old earmarks fundedJan.
THEN o/R=5000,s/S=3000,F[Jan]=0;reset alone releases nothing. In a separate alternative confirmation from the same starting head,user explicitly reviews a savings release2000 alongside B:THEN same s amount1000,one release event distinct from the non-carry decision,R=5000,F[Jan]=2000,B=8000;no bank debit. A payload that merely drops s or labels reset as implicit release is rejected. Alternatives are not sequential double-applied actions.

## HB2-044 — no automatic A/B choice or unconfirmed reset (BR-01/05/10)

GIVEN HB2-039 initial C0/V0 and Jan5 website open with draft B=8000;neither A nor B selected.
WHEN user views the options,leaves,or submits a transition without a mode.
THEN no financial writes;submitted transition returns TRANSITION_CHOICE_REQUIRED,C0/B=10000,V0 unchanged,count1,no funding movement or default carry/reset. Selecting A with an unresolved multiple-source proposal cannot silently execute B. Selecting B explicitly makes HB2-039 available without multiple-source policy approval. Explicit DEFER is a third distinct ordinary-update action with its own full reviewed vector,not implicit FRESH_START.

## HB2-045 — fresh-start request retry, stale competing carry and rollback (BR-02/05/10)

GIVEN Nov28 C0 B=90000,A={Nov:40000,Dec:50000},o R[Nov]=30000;Dec2 actual84000 and A/B previews share base revisionr.
WHEN explicit FRESH_START requestq confirms {Nov:0,Dec:84000},same o R[Dec]=30000,then retryq/same payload and attempt stale A preview againstr.
THEN first commits C1/one vector/one fresh-start decision/funding/audit result,B=84000,F[Dec]=54000,count2;retry returns original result,stale A rejects without extra writes. q with mode changed toCARRY rejects payload conflict even if its numeric vector is identical. A simulated failure during checkpoint/vector/decision/funding/audit commit leaves none of that batch or a committed request result;successful retry can commit once. Unauthorized replay reveals no stored result.

## HB2-046 — one reset spans several old months and preserves future earmarks (BR-01/03/05/07/08)

GIVEN Nov20 2026 C0 B=10000,A={Oct:0,Nov:4000,Dec:4000,Feb2027:2000},o unpaid3000 fundedOct,s amount1000 fundedDec,future saving sf amount500 fundedFeb2027;no December observations/updates.
WHEN Jan5 2027 actual B=8000 and explicit FRESH_START confirms {Oct:0,Nov:0,Dec:0,Jan:6000,Feb2027:2000},same o/s fundedJan,sf unchanged inFeb.
THEN sum(A)=8000,R[Jan]=3000,S[Jan]=1000,F[Jan]=2000,S[Feb]=500,F[Feb]=1500,sum(F)=3500=8000-3000-1500. Decision lists all three past allocation states and both moved identity refs;future2000/sf500 preserved once. Exactly one new Jan5 checkpoint/vector/decision,not one per old month;no invented October/December observations,intermediate transfers or prerequisite closes. Original complete vectors/reports survive;old allocations are not posted as expenses/income. Changing future2000 or sf500 would require a separately reviewed explicit edit.

## Archived original compatibility and verification

The remaining record documents earlier revisions and original owner-reported acceptance only. Earlier signed-allocation validity and Accepted/Done claims do not govern the amended revision;D32..D35 supersedes them. Current review status is above.

## Compatibility and requirement review

| Existing scenarios | HB2 coverage / preserved contract |
|---|---|
| HB1-001/002/013, F-003/015 | HB2-001/003/020: full vectors, future month distinct, no delta as income; existing normal forecasts untouched |
| HB1-003/004/009/020, F-004/005 | HB2-017/025/027: integer signed vectors valid, optional splits non-posting, no new liquidity formula |
| HB1-005/006/007/019, F-011/012/014/018 | HB2-014/018/020/028: optional evidence/dedup only, K+U=D, no bank or allocation repost |
| HB1-008, F-001/002/006/007/017 | HB2-009/012/013/029: full remaining reserve, fresh balance and no double debit; unchanged payment still requires BR-02 warning/affirmation |
| HB1-010/012/014/015, F-008/009/016 | HB2-005/010/011/014/024/029: one consented carry, same identities, no savings release or recurring-item recreation; template scope unchanged |
| HB1-011/016/017/018, F-010/013 | HB2-002..008/019/020/022/030: exact accepted examples, unknown remains unknown, latest observation and original report survive |

All HB1-001..020 and F-001..018 were read for self-review. No contradiction with ADR0001 was found;explicit historical ordering/state conflicts refine its previously deferred contract. Q-HB2-02 remains an exclusion,not a selected complex A algorithm. Independent review completion is owner-reported in the final acceptance record;no additional independent review was performed locally.

Owner clarification coverage: primary combined flow and atomicity HB2-031;actual unchanged check HB2-032;unconfirmed open/no background work HB2-033;explicit deferral HB2-034;technical post-update carry HB2-035;historical November preservation HB2-036;untouched signed month HB2-037;affected-dependency rejection HB2-038. BR-01/02/05/07/08/10/11 remain covered. ADR 0001's transfer-only emphasis receives an explicit proposed addendum in ADR 0002;its Accepted text is unchanged. Only the previous Proposed ADR 0002 global-negative-month restriction is narrowed under owner D28. Existing historical/version rules and HB-003 forecast boundary are unchanged.

D29..D31 coverage:HB2-039/040 preserve old planning deficits and December's actual knowledge gap;HB2-041 distinguishes real unpaid liabilities;HB2-042/043 retain full reserves/savings with explicit-change-only exceptions;HB2-044 forbids automatic A/B choice;HB2-045 validates mode-aware atomicity/retries;HB2-046 handles several past months and unaffected future earmarks in one update. HB2-016/017/025/038 gates now explicitly concern only unresolved A proposals. The approved B alternative extends complete-vector input;it does not alter the bank/reserve/history invariants of HB1-001..020 and F-001..018 or their technical carry examples. No forecast formula or independent/runtime test claim is introduced.

## Local verification evidence

Initial 30-scenario revision checked locally on 2026-11-01, branch `docs/hb-002-month-history` (counts below describe that earlier revision):

- `node` v22.23.0, inline JavaScript supplied through stdin: 68 exact BigInt arithmetic assertions passed (34 complete vectors, 24 free/reserve/savings identities, 10 delta/evidence identities), including the complete/incomplete November examples and signed owner-option examples. This validates synthetic arithmetic, not implemented financial behavior.
- Same Node check: 30 unique sequential HB2 IDs, each with GIVEN/WHEN/THEN; 54 local file links and 6 anchors across 12 relevant documents; JSON parse, 7 unchanged layers and Proposed/Review gates passed. Structural Markdown checks covered balanced fences, unique headings, heading spacing, new-file table widths and trailing whitespace; this is not a Markdownlint run.
- Node ICU/Intl conversion checks passed for Berlin's 2026 autumn repeated hour, spring missing hour and Nov30 23:30Z becoming Dec1. No application date utility exists yet.
- `python3 scripts/check_agent_docs.py` and `python scripts/check_agent_docs.py` could not run: neither executable is available in PATH. No dependencies were installed. Node performed equivalent required-file, skill-frontmatter and layer/JSON checks successfully: 18 required documents, 10 skills, 7 layers. This is not execution of the Python script or hosted CI.
- `markdownlint`, `markdownlint-cli2` and `py` were not found in PATH. No full Markdownlint pass is claimed.
- `git diff --check` passed after removing whitespace in the changed task status. Separate `git diff --no-index --check -- NUL <new-file>` checks for both new files emitted no whitespace diagnostics (exit 1 reflects new-file differences; Git also warned about expected LF-to-CRLF conversion).
- Self-review against Accepted ADR 0001, BR-01..11, HB1-001..020 and F-001..018 found no changed accepted rule; compatibility mapping above records coverage. Independent review and runtime finance/DB/UI tests have not been performed. `.vscode/extensions.json` was not edited; no app, dependencies, migrations, external services, commit, push or PR introduced.

At initial verification,HB-002 remained Review and ADR0002 Proposed. Those historical records are preserved below;the final acceptance record and current header govern status. Markdown scenarios remain specifications;future domain/DB tests must execute these oracles before persistence/UI implementation.

### Owner clarification recheck — 2026-11-01

- `node` through stdin: 37 exact BigInt assertions passed (16 complete vectors, 13 free/reserve/savings identities, 8 net/transfer/signed-month checks), covering 90000->84000, unchanged real check, deferred carry, technical later carry, the 89000 vector with untouched -1000 January, and prior 80000->75000/76000 history examples. A one-cent signed vector was checked as well. These are arithmetic checks, not executed domain behavior.
- 38 unique sequential HB2 IDs with GIVEN/WHEN/THEN passed; HB2-010/011 labels and introduction identify transfer-only as a technical mode; HB2-017 now limits the signed carry gate to actual affected months. HB2-031..038 add the primary path and seven requested clarification cases plus dependency failures.
- Local reference check passed for 70 file links and 10 anchors across 15 Markdown files. JSON parsing, scoped-carry/actual-check metadata, 7 unchanged layers, Proposed/Review status and equivalent bootstrap checks (18 files, 10 skills) passed. Structural Markdown checks passed; no Markdownlint claim.
- `git diff --check` passed. `git diff --exit-code -- docs/adr/0001-checkpoints-and-allocations.md` returned 0: Accepted ADR 0001 is unchanged. The proposed minimal UX addendum is explicit in ADR 0002, and owner D26..D28 is recorded separately.
- SHA256 of `.vscode/extensions.json` remained `84055C05ECC09BEF488B9AD1BEAA4351F2A8196E8A827F65A4888A9E29D0FA80`, matching the earlier revision. Python/python3/py and Markdownlint tools remain absent from PATH; the Python CI script, full Markdownlint and runtime tests were not run. No independent review, implementation, dependencies, migrations, commit, push or PR.

### Fresh-start decision recheck — 2026-11-01

- Node through stdin:43 exact BigInt assertions passed (18 full vectors,17 full reserve/savings/free checks,8 delta/identity checks). Covered Nov-5000/Dec15000 at B10000 → Jan8000 at fresh B8000,history-preserving net-2000,full liability/savings deficit,explicit savings-release alternative,one-cent vector and multi-old-month reset with untouched future earmarks. These validate fixture arithmetic,not implemented domain behavior.
- All46 unique sequential HB2 IDs contain GIVEN/WHEN/THEN. Added HB2-039..046;updated HB2-016/017/025/038 to distinguish unresolved A-only proposals from approved B. Self-review preserves BR-01/02/03/05/06/07/08/10/11,HB1-001..020 and F-001..018;old planning deficit,actual unpaid reserve and savings are separate states.
- 73 local file links and11 anchors across15 Markdown files passed. Structural Markdown (fences,unique headings,new-file tables/spacing/whitespace),JSON parsing,explicit modes/no default/A-only gate metadata,and equivalent bootstrap checks (18 required files,10 skills,7 unchanged layers) passed. This is not Markdownlint or hosted CI.
- `git diff --check` and `git diff --exit-code -- docs/adr/0001-checkpoints-and-allocations.md` passed;Accepted ADR 0001 is unchanged. `.vscode/extensions.json` SHA256 still matches the recorded value. Python/python3/py and Markdownlint remain absent from PATH;no Python-script/full-lint/runtime test execution is claimed. ADR 0002 Proposed,HB-002 Review;no independent review,app/dependencies/migrations,commit,push or PR.

### Final scoped acceptance — 2026-11-01

The owner reports independent review of ADR0002 and all46 scenarios completed and explicitly approves the scoped contract. Accepted scope:historical selection/ordering,unknown-end/manual closing,immutable original reports,explicit corrected versions,ordinary fresh-check atomic updates,and explicit B FRESH_START with full unpaid/savings preservation after missed months. Completion trace is recorded in TASKS.md. Complex A CARRY with several past months or affected negative allocations remains excluded under Q-HB2-02;future implementation must reject it without financial writes until separately approved. B stays available;no A/B default or algorithm for complex A is accepted. ADR0002 is Accepted and HB-002 is Done as documentation/scenarios.

Final local checks executed through Node stdin before/after status updates:

- 98 exact BigInt assertions passed:41 complete vectors,39 reserve/savings/free checks,18 delta/evidence identities. Includes primary84000 update,unknown/known November values,partial payment/cancellation,signed and one-cent cases,fresh start with preserved liabilities/savings and untouched future earmarks. This is fixture arithmetic,not execution of a finance engine.
- All46 unique sequential HB2 IDs have GIVEN/WHEN/THEN. Self-review found no new contradiction with ADR0001,BR-01..11,DATA_MODEL,PRD,UX or the reviewed scenarios within accepted scope. Original ADR0001 has no diff;reviewed financial oracles are unchanged. Both A-only exclusion and B availability are explicit across ADR/business rules/model/UX/task register/open questions.
- 84 local file links and12 anchors across16 relevant Markdown documents passed;JSON parsing,7 unchanged architecture layers,Accepted/Done gates,modes/no-default metadata and structural Markdown checks passed. Equivalent bootstrap checks passed for all18 required documents and10 skill frontmatters;the REQUIRED list includes both HB-002 deliverables. `scripts/check_agent_docs.py` was read/reviewed for consistency.
- Berlin ICU/Intl checks passed for2026 autumn repeated hour,spring missing hour,UTC/Berlin month boundary,and leap/nonleap February calendar lengths. No app date utility or database exists yet.
- `python3 scripts/check_agent_docs.py` failed to launch because python3 is not in PATH. Python/py and Markdownlint were also unavailable in prior local checks. No Python CI script,full Markdownlint,hosted CI,domain/DB/UI test run or additional local independent review is claimed.
- `git diff --check` passed;new-file whitespace checks emitted no whitespace diagnostics (no-index exit1 represents file differences;Git may warn about expected LF/CRLF conversion). `.vscode/extensions.json` SHA256 still matches the earlier recorded value and is excluded from the commit. No app/dependencies/migrations or real financial data introduced.

One local documentation commit is authorized on `docs/hb-002-month-history`,subject `docs(hb-002): accept immutable month closing and corrections`;the exact resulting hash is reported after commit. No push/PR. HB-003 forecast/liquidity formula/warnings remain undecided;Q-HB2-02 stays open outside this completion scope.
