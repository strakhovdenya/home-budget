# HB-020 — First-run budget onboarding and recurring templates

Status: **Planned; documentation / scope update only**. Every scenario below is
**NOT EXECUTED**. No onboarding implementation or executable test is authorized
in HB-019 by this document. HB-020 retains its existing recurring-template scope,
P0 MVP priority under owner D45 (2026-11-04); Q-HB1-03 is resolved.
D47 (2026-11-08): HB-020 and HB-019.2 independently follow HB-019.1;
HB-021 requires both. These HB20 cases belong solely to HB-020; HB-019.2 owns
complete saved-state browsing. Existing A/B/T oracles remain unchanged.

Owner-approved addition: the admitted Google user can explicitly create their
first named budget, then confirm actual balance and complete allocations through
the existing financial mechanisms. This does not expand Google admission/public
registration, add a second account or authorize schema/architecture changes.

Sources: [HB-020 task](../../../docs/TASKS.md#hb-020--first-run-budget-onboarding-and-recurring-payment-templates),
[M2 plan](../../../docs/IMPLEMENTATION_PLAN.md#milestone-m2--first-usable-product-mvp),
[auth](../../../docs/AUTH.md), [financial rules](../../../docs/BUSINESS_RULES.md),
[HB-017](../../../docs/planning/hb-017-update-budget.md),
[F-016](core-rules.md#f-016--recurrence-proposal-not-duplicate).

## Shared fixture and proof rules

Use synthetic data only, integer EUR cents and Europe/Berlin calendar dates.
P is the current server month, Q the following month, M the previous month;
browser dates derive from the server, never a calendar bypass. The admitted
Google identity is a reviewed isolated test identity; existing allowlist,
verified-subject/session and Origin/CSRF protections remain enabled.

The first login creates only the existing authenticated user identity. Account
creation is a separate explicit action. Ownership comes only from the trusted
server session, never a client email/user/account field. With no confirmed bank
checkpoint, actual balance, allocations and free funds are **unknown**, not zero.
No obligations/savings initially exist (R=S=0), and no financial history is invented.
An auditable account-creation event records the real user action; it is not a bank
checkpoint, income/expense, period allocation or closed-month report.

Account creation and the first financial confirmation are two resumable steps.
Atomic account creation means account identity/name/owner, required real creation
audit and durable retry outcome are committed coherently or not committed at all.
It does not require committing the initial bank balance in that transaction.
The exact command/receipt contract, name normalization/bound and PostgreSQL
duplicate/race mechanism must be specified in HB-020 planning before coding.
Process-local memory, a disabled button or a pre-insert existence check alone
cannot provide the required cross-instance duplicate guarantee.

Proof labels below are required future evidence: **PG** real isolated PostgreSQL,
**A** auth/server-boundary tests, **B** real browser E2E, **U/C** unit/component.
An unavailable runtime remains NOT EXECUTED. Later implementation must register
actual executable identities and fresh normative hashes in finance coverage;
this future specification is not a passing mapping or HB-019 verification update.

## HB20-A01 Admitted first login offers a usable creation screen

Proof A/PG/U/C; browser counterpart B01.
GIVEN an admitted Google identity, no owned account and no financial facts.
WHEN the first login completes and the protected budget page loads.
THEN show a clear localized "Create budget" screen with a labelled name field
and confirmation action, rather than a dead-end NO_ACCOUNT. Only the existing
user identity may have been provisioned by login; account count remains zero
until explicit creation. No checkpoint, allocation, obligation, saving, income,
expense, transfer or report is synthesized. Storage/auth failure is an error
with safe retry, not evidence of account absence or permission to create.

## HB20-A02 Explicit named creation commits one empty owned budget

Proof PG/A/U/C.
GIVEN A01 and a valid bounded synthetic name "Household test".
WHEN the authenticated owner explicitly confirms creation.
THEN commit exactly one EUR budget account with that validated name and session
owner, a real creation audit and coherent retry outcome in one transaction.
No bank checkpoint or allocation pointer exists; balance/A/F remain unknown,
R=S=0. Continue to existing initial balance/allocation setup. No automatic
recurring acceptance, historical import, income or expense is created.

## HB20-A03 Invalid names and unauthorized creation write nothing

Proof A/PG/U/C.
GIVEN no owned budget. WHEN submit blank/whitespace or a name beyond the approved
bound; or call creation directly with no session, expired session, denied Google
identity, forged owner/account fields or invalid Origin/CSRF context.
THEN refuse safely with no account/creation audit/receipt or financial mutation.
Do not reassign another user's identity/account or disclose their data. Reading
the creation page is not authorization for a later write; reauthorize each action.
Preserve a valid editable name on recoverable UI errors without logging secrets.

## HB20-A04 Original retry returns the same account across instances

Proof PG/A.
GIVEN a committed account-creation command and original request identity/name.
WHEN repeat it after refresh or through another application instance.
THEN return the original owned account/outcome, with no second account, duplicate
creation audit or financial fact. Reusing the same request identity with a
different name is a conflict; it must not rename the committed account. Retrying
setup must not restart Google identity provisioning or create another budget.

## HB20-A05 Concurrent create requests cannot produce a second account

Proof PG/A; actual independent connections and synchronization barrier required.
GIVEN one admitted owner and zero accounts. WHEN two tabs/instances confirm
creation concurrently, both with the same request identity and separately with
different identities/names.
THEN at most one first account and coherent creation audit/outcome commit. A
successful replay refers to the same account; a losing different request may
receive an already-created/conflict result and safely resolve the owned account.
Its different name must not overwrite the winner. Do not merge names/ownership,
create a second account or rely on a client lock. Other owners remain unchanged.

## HB20-A06 Creation rollback and unknown COMMIT recover safely

Proof PG/A/U/C.
GIVEN zero accounts. WHEN inject failures between account insert, required audit
and durable outcome, before commit, THEN the complete creation transaction rolls
back; the previously authenticated user remains valid and can retry creation.
No dangling account, fake success, partial audit or financial state remains.
Separately lose the acknowledgement after real COMMIT: retain the original
request identity, resolve its outcome/owned account and resume; do not blindly
issue a new creation command. Fresh connections must recover the single account
without changing its name or generating any financial history.

## HB20-A07 First actual balance uses the existing financial flow

Proof PG/A/U/C; browser counterpart B03.
GIVEN the successfully created empty account, no checkpoint, R=S=0.
WHEN the user explicitly confirms actual B=100000 on a valid bank date and the
complete A={P:70000,Q:30000} through HB-010/HB-017 initial-update mechanisms.
THEN one real checkpoint/complete allocation revision and required audit commit
atomically; sum(A)=B, each A>=0, F[P]=70000 and F[Q]=30000. Future-month cash is
protected once and does not inflate current-month daily guidance. No difference
is classified as income/expense; no automatic bank debit or rollover occurs.
Separately B=0 with A={P:0} is accepted only after explicit real confirmation;
this known zero must differ from the account's earlier unknown balance.

## HB20-A08 Incomplete or failed financial setup is resumable

Proof PG/A/U/C.
GIVEN A02 has committed but no actual balance is confirmed. WHEN cancel, close
the tab, log out/in, reload or submit an invalid partial allocation (B100000,
A totals90000), THEN retain the same valid empty account, no partial checkpoint/
vector/financial receipt, and a clear continuation into initial setup. Never
replace unknown funds with zero or send the owner back to create a second account.
If the first valid financial COMMIT acknowledgement is lost, use HB-017's original
command/status/replay mechanism; resolve the one financial update without a new
checkpoint or duplicate bank movement. Earlier confirmed facts are not overwritten.

## HB20-A09 Existing users and accounts are unchanged

Proof PG/A; browser counterpart B04.
GIVEN an existing owned account with confirmed synthetic checkpoint, allocations,
obligations/savings, audits and immutable closing versions. WHEN log in, reload,
open first-run entry or directly request first-account creation.
THEN use the existing owned budget or safely refuse duplicate creation; do not
rename, reset counters/pointers, rewrite history or touch financial rows. Preserve
existing user identity/preferences as well; compare user/account/history data
before/after. An existing empty account resumes
setup instead of creation. Unexpected inconsistent/multiple-account legacy state
must not trigger automatic selection, deletion or repair; use a safe error and a
separate reviewed procedure. This feature does not introduce multi-account support.

## HB20-B01 Browser first Google login through first budget creation

Proof B; not replaceable by auth/component results.
GIVEN reviewed isolated Google sign-in setup and no owned budget.
WHEN complete the normal admitted sign-in, enter a synthetic budget name and
confirm creation using keyboard and pointer on mobile/desktop in RU/DE/EN.
THEN labelled/focusable "Create budget" UI, clear pending/error feedback, one
account and a usable initial-finance step. No terminal NO_ACCOUNT or invented
zero balance. Keep secrets/name/financial values out of URLs and diagnostic logs.
No production auth bypass or disabled allowlist/Origin/CSRF checks for this test.

## HB20-B02 Browser validation, double submission and recovery

Proof B with PG state verification.
GIVEN first-run creation form. WHEN submit invalid names, double-click/press
Enter repeatedly, confirm in two tabs and interrupt a response, THEN show useful
accessible errors/pending state, preserve recoverable input, and permit safe
continuation. Verify the single account/name/outcome, not just a disabled button.
Never conceal an unknown outcome behind an unconditional success or a new create.

## HB20-B03 Browser resume through first real balance confirmation

Proof B with PG state verification.
GIVEN an empty created account. WHEN cancel/relogin before confirming money,
THEN resume the same account's initial setup. Reject incomplete allocations
without partial financial state; then complete A07 via the existing flow.
Show the confirmed actual balance/date and correct period amounts; require no
bank operation explanation, PDF or artificial initial checkpoint. Distinguish
explicit B0 confirmation from unknown. No automatic recurring item is created.

## HB20-B04 Browser regression for established accounts

Proof B with PG state verification.
GIVEN A09. WHEN normal Google login and navigation continue, THEN the existing
budget remains usable with unchanged money, history and name; no forced creation
or repeated onboarding confirmation. Unauthorized/expired sessions cannot use
an already-open creation form to write. A storage failure offers safe retry,
never a misleading invitation to create another budget.

## HB20-T01 Recurring proposal requires confirmation and is not duplicated

Proof PG/A/U/C/B; retains F-016.
GIVEN an enabled monthly5400-cent template and a confirmed P obligation from it.
WHEN reload/reopen proposals or accept/retry/concurrently accept template+P,
THEN at most one accepted obligation for that template+period, no automatic
acceptance and no bank debit. Future-period/new-income suggestions remain
proposals; expected income never funds today's allocations or daily forecast.
First-run account creation itself accepts no template or obligation.

## HB20-T02 Edit or skip recurring suggestion remains explicit

Proof PG/A/U/C/B.
GIVEN a5400-cent template proposal for P and an existing confirmed bank state.
WHEN explicitly edit to5000 and accept, THEN create one confirmed5000-cent
obligation with full outstanding reserve through existing financial mechanisms,
not both5000 and5400 items. WHEN instead skip, THEN create no obligation/reserve
or bank movement for that proposal. Neither choice silently changes the template,
actual checkpoint or unrelated obligations; keep the real decision auditable.

## HB20-T03 Old debt and a new month's accepted bill stay distinct

Proof PG/A/U/C/B; retains F-016 and full-reserve/history rules.
GIVEN an unpaid5400-cent M bill and a separate proposed5400-cent P bill.
WHEN accept the P proposal, THEN retain two independent obligations and their
full outstanding amounts/origin/funding history. Do not merge, auto-pay, cancel
or erase the old debt, fabricate income, debit the bank or close a month.
Payment/carry/correction remains a separate explicit existing financial action.

## Future acceptance gate and exclusions

Implement HB-020 only after its scoped plan reviews the authorization entry,
name validation, durable command identity/status/replay and PostgreSQL atomic/
race guarantees, including any necessary separately reviewed schema proposal.
No process-local-only duplicate protection, new finance engine or auth bypass.
Run real PG/auth/browser first-run scenarios and recurring regressions; record
exact executed results and remaining gaps. Do not infer PASS from this document.
HB-021 broad browser QA does not waive HB-020's own first-run acceptance checks.
No HB-019 code/test/report change, bank import, public registration, account
deletion/renaming, second budget account or publication is part of this scope update.
