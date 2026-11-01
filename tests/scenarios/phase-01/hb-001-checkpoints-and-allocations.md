# HB-001 — checkpoint-first acceptance scenarios (synthetic)

**Status:** Reviewed corrected specification under [Accepted ADR0001](../../../docs/adr/0001-checkpoints-and-allocations.md). Owner confirms re-acceptance after repeated independent review of D32..D35 and all four fixes. Original acceptance/evidence remains archived;no runtime tests implied.

All values are integer EUR cents;A>=0 and B>=0;F and optional operation details may be signed; dates Europe/Berlin in 2026; synthetic account A. A denotes a COMPLETE confirmed month vector, F=A-R-S. Unlisted months/R/S are zero. Every checkpoint commits its full vector atomically; optional bank detail is explicitly marked. Each THEN must retain before/after history. Current funded-case daily values use inclusive days and integer quotient; no daily oracle is asserted for the unresolved liquidity edge. K/U are optional reconciliation diagnostics only.

## HB1-001 — simultaneous 1200 EUR receipt and 100 EUR expense (BR-01/05/09/11)

GIVEN Nov 20 B0=40000,A={Nov:40000},R=S=0. WHEN Nov 28 B1=150000,A={Nov:30000,Dec:120000} is confirmed WITHOUT transaction entry. THEN sum(A)=150000, Nov F=30000,daily=10000 for 3 days, Dec preview=3870; D=110000 is not labelled gross income. History stores C0/C1 and full vectors.

WHEN later OPTIONAL evidence confirms +120000 and -10000, THEN K=110000,U=0, same B/A/R/S/F/forecast. Without evidence K=0,U=110000 is permissible and must not block saving. No additional +110000 source allocated alongside the vector.

## HB1-002 — early December funds and full reserve (BR-03/04/05)

GIVEN Nov 27 B=3000,A={Nov:3000}. WHEN Nov 28 confirm B=123000,A={Nov:3000,Dec:120000},R[Dec]=90000. THEN sum(A)=123000,F[Nov]=3000,F[Dec]=30000,Nov daily=1000,Dec preview=967; B is not reduced by reserve creation. No income operation required. History retains full reserve creation and vector confirmation.

## HB1-003 — optionally described split purchase (BR-05/09/11)

GIVEN Nov 28 B=32000,A={Nov:2000,Dec:30000}. WHEN Nov 29 confirm B=28500,A={Nov:0,Dec:28500}. THEN R=S=0,F[Nov]=0,F[Dec]=28500,daily Nov=0,Dec preview=919. OPTIONAL one -3500 operation with funding details -2000 Nov/-1500 Dec sums to -3500; these details do not debit B or mutate A again. User may omit them entirely; before/after vectors survive.

## HB1-004 — negative cash rejects;actual receipts remain checkpoint-first (BR-04/05/11)

GIVEN Nov28 B=10000,A={Nov:10000},R=S=0;expected December income is unreceived.
WHEN Nov29 draft B=8000,A={Nov:9500,Dec:-1500} is submitted.
THEN NEGATIVE_CASH_ALLOCATION,no new committed vector/forecast,even though sum=8000. A liquidity warning cannot validate it.
WHEN Nov30 a real B=128000 and nonnegative A={Nov:9500,Dec:118500} are explicitly confirmed without operations.
THEN sum=128000,F[Nov]=9500,F[Dec]=118500,Dec preview3822,remainder18;no extra-1500 adjustment or inferred gross income. Historical confirmed revisions remain retained.

## HB1-005 — partial then full PDF explanation (BR-09/11)

GIVEN Nov 1 B=100000,A={Nov:100000}; Nov 5 B=90000,A={Nov:90000},R=S=0. No details: D=-10000,K=0,U=-10000. WHEN approve OPTIONAL -6000 row THEN K=-6000,U=-4000, B/A=90000, F=90000,daily=3461 for 26 days. WHEN approve second -4000 THEN K=-10000,U=0; same B/A/F/daily. No residual allocation replacement exists. Evidence revisions retained, any original closed v1 unchanged.

## HB1-006 — positive net decomposed without rewriting months (BR-05/09)

GIVEN Nov 28 confirmed B=150000,A={Nov:30000,Dec:120000},R=S=0; preceding B=40000, D=110000. WHEN approve +120000 evidence THEN K=120000,U=-10000; A unchanged, Nov daily=10000,Dec preview=3870. WHEN -10000 evidence arrives THEN K=110000,U=0, same state. Evidence cannot infer replacement financing from bank dates. Retain evidence audit separately from allocation history.

## HB1-007 — duplicate evidence and write conflicts (BR-02/09/10)

GIVEN Nov 5 B=90000,A={Nov:90000},R=S=0; D=-10000,K=-6000,U=-4000 with optional manual operation m=-6000. WHEN PDF matches m, retry same request, and approve matching overlapping-statement evidence THEN still one m,K=-6000,U=-4000,B/A/F=90000,daily=3461. Distinct evidence may link to m; identical retry creates no duplicate financial action. A stale allocation revision or same request id/different payload is rejected atomically, preserving vector/history.

## HB1-008 — partial payment and zero outstanding (BR-02/03/08)

GIVEN Nov 1 B=100000,A={Nov:100000},outstanding/R[Nov]=20000. WHEN Nov 5 fresh B=95000,A={Nov:95000},partial paid=5000 THEN outstanding/R=15000,F=80000,daily=3076. WHEN Nov 6 fresh B=80000,A={Nov:80000},paid remainder THEN outstanding/R=0,F=80000,daily=3200. No bank transaction entry required; B is not auto-debited. Original amount 20000 and all payment/vector revisions remain inspectable. Same balance with paid status must warn/require fresh affirmation (F-002).

## HB1-009 — one-cent validation separates cash from signed detail (BR-10/11)

GIVEN Nov28 B=10000,A={Nov:10000},R=S=0.
WHEN new draft B=9899,A={Nov:9950,Dec:-51} submitted.
THEN reject NEGATIVE_CASH_ALLOCATION despite exact sum9899. Separate explicit valid confirmation A={Nov:9849,Dec:50} at actual B9899 succeeds;F equals A,Nov n3,q3283,r0,Dec preview1,r19.
OPTIONAL one payment-101 with funding details-50/-51 is metadata only;no second debit or derived active A. Reject fractional cents,overflow,wrong sum,stale revision or unauthorized scope atomically;all prior confirmed states remain.

## HB1-010 — consent before carry; zero net not gross completeness (BR-05/09/11)

GIVEN Oct close v1 B=10000,A={Oct:10000},R=S=0. WHEN Nov opens THEN A unchanged, no automatic Nov credit. WHEN user confirms transfer Nov 1 at unchanged B THEN A={Oct:0,Nov:10000},F[Nov]=10000,daily=333,Oct v1 intact. WHEN Nov 2 user reaffirms B=10000,A={Nov:10000} and OPTIONAL +5000/-5000 evidence THEN D=K=U=0,one of each movement; bank/A=10000,daily=344. U=0 before detail did not prove gross completeness. No duplicated carry/income.

## HB1-011 — required owner case: 800 -> 770, 750/20 (BR-01/05/11)

GIVEN Nov 20 C0 B=80000,A={Nov:80000},R=S=0. WHEN Nov 22 C1 B=77000,A={Nov:75000,Dec:2000}, user confirms each amount, no operations/categories/explanations. THEN sum(A)=77000,D=-3000,delta A[Nov]=-5000,delta A[Dec]=2000,F[Nov]=75000,F[Dec]=2000. No inferred Nov expense=5000 or Dec income=2000; no demand to allocate -3000. History retains C0 and both vectors. Nov daily=8333 for 9 days,Dec preview=64.

Statistics assertion: without operation evidence, neither -5000 allocation delta nor -3000 bank net may be displayed as actual November spending; +2000 must not appear as confirmed December income. Show budget changes separately and activity detail as incomplete, never confirmed zero spending.

## HB1-012 — redistribution without changed card balance (BR-02/05/10)

GIVEN Nov 22 latest B=77000,A={Nov:75000,Dec:2000},R=S=0. WHEN user confirms unchanged-bank redistribution A'={Nov:70000,Dec:7000}. THEN sum(A')=77000,delta vector=-5000/+5000,sum(delta)=0; same checkpoint/date retained, one new allocation revision, no artificial bank observation. F[Nov]=70000,F[Dec]=7000,Nov daily=7777. No expense/income generated, old revision remains available.

Statistics assertion: the -5000/+5000 redistribution is budget history only; without operation evidence do not report 5000 actual spending or 5000 confirmed income in charts, totals or exports. Bank net zero alone is not evidence of zero gross spending.

## HB1-013 — December's 500 EUR received in November (BR-04/05)

GIVEN Nov 27 B=40000,A={Nov:40000},R[Nov]=30000,S=0. WHEN Nov 28 user confirms actual B=90000,A={Nov:40000,Dec:50000}. THEN sum(A)=90000,F[Nov]=10000,F[Dec]=50000,Nov daily=3333 for 3 days; future 50000 does not raise Nov allocation/free. No income entry required; optional +50000 evidence changes no state. Retain confirmed vector and reserve history.

## HB1-014 — transfer 400 into existing 500 requires consent (BR-05/11)

GIVEN Nov 28 B=90000,A={Nov:40000,Dec:50000},R[Nov]=30000,S=0. WHEN Dec 1 opens and transfer proposal is shown THEN active A/R remain unchanged, pending proposal has no cash effect; no old free added to Dec automatically. WHEN one-button confirmation at unchanged B THEN A'={Nov:0,Dec:90000},R'[Dec]=30000,F'[Dec]=60000,daily Dec=1935 for 31 days. Same bank observation remains dated Nov 28 (stale metadata preserved); transfer consent dated Dec 1. No 140000 target balance, no re-entry of unchanged amount. Retry/reopen cannot repeat transfer; history retains pre-transfer vector.

Explicit observation assertion: latest checkpoint id, checkpoint count and last_bank_observed_date remain unchanged; last_bank_observed_date=2026-11-28, transfer_confirmed_date=2026-12-01. UI still displays "last checked Nov 28"; no Dec 1 bank checkpoint/trend dot or freshness reset. Transfer is not shown as a new card check. The -40000/+40000 allocation change is not reported as actual November spending/December income without operation evidence.

## HB1-015 — full reserve and savings survive transfer (BR-03/05/07)

GIVEN Nov 28 B=90000,A={Nov:40000,Dec:50000},one obligation o outstanding/R=30000 funded Nov,one saving s=5000 funded Nov. WHEN Dec 1 confirmed transfer THEN B=90000,A={Nov:0,Dec:90000},same o outstanding/R[Dec]=30000,same s S[Dec]=5000. F[Dec]=55000,daily=1774; sum(F)=90000-30000-5000=55000. Original identities/origins and funding history preserved; no reserve release, duplication, partial reserve or extra cash debit. Deferring transfer preserves o/s without recreation.

## HB1-016 — Nov 20 then Dec 2, combined update and transfer (BR-01/05/08)

GIVEN Nov 20 B=80000,A={Nov:60000,Dec:20000},o outstanding/R[Nov]=30000,S=0; NO observations Nov 21..Dec 1. WHEN Dec 2 observed B=75000 and user confirms transfer/full A={Nov:0,Dec:75000}. THEN sum(A)=75000,same o R[Dec]=30000,F[Dec]=45000,daily=1500 for 30 days. D=-5000 spans months and is NOT inferred Nov expense. No Nov 30 checkpoint, no requirement to create one, no assumption of zero late-Nov spending. History preserves Nov20 vector, Dec2 observation and Dec2 transfer consent; optional operation detail absent.

## HB1-017 — close November without Nov 30 bank observation (BR-08/11)

GIVEN state/history of HB1-016, WHEN user manually closes Nov on Dec 2 after transfer THEN v1 contains last historical observation B=80000 dated Nov20,known historical A={Nov:60000,Dec:20000} effective Nov20,R[Nov]=30000,S=0,bank_data_completeness=incomplete,end_balance=unknown/null. Historical allocated Nov free=30000 is labelled based on Nov20 known state, NOT confirmed Nov30 free. No retrospective daily bank points. Current B=75000,A={Nov:0,Dec:75000},F[Dec]=45000 remain unchanged. Neither Nov20 80000 nor Dec2 75000 is presented as Nov30 bank balance. HB-002 must specify detailed cutoff selection.

## HB1-018 — original history survives later transfer/correction (BR-08/11)

GIVEN Nov v1 closed on Dec1 using Nov20 checkpoint B=80000,A={Nov:60000,Dec:20000},R[Nov]=30000,S=0,end_balance unknown. WHEN Dec2 update/transfer of HB1-016 occurs THEN original v1 and its Nov allocation remain byte-for-byte accessible; active Nov A=0 does not erase v1. WHEN on Dec3 a synthetic historical Nov30 B=76000,A={Nov:56000,Dec:20000} is explicitly added, THEN latest bank remains Dec2 B=75000,current A unchanged,original v1 retained; reviewed v2 may use Nov30 evidence, historical Nov F=26000. No silent v1 replacement or Dec2 relabelling. Full historical revision algorithm remains HB-002.

## HB1-019 — later PDF across month boundary, no second debit (BR-09/11)

GIVEN HB1-016 checkpoints Nov20 B=80000/Dec2 B=75000,active A={Dec:75000},R[Dec]=30000,S=0. WHEN OPTIONAL approved statement entries -3000 on Nov25 and -2000 on Dec1 explain D=-5000 THEN K=-5000,U=0; bank/A still 75000,R=30000,F=45000,daily Dec2=1500. Partial approval only -3000 gives U=-2000 with same budget. Matching repeat PDFs or a prior manual record creates no duplicate movement/debit. Dates remain real bank dates, not financing months; A and original close versions stay unchanged. This is evidence-based attribution, unlike guessing Nov expenses from net D.

## HB1-020 — complete-vector invariant at every confirmation (BR-05/10/11)

GIVEN first-ever B=80000 and no details. WHEN draft A={Nov:60000,Dec:19000}, sum=79000, THEN reject confirmation with 1000 mismatch; no committed checkpoint/set, no suspense row/category. WHEN corrected A={Nov:60000,Dec:20000} THEN commit full vector=80000. WHEN new checkpoint B=75000 with A={Dec:75000} THEN commit sum=75000; when a new same-bank draft A={Dec:76000,Jan:-1000} is submitted,reject NEGATIVE_CASH_ALLOCATION even though sum=75000. A separate explicitly confirmed valid redistribution {Dec:74000,Jan:1000} sums75000. R=S=0,F equals each valid vector;no new revision from the rejected draft. Same id/payload retries add no revision, same id/different vector or stale expected revision reject atomically. All old full vectors remain inspectable, never summed together.

## Archived original coverage and evidence

The following record describes the pre-amendment revision and original completion only;its signed-input validity claims are superseded by D32..D35. It is not proof for the amended scenarios.



BR-01/02: 001/007/008/011/012/016; BR-03/07: 002/008/014/015; BR-04: ordinary forecast examples and explicitly pending 004/009/020 edge; BR-05: all full-vector sums, consent 010/014..016; BR-08: 010/017/018; BR-09: 001/005..007/019; BR-10/11: 007/009/012/020 plus all no-double-count/history assertions. Existing F-002 covers unchanged-balance paid warning; F-008 savings release; F-010/013/018 backdating/versioning. HB-002 and HB-003 still own detailed algorithms.

Verification for this revised document is recorded after local arithmetic/link/whitespace checks below. Earlier first-draft 28-assertion evidence does not validate this revision. Owner reports independent review of revision 2 and all 20 scenarios completed; the observation-date/statistics clarifications are incorporated. No application/unit/integration/browser/PDF parser test success is claimed.

### Local document verification — 2026-11-01, revision 2

- PowerShell in-memory expected-value tables: **77 arithmetic checks passed** — 27 complete month vectors, 32 equality/reserve/delta checks, 18 forecast quotient checks. Quotients use `System.Numerics.BigInteger.DivRem`, no floating-point money division. This verifies written synthetic examples, not implemented finance behavior.
- `Get-Content -Raw -Encoding utf8 docs/architecture.json | ConvertFrom-Json` plus declared-layer/finance-policy assertions passed; domain permits only shared-pure, operation detail/suspense/final-day requirements are false. No runtime import-lint enforcement claimed.
- Scenario heading scan passed: 20 unique HB1 IDs. Markdown link scan: 50 relative file targets exist; separate local-heading scan: 4 anchors resolve.
- `git diff --check` passed with repository line-ending settings. New ADR/scenario files separately checked with `git diff --no-index --check -- NUL <path>`: no whitespace diagnostics (exit 1 denotes no-index differences).
- `.vscode/extensions.json` SHA256 compared before/after: unchanged. No app code, dependencies, migrations or real financial data introduced. After owner-reported independent review and successful final local checks, ADR 0001 is Accepted and HB-001 is Done as a documentation/scenario task. A local documentation commit is authorized; no push. HB-002/HB-003 contracts remain pending.

Final acceptance recheck (2026-11-01): repeated all 77 arithmetic checks successfully; verified 20 unique scenario IDs, explicit HB1-014 checkpoint-date/count/UI oracles and HB1-011/012/014 statistics prohibitions. JSON/layer checks, 50 local file links and 4 anchors passed. Independent review completion and architecture approval are reported by the owner; this local verification is not an additional independent/runtime test run. Completion acceptance-to-scenario mapping and local commit reference are recorded in TASKS.md; liquidity remains open for HB-003.
