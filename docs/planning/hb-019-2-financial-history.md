# HB-019.2 — Complete saved financial history

**Current status (owner 2026-11-11): Review / awaiting separate Owner Acceptance.**
R1 implementation and Finance Gate context maintenance are independently APPROVED
(0/0/0/0 each, as reported by the owner). Documentation finalization, fresh checks,
feature commit/push and a PR are authorized; merge/deploy/Done are not.
[D54](../DECISIONS.md#hb-0192-browser-verification-handoff--owner-2026-11-11)
assigns outstanding real-browser/AT execution to HB-021 before its own acceptance:
auth/navigation and all HBH-001–007 browser flows, RU/DE/EN, 320px/desktop,
native 200% zoom, keyboard/focus/announcements and physical screen-reader output.
All remain **NOT EXECUTED**, not PASS; HB-019.2 financial/U/C/P obligations and
scenario oracles are unchanged. HB-021 inherits the assertions without new IDs.
The dated planning-stage records below are historical, not current authorization
or runtime evidence. See the [verification report](hb-019-2-verification.md).
**Depends on:** HB-010, HB-013, HB-014, HB-017, HB-018, HB-019, HB-019.1.
HB-020 independently follows HB-019.1; HB-021 requires both HB-019.2 and HB-020.
Sources: [D46–D49](../DECISIONS.md#saved-financial-history-and-evidence-scope--2026-11-08),
[BR-01/05/08/10/11](../BUSINESS_RULES.md), Accepted
[ADR0002](../adr/0002-month-closing-and-corrections.md),
[task](../TASKS.md#hb-0192--complete-saved-financial-history),
[scenarios](../../tests/scenarios/phase-01/hb-019-2-financial-history.md).

## Goal and boundaries

Provide user-accessible history of ALL saved bank checks and financial states in
current and past months, including revisions and explicit allocation/funding and
lifecycle changes. A latest-ten list is not complete history. Do not create a
daily bank ledger, infer unobserved spending or require closing before browsing.
Future allocations remain visible inside their confirmed complete vector; this
does not make a future bank observation. Current money remains separately dated.

HB-019.1 owns HBUX-001–036: update/transition interactions, historical input preview
and saved result, and correct presentation of already available month/report data.
HB-019.2 owns HBH-001–007 below: complete navigation and the three perspectives.
HB-019 retains closing/correction writes and immutable report readers. HB-020 owns
onboarding/recurrence. HB-021 reuses these contracts for integrated browser proof;
HB-022 owns additional comparisons, charts and analytical grouping, not basic history.

## Three explicitly labelled perspectives

| Perspective | Basis | Required distinction |
|---|---|---|
| As known then | Day through-date H and source-proven original account knowledge cut K supported by the existing daily reader | Preserve original facts/confirmed ordering evidence at K; no claim of exact state after each same-day position |
| With later corrections | Same day H, explicitly identified later validated K | Resolve corrections at K before historical selection; never silently change a pinned view or substitute an event-position meaning |
| As closed | Explicit immutable report version with its own H/K, source and selection versions | Latest accepted version defaults only in report context; explicit old-version selection persists |

H/K express confirmed information, not a claim that unknown bank cash was observed.
Show observation date/optional time precision, effective date/position, recorded
date, funding/origin and correction lineage with accessible user labels; technical
IDs need not dominate the screen. No live historical daily forecast.

## Technical planning revision — 2026-11-09

**Planning only.** D50–D53 selects daily precision (option C),20-row ordinary
server keyset paging, demonstrated scale only and no HBH finance-gate expansion
through MVP. This revision updates the existing plan and necessary specifications,
including HBH Markdown, not executable tests. No runtime code, SQL, dependency,
checker/manifest/CI/receipt, evidence deletion or publication change. HB-019.2
stays Planned. Q-HB192-01/02 now records these owner choices, while the revised
technical design still requires review. Historical verification notes below refer
to their earlier document versions, not a current finance PASS.

### D50 scope reconciliation: complete evidence versus selection precision

D46–D48 and Accepted ADRs remain as dated history; D50 is an explicit delivery
clarification. Every retained batch, check/vector revision, lifecycle/funding fact,
correction, identity, timestamp, ordering manifest, legacy transition and report
version stays reachable. “Complete history” does not assert a reconstructed
before/after state at every same-day position. No age/total-count cutoff is added.

| Earlier contract / HBH | Required MVP after D50 | Deferred to HB-027 | Test and honest UI wording |
|---|---|---|---|
| All saved states, before/after links; HBH-001 | Full registry/source census, typed original revisions, existing verified saved reviews, daily H/K state links | Newly reconstructed exact before/after for every same-day source | PG census over all pages; label source facts separately from “Through day H, as known at K” |
| Original/later H/K with same-day order; HBH-002 | Existing day H/K selectors, corrections before H, original/later cuts; expose confirmed order/IDs as evidence | Arbitrary through-position picker/new intra-day assembler | Exact80000→76000 day oracle and same-day non-mislabel test; never call day selection “after this event” |
| Immutable versions; HBH-003 | Existing validated v1/v2 with their own H/K/digests and reload by explicit version | Comparison to newly reconstructed intra-day states | PG v1 bytes unchanged, real browser explicit version; no automatic v2 |
| UNKNOWN/zero; HBH-004 | Full known R/S, unknown B/A/F/end where appropriate; real zero/negative F preserved | Any additional exact intra-day reconstruction | U/PG zero versus unknown oracles; “No observation” is not0 |
| Identity/funding/payment order; HBH-005 | Retained event order/proof and correct daily states at declared K, no double debit | Generic before/after at every same-day funding/lifecycle position | PG exact daily amounts and source lineage, label evidence order separately from selected day state |
| Stable/owned bounded reads; HBH-006 | Validated K_index/lastSeq/filters,20 rows, no writes, explicit re-entry/refresh | Exact position reconstruction only; security is not deferred | PG two-connection pages, invalid/foreign params, unchanged tables; no expiry claims |
| Accessible three bases; HBH-007 | RU/DE/EN,320px/native200% zoom, keyboard/AT status, real browser and precision labels | Position-level state UI | C/B/A checks; physical AT unavailable=NOT EXECUTED, no inflated PASS |

Existing readAt already accepts a day and K; assembleSnapshot already invokes
the accepted daily bank/O/S selectors. This supports the existing HBH day fixtures
without a new selector/through-position/formula/version. Retained same-day order
is still validated by existing mechanisms; leaving that order accessible is not
a promise of a new selectable intermediate state. If an actual daily H/K case
cannot be proved through the permitted path, show the exact failure and ask the
owner before implementation; do not treat incomplete evidence as accepted output.

### Repository baseline and inspected implementation

Initial working tree/index: clean. Branch `feat/hb-019-1-budget-update-ux`, HEAD
`5e6df62b4173c20dde51d4caff1d95adec5c8503`; local `main` is the older
`0cce37132cd91f0758d21ef11cb102d82d22ff74`. GitHub connector read of `main`
confirmed `050c7b0e5d497fc016726bf705fc9b17fbd2f010` (merged #21), matching
the local `origin/main` ref. `git diff --stat HEAD origin/main` is empty:
different commit history, identical tracked trees. No checkout/reset/fetch needed.
Shell `git ls-remote` failed to connect; the connector supplied the remote check.

### Mandatory implementation branch preparation — review correction 2026-11-09

The preceding baseline is historical inspection evidence, **not** an implementation
base. HB-019.1 was squash-merged: identical trees do not imply equivalent ancestry.
Current `git merge-base HEAD origin/main` is the older
`0cce37132cd91f0758d21ef11cb102d82d22ff74`, not the squash commit. Do not implement
HB-019.2 on `feat/hb-019-1-budget-update-ux`, merge that branch again, or use its
HEAD as the new branch point.

Before separately authorized implementation, perform this preparation gate:

1. Inspect branch/HEAD, tracked/untracked/ignored status and the current plan diff.
   The plan is already **uncommitted** in the HB-019.1 worktree; preserve its full
   contents, including both planning passes, and all local files. Do not overwrite
   .env.local, copy secrets into another tree, clean ignored files, reset, discard,
   force-checkout or auto-stash. No such Git mutation occurs in this correction.
2. Fetch `origin/main` non-destructively and verify its SHA against remote main.
   The inspected050c7b0 squash SHA is evidence, not a permanently pinned future
   starting point. If remote verification/fetch fails, stop branch preparation;
   a stale local main or origin/main is not a substitute for the current base.
3. Create a **new HB-019.2 branch directly from that verified origin/main** in a
   separate, unused approved worktree directory. Leave the original worktree and
   its local files intact. Record `BASE_SHA=origin/main` at creation; before edits
   require `git rev-parse HEAD == BASE_SHA`,
   `git merge-base HEAD origin/main == BASE_SHA` and an empty initial diff. Inspect
   local files for conflicts before creating the worktree; never reuse/overwrite
   an occupied directory. Do not cherry-pick/replay HB-019.1 commits.
4. Transfer only the reviewed documentation amendments, including this uncommitted
   plan, after comparing their base versions against new main. If main changed
   the same documents, reconcile the text
   explicitly; do not blindly replace newer content. Verify the reviewed additions
   survived and the original uncommitted documents/local files remain intact.
   No automatic commit or configuration/environment copy is part of this gate.
5. Before any future PR, fetch current origin/main again, record merge-base and
   inspect both `git log origin/main..HEAD` and
   `git diff --name-status origin/main...HEAD` / `git diff origin/main...HEAD`.
   Verify the recorded BASE_SHA is an ancestor of current origin/main and the
   branch, and their merge-base is BASE_SHA or a deliberately reviewed newer-main
   integration point. The PR range must contain only HB-019.2 commits/changes,
   with no old HB-019.1 feature commit or repeated HB-019.1 implementation patch.
   Overlap in a filename alone is not duplication; review actual hunks against
   the squash-merged code. Unexpected ancestry/content blocks publication until
   resolved in separately authorized work; never force-reset or rewrite history.

These are future gates only. This turn creates no branch/worktree, moves no local
file and performs no commit, push, PR or merge.

Read inputs: AGENTS, PRD, BR, DECISIONS, TASKS, IMPLEMENTATION_PLAN, architecture
and architecture.json, data model/database runbook, conventions, AGENT_FACTORY,
CODEX_WORKFLOW, ADR0001–0003, existing HBH fixture/oracles, relevant implementation
and verification reports. Applied local create-planning-doc, create-scenarios,
verify-financial-invariants, define-architecture, security-best-practices,
configure-project, vercel-react-best-practices and web-design-guidelines to this
design only. No scripts from a skill were run. Installed package/API contracts
take priority; no version upgrade or dependency recommendation is made.

| Existing implementation / evidence | Reuse and concrete limitation |
|---|---|
| HB-010: `domain/checkpoints/history.ts`, `db/checkpoint-history.ts` | `correctionTips` resolves at K before H; `indexHistory` proves recorded ordering manifests; `selectState` already accepts a same-day position. Preserve original/superseding revision IDs, including corrections moved beyond H. |
| HB-013: `db/transition-state.ts`, `transition-reports.ts`, `funding-evidence.ts`, `domain/transitions/*` | Full immutable funding and CARRY/FRESH_START/DEFER evidence exists. A transition is not necessarily a new checkpoint or cash transfer. Prepared/cancelled proposals are controls, not saved financial states. |
| HB-014: `db/projection-reader.ts`, `domain/forecast/assembly.ts` | Scoped REPEATABLE READ READ ONLY, preflight rows/bytes/work and selectors exist. `readAt` is explicitly trusted/internal, not a user feature port. `assembleSnapshot` calls all three selectors through a day, without forwarding their optional position argument. Current active pointer/captured revision is not old-state evidence. |
| HB-017/019.1: `db/budget-update-repository.ts`, `budget-update-presentation.ts` | `history()` takes `FOR UPDATE` through `ownedAccount`, limits ten budget-update rows **before** filtering kinds, and skips list entries for legacy transitions lacking BUDGET_UPDATE_REVIEW. It can return fewer than ten. It is unsuitable for complete read-only indexing. `originalEvidence` verifies original review/receipt, optional presentation and lineage; do not fabricate that document for HB-013. |
| HB-018: management readers and full obligation/savings histories | Reuse identity, origin, historical title/status, payment/release/funding validators. Current management lists cannot replace a pinned historical state. |
| HB-019: `db/closing-repository.ts`, `closing-reader.ts`, `domain/closing/*` | Existing original-report validation, immutable version chains, bounded chunks and cross-instance advisory admission. Explicit version/digest can be reused; selecting latest on each page would mix versions. Historical period reachability is currently a closing-only opt-in. |
| Existing UI: `/months`, `/update-budget`, dashboard and shell | Months owns closing/report actions; Update owns edits/previews/results. Add history entry/detail navigation without duplicating either writer or importing infrastructure into features. |

Current finance preflight limits: 20,000 source rows, 8 MiB stored source bytes,
1,000 selected identities, 1,200 periods, 1 MiB wire; conservative historical
work admission `workRows * workRows <= 4,000,000`, 10-second SQL statement timeout.
These are independent constraints: a short page does not bound reconstruction.
Do not raise them, filter away predecessors, or reconstruct every row to populate
a timeline. HB-019 additionally budgets chains, original proof and canonical work.

### Proposed layers and interfaces

Keep the seven current layers/import directions. Proposed additions have distinct
purposes: `domain/history` defines checked daily selection/DTO/port, no new assembler;
`features/financial-history` orchestrates authorized reads and renders the viewer;
`infrastructure/db/financial-history-reader` implements scoped SQL/source admission;
`app/history` and an app boundary compose session/owned account, reader and actions.
Reuse existing money/calendar/selector/evidence code by direct imports. No generic
event endpoint, new finance writer, ledger, database table or library.

**D50 architecture boundary:** the app/feature daily read port may compose the
existing trusted day-H/K capability only after normal ownership/input checks.
Do not expose arbitrary client K directly to readAt. Reuse its current selectors,
assembly, historical source validation and report reader without a new through-
position argument, assembler, formula or selectionContractVersion. No forecast/
closing caller, active-pointer guard or existing same-day ordering behavior changes.
No new historical-period loader mode or reachability optimization is selected;
if the existing day read cannot prove a required state, document the exact failing
case and return to the owner before coding a workaround. No schema/import direction
or library change. This documented MVP boundary also appears in ARCHITECTURE and
its planned architecture.json metadata; runtime layer rules stay unchanged.

**HB-027 after release:** option A extends the existing read-only H/K/through-
position path (one financial logic, working-screen regression risk); option B adds
an isolated history assembler reusing current selectors/validators (duplication/
drift risk). Neither option is selected. Separate plan, independent review and a
direct owner choice are mandatory; HB-027 does not block HB-021/MVP/release.

Proposed private operations (illustrative names; each read authorizes anew):

- openHistory({schemaVersion:1, month}) resolves the owned account and captures
  K_index with its retained committed-batch anchor, or the validated empty-account
  basis when seq=0. Page size is fixed20.
- pageHistory({schemaVersion:1, indexAnchor, K_index, fromLastSeq, lastSeq, month}) validates the
  declared basis and exclusive boundary, returning items, echoed basis and
  nextLastSeq:null|string. Previous/Next uses a UI-only memory stack of boundaries.
- openHistoryEntry({basis, batchId, sourceId}) proves scoped membership and loads
  typed evidence/details on demand, including legacy and INVALID source status.
- selectHistoryBasis({basis, dayH, sourceBatchId, perspective, knowledgeBatchId})
  derives original/later K from retained owned proof, bounded by K_index; no
  position-state picker or arbitrary free-form K admission.
- pageHistoryDetail({basis, detailDigest, section, offset}) repeats source/basis
  checks under existing bounds. openClosingVersion({basis, reportId, version,
  digest}) reuses the existing validated immutable report path.

These objects are bounded plain data with exact keys/enums and canonical decimal
sequence/cent strings, never floats. Copy/normalize before async authorization;
reject accessors/prototype surprises and extra owner/account fields. IDs/anchors
are untrusted references, not secrets or credentials. No server history session,
new secret, signature, encrypted token or TTL. Validate every numeric value against
owned retained source rows, not just its range. Empty account is NO_OBSERVATION,
not balance0; only an enumerated empty filter returns a successful empty timeline.

Outputs retain schemaVersion1/selectionVersion1, basis, registry/source completeness
and nextLastSeq. Basis has captured index anchor/K_index, declared filter and
server Berlin day/instant; daily state has dayH, proven K_state, recorded cutoff,
source/ordering refs and precision:DAY. Report has immutable ID/version, its own
H/K/schema/selection versions, predecessor and digest. Never substitute report
commit seq for its evidence cutoff or current captured revision for historical K.
No expiry field or selectable position is part of the new daily state contract.

Amounts are canonical decimal integer-cent strings; bigint stays server-side.
Bank is `UNKNOWN` or `OBSERVED {checkpointRevisionId, observedDate, observedAt,
balanceCents}`; observedAt retains stored precision, not guessed midnight.
End balance is independently `UNKNOWN` or observed on H's day; reports use their
existing end-date rule. No check at month end means unknown even with an older B.
State detail includes the **entire** C-linked A vector, signed F, full R/S and
deficit per period; source checkpoint/vector IDs, logical/supersedes/predecessor
refs; O/S identity/revision/title/origin/funding/status/amounts; recorded/effective/
bank/confirmation dates and transition/payment/release evidence where retained.
Known R/S remain available in NO_OBSERVATION while B/A/F/end are unknown.
All-zero observed cash is not NO_OBSERVATION. Missing/corrupt mandatory evidence
returns failure; absent optional operations are NOT_PROVIDED, never zero spending.

Large vectors/identities/evidence have bounded detail sections/pages tied to one
detail digest, selection and stable item ordering. Summary is computed from the
complete admitted state before chunking; paged parts never claim full detail until
all parts arrive. Each page revalidates the pinned source, not only a cached digest.
No live daily forecast is generated for past H. Current dated money, if requested,
is a separate live read/result, outside historical totals and paging basis.

### Q-HB192-01 — proposed complete index, paging and admission

**Proposed disposition, corrected after independent review:** `budget_updates` is
the canonical committed-batch index. `schema.ts` defines UNIQUE(owner_user_id,
account_id, recorded_seq), and `factKeys` binds child owner/account/batch/sequence
to that registry. `commitBatch` inserts the registry row, mandatory audits and
financial facts atomically, then advances the account sequence. A visible registry
row therefore identifies a committed batch; do not infer commitment from the
presence of a particular child, aggregate review, kind allowlist or active tip.
UNION of child tables is unsuitable as the index root: an omitted source type or
missing mandatory child would remove the batch from the timeline and invalidate
the completeness claim. Child aggregation remains useful only for enrichment.

Capture K_index from the owned account in the read-only snapshot. The unfiltered
root-page query is conceptually the following **proposed contract**, not a SQL
file change; all parameters are validated/bound, never string-interpolated:

```sql
SELECT u.id, u.recorded_seq, u.recorded_at, u.kind
FROM budget_updates AS u
WHERE u.owner_user_id = :authorized_owner
  AND u.account_id = :authorized_account
  AND u.recorded_seq <= :K_index
  AND (:lastSeq IS NULL OR u.recorded_seq < :lastSeq)
ORDER BY u.recorded_seq DESC
LIMIT 21;
```

The account-scoped unique sequence alone is the total registry key, not effective
order. Show20 rows, use row21 only for hasNext, and continue strictly below the
**last emitted registry lastSeq**, never a child key or last valid reconstructed
state. Every scoped row at/below K_index stays reachable once in All history,
including unknown kinds and invalid-source rows. Unknown kind is an explicit
unsupported/source error, not a batch exclusion. No OFFSET, DISTINCT root dedup,
child-dependent LIMIT or latest-ten/total-age cutoff.

For the20 selected batch IDs, use bounded bulk LEFT JOIN/aggregate or separate
scoped reads to enumerate checkpoint/allocation revisions, O/S state revisions
(including funding), transition decisions/transfers, historical positions/ordering
revisions, report versions and audits. Avoid multiplying root rows in fan-out
joins. Every query/join checks owner/account plus batch ID and recordedSeq; validate
each source's own schema/lineage. Return each typed source once as a child; source
count/type and mandatory evidence are independently checked by batch kind and
retained original command/audit contract. `kind` alone does not prove completeness.
Do not reconstruct whole financial states for every list entry or introduce N+1
queries. A funding state links to its decision without adding cash. Report-only
batches link to the existing version reader; lifecycle-only and audit-only batches
retain their proper typed evidence without requiring a checkpoint/vector.

Read output distinguishes **registry coverage** from **financial source validity**:
root metadata contains an opaque batch ref, stored kind/recorded label and
`sourceStatus: VALID | INVALID | UNSUPPORTED` after bounded enrichment. Missing
mandatory child/audit/identity or mismatched evidence leaves that batch visible
as an explicit source-error entry; it never becomes a fabricated saved state or
an empty successful history. State/detail access returns HISTORY_SOURCE_INVALID
with no financial payload for INVALID/UNSUPPORTED entries. Registry coverage can
be complete while source validation is invalid; the envelope must not label the
financial history complete in that case. Integrity errors do not change paging
keys. Whole-operation admission/storage failures still refuse the page normally.
Prepared/cancelled proposals without a committed registry row remain controls,
not indexed financial batches. Unexpected child-without-registry integrity is a
source error, never a synthetic batch inserted into the index.

Detail children use `(sourceKind, immutableSourceId)` ordering; historical order
within a day always comes from manifests, never UUID or recordedAt sorting.
The batch sequence orders the knowledge timeline only.

Month filter means “effective financial changes/checks in this Berlin month”,
including any retained revision date, with report-only rows in their report month.
Cross-month corrected facts retain original and corrected date associations; once
per filtered index. A financing-month allocation is detail, not a bank observation
in that future month. Unfiltered All history guarantees reachability independently
of month membership. This definition needs UX review, not an inferred new finance rule.
For this filtered view, derive membership from validated scoped source metadata
rooted in the registry; source EXISTS checks are membership tests, not a replacement
registry. Admit and validate the bounded membership scan before producing filtered
pages. If missing required evidence makes membership undecidable, return an explicit
HISTORY_SOURCE_INVALID for the filtered request rather than silently skipping that
batch; All history still exposes its registry error entry. Filtered continuation
pins the same membership basis/K and last emitted registry key. No child fan-out
duplicates, hidden source-type exclusions or unbounded scan to fill a page.

List entries expose original revision refs even if superseded; the corrected state
is a separate selector result. Original HB-017 proof is optional by source kind.
Legacy HB-013 decisions use their own proposal/decision/funding/audit validators;
absence of BUDGET_UPDATE_REVIEW is expected there, but a broken mandatory legacy
manifest is an error. Same-balance allocations are not deduplicated by amount.
An independent PG registry census at K, not this page query reused as oracle,
proves exact batch-ID/sequence coverage. A separate child-source census proves
event completeness and evidence validity; these are two different assertions.

**D51 server paging and request admission:** open captures the owned account's
K_index and retained registry anchor in one REPEATABLE READ READ ONLY transaction.
Every later read re-authorizes the session/owned account and revalidates the anchor
ID/seq, 0<=K_index<=current seq, canonical lastSeq<=K_index, filter and all referenced
source/report memberships. Seq0 is valid only for the empty-cut shape; it is never
an observed-zero bank balance. Original/later state K is derived from a verified
owned batch/report source, not trusted as an arbitrary browser bigint.

Validate lastSeq against an owned emitted-row anchor and its declared month;
reject absent, foreign, above-cut or malformed boundaries. For next/previous
requests include the preceding page boundary and candidate lastSeq: a bounded
server query recomputes that page's20 root keys (using the same validated filter)
and checks the proposed boundary is its actual last emitted key. Filter changes
require re-entry at lastSeq=null. Requests for another valid historical cut can
only be treated as a separately validated read basis, not permission to merge
results into the old page stack. No arbitrary OFFSET/jump represented as Next.

Without server sessions or signed parameters the server cannot prove a request
was physically preceded by a UI visit, nor distinguish substitution of an entire
valid owned basis from an intentional read of that basis. Such a basis grants
no additional access. Every response echoes its full validated basis; UI compares
it with its immutable in-memory open basis **before** replacing/appending pages,
discards mismatched/out-of-order responses and requires explicit refresh/re-entry
for a different cut. This is input validation plus read isolation, not a claim of
cryptographic view provenance. Malformed/inconsistent/foreign substitutions refuse;
a complete valid replacement can never silently mix cuts in the displayed history.
Echo and compare the requested page boundaries too: a response for another valid
page cannot skip/duplicate entries by being appended at the wrong stack position.

New writes advance account metadata but do not change rows selected at the pinned
K_index or K_state. Resolve corrections/order manifests at the declared K; mutable
report heads/titles/current pointers cannot replace pinned evidence. Re-entry or
explicit refresh captures current K_index and clears the UI page stack. No expiry
or expired-token UX. No financial values/IDs/page params in URLs/logs or persistent
browser storage; use private actions/request bodies only. No write to counters,
audits, receipts, proposals, report heads/flags or finance during navigation.
Each request uses its own owned read-only snapshot; do not hold it across requests.

Proposed hard operation caps: 20 summaries/page, 100 detail items/page, request
body 16 KiB, whole response <= existing 1 MiB. Enforce source/storage/
identity/period/work budgets above **before** full materialization; charge JSON
decoding/canonicalization, distinct cuts, children and report-chain validation.
List metadata has its own bounded count/byte admission and 10-second SQL timeout;
do not read entire JSON reviews just to list. Reuse account-scoped transient
advisory admission (one costly read at a time, retryable busy result), no financial
row locks or persistent limiter. Load one cut per state operation, not 20 cuts.
Existing report limits/chunk validation remain independently enforced.

**D52 practical scale:** normal use is about4 card checks/month, with additional
retained allocations/lifecycle/report batches as actually saved. The list reads
metadata only; reconstruct one selected detail on demand. No proactive cache,
read model, background processing, partition/materialization, index or migration.
Keep every existing source/work/wire/timeout limit unchanged. There is no retention
age or total saved-row cutoff. If actual source/work admission refuses a request,
show an honest complete-detail error, retain the selected basis, record the
reproduced inputs/operation counts and propose alternatives for a later owner
choice. HB-019.2 does not implement speculative scale fixes or silently shrink K.

| Result category (proposed history codes) | User behavior / disclosure |
|---|---|
| UNAUTHORIZED / FORBIDDEN | Authenticate/unavailable owned resource; equivalent foreign/unknown response, no foreign data |
| INVALID_INPUT | Invalid/inconsistent K/lastSeq/anchor/filter/version; localized safe retry or explicit re-entry, never fallback to live |
| HISTORY_SOURCE_INVALID | Visible registry error for missing mandatory source; detail/undecidable filter refuses, no false complete history |
| HISTORY_LIMIT_EXCEEDED | Honest resource refusal at unchanged cut; no hidden truncation/optimized substitute |
| RETRYABLE_STORAGE_ERROR / STORAGE_ERROR | Retry same validated read/basis; no finance write or SQL/driver details |

### Q-HB192-02 — existing daily precision and honest selection

**D50 disposition:** select a saved source and display its original facts/IDs/
recorded/effective times/confirmed same-day order as evidence. A separate state
panel chooses day H and the source-proven original committed K (including atomic
siblings), with the explicit precision label “Through [day], as known at [cut]”.
The existing reader selects facts through the day at that K. This is **not** called
“after this event” or arbitrary before/after at a position; a multi-position batch
must not be split into synthetic intermediate financial states. Existing verified
saved HB-017 reviews/report snapshots remain accessible with their own proven
basis; they are not a generic reconstruction algorithm for legacy batches.

“With later corrections” keeps exactly the same day H; it chooses a later retained
owned committed cut up to pinned K_index, initially that captured cut, validating
the referenced batch. Captions state day precision and the actual recorded cutoff.
No guessed transaction timestamp or free-form K/position picker. To include later
writes, explicitly refresh/re-enter; clear old page state first. “As known then”
requires a source-proven original K, not today's current pointer. Missing proof
returns an explicit source error, never a guessed as-known state.

For month entry H=end of a past Berlin month or captured server day of the current
month, with the pinned captured K clearly labelled corrected/captured day view.
This is not automatically labelled original/as-known. No future H; future amounts
remain in the complete vector. The report picker independently selects an explicit
immutable version/reason/date/H/K and validated digest; latest defaults only on
entry without version. Reload/re-selection of v1 never changes its bytes or
publishes v2. No new optional-position API, assembler or selection version; HB-027
owns exact intra-day reconstruction only after release and separate approval.

### UI, navigation and privacy

Add `/history` as a read-only destination in existing shell, with entry links from
Months and saved-update results. Preserve existing Months version/closing workflow
and Update actions. Timeline → selected entry → basis picker → full state/source
sections; each section has bounded Previous/Next navigation and page-progress
announcements. Return-to-list retains its pinned in-memory view. Reload of a
nonfinancial route/month filter opens a fresh clearly labelled captured view;
re-entry clears the page stack and prompts explicit basis/version re-selection. Existing `/months`
explicit version links remain HB-019 behavior, not a new history token URL.

Use RU/DE/EN catalog keys, Berlin dates and existing integer-money formatting.
Show actual bank-check date prominently, effective date and recorded date separately;
explain funding/origin with original names at the selected K. Label UNKNOWN and
observed 0 distinctly and signed F deficits explicitly. Never display reconstructed
allocation differences as expenses. Current dated context is visually secondary.
No charts/comparison aggregates (HB-022), duplicate report editor or finance form.

Use semantic heading/landmark/list/table markup, labelled selects/buttons, visible
focus, keyboard activation and stable focus return to the selected row. Announce
loading/new pages/errors politely; retain old contents with their basis during
loading, replace atomically on success, discard out-of-order responses. Avoid
unbounded infinite scroll. At 320px use stacked labelled rows; long DE names and
negative/large amounts wrap; test native 200% zoom, themes and reduced motion.
Physical screen-reader verification remains a separate acceptance obligation.

Apply the [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)
for labels, focus, semantic navigation and responsive checks (read 2026-11-09).
Their generic URL-state advice is overridden by this product's privacy contract:
URLs may contain route/month/nonfinancial tab only; no bank amounts, source IDs,
H/K, evidence, page parameters or history detail. No Web Storage, IndexedDB or offline cache.
History actions use request bodies; server actions/read responses are private and
must not enter shared/CDN caches. No cross-user module cache or financial telemetry.
React renders user titles as escaped text. Session authorization is repeated per
page/detail/version; disabled controls are UX, not access control. No auth bypass
or production/OAuth credentials for QA. Prefer server-loaded initial page and small
client navigation state; no new state/cache library or client financial calculations.

### HBH trace matrix and executable proof proposal

All existing HBH IDs and numerical fixtures/oracles remain; the dated D50–D53
MVP/precision/HB-027/test mapping amends their wording explicitly. New file
names/titles here are **proposed**, not existing tests or registered runtime proof.
Reuse tests/checkpoints, closing, transitions, budget-update and their fixtures;
add only history-specific assertions. U=unit, C=component, P=isolated PostgreSQL,
B=real browser, A=physical assistive technology. Exact fixture and equivalent
guarantee claims must be distinguished in the eventual report.

| Scenario / BR | Concrete proposed tests and existing reuse | Independent oracle / negative assertion |
|---|---|---|
| HBH-001; BR-01/05/08/11 | `tests/integration/financial-history.test.ts`: “HBH-001 canonical registry and complete typed sources”; seven index cases below, U metadata normalization, C Previous/Next; B list→old state→return. Reuse bank-checkpoint, transition and update-budget PG fixtures. | Independent registry census equals emitted batch IDs/sequences across all pages, exactly once; independent child census equals typed refs. Missing required facts retain a source-error registry entry and refuse state detail. Twelve extra vectors are not twelve bank checks; live B100000/FNov50000 unchanged. |
| HBH-002; BR-01/08/11 | U existing daily assembly in `tests/financial-history.test.ts`; P “HBH-002 pinned K0 versus K2 and moved correction”; C/B basis controls. Reuse checkpoints/forecast/closing H/K cases. | HOct31/K0: B80000, A60000/R20000/S10000/F30000, end unknown. Same H/K2: B76000, A56000/F26000, observed end76000. Current C1 B100000 remains authoritative; -4000 is not an expense. Same-day evidence retained; day state is not labelled after an event. Corrections resolve before H. |
| HBH-003; BR-08/11 | P “HBH-003 v1/v2 explicit immutable source and reload”; extend closing page/component tests; B report picker/reload. Existing month-closing PG supplies legitimate v2 creation in GIVEN only. | v1 bytes/hash/manifest/cut unchanged; v2 predecessor/source/reason exact. Corrected-state browse creates no report; latest defaults only before explicit selection. |
| HBH-004; BR-01/03/07/08 | U/P “HBH-004 observed zero versus no observation and earlier check”; C localized rendering. Reuse closing no-observation/zero fixtures and forecast completeness. | Observed B0/A0/R2000/S1000/F-3000. No-C branch B/A/F/end unknown with known R/S; original v1 last80000/end unknown. No interpolation/latest-B fallback or empty-detail=zero-spending assertion. |
| HBH-005; BR-02/03/05/06/07/11 | U/P “HBH-005 original identity funding then payment”; C/B source detail. Reuse genuine CARRY/FRESH_START, obligation partial-payment/savings-release evidence and update-budget writer in GIVEN only. | Oct R20000/S10000; Nov funding transfer once; later paid C3 B80000/ANov60000/R0/S10000/F50000, Dec20000. Preserve identity/origin; no second debit20000, reserve duplication or automatic saving release. |
| HBH-006; BR-08/10/11 | P “HBH-006 concurrent registry append retains exact old pages” with independent connections, plus index case7 below; `tests/financial-history-boundary.test.ts` auth/parameter validation; U bounds/limits; C/B busy/invalid/re-entry UX. | Substitute K_index/lastSeq/anchor/filter/account/version, invalid day/cut and page adjacency, oversized input/source/work/wire, missing evidence; zero foreign disclosure. Echoed-basis mismatch cannot append; explicit re-entry refreshes. Fixed K registry census survives append and same-day reordering at later K; refresh includes the new batch exactly once. Compare rows/counters/hashes before/after every read/refusal. |
| HBH-007; BR-01/08/10 | `tests/financial-history-ui.test.tsx`: locale/basis/unknown/focus/error/race; B authenticated journey RU/DE/EN × 320px/desktop × native200% zoom; A physical reading of basis/progress/zero. Reuse shell/month/version components. | No financial action on click/reload/Berlin month/DST change; no sensitive URL/log/browser storage/cache entries; no past daily forecast. Component success cannot satisfy B/A. |

The corrected index has seven concrete proposed PG cases within HBH-001/006,
without changing their normative scenario fixtures/oracles. All are NOT EXECUTED:

| Case / proposed test title | Required assertions |
|---|---|
| 1. Registry identity and fan-out | Independently enumerate scoped budget_updates at K; compare exact batch IDs/sequences with all emitted root rows. A multi-source/multi-audit batch appears once with every typed child; foreign-account rows never enter either set. No reconstruction from amount deltas. |
| 2. Legacy committed transition | Genuine HB-013 transition without BUDGET_UPDATE_REVIEW remains indexed and uses its own proposal/decision/funding/audit proof; missing aggregate review alone is not corruption. Prepared/cancelled controls without registry rows add no batch. |
| 3. Report-only committed batch | A legitimate MONTH_CLOSE with no new checkpoint/vector is present, points to its immutable selected version and preserves its original H/K/source proof. Do not require unrelated children. |
| 4. Lifecycle-only committed batch | A legitimate obligation/saving lifecycle batch with no new bank observation is present with complete state/audit lineage and unchanged bank cash. Parameterize supported kinds rather than filtering to BUDGET_UPDATE/PERIOD_TRANSITION. |
| 5. Missing/unsupported required source | On synthetic corrupt fixtures, remove/mismatch one required source at a time (checkpoint/vector, lifecycle, transition, closing, audit/identity); retain registry row/sequence and assert a visible INVALID entry, detail HISTORY_SOURCE_INVALID and no false financial-completeness label. Unknown kind remains UNSUPPORTED. An undecidable month filter refuses explicitly; no missing row is mistaken for valid empty history. |
| 6. Bounded pagination and membership | Use45 valid committed batches: pages20/20/5 with exact exclusive sequence boundaries, repeated first-page/back navigation, no skip/duplicate despite fan-out or superseded sources. Check empty account, terminal null continuation and effective-month/cross-month membership; separately assert invalid-source rows retain root-page slots/continuation keys. |
| 7. Concurrent append at pinned cut | Independent connection commits a valid later registry batch between pages (including backdated/same-day source variants). Old pages equal the original registry census at K; the new row is absent until explicit refresh, then appears exactly once. No changed financial/control rows from any navigation read. |

The child census and synthetic corruption oracle must not reuse the implementation's
kind dispatcher/join query, which could repeat the same omission. Corrupt fixtures
use only the existing isolated test harness; if relational guards forbid a specific
corruption, verify the guard's refusal and use a structurally permitted missing
evidence variant instead. No production SQL or schema weakening is authorized.

Split the security/resource group into independently reviewable sets of <=7 test
cases: (1) session/foreign/missing/shape/version/anchor/boundary, (2) K/lastSeq/
filter/day-H/concurrent-append/cross-basis/corruption, (3) rows/bytes/work/identities/periods/
wire/busy. Each case can parameterize exact boundary values; do not merge away
separate acceptance obligations to reduce the count.

Shared PG proof uses the existing migration chain on a **new explicitly owned**
loopback disposable instance, synthetic owners/accounts/dates only. Inspect local
target guards/harness first; explicitly supply all database URL overrides and
isolated target markers, without loading .env.local. Do not start/reuse/stop other
containers or connect Neon. Snapshot finance tables, audit/receipt/proposal tables,
account counters/pointers, period rows, report heads/flags and canonical report
bytes around every read/refusal; assert exact equality. READ ONLY transactions
are also tested at the SQL boundary. No row/advisory lock is mistaken for a write.

Planned implementation validation: lint/typecheck/build; targeted U/C and P suites;
full UTC unit, full isolated PG, the required identical UTC/LA subset, separate
DB17, and finance gate init→record→check with newly generated receipts. Existing
HBH scenarios are fingerprinted under tests but **not** parsed by current gate's
definition inventory. **D53: no checker, mandatory HBH binding or CI expansion
through MVP.** Every applicable HBH U/C/PG/browser test still must actually run
and map exact assertions/results in one main verification report for independent
review. Existing finance gate PASS is not machine-enforced HBH coverage. Discuss
enhancement after MVP only; no automatic implementation. Protected context hashes
must later be maintained in a separately authorized context-only update, with a
fresh finance run before publication; no HBH bindings/checker/CI changes or weakened
checks. No hashes/receipts are refreshed in this documentation stage. Browser/A
proof remains separate.

No Playwright package is currently installed or test:e2e script defined: use the
authorized in-app local browser if available, or separately review runner setup.
Unavailable authenticated browser/zoom/A evidence is explicitly NOT EXECUTED.

### Small implementation sequence (all pending separate authorization)

These are slices of HB-019.2, not new task-register statuses or all-milestone work.
Each row has <=5 acceptance criteria and <=7 primary test cases; the detailed
matrix above supplies oracles. Finance/scenario proofs precede UI.

| Slice / dependency | Acceptance gates | Primary proof cases (maximum seven) |
|---|---|---|
| B0 branch preparation, before implementation | Fresh origin/main verified; new HB-019.2 worktree/branch starts at that SHA; uncommitted plan/local files preserved; merge-base recorded; future PR excludes old HB-019.1 commits/patches. | Remote/base identity; clean initial range; original-file preservation; transferred plan reconciliation; merge-base/ancestor checks; future commit-range review; future PR hunk review. |
| S0 revised design review, before S1 | Verify D50–D53 daily scope/paging; review permitted day-H/K port; preserve bounds; no HBH gate expansion. | Registry/child census; daily precision/evidence; K/lastSeq validation; query bounds; source map; cleanup mapping; no-write proof. |
| S1 metadata index, after B0/S0 | Canonical registry coverage; complete typed children/source-error visibility; pinned sequence keyset; legacy-specific proof; bounded owned read-only SQL. | The seven corrected PG index cases above: registry/fan-out; legacy; report-only; lifecycle-only; invalid/unsupported source; pagination/membership; concurrent append. |
| S2 state detail, after S1 | Existing day-H/proven-K only; full vector/identities/funding; zero/unknown; immutable old source; existing budgets refuse honestly. | HBH-002 daily oracle; same-day evidence/label; moved correction beyond H; HBH-004 branches; HBH-005 payment/funding; existing old-K future vector; source/work refusal. |
| S3 ordinary paging/auth/read actions, after S1/S2 | Per-read owned scope; validated anchored K_index/lastSeq/filter; echoed basis cannot mix; consistent failures; zero writes. | Three <=7-case parameter/security/resource sets above, no crypto/expiry tests. |
| S4 timeline/selection UI, after financial S1–S3 proof | Three explicit bases; existing report reader; all locales; keyboard/responsive loading/error states; no sensitive persistence. | HBH-001 navigation; HBH-002 picker; HBH-003 version; HBH-004 labels; async race/error/re-entry; keyboard/locale; privacy. |
| S5 Evidence Cleanup, independent of UI after reviewed mapping | Preserve final/unique proof; archive refs work; links repaired first; fingerprint/gates preserved; no history rewrite. | Seven cleanup checks below. |
| S6 acceptance, after S4/S5 | Fresh full runtime proof; real browser/zoom evidence; physical AT status; independent quality/functional review; explicit owner acceptance before Done. | HBH-001 through HBH-007 with their matrix obligations and exact execution records. |

One eventual main verification report for HB-019.2, with commands, tested SHA/tree
digest, scenario mapping, failures and limitations. Reuse scenarios and tests;
machine reports remain ignored local/CI unless a required proof needs retention.
No new per-correction evidence directory, copied normative prose or duplicate plan.

## Evidence Cleanup — audit and proposed deletion manifest

**Nothing is deleted in planning.** Inventory covers all tracked evidence/browser
directories and technical reports found with `git ls-files`, plus migration
snapshots and test fixtures that could be mistaken for disposable evidence.
There are five tracked evidence/browser directories: the three HB-019.1 sets have
**48 tracked files (13+18+17)**, matching the request. The physical directory scan
finds49 because correction also contains ignored `db17-final.log` (416 bytes).
HB-017 adds2 machine evidence files and23 browser files: **73 tracked artifacts**.
Ignored local artifacts are not deletion targets; no .env, bank files, private
exports, node_modules or foreign container was inspected. Tracked sizes:
initial696614, correction717071, publication701326,
HB017 evidence373064, HB017 browser1150228 bytes.

KEEP means retain in the working tree. DELETE means remove only after archival
and link checks. REPLACE means first preserve the unique synopsis and repair
inbound references in an existing primary report, then remove that exact artifact.
Neither category permits deleting original financial source data or rewriting Git.
Historical runs are superseded evidence, not necessarily byte-identical duplicates.

### Archive identity and reference rules

All 73 tracked paths exist in local snapshot
`5e6df62b4173c20dde51d4caff1d95adec5c8503`; the identical tree is published at
[main snapshot 050c7b0](https://github.com/strakhovdenya/home-budget/commit/050c7b0e5d497fc016726bf705fc9b17fbd2f010).
Before cleanup, verify **each** deletion candidate with `git cat-file -e SHA:path`
and hash its `git show SHA:path` bytes against the current artifact. Replace
relative links with exact GitHub `blob/050c7b0e5d497fc016726bf705fc9b17fbd2f010/<path>`
permalinks and label them historical (repository access still required). Example:
[initial raw unit report](https://github.com/strakhovdenya/home-budget/blob/050c7b0e5d497fc016726bf705fc9b17fbd2f010/docs/planning/hb-019-1-evidence/unit.json).
Commit-level links alone are insufficient for a removed directly linked artifact.
Use the exact file path in each replacement; no branch-relative archive links.

CI currently writes fresh reports under `$RUNNER_TEMP/hb015`; its workflow has
**no upload-artifact step**. No GitHub Actions archive, retention duration or
downloadability has been established. Do not rely on Actions as the sole archive.
The proposed Git permalinks are the durable historical reference. Keep necessary
final proof locally in Git; archived receipts are never fed into a fresh gate.

Below I=initial `hb-019-1-evidence/`, C=correction
`hb-019-1-correction-evidence/`, P=publication `hb-019-1-publication-evidence/`,
all under `docs/planning/`. These are exact directory/file sets, not recursive
delete globs. References/dependencies include machine pairings, not only Markdown.

| Path / exact filenames | Purpose | References / dependencies | Decision | Reason |
|---|---|---|---|---|
| I: `baseline.json` | Pre-change 20-document hashes | Same bytes as C/P baseline; historical final-audit inputs | DELETE | Keep one identical baseline in P; no unique evidence lost. |
| I: `commands.json`, `final-audit.json`, `git-status.txt` | Initial command/failure/tooling/scope chronology | hb-019-1-verification links all three; finance report links commands | REPLACE | Preserve initial/failing command synopsis and exact SHA file links in primary report; not current acceptance inventory. |
| I: `summary.json`, `source-integrity.json` | Initial1000/439/552 run and input hashes | Finance report links both; summary/run/fingerprint relationship | REPLACE | Archive exact initial manifest/counters; latest accepted run is P. Different initial inputs must not be called duplicate final proof. |
| I: `run.json`, `unit.json`, `unit.receipt.json`, `integration.json`, `integration.receipt.json`, `timezone.json`, `timezone.receipt.json` | Initial raw run + three digest-bound report pairs | Summary/commands and receipt runId/digests; no fixed CI input | REPLACE | Archive as one seven-file run set, retain historical result/failed-attempt narrative. No orphan receipt and no claim old run proves new inputs. |
| C: `baseline.json` | Repeated initial baseline | Identical I/P baseline | DELETE | Keep P copy, redirect any newly discovered reference. |
| C: `commands.json`, `summary.json`, `source-integrity.json`, `final-audit.json`, `git-status.txt` | Correction1012/443/552 run, hashes and checks | Both UX/finance reports link all five | REPLACE | Preserve reason, original expectation failure, exact commands/cwd/TZ/exits and pinned archive links; P reruns corrected implementation. |
| C: `run.json`, `unit.json`, `unit.receipt.json`, `integration.json`, `integration.receipt.json`, `timezone.json`, `timezone.receipt.json` | Correction raw run and paired receipts | Correction summary/runId/report digests | REPLACE | Archive seven-file set together; keep correction versus initial distinction and exact fixture/source refs. |
| C: `dashboard-la.json` | Supplemental52-test LA dashboard run | Correction section in both reports describes this unique supplemental execution | KEEP | P's required552 subset does not replace these dashboard LA assertions. Keep explicit path/reference in consolidated report. |
| C: `diff-check.txt`, `index-stat.txt` | Empty successful command output | Both are zero-byte; command exits are retained elsewhere | DELETE | No unique content. Preserve exit status and command in primary report/commands archive. |
| C: `final-audit.txt`, `final-finance-check.txt` | Intermediate text audit/gate result | Audit JSON and report already preserve scope/result; verify exact fields before removal | REPLACE | Summarize any unique gate dispositions in primary report then archive exact text. Do not assume text and JSON byte equality. |
| P: `baseline.json`, `commands.json`, `summary.json`, `source-integrity.json`, `final-audit.json`, `secret-scan.json`, `db17-final.txt` | Accepted final command/input/scope/count/baseline/security heuristic/DB17 evidence | Both UX/finance reports link commands/summary/integrity/audit/scan; source manifest and DB17 support final counts | KEEP | Minimal final provenance/support set; secret scan is heuristic only and DB17 filtered skips are not passes. |
| P: `run.json`, `unit.json`, `unit.receipt.json`, `integration.json`, `integration.receipt.json`, `timezone.json`, `timezone.receipt.json` | Accepted final raw run + paired receipts | P summary/commands/run fingerprint; report digests | KEEP | Preserve one complete accepted finance evidence bundle, not just a summary with orphan receipts. |
| P: `attempt-1-summary.json`, `attempt-1-run.json`, `attempt-1-record-pg.txt` | Failed stale-input publication attempt | P commands contains attempts; both reports explicitly describe failed receipt admission | REPLACE | Move exact status/reason/runId/fingerprint/exit to primary report and link SHA files before removing. The failure must remain visible. |

All 48 tracked HB-019.1 files are covered: **15 KEEP, 4 DELETE, 29 REPLACE**.
The 33 removal candidates are initial13 + correction17 + publication3.
The 15 retained files are publication14 + unique correction dashboard LA1.
Ignored `C/db17-final.log` is KEEP locally/out of scope, not a tracked duplicate
to delete or an artifact to add to Git.

### Earlier tasks, browser evidence and technical reports

| Path / exact group | Purpose | References / dependencies | Decision | Reason |
|---|---|---|---|---|
| `docs/planning/hb-017-evidence/executed-tests.json`, `source-integrity.json` | Unique HB-017 per-test results/raw digests and tested-copy equivalence | Both directly linked in hb-017-verification | KEEP | Not duplicated by later aggregate reports; keep original acceptance trace. |
| `docs/planning/hb-017-browser/geometry.json`, `auth-copy.json` | Actual geometry36 locale/theme/viewport cases and auth-copy matrix | Direct links in hb-017-verification | KEEP | Unique browser checks, not replaced by HB-019.1 component tests. |
| Same directory: `disjoint-C-en-1280.png`, `disjoint-F-en-1280.png`, `final-cold-history-en-1280.png`, `form-de-light-320.png`, `form-ru-dark-375.png`, `unknown-en-375.png` | Representative transition/receipt, responsive/theme and unknown-outcome images | Six explicit links in hb-017-verification | KEEP | Preserve linked, differentiated historical visual evidence. |
| Same directory: `conflict-en-375.png`, `login-neutral-de-375.png`, `login-neutral-en-375.png`, `login-neutral-ru-375.png`, `no-account-en-762.png`, `preview-u08-en-1280.png`, `saved-u08-en-1280.png` | Distinct conflict/auth/no-account/preview/save browser states | No direct Markdown path links found; associated report's QA narrative | KEEP | Lack of inbound link does not prove redundancy; retain distinct historical states. |
| Same directory: `form-de-dark-375.png`, `form-de-system-1280.png`, `form-en-1280.png`, `form-en-dark-375.png`, `form-en-light-320.png`, `form-en-system-1280.png`, `form-ru-light-320.png`, `form-ru-system-1280.png` | Additional form screenshots | No direct path links found; geometry.json retains numeric locale/theme matrix, representative images above retained | REPLACE | Eight provisional visual-variant candidates; compare archived images side by side during cleanup and KEEP any unique defect/state. No deletion based only on filename. |
| `docs/planning/hb-005-verification.md` through `hb-019-verification.md` (each HB005–019, 15 existing files) | Final per-task acceptance/commands/failures/limitations | TASKS, task plans, runbooks and inter-report links | KEEP | Already one primary report per earlier task. Older status paragraphs are chronology, not reason to erase final acceptance. No bulk status rewriting. |
| `docs/planning/hb-019-browser-qa-findings-2026-11-04.md` | HB-019 defects, scope and unresolved Q07 | HB-019 plan/report/task references | KEEP | Unique unresolved findings and historical browser evidence. Do not erase OPEN/NOT REPRODUCED. |
| `docs/planning/hb-019-1-verification.md` | Main accepted UX/report chronology | TASKS/DECISIONS/architecture, finance report, evidence links | KEEP | Consolidation destination and sole main HB-019.1 verification report. |
| `docs/planning/hb-019-1-finance-gate-verification.md` | Technical execution report with additional run/failure provenance | TASKS/DECISIONS/fingerprint plan/UX report plus direct evidence links | REPLACE | Merge unique finance/fingerprint/tooling/failure information into existing main report; keep a concise historical link stub at this path until all inbound links/anchors are repaired. No immediate removal proposed. |
| `docs/planning/hb-019-1-documentation-alignment-verification.md` | Separately accepted20-doc audit, exact validator and expected historical stale-context refusal | Prior documentation acceptance; retained command body is unique | KEEP | Different accepted stage; stale-context claim is historical and must not be relabelled a current gate failure. |
| PRD/BR/DECISIONS/TASKS/OPEN_QUESTIONS/ADRs/architecture/data model/runbooks, all planning and scenario specifications | Normative contracts, decisions, stable IDs and oracles | finance normativeContexts and linked design dependencies | KEEP | No specification/decision/scenario deletion or weakening; mixed normative/report plans remain protected whole files. |
| `drizzle/meta/0000_snapshot.json` through `0005_snapshot.json`, `_journal.json`; SQL migrations; `tests/fixtures/*`, `tests/finance/coverage.json`, finance checker/tests and CI | Migration metadata, synthetic fixtures and executable gate | Drizzle/tooling/test imports, file-set fingerprint, coverage definitions/context hashes | KEEP | These snapshots/JSON files are required project inputs, not redundant execution evidence. |

Total provisional removals: **41 artifacts** (33 HB-019.1 + eight HB-017 images),
plus consolidation of one technical report into the existing main report with a
temporary link stub. Four direct DELETE candidates;37 require REPLACE checks.
The eight image candidates have not been visually verified as duplicates in this
planning; their removal is conditional. No new archive directory/report is needed.

### Fingerprint/CI dependencies and cleanup acceptance checks

Actual checker inspection: fingerprint enumerates **all** regular files in
src/tests/drizzle/scripts plus explicit root config and normativeContexts. It
does not recursively follow Markdown links. None of the73 tracked artifacts is in that
set; no tests/checker/workflow fixed-path read of these docs evidence directories
was found. CLI consumes the caller's current-run output directory, not P/I/C.
Removing historical evidence therefore does not replace/disable finance validation.
`administrativeReports` explicitly lists the two HB-019.1 UX/finance reports only;
this is not permission to exclude mixed contracts. Updating TASKS/DECISIONS or
protected plans to fix links changes finance inputs and requires fresh contexts/
execution. Keep unprotected reference consolidation separate where practical.

This HB-019.2 plan itself is currently outside normativeContexts/fingerprint;
the HBH scenario Markdown is included through tests traversal, but its IDs have
no runtime gate registration yet. D53 retains this distinction through MVP:
actual HBH results belong in the one verification report, not new mandatory gate
bindings. Gate enhancement is only a post-MVP discussion, not automatic work.

Cleanup has its own seven required checks, all after implementation authorization:

1. **Archive manifest:** enumerate exact candidates, verify each SHA:path object,
   original byte hash and readable repository permalink. Keep any missing/modified
   unique artifact. Do not rely on local tmp ZIPs or unspecified Actions retention.
2. **Reference integrity:** scan all tracked text for full/relative paths and
   directory mentions, including JSON manifests/commands and scripts. Repair
   inbound Markdown file+anchor links to the consolidated report or historical
   exact file permalink; distinguish archived internal run-directory paths from
   live dependencies. Compare broken links before/after, introduce zero new ones.
3. **Preservation:** cross-check final acceptance/counts, failed commands and
   limitations, original hashes/run IDs, unique dashboard-LA and browser evidence,
   scenarios/ADRs/decisions/financial snapshots. Retained raw reports must still
   match receipts. No unique content loss or failed run silently removed.
4. **Fingerprint sensitivity:** compare old/new `fingerprintFiles()` and digest.
   With evidence-only removal expect identical 324-input baseline; if protected
   references/contracts change, expect new digest and old-run rejection. Do not
   refresh just a receipt/hash to simulate fresh execution; test SQL/add/remove
   sensitivity via existing finance-fingerprint regressions.
5. **Scenario regression:** run finance-coverage/fingerprint unit tests and full
   finance suites, isolated PG, UTC/LA parity and DB17 under existing rules. Review
   HBH and existing financial no-write/history invariants; no removal waiver.
6. **Fresh CI:** execute existing docs-check and complete finance CI on the actual
   authorized candidate SHA; record links/results in the one main report. Gate
   init/record/check uses fresh local/CI reports, never archived acceptance receipts.
   If runner/CI changes become necessary, submit separately for review first.
7. **Diff review:** exact candidate-path deletions only, no .git/history rewrite,
   no normative/test/SQL/schema/dependency removal, no secret/private files.
   Inspect final status and independent reviewer confirms the preservation map.

Do not execute a recursive directory deletion. Future cleanup should delete only
the reviewed exact file manifest after checking absolute resolved paths remain
under this workspace. Leave mixed KEEP/REPLACE directories intact.

## Risks and owner decisions before implementation

| Decision / risk | Evidence and proposed handling |
|---|---|
| Canonical index completeness — review High | budget_updates is the committed registry with account-scoped unique sequence; source UNION cannot replace it. Prove registry coverage separately from child completeness; missing mandatory sources remain explicit registry error entries, never hidden batches. |
| Squash-merged branch ancestry — review Medium | Current feature/main merge-base predates the squash despite equal trees. Mandatory B0 starts a new branch at freshly verified origin/main, preserves the uncommitted plan/local files, and checks merge-base plus future PR commits/hunks for repeated HB-019.1 changes. |
| Daily read capability | Compose only validated owned day H/proven K with existing internal path/report reader. No new position/assembly/reachability mode. A demonstrated required daily failure blocks implementation pending owner decision. |
| Untrusted page parameters | Validate retained anchors/cut/lastSeq/filter and page adjacency each read; echo basis, UI rejects cross-basis append. No cryptographic prior-visit proof; full valid owned replacement is a separate read basis. No secrets/sessions. |
| Actual resource refusal | Keep current caps/timeouts; metadata list/on-demand detail only. No age/count cutoff or proactive optimization. Reproduce failure with facts/options for a later owner choice, no scale fixes in HB-019.2. |
| Index/filter semantics and original cuts | Review “recorded timeline, effective-month filter” and valid saved-event H/K defaults. Batch order cannot stand in for intra-day effective order; no arbitrary timestamp/K entry. |
| Legacy completeness | Missing aggregate HB-017 review can be normal for HB-013; missing required legacy source evidence is not. Validate by source type and preserve unavailable/error distinctions. |
| No-write proof | Existing HB-017 history locks/writer-oriented helpers must not leak into new navigation. Use owned SELECT and true READ ONLY transaction; compare all financial/control tables. |
| Evidence archive / file-count discrepancy | Confirmed48 tracked plus one ignored log; removal candidates are conditional. P final bundle retained; no proven Actions archive. Review exact Git-object/permalink and unique-content checks before removing41 candidates. |
| Finance evidence freshness/scope | D53 defers HBH gate expansion through MVP. Protected-document changes make existing contexts/receipts stale: no current gate PASS. Separately authorize context-only freshness maintenance before publication, then fresh existing finance checks plus HBH proofs in one report. |
| Browser/AT and HB19-Q07 | Accepted earlier browser/320px/200%zoom/AT limits and unresolved Q07 remain. History implementation needs its own actual browser evidence; unavailable physical AT stays explicit and requires owner acceptance of the limitation. |

No product ambiguity is resolved by inventing movements, balances or dates. The
two existing Q-HB192 questions contain the pending decisions; their proposed
answers and D50–D53 are recorded in existing OPEN_QUESTIONS/DECISIONS/TASKS
without changing HB-019.2 Planned or claiming implementation acceptance.
Any discovered need for DB/schema/financial semantics changes must come back with
measured evidence and alternatives, before implementation authorization.

## Review handoff and planning-stage checks

### Earlier planning correction record (historical)

**Planning correction — 2026-11-09:** owner supplied independent ChatGPT verdict
CHANGES REQUESTED (0 Critical /1 High /1 Medium /0 Low). This revision addresses
the High with a budget_updates-rooted index/read/error contract and seven proposed
PG completeness cases; it addresses the Medium with mandatory B0 branch/ancestry/
preservation gates. These dispositions await repeat independent review; no approval
or implementation is inferred. Existing financial rules, HBH-001–007, three H/K
perspectives, resource/auth/read-only limits, file minimization and the41-candidate
cleanup section are preserved. Only this existing uncommitted plan is edited.

Correction verification actually executed: six relative file/anchor links checked,
zero broken; content-hash comparison confirms unchanged perspective, Q-HB192-02/UI,
resource and Evidence Cleanup sections from the pre-correction uncommitted plan.
Static consistency checks confirm the canonical registry query, branch gate and
41-candidate manifest. `git diff --check` exits0; index empty; `git status --short`
shows only ` M docs/planning/hb-019-2-financial-history.md`. No test suite, database
operation or Git branch/worktree mutation was executed in this correction.

### Current owner amendment and repeat-review handoff

**Current owner amendment (D50–D53),2026-11-09:** owner reports the preceding
corrected plan APPROVED; this new daily/paging/scale/gate boundary needs repeat
independent review. Earlier checks above are historical. Existing documentation
and scenario specs only change; no code/PG/browser execution, deletion or
publication. B0 remains a future gate.

Handoff for independent **ChatGPT review**: review this plan, revised HBH-001–007,
D50–D53 clarification against unchanged D46–D49/ADRs and TASKS/HB-027. Assess
complete evidence versus daily precision, numerical H/K oracles, plain parameter
ownership/basis consistency, no writes, unchanged bounds and all41 cleanup
candidates. Neither HB-027 option is approved; it cannot block MVP. Distinguish
no HBH gate expansion from required future context-only freshness maintenance.
Return findings/approval; this author claims no new independent review or PASS.

Readiness for implementation review requires approved S0 decisions, failing then
passing meaningful financial tests, exact HBH matrix assertions/fixtures, fresh
full finance/tooling/PG evidence, actual browser records and explicit AT status,
clean scope/link/archive audit and independent quality/functional verdicts. Only
subsequent owner acceptance can change HB-019.2 to Done. This planning turn stops
with a document for review, not implementation approval.

### Original planning checks (historical, not current document/gate evidence)

Planning checks actually executed on2026-11-09 (read-only unless this plan edit):

- Branch/HEAD/status and tree comparison; remote main via GitHub connector.
- Tracked path/byte inventory and textual inbound-reference census of all73
  artifacts; exact byte equality of the three baseline.json copies.
- Imported the inspected checker without invoking its CLI: `fingerprintFiles()`
  returned324 inputs; `fingerprint()` returned
  `93508e70fb34f6f40f6ec4b509c1ee089370fedb252c9fc8c98c921805b1f322`.
  `validateManifest()` succeeded with596 definitions. This is static manifest
  validation, **not** fresh financial test execution or a current-run gate PASS.
- All nine retained historical report/receipt digest pairs validated against their
  own run IDs. This checks archival integrity only, not freshness/job/root admission.
- Checked all73 local historical Git objects against worktree artifacts:69 are
  byte-identical, four retained HB-017 JSON files differ only in checkout CRLF.
  All48 HB-019.1 artifacts are byte-identical. The initial strict comparison
  stopped at the first CRLF difference; the repeat explicitly classified text
  normalization without weakening byte checks for binary/raw HB-019.1 evidence.
  Verify server permalink accessibility and candidate hashes again during S5;
  this is not a completed cleanup or remote archive-download test.

No unit/integration/browser/AT suites or database commands were run in planning.
Final document validation: six relative file/anchor links checked, zero broken;
one changed plan only, empty index; fingerprint unchanged and manifest still596.
`git diff --check` exits0. Python bootstrap invocation could not run because
`python` is unavailable; a Node equivalent of the inspected checker passed22 core
file checks,10 skill frontmatters and7 architecture layers. Its first attempt
also stopped on CRLF before normalization to Python read_text semantics; the
normalized repeat passed. These are documentation checks, not runtime finance proof.
No generated evidence folder/report was created.

### D50–D53 documentation verification and finance freshness — current revision

Actually checked on2026-11-09: branch/HEAD remain the original HB-019.1 worktree
(`5e6df62b4173c20dde51d4caff1d95adec5c8503`); its uncommitted plan was updated in
place, not replaced from Git/main. B0 was not executed. Ten existing documentation/
scenario files changed; no new document/evidence. Static link audit checked355
relative file/anchor links including baseline comparison: zero broken. TASKS has
29 unique HB IDs (HB001–027 plus019.1/019.2), one Planned/Post-MVP HB-027, and all
seven HBH IDs each have MVP/precision/deferred/test sections. No HB-019.3 or
deployment task. architecture.json parses; runtime/tests/SQL/scripts/CI hashes
are unchanged. Original D46–D49/other decision chronology and HBH shared numerical
fixture are unchanged. The full cleanup map/checks are unchanged except the
explicitly superseded future-HBH-gate-binding paragraph; all33+8 conditional
candidates, KEEP/DELETE/REPLACE rows, final proof and SHA/permalink policy remain.

**Protected changed contexts (8):** docs/BUSINESS_RULES.md, docs/DECISIONS.md,
docs/ARCHITECTURE.md, docs/architecture.json, docs/PRD.md, docs/UX.md,
docs/TASKS.md and docs/OPEN_QUESTIONS.md. The revised HBH Markdown under tests is
also fingerprinted (ninth changed protected input), though not a parsed HBH binding.
This plan is still outside current normativeContexts; no checker change is made.
Read-only validateManifest inspection confirms expected NORMATIVE_CONTEXT_MISMATCH
for those8 stale contexts. This is a disclosed freshness refusal, not a finance
PASS or a test run. Manifest/receipts remain unchanged. Before publication obtain
separate authorization for context-only maintenance (no new HBH bindings), then
fresh existing finance init/record/check, UTC/LA, isolated PG and real HBH tests
mapped in one report; restore existing CI validity without disabling/expanding it.

Current git diff --check exits0; only the ten intended existing files appear in
git status --short, index empty. Unit/component/PG/browser/physical-AT proofs are
**NOT EXECUTED** in this documentation turn. No code, finance test run, container,
production/Neon/secret access, evidence deletion or publication. No demonstrated
daily-path financial contradiction was found by static inspection; actual daily
proof, plain-parameter/basis regression and complete source census remain required
before implementation acceptance. Any failing required daily case needs an owner
decision, not automatic HB-027 work or a substituted partial PASS. The amended
documents are handed to the owner for repeat independent ChatGPT review.

## Acceptance criteria

1. All saved checks and financial states are reachable across current/past months,
   including more than ten updates, legacy transition facts and retained revisions;
   paging is complete and consistent at its pinned knowledge cut.
2. Three perspectives identify day H/proven K or immutable report version and
   preserve observed/effective/recorded ordering evidence/correction provenance.
   No exact intermediate position-state promise; HB-027 is post-MVP.
3. Unknown cash/end balances differ from observed zero; historical R/S/F and
   full vectors retain identity/funding, never infer flows or duplicate money.
4. Every read remains owned, bounded and read-only; later writes never change a
   selected immutable version or mix pages from different cuts.
5. RU/DE/EN, 320px/desktop/200% zoom, keyboard and screen-reader navigation explain
   the basis. Per D54, actual browser/auth/navigation/layout/zoom/keyboard/physical-AT
   execution is owned by HB-021 and remains NOT EXECUTED until performed before
   its acceptance; HB-019.2 financial/U/C/P evidence remains mandatory and separate.

## Remaining technical questions

[Q-HB192-01/02](../OPEN_QUESTIONS.md#history-implementation-questions--2026-11-08)
record D50–D53 daily-precision/20-row keyset owner choices and remaining review/
proof gates. Complete retained evidence stays MVP; exact intra-day reconstruction
is the dated HB-027 deferral, not silent truncation.
