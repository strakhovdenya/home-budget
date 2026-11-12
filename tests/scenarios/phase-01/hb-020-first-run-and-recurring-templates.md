# HB-020 — First actual budget confirmation and monthly obligation templates

## D57 scenario refinement — 2026-11-12

All original 17 IDs and financial/H/K oracles remain. For HB20-T01–T03/F-016, P is the loaded proposal context YYYY-MM (default current Berlin month). Initial ACCEPT origin=funding=P; no two editable month fields. Show P in offer/review and permit amount editing; refreshing another context cannot retarget an already reviewed command. Unequal origin/funding, malformed period, changed original command, stale config/revision or forged scope must refuse without writes. DECLINE remains only for P. Test a noncurrent valid P using a current-day event, leap February, Berlin/DST and int64 boundaries without changing ordinary date policy. Old unpaid M remains unchanged/full-reserved; moving its funding is a separately confirmed existing FRESH_START/CARRY, and D44 still rejects combined same-identity lifecycle. Code/tests and actual results are in the verification report; historical NOT EXECUTED stage labels below are not current runtime evidence. Browser/physical AT still require their own execution.

Status: **Planned; documentation alignment only** under owner D55 / D56 (2026-11-11).
Every scenario below is **NOT EXECUTED**. Owner reports independent approval of
the R1 plan and authorizes this coordinated specification update, not code,
executable tests, migration, publication, acceptance or Done. HB-020 remains P0;
HB-019.2 and HB-020 independently follow HB-019.1, and HB-021 waits for both.
D54's HBH browser handoff does not waive HB-020's own browser proofs.

Sources: [D56](../../../docs/DECISIONS.md#hb-020-monthly-decisions--owner-2026-11-11), [D55](../../../docs/DECISIONS.md#hb-020-product-alignment--owner-2026-11-11),
[task](../../../docs/TASKS.md#hb-020--first-run-budget-onboarding-and-recurring-payment-templates),
[R1 plan](../../../docs/planning/hb-020-first-run-and-recurring-templates.md),
[BR](../../../docs/BUSINESS_RULES.md), [auth](../../../docs/AUTH.md),
[F-016](core-rules.md#f-016--recurrence-proposal-not-duplicate),
[RESOLVED Q-HB20-NEW-INSTANCE](../../../docs/OPEN_QUESTIONS.md#hb-020-monthly-instance-suggestion--resolved-d56).

## Shared fixture and proof rules

Synthetic data only; all amounts integer EUR cents, dates Europe/Berlin.
P=current server month, Q=following month, M=previous month. Browser dates derive
from server calendar, never an auth/calendar bypass. Google identity/client/
redirect and synthetic DB must be reviewed and isolated; keep verified allowlist,
subject/session, Origin/Host and Auth.js CSRF/PKCE/state/nonce protections.

First login provisions only the existing authenticated users identity. Before
first confirmation B/A/F and daily guidance are UNKNOWN, not0; no obligations/
savings exist, so R=S=0. First-run UI asks for real B, actual observation date
and complete nonnegative A, with one explicit reviewed confirmation. There is
no public Create budget/name step. Any missing single owned EUR technical
account with stable internal displayName commits atomically with the first real
checkpoint/vector, required creation/financial audits and durable receipt.
No account on login, preliminary hidden account COMMIT, fictitious bank point,
income/expense or automatic template acceptance. A real explicit B=0 is distinct
from unknown. Existing empty account resumes actual confirmation without rename/
recreation; existing initialized budget stays unchanged by first-run entry.

Owner comes only from trusted session, never client owner/account/name/currency.
Account/first C/V/audit/receipt commit together or all roll back. Original command
identity/status/replay and cross-instance owner-level exclusion are required.
Different-key losing first-run command cannot silently become another financial
update. NOT_FOUND while a command is in flight is not proof of rollback.
Technical composition is specified in R1, not an already working HB-017 API.

Monthly template is explicit title/amount/origin/funding entry convenience.
Template-created dueDate=null; ordinary optional dueDate elsewhere is unchanged.
No payment-day schedule, income/receipt trigger, inferred income or card debit.
Ignoring/closing is local UI only: no server write, skip entity, audit, receipt,
seq/counter or reserve. Explicit DECLINE is different: durable terminal month-only
decision with typed audit/receipt, no obligation or money change. Only ACCEPT
creates a full-reserve ordinary obligation. One final ACCEPT or DECLINE may win
per owner/account+templateId+originPeriod, never both, even with races/retries.
An enabled template offers next month despite old debt or prior DECLINE. Disable
stops offers but retains obligations/decisions/history. Old debt keeps identity,
full remainder/reserve, origin/current funding and history; only explicit existing
FRESH_START/CARRY and D43/D44 may change funding. See T01–T03/F-016.

Proof labels: **A** auth/server/request boundary; **PG** real isolated PostgreSQL;
**U/C** unit/component; **B** real browser. Compare all relevant rows before/after,
not just account count: users/preferences, accounts/counters/pointer, batches/
receipts/audits, periods, C/V/A, positions/orderings, obligations/savings and events,
transition controls/transfers and report heads/immutable versions. No-write
requires exact equality; allowed writes must be explicitly whitelisted. Real
races use independent checked-out connections/backend PIDs and a barrier with
proven overlap; a disabled button/Promise.all/process mutex is not proof.
Ack-loss proof executes real COMMIT then loses its acknowledgement and recovers
on a fresh owned connection, separately from full rollback and still-running cases.

All financial invariants remain: ΣA=B, each A>=0, full R/S even if F<0, no
future expected cash, no duplicate debit, no automatic funding/payment/closing,
original H/K/revisions/versions intact. Use current safe-main formula unchanged.
No unit/auth/PG/browser/runtime checks are run by this specification update.

## HB20-A01 Admitted first login offers actual balance and complete allocation

Proof A/PG/U/C; browser counterpart B01.
GIVEN an admitted Google identity, no owned account and no financial facts.
WHEN normal first login and protected first-run page/preview complete.
THEN show labelled localized actual B/date/full-A input and clear explicit
confirmation; no Create budget/name field, terminal NO_ACCOUNT or numeric zero
cash. Login may provision only the existing user identity. Account count0 and
all financial/audit/receipt tables unchanged until valid explicit confirmation.
Storage/auth/multiple-account error fails safely, not invitation to create.

## HB20-A02 First real confirmation atomically initializes owned budget

Proof PG/A/U/C; browser counterpart B01.
GIVEN A01 and actual B100000 on a valid observation date with complete confirmed
A={P:70000,Q:30000}, R=S=0.
WHEN the session owner explicitly confirms that reviewed real observation/vector.
THEN one owned EUR technical account/internal stable name, one real checkpoint,
one complete vector, required account/financial audit and coherent receipt
commit in one transaction. No durable intermediate empty account or second
confirmation/hidden COMMIT. ΣA=B, F[P]=70000,F[Q]=30000; original observation and
recorded time remain separate. No invented income/expense, template acceptance,
transfer, payment, savings or report. Existing users/preferences/foreign data
unchanged. Technical original identity/proof follows the reviewed R1 contract.

## HB20-A03 Invalid inputs and unauthorized first confirmation write nothing

Proof A/PG/U/C.
GIVEN no owned budget. WHEN submit malformed/fractional/overflow/negative B or A,
future/invalid observation date, duplicate month, missing complete-vector consent
or B100000 with A total90000; or call without valid session/allowlisted identity,
with forged owner/account/name/currency fields or invalid Origin/CSRF context.
THEN safe refusal and exact no-write across account, C/V/A, audit, receipt and
every other financial table. No foreign identity reassignment/disclosure.
Reauthorize each action, not only page load; preserve valid editable in-memory
financial input on recoverable errors without URL/log/persistent browser storage.

## HB20-A04 Original first-confirmation retry returns the same complete outcome

Proof PG/A.
GIVEN committed atomic first confirmation with original key and normalized B/
observation/A/consent. WHEN retry via another instance or after refresh, or use
owned status, THEN prove and return the original account/C/V/receipt without
duplicate audit, counter, checkpoint or financial movement. Same key with changed
B/date/vector is conflict, not a correction or new observation; no internal label
rewrite. Original-date replay remains valid before new calendar/stale checks.
No restart of user provisioning or blind new command after UNKNOWN.

## HB20-A05 Concurrent confirmations cannot create another budget or bank check

Proof PG/A; independent connections/backend PIDs and synchronization barrier.
GIVEN one admitted owner, zero accounts. WHEN two confirmed requests overlap,
with same key/payload and separately different keys/B/A.
THEN at most one account and initial C/V/audit/receipt commit. Identical replay
returns the original; different-key loser resolves existing initialized budget
or conflicts without recording its B/A as a second check, changing winner
values/counters or creating another account. Winner rollback permits the next
explicit valid confirmation to proceed. Foreign owners/data unchanged.
No client-only lock, pre-insert existence check alone or process-local guarantee.

## HB20-A06 Whole initialization rollback and unknown COMMIT recover safely

Proof PG/A/U/C.
GIVEN zero accounts and the existing admitted user identity.
WHEN inject failures after account/batch/checkpoint/vector/audit insertion or at
deferred COMMIT, THEN account and all newly introduced financial/audit/receipt/
counter state roll back together. User remains valid; no fake success, empty
durable workspace, orphan or partial observation remains.
Separately execute real COMMIT and lose acknowledgement. Retain original key/
command, resolve full original outcome on a new authorized connection and resume
the one initialized budget; no new key/checkpoint/bank movement. A read returning
NOT_FOUND while original remains uncommitted never proves rollback or success.

## HB20-A07 First actual money obeys existing financial invariants

Proof PG/A/U/C; browser counterpart B03.
GIVEN first-run no-account state (or an existing empty owned account).
WHEN explicitly confirm B100000 on actual valid date and A={P:70000,Q:30000}
using reused HB-010/HB-017 validators and the reviewed atomic composition.
THEN one actual checkpoint/complete allocation and required audit/receipt commit;
missing account is included atomically, existing empty account is not recreated.
ΣA=B, every A>=0, R=S=0,F[P]=70000,F[Q]=30000,safeAvailable=70000;
mainDaily=70000 div inclusive remaining Berlin days. Protect Q once; no inferred
income/expense, debit or rollover. Separately explicit real B0/A={P:0} produces
known0 only after confirmation; earlier UNKNOWN never defaults to this value.

## HB20-A08 Interrupted first confirmation resumes from honest saved state

Proof PG/A/U/C; browser counterpart B03.
GIVEN no account and an unconfirmed first-run draft. WHEN cancel/close/reload/
logout-login or submit B100000/A total90000, THEN no new account/C/V/audit/receipt
is saved; read persisted absence and offer initial real input, still UNKNOWN.
Do not promise unsaved draft recovery after reload. GIVEN a successful atomic
confirmation, reload/relogin resumes the same complete saved state; lost
acknowledgement uses original status/replay with no second checkpoint.
Separately GIVEN a pre-existing empty owned account, invalid/cancelled financial
setup retains that exact account and unknown funds; fresh valid review uses
existing financial confirmation without recreation, rename or stale retargeting.
Never overwrite earlier confirmed facts or manufacture an empty stage.

## HB20-A09 Existing users and accounts remain unchanged

Proof PG/A; browser counterpart B04.
GIVEN existing owned account with synthetic C/V, full R/S, audits and immutable
closing v1/v2. WHEN login/reload/open first-run entry or directly request stale
first initialization, THEN use the existing budget or safely refuse; exact
before/after data equality for user/preferences/account/name/counters/pointer/
financial/history rows, no extra checkpoint or account. Existing empty resumes
actual confirmation. Unexpected multiple/inconsistent accounts fail safely,
with no selection, deletion, reset or repair. No multi-account support added.

## HB20-B01 Browser first Google login through one actual confirmation

Proof B; not replaceable by auth/component results.
GIVEN reviewed isolated Google sign-in/redirect and synthetic DB, no owned budget.
WHEN complete normal admitted login, enter actual B/date/complete A and confirm
once using keyboard/pointer on mobile320px/desktop in RU/DE/EN.
THEN accessible labelled financial form and review, clear pending/error feedback,
one account with one real complete first update and usable budget. No public
Create budget/name step, fabricated0 or account created on login/preview.
Check visible actual date and persisted C/V/receipt. No money/IDs/secrets in
URL/logs and no allowlist/Origin/CSRF/auth bypass.

## HB20-B02 Browser validation, repeated submission and result recovery

Proof B with independent PG before/after state verification.
GIVEN actual-balance/full-A first-run form. WHEN invalid B/date/allocations,
double-click/repeated Enter, two-tab confirmations and interrupted response.
THEN useful accessible inline errors/focus/pending/UNKNOWN, retained recoverable
input and safe original-result checking. Verify single account/actual C/V/winner
amount/date/vector/receipt, not merely disabled controls. No unconditional success,
assumed rollback, automatic new key/checkpoint or hidden partial account save.

## HB20-B03 Browser cancel/relogin and known-zero real confirmation

Proof B with PG state verification.
GIVEN uncommitted no-account first-run draft. WHEN cancel/reload/logout-login,
THEN absence/UNKNOWN remains honest and first real input is offered again.
Reject incomplete A with no account/partial facts, then explicitly confirm A07
in one action. Verify real B/date/P-Q free and complete receipt.
Separately resume an already-existing empty account without recreating/naming it.
Distinguish explicit B0 from UNKNOWN; interrupt real financial acknowledgement
and resolve original once. No required operation explanation/PDF, artificial
checkpoint or automatic recurring bill.

## HB20-B04 Browser regression for established accounts and expired forms

Proof B with PG state verification.
GIVEN A09. WHEN normal admitted Google login/navigation/history continue,
THEN existing budget/name/money/history remain usable unchanged; no forced
first-run confirmation. Expire session on an already-open financial form and
invoke it directly: no unauthorized write. Storage error offers safe retry,
never misleading absence/creation. No change to normal Google/Origin/CSRF checks.

## HB20-T01 Explicit template acceptance is inert until confirmed and unique

Proof PG/A/U/C/B; retains F-016. Every subcase is NOT EXECUTED.
GIVEN B100000,A={M:0,P:70000,Q:30000},R=S=0 and enabled5400-cent template,
no P decision. WHEN load/reload/open suggestions, THEN exact all-table no-write,
no reserve, automatic ACCEPT/DECLINE, income, schedule or debit.
WHEN explicitly ACCEPT P5400 funded P, THEN one normal UNPAID identity/CREATE,
dueDate=null, full R[P]=5400,F[P]=64600,safeAvailable64600; B/A/C/V,S, bank date
and unrelated debt unchanged. One receipt proves original reviewed command,
config/origin/funding and exact CREATE through the unchanged obligation adapter.

**Repeat/key stability.** Same-key ACCEPT under original or different request
resolves the proved original without duplicate obligation/audit/receipt/counter.
Changed same-request payload conflicts. Competing5400/5000 accepts yield one
proved winner, no hidden amendment. Config/amount/funding edits, PAID/CANCELLED
or disable/re-enable never reset P. First-run accepts no template; ordinary
optional dueDate elsewhere stays. Each action reauthorizes trusted owned scope.

**ACCEPT / DECLINE race.** Independent checked-out PG connections, backend PIDs
and a synchronization barrier prove overlap, in both lock orders, with same and
different request IDs. Exactly one terminal outcome commits. ACCEPT winner has
one full-reserve CREATE; DECLINE winner has zero CREATE and exact unchanged
financial state. Losing request conflicts or explicitly resolves the proved
winner, never reports its own uncommitted intent as success. Same-request changed
payload conflicts. Compare all rows/counters/evidence, not disabled UI controls.

**Failure/UNKNOWN/auth.** Inject decision/CREATE/audit and deferred-COMMIT failures:
all new writes roll back. Separately execute actual COMMIT then lose its ack;
READ/STATUS/original retry on a fresh authorized connection proves original
winner with no new key or bill. NOT_FOUND while in flight proves neither rollback
nor success. Foreign/expired session, forged scope, invalid Origin/CSRF, invalid
month/config or malformed input writes nothing and leaks no foreign decision.
Real browser covers review/confirm/revisit/two tabs/conflict/UNKNOWN with PG proof.

## HB20-T02 Edit before acceptance, durable monthly DECLINE or local ignore

Proof PG/A/U/C/B. Every subcase is NOT EXECUTED.
GIVEN T01 baseline. WHEN edit5400→5000 before review/ACCEPT P, THEN one full
R[P]=5000,F[P]=65000,safeAvailable65000; template still5400,B/A/C/V/S and other
obligations unchanged. Fractional/overflow/nonpositive cents refuse with no write.
WHEN close/ignore without DECLINE, THEN exact no-write including no audit/receipt/
counter/reserve/saved suppression. Reopening may offer again, never auto-accepts.

**Durable month-only decline/repeat.** From an undecided T01 baseline explicitly
choose «Не добавлять за этот месяц» P. THEN one durable terminal DECLINE with
scope/template/origin/config/original-command typed proof/audit/receipt, zero
obligation/CREATE/position/payment/bank operation. B100000,A/C/V,R=S=0,F[P]=70000,
safeAvailable70000,bank date and report heads/immutable versions exactly unchanged.
Only required decision batch/audit/receipt/account counters are whitelisted writes.
Reload/relogin/another instance suppresses only P. Repeat same or new request ID,
including overlapping DECLINE/DECLINE, returns original without extra audit/
receipt/counter. Changed original payload conflicts. ACCEPT cannot overturn
DECLINE; DECLINE after ACCEPT cannot erase its obligation or reserve (T01 race).

**Already paid before access.** GIVEN the actual earlier payment is already in
confirmed B100000 but no P obligation/decision was recorded, WHEN explicitly
DECLINE P, THEN same financial no-change oracle: no invented payment date/history,
bank transaction, income or second debit. DECLINE itself proves no payment.
If P obligation already exists, DECLINE is unavailable/refused; use existing
Paid/Partial/Cancelled with its required bank-state confirmations.

**Next month/disable/cancel.** Advance injected Berlin month P→Q after DECLINE P:
the enabled template offers Q on read with exact no-write. ACCEPT Q creates one
Q bill only on explicit review; DECLINE Q independently suppresses Q. Disable
is a separate audited config change: future offers stop, prior obligations,
decisions/history and immutable reports remain. Re-enable never resets decided
P/Q. Cancelling an accepted Q obligation is a separate lifecycle event, releases
its reserve without bank debit or deletion of decisions; normal confirmation
rules remain. Physical template deletion/history erasure is outside scope.
Real browser distinguishes all controls, reload/relogin suppression, next-month
offer and pending/error/UNKNOWN. DECLINE also needs T01 failure/real-ack-loss/auth
oracles and proof the obligation writer was never invoked.

## HB20-T03 New month offers a distinct bill while old unpaid debt remains

Proof PG/A/U/C/B; retains F-016, full reserves/history and D43/D44.
Every subcase is NOT EXECUTED.
GIVEN B100000,A={M:0,P:70000,Q:30000},S0,enabled5400-cent template and accepted
unpaid M5400 bill funded M. WHEN calendar becomes P and suggestions load, THEN
P is offered despite old debt, exact all-table no-write. WHEN explicitly ACCEPT
P5400 funded P, THEN two distinct identities/origins/full reserves, R[M]=5400,
R[P]=5400,Rtotal10800,F[M]=-5400,F[P]=64600,F[Q]=30000,safeAvailable59200.
Old identity/status/amount/origin/current funding/history, B/A/C/V/S and bank date
remain unchanged. Historical funding never changes to make P fit. If old funding
was explicitly moved P beforehand, R[P]=10800,F[P]=59200 and same safeAvailable;
template never performs that move. If old partial remainder4000 instead,
Rtotal9400,F[M]=-4000,F[P]=64600,safeAvailable60600, old identity/history retained.

**Decline alternative.** From old-debt baseline with no P decision, DECLINE P
suppresses only P, no new obligation; old R5400 remains exactly, F[M]=-5400,
F[P]=70000,safeAvailable64600. No old payment/cancellation/funding transfer,
money or report mutation. Next enabled Q offers independently of DECLINE P and
still-unpaid M; read writes nothing. Disable stops offers without changing debt
or decisions (T02). No merge, automatic pay/cancel, income, debit, savings release
or close. Funding requires explicit existing FRESH_START/CARRY consent.
Reject same-identity funding+lifecycle atomically under D44; retain draft for
separate later explicitly confirmed lifecycle update.

**History.** At K before decision it is absent; after commit exactly one outcome
is reachable with config/origin/CREATE refs for ACCEPT or audit-only month
membership for DECLINE, no invented bank evidence. Original/later daily H/K,
old/new sources, complete pagination/filter membership and immutable closing
v1/v2 stay reachable. T01/T02 repeats/races/rollback/UNKNOWN remain required;
real browser must show new-month offer with old debt and explicit decisions.

## Future acceptance gate and execution boundary

Before implementation, independently review atomic no-account composition,
original financial/creation proof/status/replay and outer UNKNOWN classification.
The approved R1 exact-schema adapter must derive {changes:[one CREATE]} for
unchanged parseObligationBatch/writeObligations on the same tx/batch; validate
outer command, prepared provenance and copied outer/inner/actual CREATE mapping
with one receipt. No template-field parser expansion or second transaction.
Storage A/B stays unselected: A needs complete bounded semantic proof and account
lock for BOTH outcomes; B scoped decision tables/UNIQUE across both outcomes
require separate consent/migration review. Neither option is selected.
DECLINE uses only typed decision/audit/receipt, never the obligation writer;
original proof/status/UNKNOWN and final cross-outcome exclusion are required.
History must expose technical creation/config/ACCEPT/DECLINE sources and month
membership without false bank checks, dropped controls or changed H/K/reports.

Retain all17 original IDs (16 HB20 IDs plus core F-016) and all real
auth/unit/component/PG/browser proof requirements.
Run such tests only at a separately authorized later implementation stage;
unavailable proof stays NOT EXECUTED. D54/HB-021 does not replace B01–B04.
Normative hashes are intentionally stale after this documentation alignment;
do not edit Finance Gate/checker/CI/bindings/receipts/evidence or claim old PASS
as new proof. Later separately authorized maintenance/fresh checks are required.
Runtime tests: NOT RUN (documentation-only, owner instruction).
No implementation, executable test, SQL, production change, publication or Done.
