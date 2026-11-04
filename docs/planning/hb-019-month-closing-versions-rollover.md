# HB-019 — Manual month closing, versions and rollover

**Status: planning proposal; implementation NOT AUTHORIZED.** Prepared 2026-11-04.
HB-019 remains Planned. Independent ChatGPT review and separate owner permission
are required before implementation. This document and the
[HB19 scenarios](../../tests/scenarios/phase-01/hb-019-month-closing-versions-rollover.md)
are the only deliverables. No runtime tests were executed in this planning turn.

**Planning correction R1:** owner supplied independent ChatGPT review
CHANGES REQUESTED, Critical0/High1/Medium3/Low0. These corrections await repeat
independent review; no reviewer approval is claimed.

## Baseline, authority and scope

At inspection, branch `main`, HEAD, local `main` and cached `origin/main` all equal
`3288ce91ba197d52ac51de036e1bccea55420a4f` (HB-018, PR #19); tracked/untracked
worktree initially clean. `git ls-remote origin refs/heads/main` failed because the
shell could not connect to GitHub. A read-only connected GitHub GET of
`https://api.github.com/repos/strakhovdenya/home-budget/branches/main` independently
returned that same SHA. No fetch, pull, checkout, stash, reset or cleanup occurred.
Ignored `.vscode/`, `tmp/` and all existing local files are retained. If the remote
moves before implementation, inspect the new diff and rebase the plan by review;
do not reset local work. This observation is not a continuing synchronization claim.

Authority, in order: [business rules](../BUSINESS_RULES.md), Accepted
[ADR0001](../adr/0001-checkpoints-and-allocations.md),
[ADR0002](../adr/0002-month-closing-and-corrections.md),
[ADR0003](../adr/0003-daily-forecast-and-liquidity.md), owner
[decisions](../DECISIONS.md), [questions](../OPEN_QUESTIONS.md),
[PRD](../PRD.md), [task register](../TASKS.md),
[implementation plan](../IMPLEMENTATION_PLAN.md), [architecture](../ARCHITECTURE.md),
[layer declarations](../architecture.json), [data model](../DATA_MODEL.md),
[database contract](../DATABASE.md), [conventions](../conventions.md),
[agent workflow](../AGENT_FACTORY.md) and [Codex workflow](../CODEX_WORKFLOW.md).
Older delivery-state paragraphs are chronology; actual source and current task
acceptance determine implementation inventory. D32–D35 and D36–D39 are settled.

Applied project-local skills: `create-planning-doc`, `create-scenarios`,
`verify-financial-invariants`, `define-architecture`, `security-best-practices`,
`configure-project`, `vercel-react-best-practices`, `web-design-guidelines`.
Architecture/configuration edits suggested by generic skill steps are superseded
by the owner's two-document-only instruction. Next.js/React security references
and React auth/serialization/request-state/parallel-read guidance inform the plan;
installed APIs and accepted project contracts take precedence. The
[web interface checklist](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)
was fetched for UI planning; implementation must recheck it. No package upgrade,
new library, provider, architecture rewrite or broad security remediation is proposed.

Requirements: BR-01/02/03/04/05/06/07/08/09/10/11, principally BR-08;
[HB2-001–046](../../tests/scenarios/phase-01/hb-002-month-closing-and-corrections.md),
[F-009/F-013](../../tests/scenarios/phase-01/core-rules.md).
Retain HB-013/014/017/018 behavior. HB-018's owner-accepted browser B01–B07 and
physical screen reader NOT EXECUTED are not HB-019 evidence. Accepted HB17-A03
remains unchanged. No commit/push/PR/merge/deploy, Neon/production, real finances,
environment-file/secret access or Docker inspection is authorized by this plan.

## Actual reuse and gap matrix

Paths in this matrix are relative to repository root. “Implemented” means source
exists; it is not a new claim that its tests passed today.

| Capability | Actual source / contract | Classification and HB-019 consequence |
|---|---|---|
| Exact cents, Gregorian months, Berlin conversion | `src/domain/money/{money,money-codec}.ts`, `src/domain/periods/period.ts`, `src/shared/pure/{calendar,berlin-date,instant}.ts` | Implemented; use existing checked bigint/string primitives, not floating money or +24h days. |
| H/K bank/vector selection | `src/domain/checkpoints/history.ts`: `correctionTips`, `indexHistory`, `selectState`, `validateHistoricalStates` | Implemented: correction-before-H, immutable order manifests, anchor conflict refusal, unknown end; no closing DTO/validator yet. |
| Historical earmarks and original evidence | `src/domain/obligations/{history,lifecycle}.ts`, `src/domain/savings/{history,evidence,lifecycle}.ts`; DB `obligation-history.ts`, `savings-history.ts`, `funding-evidence.ts` | Implemented full-state histories/payment/savings/funding proof. Reuse whole suffix validation; never replay deltas through newer full states. |
| Coherent bounded read | DB `projection-reader.ts`: `createProjectionRepository.read/readAt`, exported `readProjectionContext`; `history-read-context.ts`; domain `forecast/assembly.ts` | Implemented REPEATABLE READ READ ONLY, one K, independent identities and audit validation. `readAt` is private. Reuse on caller transaction, not a separate reader transaction inside confirm. |
| Safe forecast | `src/domain/forecast/{budget,liquidity,freshness,serialization}.ts`, `forecast/ports.ts` | Implemented D36 max-based protection and D37–D39. Closing snapshot is not a live forecast input. |
| Allocation/rollover | `src/domain/transitions/{contracts,planning,funding,validation,ports}.ts`; `ProposalRepository`; `src/features/period-transitions/use-cases.ts` | Implemented single-source CARRY, FRESH_START, DEFER, explicit observation modes. Multi-source CARRY excluded. |
| Transition persistence | DB `transfer-proposal-repository.ts`, `transition-{state,writer,reports}.ts`, `redistribution-writer.ts`; `src/app/period-transition-boundary.ts` | Implemented private composition, control proposals, cancellation, funding revisions, semantic replay. No registered public transition endpoint at that boundary. |
| Compound budget update | `BudgetUpdateRepository` in `src/domain/budget-update/ports.ts`; domain planning/validation; `src/features/budget-updates/use-cases.ts`; DB `budget-update-{reader,writer,repository}.ts` | Implemented load/preview/confirm/status/history. One final C/V and funding/lifecycle batch; same-identity compound refused. Transition preview additionally writes nonfinancial proposal/period controls after a read-only candidate transaction. |
| Public financial save UI | `src/app/update-budget/page.tsx`, `src/app/update-budget/actions.ts`, `src/app/update-budget-boundary.ts`; `src/features/budget-updates/update-budget-screen.tsx`, `budget-editors.tsx`, `budget-draft-provider.tsx`, `presentation.ts` | Implemented `/update-budget`. Add only transition entry/context and missing review information. |
| Account-locked commit | DB `commit.ts`: `commitBatch`, `rejectBatch`, `classifyTransactionError`; domain `updates/{validation,canonical-value,contracts}.ts`; DB `audit-writer.ts` | Implemented READ COMMITTED account row lock, scoped same-request replay before stale checks, receipt/audit/counters in one transaction. `verifyReplay` currently accepts only BUDGET_UPDATE/PERIOD_TRANSITION. Closing needs a narrow reviewed extension, not a second transaction manager. |
| Closing physical row | DB `schema.ts:112` `monthClosings`; `drizzle/0000_foundation.sql`, `0001_integrity.sql` | Exists in DB: full scalar/nullability/version/provenance fields plus JSON payloads. Does not implement a closing service. |
| Report pointer | DB `schema.ts:116` `reportHeads` | Exists in DB: unique account/period head and external `correctionPending`; not a calendar-state API. |
| Closing SQL guarantees | `0001_integrity.sql`: scoped deferred C/V/period/predecessor FKs, `month_closings_immutable`, `hb_close_integrity`/`close_integrity`, `hb_report_head`/`report_head_integrity`; generated `closing_version/free/detail` checks and unique version/predecessor | Implemented storage protections: elapsed month, scalar C/V provenance at K, NULL vs observed end, immediate same-period successor, no fork/overwrite. JSON source closure, complete R/S evidence, consent, latest accepted head and audit semantics remain runtime-owned. Do not call these triggers a complete closing implementation. |
| Report impact | DB `checkpoint-persistence.ts:affectedReports`, `report-impact.ts:markSavingReportImpact`, `transition-reports.ts:transitionReportImpact` | Implemented pinned old K/C/V/order/O/S proofs and targeted pending flags. Expected manifest keys include `obligationRevisionIds` and `savingsRevisionIds` for ALL selected identities, not only target-funded ones. No automatic v2. New manifest must remain compatible. |
| Calendar/month routes | `src/app/months/page.tsx`, `src/app/dashboard-loader.ts`, `src/features/dashboard/dashboard-screen.tsx`, `period-navigation.tsx`, `presentation.ts` | Implemented period navigation/current server month; `/months` renders dashboard. OPEN/AWAITING_CLOSE/CLOSED, report version selector and manual closing controls absent. |
| Closing application/domain ports and read/write UI | Search inventory under `src/domain`, `src/features`, `src/app`, `src/infrastructure/db` | Absent: close preview/confirm/status/read-version/diff, strict stored-report decoder and version writer. ADR-only application behavior is HB-019's gap. |
| Existing proof | `tests/integration/persistence.test.ts` DB15/16/20; bank-checkpoints report impact; transitions T44–45; savings report impact; budget-projection immutable report tests | Source tests exist; reports are manually seeded low-level fixtures. They do not execute a production close/correction workflow. `tests/finance/coverage.json` explicitly records this HB-019 deferral. |
| Optional operations/PDF | `src/domain/checkpoints/reconciliation.ts`, `transitions/financing-detail.ts`; production checkpoint reader K/U unavailable | Pure explanatory contracts exist; persisted operations/PDF approval APIs absent. No such feature will be added to make a closing test look complete. |

Storage currently has 20 tables after migration0005 (including cancellation).
No proven missing table/column requires a migration for this proposal. New narrow
closing ports are justified because existing projection ports do not append/read
immutable report versions, and budget-update ports intentionally change financial
state. Approving this plan must explicitly cover these ports and the restricted
closing replay hook extension. Any subsequently demonstrated SQL/schema gap stops
the affected slice for an owner-reviewed amendment; no speculative migration.

## Financial and historical contract

All synthetic values and production amounts are bounded int64 integer EUR cents;
wire values are canonical decimal strings. B>=0, every A>=0, sum(A)=B.
R is full selected UNPAID remainder; ordinary unpaid always selected; possible
claims are included only by explicit `reserveFull=true`. S is full retained saving.
E=R+S, F=A-R-S may be negative, sum(F)=B-sum(R)-sum(S). No truncation, partial
reserve, automatic release/cancellation/payment, duplicate debit or expected cash.
Current safe-main remains `T=E[current]+sum(max(A[p],E[p]))` over other periods,
`safeAvailable=max(0,B-T)`, integer division by inclusive Berlin days.
Do not substitute A+E, sum overlapping shortage diagnostics, or feed report data
into the current forecast. Checkpoint differences and allocation deltas are not
confirmed gross income/spending; missing activity is unknown, not zero spending.

Closing month M fixes H=endOfMonth(M), with server Berlin today strictly greater
than H. K is an inclusive whole committed account sequence, captured with
aggregate revision and report head. Preview displays server `previewGeneratedAt`
as information, not a client-authenticated cutoff. Under the confirm account lock
the server captures `evidenceRecordedCutoffAt` using the existing batch instant
while K still equals that prior committed sequence. This is capture of the same
knowledge boundary at confirmation, not a claim about when preview was viewed.
No client timestamp is persisted as trusted server evidence. Report commit uses
that prior committed K and receives its own next recorded sequence. Every
historical source, identity, correction, audit, ordering and funding proof is
selected/validated at that K. Resolve correction tips BEFORE H filtering. Select
one complete V anchored to selected C and one full state per typed identity.
No entry-time/UUID ordering, current-state substitution or old-vector rebasing.

| Branch | Required stored and displayed behavior |
|---|---|
| C observed on H | END_DATE_OBSERVED; endCheckpoint=C, endBalance=C.balance, including real zero; preserve actual date/optional instant, no midnight guarantee. |
| C exists before H, including before M | INCOMPLETE; endCheckpoint/endBalance NULL; retain C's real date/amount and V's effective date plus historical A/R/S/F. Label them last confirmed state, not final-day actual cash or spending. |
| No C/V exists through H | NO_OBSERVATION; bank/date/vector/A/F NULL; known historical R/S and identities still reportable. Zero observations inside M alone do not select this branch if an older C exists. |
| C/V conflict, invalid/missing source or evidence | Typed safe refusal; leave report/head/financial state unchanged. Missing final-day data alone is never such a conflict. |

`operationDetailStatus` is independent: NOT_PROVIDED initially because no persisted
operation source exists. PARTIAL/USER_CONFIRMED_COMPLETE must not be accepted as a
client assertion without a reviewed evidence contract; do not invent a transaction
entry UI. Decoder retains enum compatibility and refuses unsupported proof. PDFs
and U=0 do not prove complete activity. Future evidence-only version semantics are
specified/tested as pure candidate fixtures; real PDF workflow remains HB-024–026.

Report snapshot copies display titles, origin/funding, status/selection, amounts,
effective positions, evidence and before/after revision refs. Never join live names
or today's outstanding into an old version. Stored JSONB key order is not original
text serialization: prove exact canonical content/digest plus unchanged persisted
row values before/after, not driver-specific JSON formatting. Retain immutable
versioned canonical serialization and selection contract IDs; unsupported versions
refuse safely rather than reinterpret old reports under a newer algorithm.

`sourceManifest` v1 must contain existing top-level O/S revision ID arrays and
checkpoint/allocation refs plus typed identity creation, lifecycle/state audits,
payment/savings/funding proofs, relevant transition decisions, positions, order
refs and copied period mappings. Arrays have deterministic ordering, no duplicate
typed identity/revision, and exact closure against bounded independently enumerated
sources. Full snapshot contains complete V and historical full states, including
paid/cancelled/released states as evidence. Changed evidence refs in v2+ are typed
and immutable, not arbitrary client strings. Validate both referenced facts and
copied values; a matching hash of untrusted JSON is not proof.

## Proposed modules, API and DTO

Keep app → features → domain; infrastructure implements domain ports. Pure
`domain/closing` adapts existing selectors/calculators and validates closing
records/diffs; it is not a second cash/history engine. Framework code performs no
financial formula. No external import allowlist or direction changes.

Proposed feature operations (names are planned, not existing endpoints):

| Operation | Input captured before asynchronous auth | Output |
|---|---|---|
| `loadMonth` | Strict YYYY-MM; optional selected version as bounded positive integer | Server calendar status, owned head/pending, available version summaries, selected immutable report or no report. |
| `previewClose` | Fresh requestId UUID, period, mode INITIAL or REVISION, bounded nonempty reason; expected head null/ID | Read-only exact candidate, paged review, pinned H/K/revision/head, scope-bound candidate digest, informational server preview time and explicit unknowns; or NO_REPORT_CHANGE. |
| `confirmClose` | Existing PreparedCommand envelope: requestId UUID, expectedRevision decimal, effectiveDate=actual reviewed confirmation day, reason; explicit exact-content consent described below | Existing CommitReceipt plus separately authorized exact report lookup by committed update ID. No generic event API. |
| `closeStatus` | Original requestId | Receipt plus report identity/version only after original immutable evidence validates; unknown remains unresolved, never assumed rollback. |
| `readVersion` | Period and explicit version (or null for current accepted head) | Fully validated report header/summary, exact immutable document digest/length and bounded detail pages; whole document retrieval uses `readReportChunk`. |
| `readReportChunk` | Period, explicit version, expected document digest and integer byte offset | Independently authorized fully validated immutable canonical document chunk, at most128KiB raw UTF-8 bytes base64-encoded; next offset/total length/digest. No process-local cursor. |
| `readReviewPage` | Original preview input plus pinned H/K/revision/head/digests and bounded section/offset | Read-only reconstruction of the same candidate and diff; bounded review section or canonical bytes, never a new implicit review of changed state. |

Server determines owner/account through existing `resolveDashboardAccount` and
`requireOwnedAccount`; clients never nominate owner, actor or arbitrary account.
IDs in payload are untrusted equality checks, not authorization. Period key can
represent a virtual period with no physical row. Confirm can create that scoped
period row inside the same report transaction if genuinely absent.

Proposed confirm payload (documentation, no executable implementation):

```text
schemaVersion: 1
operation: INITIAL | REVISION
period: YYYY-MM
historicalThroughDate: YYYY-MM-DD
knowledgeCut: canonical nonnegative decimal sequence
expectedHeadId: scoped UUID | null
expectedHeadVersion: positive integer | null
snapshotSchemaVersion: 1
selectionContractVersion: 1
reviewDigest: SHA-256 of canonical reviewed candidate and pinned coordinates
confirmed: true
```

### Cross-instance confirmation without a new secret or store

Selected proposal: stateless exact-content confirmation against existing immutable
database facts. Any instance rebuilds the same candidate at H/K under the account
lock, including manifest, ordering and exact diff from expected head. Define the
review digest over a versioned canonical envelope: server-resolved owner/account,
requestId, operation/period, H/K, aggregate revision, expected head ID/version,
reviewed confirmation day, exact reason, schema/selection IDs and full candidate/
diff content digests. Every field is normalized and compared independently too;
the caller's digest is a content checksum, never an authentication credential.
Candidate/diff canonical content excludes generated report/update UUIDs, commit
sequence/time/closedAt and preview clock values. Those coordinates are assigned
and audited only at commit; otherwise identical content could not rebuild on B.
Expected predecessor/version and immutable source IDs remain included. The
server-captured cutoff time is validated from the committed audit/batch on replay,
not added retroactively to the originally consented checksum.
`confirmed:true` is mandatory and has no default; authenticated session, ownership,
CSRF/Origin protection and submitted exact-content consent authorize the command.
The UI only enables its explicit confirm action after presenting the exact review.
Direct authorized calls must satisfy the same complete contract. This proves
consent to the exact rebuilt content, not that a particular UI was visited or a
preview token was issued. No security claim relies on such unverifiable history.

H/K/revision/head remain pinned; any intervening financial/historical/report write
refuses stale. A forged digest, altered scope/coordinate/reason/manifest or missing
consent refuses; an authorized caller able to compute the exact valid checksum
still needs explicit consent, ownership and all server invariants. Preview time
is omitted from command/digest and cannot be forged into report provenance.
Persist the server-captured confirmation cutoff time and validated command/content
bindings in the existing report/audit transaction. Replay reconstructs the original
envelope using that durable audit/report, never today's candidate or current clock.
Same command can confirm/status/replay on any instance or after restart. Account
locking, payload conflicts and unknown COMMIT recovery are unchanged.

Alternatives considered: a stable deployment HMAC requires a managed shared secret,
rotation/old-key/replay policy; a durable preview record requires a new persisted
control contract and possibly schema plus expiry/cleanup/atomicity design. Neither
is selected or authorized. If independent review requires proof of server-issued
preview in addition to exact authenticated consent, stop that slice and present
these alternatives for owner decision BEFORE adding a secret/store/schema. Do
not reuse Auth.js secrets implicitly or retain process-local HMAC as a fallback.

Large source manifests stay on the server. Input envelope fits HB-009 canonical
limits. Candidate/snapshot serialization needs a dedicated bounded pure closing
codec for larger documents rather than widening `normalizeValue` globally; define
a deterministic sorted-key JSON contract over decimal-string money, dense arrays,
plain data descriptors and bounded traversal. Hash its exact UTF-8 bytes in the
server adapter; domain returns canonical content without importing node:crypto.
Do not reuse a 64Ki-code-unit command normalizer on an 8MiB stored report then
silently drop evidence. Final approved codec limits/algorithm must be fixed and
tested in A2 before B; incompatible capacity is a typed refusal.

`auditDocuments` normalizes the ENTIRE descriptor array with HB-009 limits, not
each descriptor separately. Keep the complete REPORT_VERSION/REPORT_HEAD audit
array compact within those unchanged limits: normalized command, report IDs,
predecessor/version, scalar before/after values/completeness, H/K/schema and
canonical before/after content/manifest digests. Large full states/changed refs
live in immutable report snapshot/manifest/changeEvidenceRefs, referenced by exact
scoped report ID and checked digest, not duplicated into the audit. Replays must
load and validate those referenced immutable documents; a digest alone is not
sufficient evidence. Oversized descriptor array rejects atomically. No global
normalizer or audit size increase is proposed.

## Read, write, replay and failure boundaries

Read/load/preview/read-version: authorize independently; one REPEATABLE READ READ
ONLY transaction captures account, K/revision/server clock, period/head/report
and all histories. `readProjectionContext(tx,...)` uses that transaction. Stored
report validation reselects sources at the report's original H/K with pinned
order/selection version and validates report/audit/chain together. A present-day
active pointer is compared only under the existing full-current selection guard.
Do not require old report heads to equal current financial pointers.

Confirm INITIAL/REVISION, indivisible sequence:

1. Normalize/copy/freeze bounded input synchronously; authenticate and resolve scope.
2. Enter existing `commitBatch`; lock owned account first. Validate exact scoped
   prior request and original immutable report evidence BEFORE stale/calendar
   checks. Same key/different payload fails, authentic replay writes nothing.
3. For a new request recheck expected account revision, K and elapsed month;
   lock period/head in consistent order. The account lock serializes the absent
   v1 head case; do not create an intermediate/dummy head to lock it.
4. Require explicit exact-content consent for a new request, including request/reason
   binding and reviewed confirmation day; read full historical context on the SAME
   connection at pinned H/K; verify
   current expected report head/predecessor, original stored head proof, review
   digest, manifest closure, reason, changed refs and meaningful canonical diff.
5. INITIAL requires no head and writes v1; REVISION requires head n, writes n+1
   with predecessor n and nonempty changed refs/reason. Reject NO_REPORT_CHANGE
   before inserting. Check SQL integer version range before n+1.
6. Insert optional missing calendar period, one immutable `month_closings` row,
   create/move `report_heads` and reset that head's pending flag only for this
   accepted candidate. Emit REPORT_VERSION and REPORT_HEAD full before/after
   compact audit including normalized command/digest/H/K/source-document refs and
   receipt mapping; full before/after evidence stays in immutable report records.
7. Existing batch inserts audit/receipt and advances account revision/sequence
   exactly once. SQL deferred checks/COMMIT succeed before success is disclosed.

Allowed write set: `budget_periods` only if absent, `budget_updates`,
`month_closings`, `report_heads`, `audit_events`, accounts revision/recordedSeq.
Forbidden: accounts active vector pointer; checkpoints, allocations, historical
positions/order manifests, obligations/savings, proposals/decisions/transfers,
other months' head/pending state. Closing is not a funding or cash change. A
report commit's aggregate revision increase may conservatively stale an open
budget update; user must refresh/review, not auto-rebase.

`commitBatch.verifyReplay` needs a closed allowlist addition for MONTH_CLOSE;
same shared proof validates authorized status/read/replay at original H/K,
recordedSeq/updateId, normalized command hash, report/head audit and version
mapping. Generic receipt validation alone is insufficient. No new receipt format
or generic custom replay API; reuse existing receipt and read report by update ID.
Unlike transition semantic replay, a different request ID for a close is a new
request and must fail stale/head checks, not silently add another identical version.

Correction preview is read-only. Late facts are accepted only through existing
fact writers and mark affected heads pending; they do not invoke this writer or
edit current heads by report creation. Compare canonical financial AND evidence
content; exclude only envelope K/capture/commit timestamps/account revision/new
request/reason/version coordinates from meaningful-change detection. Changes in
actual observation precision, copied title/status, selected refs, evidence or
ordering relevant to the snapshot are meaningful even at equal amounts.
K advancement alone yields NO_REPORT_CHANGE and creates no audit/head/version.
Existing pending flag remains externally true in that case; UI may show that the
review found no candidate change. No new dismiss-pending business command is added.
Cancellation/abandonment writes nothing and consumes no version. No cascade to
another month, no version reserved by a sequence outside this transaction.

Domain failures must throw `rejectBatch`; returning an error from a transaction
callback can commit. Insert/audit/deferred-constraint/known COMMIT refusal roll
back every allowed write, including period creation and counters. An unknown
acknowledgment is different: result may already be durable. Preserve original
request/payload in memory, expose COMMIT_OUTCOME_UNKNOWN, authorize status or
explicit same-key retry; no new-key resubmit, assumed rollback or automatic retry.

| Error family | Behavior / race |
|---|---|
| UNAUTHORIZED, FORBIDDEN | Same safe refusal for unknown/foreign report IDs; no stored result or existence oracle. |
| INVALID_INPUT, MONEY_RANGE, NEGATIVE_CASH_ALLOCATION | Reject malformed values/bounds; no repairing/sweeping or type-cast trust. |
| PERIOD_NOT_ENDED, REPORT_ALREADY_CLOSED, STALE_REPORT_HEAD | Proposed new closing codes; exact-head/absent-head races refuse, no second v1/fork. |
| STALE_REVISION, REQUEST_PAYLOAD_CONFLICT | Existing meanings; historical writes and another close invalidate preview too. |
| NO_REPORT_CHANGE | Proposed result/refusal, not success/empty version; same logical state at newer K. |
| HISTORICAL_STATE_CONFLICT, ORDERING_CONFLICT, CORRECTION_CONFLICT, HISTORICAL_PAYMENT_CONFLICT, HISTORICAL_SAVINGS_CONFLICT, HISTORICAL_FUNDING_CONFLICT | Existing validators retain their meanings; no branch repair/rebase. |
| REPORT_PROOF_INVALID, REPORT_LIMIT_EXCEEDED, UNSUPPORTED_REPORT_VERSION | Proposed closing codes for corrupt/unsupported/oversized report; no partial display or fallback to live data. |
| TRANSACTION_FAILED, RETRYABLE_STORAGE_ERROR, COMMIT_OUTCOME_UNKNOWN, STORAGE_ERROR | Existing safe storage taxonomy; suppress SQL/params/identifiers, retain draft and original key as appropriate. |

Proposed codes are added narrowly to the typed error union only after review.
Client errors use localized next steps, not driver messages. Exact replay after
later head/calendar changes validates original report, not today's candidate.

## Calendar and UX choice

Derive current month from the server Berlin date on each access. Represent current
period OPEN; elapsed period without accepted head AWAITING_CLOSE; elapsed with
head CLOSED, optionally correctionPending. Future navigation remains a future
preview, not an elapsed/closable month. No durable status enum/table is needed.
Default current month is available even without a `budget_periods` row. There are
zero calendar or financial writes on GET/load/prefetch. Explicit existing
transition prepare may create immutable nonfinancial period/proposal controls;
show/document that existing side effect, never invoke it automatically on access.
Closing preview introduces no control writes. Physical period creation occurs
only during explicit prepare/confirm, never a read-based ensurePeriod call.

| UX alternative | Assessment |
|---|---|
| Reuse `/update-budget` with month-review entry/context and existing editors | Selected proposal: one actual check/full vector/mode/funding review/confirm, existing memory draft and status recovery. Minimal new financial surface. |
| Small month banner linking to that same screen, no new inputs | Part of selected minimal entry. Must still show full target/source/funding/non-carry review in the existing form before consent. |
| Embedded independent month rollover form/save | Rejected: duplicates confirmation/status handling and risks a second checkpoint/debit. |
| Mandatory standalone transfer then bank update | Rejected as main path; explicit REUSE_CONFIRMED transfer-only remains available as accepted technical mode. |

On `/months?period=YYYY-MM`, retain dashboard context and add manual report
preview/review and explicit version selection (`version` in URL, no bank values,
reason, requestId or evidence IDs in URL). Last confirmed version is default.
Show “as closed at K” distinct from present lifecycle, unknown end balance
distinct from last known balance/date, V effective date and independent detail
status. Read report is always read-only. Close action and “Update budget” action
are separate; close never forces rollover or final-day check/PDF/operations.

Transition UI has no default CARRY/FRESH_START/DEFER. ACTUAL_CHECK is an actual
observation even at equal amount; REUSE_CONFIRMED is chosen explicitly. CARRY
preserves existing target/future money and full typed earmarks once. FRESH_START
lists every past allocation/earmark-only period, including A=0, non-carry values
and preserved/explicit future edits. DEFER retains funding while requiring a
valid complete vector for newly observed B. Same-identity lifecycle/funding edit
refuses with retained draft; disjoint supported edits stay in one atomic save.
No auto-chains for gaps, inferred dates or synthetic zero observations.

RU/DE/EN dictionaries, semantic MUI, text status/uncertainty, labeled inputs,
keyboard version selection/review/confirm/cancel, visible focus and first-error
focus, polite async status, focus on receipt/error and restoration on cancel.
Responsive comparison must retain before/after meanings at 320/375/1280 widths,
200% zoom and light/dark/system themes; tabular money, long-title wrapping,
reduced motion, no color-only status. Keep unsaved/unknown state in scoped memory
with existing guards; no browser persistent finance cache or recovery promise
after crash/reload/OAuth. Never place full source histories in every RSC prop.

## Security and resource budgets

Every action/read authorizes independently; page guard is not action protection.
Retain Auth.js session/allowlist, Server Action CSRF/Origin checks, server-only DB
composition and parameterized ORM queries. Capture untrusted graphs before auth
yields; reject unknown keys, accessors/prototype payloads, sparse/cyclic structures,
malformed decimal strings, duplicate refs and foreign scope. Render reason/title
as text. No cross-account cache or process-wide mutable preview/draft. Do not log
balances, names, reasons, source IDs, tokens, URLs or driver errors. Only safe code,
category and random correlation marker enter diagnostics. Stored JSON is untrusted
at read/replay, even when SQL constraints accept it.

### Stored size, mandatory complete reads and aggregate validation cost

Existing limits remain conjunctive: command depth32/nodes4096/size65536 UTF-16
units, reason1000 units, projection historyRows20000/identities1000/periods1200,
source storageBytes8MiB and wireBytes1MiB. `projection-reader.ts:checkProjectionBudget`
also enforces **workRows² <= 4 000 000**, hence workRows<=2000 even when total
rows<=20000. Work rows are C/V/positions/orderings/O-events/S-events; identity,
audit and decision rows still consume total row/byte/other-work budgets. Preserve
the existing preflight and timeout10000ms. No larger report codec widens it.

Each canonical immutable report document (snapshot + manifest + ordering/change
refs in a defined envelope) is <=8MiB UTF-8, depth32/nodes100000; diff document is
separately <=8MiB. These are stored/content bounds, not a requirement to serialize
one giant response. Header/summary/detail page and raw-chunk response EACH must
fit1MiB including all metadata/base64; page<=50 items AND byte limit, reduce item
count when needed. A valid 8MiB report MUST be completely readable: `readVersion`
returns validated summary, exact version/digest/totalBytes and page/chunk metadata;
`readReportChunk` returns canonical byte ranges of128KiB (last shorter). Base64
permits arbitrary UTF-8 boundary splits without replacing characters. Reassembly
checks contiguous offsets, exact length and full-document SHA-256 before parsing.
8MiB takes64 chunks; 1MiB+1 and 8MiB must not be rejected merely because the full
report exceeds a single wire response. There is no truncated "complete" response.
No export file/store is added; chunks are ordinary owner-scoped reads. A bounded
page's single oversized field is served through canonical chunks, never silently
clipped. Old-version selection/restart/another instance needs no signed cursor.

Review uses the same split: show summary/unknowns and byte-bounded exact before/
after sections via `readReviewPage`; large candidate/diff canonical bytes are
also retrievable in chunks with pinned digests. UI must expose all details and
load the review sections before enabling confirm, with no hidden omitted changes.
Every page rebuilds at the pinned H/K/revision/head and refuses stale; it cannot
mix a newer candidate into the old review. Server consent authorizes the complete
digest-bound content, never just the visible first50 rows.

Before expensive loads, one request-wide admission plan counts ALL requested
source cuts, report documents, chain metadata/audits, parsing and closure work.
At most two distinct fully validated report roots (e.g. old head + candidate),
one diff, combined source row/byte budgets20000/8MiB and chain metadata/audit
budget1MiB are allowed: serialized materialization envelope <=33MiB
(2*8MiB reports +8MiB diff +8MiB sources +1MiB metadata), not a JS heap/RSS promise.
Each context still passes existing per-cut preflight. Define conservative total
work `sum(W_i²) + V <= 4 000 000`, where i enumerates DISTINCT materialized H/K
contexts and V charges every report/diff/metadata node visit, chain link, audit
comparison and canonical/evidence comparison (repeat passes charged again).
Checked integer counters stop before exceeding the budget; preflight upper bounds
must admit the whole operation before nested loops. Reusing loaded immutable rows
is allowed only with identical scope/cut and explicit accounting; no N×full-history
revalidation hidden inside a version loop. For example two W1500 cuts already
cost4500000 and refuse even though each2250000 passes individually; two W1000
cuts cost2000000 before V. W2000 passes the existing primitive guard at equality,
but a whole report operation with additional V>0 must refuse.

Chain validation is a linear bounded walk of <=1000 scoped metadata/audit links:
same period/account, contiguous predecessor/version, no fork/cycle, immutable
command/report/digest bindings and correct pointer. It does NOT reselect full
H/K histories for every ancestor. Fully validate payload/evidence at original H/K
for each requested root; ancestors get structural/record binding proof only,
not a claim that all1000 payloads have been reconstructed. Explicitly selecting
an ancestor invokes its own full root validation. No unbounded recursive reads.
If requested roots require more source/work, refuse that combined operation;
never pretend metadata proof replaces selected-report evidence.

Apply these SAME aggregate budgets on preview/confirm/read/status/replay, and
reject append BEFORE commit if it would make the new chain/read contract exceed
1000 links or metadata/source/document limits. Already accepted versions remain
readable from immutable original cuts as later live history grows; queries load
only those cuts and bounded chain metadata. Under unchanged limits a valid
accepted8MiB report must not become unreadable merely due to size or a new live K.
Corruption/unsupported versions still refuse. Each chunk fully validates its
selected root/chain before disclosure within one bounded read-only snapshot;
no trusted process cache. Whole8MiB retrieval may perform64 such bounded requests,
so worst-case validation cost is64*4000000, explicitly not one4M operation.
Bound rate/concurrency and record latency; do not hide multiplied work. No
durable pagination state, verification certificate or schema change is introduced.

Owner-authorized MINIMAL R03 acceptance correction after R2 (2026-11-04): exact
8MiB PG persistence is no longer required. Two independent synthetic profiles
exceeded the unchanged source budget before report construction. Stop further
exact-boundary fixture research. Earlier failed/unexecuted exact8MiB PG stages
remain historical and must not be marked PASS. No production rule, limit, schema,
formula or ADR changes. HB-019 remains Review, pending independent acceptance.

Reuse existing PG1MiB/1MiB+1 round-trips, complete chunks/SHA-256/wire bounds and
cross-instance reads, plus independent atomic closing/audit/manifest evidence.
1MiB+1 supplies the admissible large-report PG proof. Keep exact8MiB codec/chunk
reassembly and8MiB+1 rejection as separate U/C tests. Convert the old failing PG
case to expected source-limit refusal with complete rollback using the already
measured R2 profile; do not add duplicate PG tests or new8MiB fixtures. Update
finance mappings/required-verification guard only for this owner-approved change.

Threshold/threshold+1 tests cover PG1MiB/1MiB+1, codec/protocol8MiB/8MiB+1, actual
wire bytes including multibyte/base64, chunk boundaries/reassembly, per-cut W2000/
2001, request sum+V, 999/1000/1001 links and aggregate metadata/audit bytes.
Unrelated dimensions stay below their limits in each boundary fixture; total
rows20000 never means20000 work rows are admissible. No silently widened bound,
truncation, skipped ancestor/cut or global normalizer/audit limit change.

Threats: forged review/head, historical source omission, missing funding/audit,
branches/cycles, later live-state leakage, stale calendar/revision, request reuse,
lock race, corrupted receipt/report, expensive histories/JSON and unauthorized
status oracle. Each has a negative scenario below; UI disable is never a lock.

## Ordered reviewable slices

Order A1 → A2 → B1 → B2 → C1 → C2 → D1 → D2 → D3 → E1 → E2 → R1 → F1.
R1 is the cross-cutting correction acceptance checkpoint; its admission/DTO design
is fixed in A2 and its tests are added alongside the affected slices, not postponed
until after UI implementation.
B/C are backend proof before D/E UI. Each row has at most five acceptance criteria
and seven independent scenario cases. Slices are review units within HB-019, not
new HB IDs; the report/head/audit/receipt transaction is never split across saves.

| Slice | Interface, invariants and write set | Acceptance criteria | Seven planned cases |
|---|---|---|---|
| A1 projection | Closing candidate DTO from existing state(H,K); read-only | Exact bank/vector anchor; historical full R/S; NULL branch; independent completeness; no live-pointer substitution | HB19-A01–A07 |
| A2 retained proof | Closing codec/manifest validator/diff content; read-only | Complete identities/audits/funding; original H/K ordering; bounded canonical storage; invalid proof refuses; no silent truncation | HB19-A08–A14 |
| B1 initial writer | INITIAL PreparedCommand/receipt; allowed report transaction set above | Owner scoped; elapsed period; exact pinned review; one v1/head/audit; zero B/A/R/S writes | HB19-B01–B07 |
| B2 durability | Same writer/status/replay, same atomic set | Same-key proof; conflict/race refusal; insert/COMMIT rollback; unknown acknowledgment recovery; safe authorization | HB19-B08–B14 |
| C1 versions | REVISION preview/confirm/readVersion; append/head/audit only | Immutable n+1; meaningful diff; explicit reason/evidence; no-change/cancel no writes; last default/old selectable | HB19-C01–C07 |
| C2 conflicts | Same DTO, scoped head/pending proof | Correct K-first selection; no branches/rebase; stale/rival refusal; original replay; no cross-month cascade | HB19-C08–C14 |
| D1 calendar/entry | loadMonth + existing budget actions; GET write set empty | Berlin current available; past waiting/closed; future preview only; close separate from cash; main form reuse | HB19-D01–D07 |
| D2 modes | Existing BudgetDraft/transition DTO; existing HB-017 financial write set | No default; full reserves/savings; target once; FRESH_START gaps; no DEFER funding move | HB19-D08–D14 |
| D3 edge dependencies | Existing proposal/review/head refs and modes | Future preserved; overlap restriction; stale target/deps; deterministic replay; calendar/range integrity | HB19-D15–D21 |
| E1 report UI | Month report/review/version components; confirmed closing actions only | RU/DE/EN uncertainty; accessible navigation; exact diff; retained draft; privacy | HB19-E01–E07 |
| E2 browser | Actual browser on owned isolated local runtime | Real close/correction; real rollover modes; keyboard/focus; responsive locales; auth/recovery evidence | HB19-E08–E14 |
| R1 correction acceptance | Stateless confirmation, large-read/work and live-fixture contracts; no schema/secret writes | Cross-instance consent/recovery; complete bounded reads; aggregate source/chain cost; consistent calendar fixtures; all original proof retained | HB19-R01–R07 |
| F1 full gate | Existing suites + reviewed finance mapping and evidence | Final full regression; real PG; timezone parity; fresh finance proof; independent review/owner gates | HB19-F01–F07 |

Races/errors for each slice are the shared table above: A/E reads refuse invalid
proof without writes; B/C serialize account then head, recheck K/revision/digest;
D uses existing proposal/target/identity restrictions. E never performs optimistic
financial persistence. F fails on missing evidence, not just failed tests.

## Exact future file scope

All following paths are proposed future work, not files created now. No unnecessary
rename/refactor or modification of historical migrations/fixtures is authorized.

| New files | Purpose |
|---|---|
| `src/domain/closing/contracts.ts`, `ports.ts`, `validation.ts`, `projection.ts`, `serialization.ts` | Narrow DTO/ports, candidate/stored proof, canonical diff; reuse money/history/earmark selectors. |
| `src/features/month-closing/use-cases.ts`, `presentation.ts`, `month-closing-screen.tsx` | Captured independently authorized feature operations, localized presentation and report review. |
| `src/infrastructure/db/closing-reader.ts`, `closing-repository.ts`, `closing-writer.ts` | Same-transaction coherent sources, cross-instance exact-content verification, bounded document pages/chunks, strict original evidence/status/replay and atomic report persistence; no preview signing module. |
| `src/app/month-closing-boundary.ts`, `src/app/months/actions.ts` | Lazy private composition and narrow public Server Actions, no generic writer route. |
| `tests/closing.test.ts`, `tests/closing-boundary.test.ts`, `tests/closing-ui.test.tsx`, `tests/integration/month-closing.test.ts`, `tests/fixtures/closing.ts` | Pure/domain/boundary/component/real PostgreSQL tests and synthetic fixtures; titles derived from scenario IDs. |

| Existing files to change only as needed | Purpose / boundary |
|---|---|
| `src/domain/updates/contracts.ts`, `src/infrastructure/db/commit.ts` | Closing error codes and narrow MONTH_CLOSE verifyReplay allowlist; preserve existing hash bytes/receipt/replay rules. |
| `src/app/months/page.tsx`, `src/app/months/loading.tsx`, `src/features/dashboard/dashboard-screen.tsx` | Compose new month status/report controls while keeping existing dashboard period behavior. |
| `src/features/budget-updates/presentation.ts`, `update-budget-screen.tsx` | Minimal transition context, mode/non-carry/full funding review; existing financial save path only. |
| `src/shared/i18n/messages/ru.json`, `de.json`, `en.json` | Existing inspected RU/DE/EN dictionaries; no duplicate catalog tree. |
| `tests/update-budget.test.tsx`, `tests/dashboard.test.tsx`, `tests/i18n.test.ts`, `tests/architecture.test.ts` | Relevant UI regression, catalog parity and layer fitness without loosening boundaries. |
| `scripts/check-finance-coverage.mjs`, `tests/finance-coverage.test.ts`, `tests/finance/coverage.json` | After executed proof only: register HB19 definitions/new normative contexts and reviewed exact runnable mappings; retain future deferrals for unsupported operations. |
| `docs/ARCHITECTURE.md`, `docs/architecture.json`, `docs/DATA_MODEL.md` | After approved implementation: describe ports/serialization/replay/report behavior consistently, no layer change. |

Catalog/date utility paths above were checked using `rg --files`; recheck changed
source inventory before coding rather than creating duplicates. Browser automation is
not installed as a package/script today: actual in-app browser QA is possible
when local runtime is available; adding Playwright/package/config/test files is
a separate reviewed tooling change or HB-021, not silently part of this file list.
Future verification/ZIP artifacts go only to an owner-approved ignored evidence
location; no artifact files are created in this planning turn. Any additional
source/migration/architecture change needs a scoped plan amendment first.

## Traceability and proof design

91 unique HB19 cases, in seven groups: A14 projection/evidence; B14 transaction;
C14 corrections; D21 calendar/rollover; E14 component/browser; R7 correction
acceptance; F7 full evidence. Original84 cases and all46 HB2 crosswalk rows remain.
Each case has GIVEN/WHEN/THEN, exact cents and a planned executable title:
`HB19-<ID> <scenario heading title>`. File/runner assignments and all 46 HB2
crosswalk rows are in the [scenario specification](../../tests/scenarios/phase-01/hb-019-month-closing-versions-rollover.md).
U=pure/domain/boundary, P=real PostgreSQL, C=component, B=actual browser,
V=document/artifact validation; multiple tags require separate evidence.

Real SQL proof uses two connections and lock barriers, actual deferred constraint
and audit failures, commit-acknowledgment loss and whole-account baselines over
all scoped tables, pointers, audit/receipts/counters and every report/head/flag.
Do not substitute a mock transaction or a success-shaped seeded closing row.
Production v1/v2/v3 are created through the new authorized workflow. Direct SQL
malformed fixtures prove runtime refusal where JSON is not SQL-owned. Existing
DB15/16/20 remain storage regressions, not new workflow proof.

HB2-018 optional statement matching is a future integration deferral with pure
nonposting/evidence-only candidate oracles here. HB2-043's same-identity savings
release+funding alternative is refused under accepted HB-017 scope; standalone
explicit release and disjoint combination are tested, never automatic splitting.
HB2-013/022 joint historical corrections run only where existing suffix/evidence
contracts support them; inconsistent originally confirmed payment meanings and
unsupported joint funding corrections must refuse, not rebase. Historical
coverage must state these branch distinctions, not claim full HB2 execution from
one passing assertion. Exact F-009 60000/50000/10000 and F-013 R10000 fixtures are
included, separately from the 80000/75000/76000 November examples.

## Future verification commands and guards

Commands below are a plan, **NOT EXECUTED**. No runtime check is permitted in this
planning turn. Read scripts/config before later execution; record installed node/
pnpm versions, exact source fingerprint, exit codes, counts and timings. Do not
access `.env*` or fall back to an existing connection. Build execution must also
be isolated from production configuration and real credentials.

Targeted intermediate examples after implementation:

```powershell
pnpm.cmd exec vitest run tests/closing.test.ts tests/closing-boundary.test.ts
pnpm.cmd test:integration tests/integration/month-closing.test.ts
pnpm.cmd exec vitest run tests/closing-ui.test.tsx tests/update-budget.test.tsx
```

Final commands, following existing `.github/workflows/ci.yml` and script CLI:

```powershell
node scripts/check-finance-coverage.mjs init tmp/hb019-final-UNIQUE
pnpm.cmd lint
pnpm.cmd typecheck
$env:TZ='UTC'
pnpm.cmd test --reporter=default --reporter=json --outputFile.json=tmp/hb019-final-UNIQUE/unit.json
node scripts/check-finance-coverage.mjs record tmp/hb019-final-UNIQUE unit
pnpm.cmd build
pnpm.cmd db:migrate
pnpm.cmd db:migrate
pnpm.cmd test:integration --reporter=default --reporter=json --outputFile.json=tmp/hb019-final-UNIQUE/integration.json
node scripts/check-finance-coverage.mjs record tmp/hb019-final-UNIQUE integration
$env:TZ='America/Los_Angeles'
node scripts/check-finance-coverage.mjs timezone tmp/hb019-final-UNIQUE
node scripts/check-finance-coverage.mjs record tmp/hb019-final-UNIQUE timezone
pnpm.cmd test:integration -t DB17
node scripts/check-finance-coverage.mjs check tmp/hb019-final-UNIQUE
```

`UNIQUE` is a fresh evidence directory, never an overwrite/cleanup of retained tmp.
Before ANY DB command: separately owned disposable local PostgreSQL, all three
DATABASE_URL/DATABASE_URL_UNPOOLED/TEST_DATABASE_URL explicitly injected to checked
`127.0.0.1:port/database`, HB_DATABASE_TARGET=isolated-development and
HB_TEST_DATABASE_TARGET=disposable-local-container. Preserve `requireLocalDatabaseTargets`,
password authentication and per-invocation fresh child database. No .env reliance,
Neon/production, чужие контейнеры, persistent database truncation or real data.
Use existing `tests/fixtures/transition-calendar.ts` civil primitives and planned
`tests/fixtures/closing.ts` for PG AND actual browser fixtures. Literal2026–2027
oracles remain pure tests. Derive D from PostgreSQL's actual Berlin server date,
C=current month,P=C-1,Q=C-2,F=C+1. The scenario document's complete BN/BL/BT/BG/BV
fixture table maps ALL E08–E14 journeys and values to real elapsed months:
BN last d(P,20)/B80000/A{P60000,C20000}; BL current D/B75000 plus late end(P)/76000;
BT past d(P,28)/90000 to current actual84000 or explicit reuse; BG missed P
from d(Q,20)/10000 to actual D/8000; BV original/explicit v2/v3 for P. Seed O/S
identities/audits/order before each base via valid existing contracts. Versions
under test are produced by the close workflow, not seeded success-shaped reports.

If server D=2026-11-04 the browser closes October, not unelapsed November:
P=Oct/Q=Sep, BN lastOct20, BL lateOct31 and currentNov4; BG missedOctober.
No requirement for current day2/3/5: D itself is the actual current check day,
even day1. Real last-day dates come from endOfMonth, including February28/29.
Record actual mapping/date/source fingerprint per journey. Month changes during
a run stale NEW-action review; stop/reseed/review against real clock, never freeze
it or disable guards. Unknown COMMIT must first resolve with its original key;
do not discard it when reseeding. Pure fixed-date DST/Nov30→Dec1/Jan and
leap/nonleap tests remain independent, not claimed as real browser-date execution.

After the LAST change to source/tests/normative contexts: rerun full lint,
typecheck, build, UTC unit/component, real PostgreSQL migration/reapply/full
integration/DB17, LA subset identity parity and finance gate. Refresh only the
reviewed actual mapping fingerprints after real execution, then regenerate the
final evidence for that exact final state; no stale prior PASS or fake registration.
Adding HB19 to the checker requires definition-parser/context tests and explicit
timezone subset review. A green old gate that does not register HB19 is not HB19
coverage. Real browser QA is additional, never inferred from component success.
Absent browser runtime: record each journey NOT EXECUTED and obtain a separate
owner decision; no inherited HB-018 waiver. Independent review and owner
acceptance remain distinct from implementer tests.

## Risks, questions, safe efficiency and stop gate

No new unresolved product decision is required to prepare this scoped plan;
`OPEN_QUESTIONS.md` is unchanged. Existing Q-HB2-02 multi-source CARRY, Q-HB3-02
negative B/overdraft, Q-HB3-03 historical overspend and Q-HB1-03 recurring scope
remain excluded. Accepted formulas, same-identity restriction and memory-only
draft policy are not reopened. Proposed ports, codec bounds/replay extension and
UI choice await plan review and owner implementation authorization. Unsupported
operation proof cannot be invented. A demonstrated inability to satisfy the
accepted immutable manifest/SQL contract blocks the affected slice and requires
a new specific question and owner decision before changing semantics/schema.

Highest risks: false month-end balance, accepting a JSON manifest without original
evidence, leaking newer lifecycle into old reports, same-request replay returning
an unproven report, race/fork at first close, version consumption on failure,
unknown commit treated as rollback, wire/canonical capacity mismatch, stale target
or inadvertent parallel save. The scenarios require independent failure proofs.
All are implementation risks; none is disguised as an executed verification claim.

Safe efficiency: reuse selectors/transaction/read context and shared UI; inspect
normative sources/contracts fully, then reread changed files/exact relevant ranges;
run targeted suites during intermediate slices; retain complete successful logs
locally with fingerprint/exit codes and summarize them. Batch independent read-only
inspection, not financial commits or coherent snapshot boundaries. One full final
gate after the last relevant change avoids redundant runs without omitting any
required check. Failures require full relevant logs and reruns. Never shorten
financial assertions, race/DST/invalid-proof variants, independent review or owner
acceptance; never replace real PG or browser evidence with a cheaper surrogate.

## R1 review disposition and concise change record

| Review finding | Planning correction and independent proof | Status |
|---|---|---|
| High1 — process-local HMAC cannot support reliable multi-instance confirmation | Replaced with authenticated explicit exact-content consent plus stateless canonical reconstruction from existing DB under account/head lock. No preview token/key/store/schema; server records confirm cutoff time at unchanged K. H/K/digest/scope/stale/head/original-key replay/unknown COMMIT remain. R01/R02/R07 and expanded B05/B10. Stable-secret HMAC and durable-preview alternatives require owner decision if later requested. | Corrected in proposal; repeat independent review pending. |
| Medium1 — report/wire/work/chain budgets conflict | Valid8MiB reports fully readable through validated128KiB canonical chunks and bounded pages, each wire<=1MiB. Preserve per-cut W²<=4M; aggregate sum(W_i²)+V<=4M, bounded root/chain metadata without per-ancestor historical replay, append admission protects continued reads. R03–R05/R07 plus A13/E07. | Corrected in proposal; runtime proof NOT EXECUTED. |
| Medium2 — D01 absent December row contradicts T | D01a uses T with existing December period; D01b has all90000 allocatedNov and no December FK refs, remains virtual/read-only. Both retain full30000 reserve/5000 savings and have independent full baselines. D01/R06. | Corrected in specification. |
| Medium3 — future fixed browser dates | Complete server-relative BN/BL/BT/BG/BV fixture mapping for E08–E14, elapsed P/Q, real D/current C, valid creation/order/recording, day1/leap/year/month-crossing rules. Fixed2026–2027 examples remain pure. R06 and actual browser evidence distinct. | Corrected in specification; browser QA NOT EXECUTED. |

Only these two complete documents changed. New API surface is bounded read-only
pages/chunks and exact-content confirm DTO; existing app→features→domain/import
directions, immutable storage, report-impact/financial write sets, HB2/F mappings
and final PG/DST/race/rollback/replay/finance/browser/review gates are preserved.
No new secret/storage/schema question is selected by this correction. A checksum
is not server-issued-preview evidence; if that extra requirement is imposed,
the affected slice remains blocked for an owner choice rather than inventing trust.

Document-only verification for this turn: strict UTF-8/no replacement/NUL,
unique IDs and GIVEN/WHEN/THEN, all46 HB2 crosswalk rows plus F-009/F-013,
relative links/anchors, fixture bigint equations, Markdown structure and whitespace,
`git diff --check` plus untracked-file whitespace inspection and exact final status.
Results belong to the final response; runtime checks remain NOT EXECUTED.

**STOP after the two documents.** Hand them to independent ChatGPT review. No
implementation, test code, migration, refactor, coverage/status edit or publication.


## Authorized implementation history (separate from R1 planning approval)

The owner subsequently authorized implementation of approved R1 at baseline
3288ce91ba197d52ac51de036e1bccea55420a4f, without commit/publication or Done.
The original planning-only restrictions above describe that earlier planning
turn. They are retained as history, not asserted as the implementation worktree.
Implementation proof belongs in [hb-019-verification.md](hb-019-verification.md).

During implementation the owner explicitly extended Exact future file scope to
src/infrastructure/db/projection-reader.ts and necessary regression tests. The
extension permits a closing-only historical mode with complete period reachability
at K, including future allocations, origins, funding and transitions. Missing,
foreign or contradictory links must refuse. Current reader/forecast/HB-017
behavior and global limits/formulas/schema/layers must remain unchanged. Required
PostgreSQL proof includes post-K growth, preserved historical future allocations,
incomplete-link refusal and byte/digest equivalence before/after growth. This is
a scope correction, not a new financial rule or architecture direction.
