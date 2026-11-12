# HB-020 — First actual budget confirmation and monthly obligation templates

## D57 correction addendum — 2026-11-12

The owner's post-implementation independent-review correction supersedes only R1/D55's independent reviewed origin/funding choice for initial template creation: there is one loaded proposal context P (YYYY-MM; default current Berlin month), displayed in offer/review without two month inputs. Initial ACCEPT must save origin=funding=P; the strict retained wire funding field must equal origin, with symmetric original proof. Financial effectiveDate remains the actual confirmation date, not P. Neither old debt nor the ordinary obligation transfer model changes; separate explicit FRESH_START/CARRY and D43/D44 remain. D56 terminal ACCEPT/DECLINE, local Later and disable are unchanged. The owner now authorizes implementation correction/tests and narrow F-016 definition alignment; the original R1/D55/D56 planning-only and no-refresh statements below describe their dated stage. Broader manifest/fingerprint changes remain separately gated. See D57 and the implementation verification report for actual proof and gaps.

**Revision R1 — PLANNING / PRODUCT ALIGNMENT ONLY**, 2026-11-11.
R1 independently APPROVED as reported by the owner; documentation alignment authorized under D55, implementation not authorized.
R1 baseline/changelog and the D55 note retain the earlier planning stage; the D56 correction below governs current operative design.
Every proposed executable test below is **NOT EXECUTED**.

**Documentation alignment — 2026-11-11 (D55):** the owner reports independent
approval of this R1 plan and authorizes coordinated documentation/scenario edits
in `D:/projects_js/home-budget-hb-020`, branch
`feat/hb-020-first-run-recurring`, from verified origin/main
`35154f64ddabd66f268987b74f0f291478adba74`. The source R1 file in main is preserved.
Initial copy SHA-256 matched:
`5D92E6E591ED04A4BA5DE6B9FCB8541FA3F354A9A939C722168380EE1A78DAD3`.
[D55](../DECISIONS.md#hb-020-product-alignment--owner-2026-11-11),
[aligned HB20 scenarios](../../tests/scenarios/phase-01/hb-020-first-run-and-recurring-templates.md)
and [question register](../OPEN_QUESTIONS.md#hb-020-monthly-instance-suggestion--open)
now carry the agreed product contract. No runtime approval or implementation.
D55 retained the then-approved design. D56 below updates terminal decision storage/exclusion; A/B remains unselected.
Sections8/10 retain the R1 amendment checklist as historical planning trace:
their AMEND/future-text labels now refer to the changes aligned in these docs,
not permission to keep conflicting live requirements or skip scenario proof.
Section1/R1 verification details describe their original planning turn.
Protected hashes are intentionally stale; separately authorized maintenance/fresh
checks must follow later. Runtime tests: NOT RUN (documentation-only, owner instruction).

**D56 correction — 2026-11-11, stage 0:** [D56](../DECISIONS.md#hb-020-monthly-decisions--owner-2026-11-11) closes
Q-HB20-NEW-INSTANCE and supersedes acceptance-only/no-durable-decline assumptions.
Enabled templates offer each new calendar month despite old unpaid debt. Explicit
ACCEPT and durable month-only DECLINE are final mutually exclusive outcomes per
owner/account+templateId+originPeriod. Ignore remains local; disable config-only.
Current §§2,5–11 and both storage alternatives now cover both outcomes. R1
baseline/changelog and D55 note are dated history, not current conflicting policy.
First-run composition and exact ACCEPT adapter remain proposals, not runtime-proven.
This D56 patch awaits independent ChatGPT review and separate owner confirmation.
Stage0 permits document checks only; no code, migration, tests or publication.

## 1. Baseline, scope and revision record

Exact baseline: local HEAD/main, cached origin/main and live `git ls-remote origin refs/heads/main` all identify **35154f64ddabd66f268987b74f0f291478adba74** (#22).
At R1 entry, `git status --short` showed only the existing untracked `docs/planning/hb-020-first-run-and-recurring-templates.md`. Registered worktrees: main at `D:/projects_js/home-budget`; `feat/hb-019-2-financial-history` at `D:/projects_js/home-budget-hb-019-2`, HEAD `c0a63c9`, clean. Its status was checked with command-local safe.directory; no global Git configuration change. No reset/clean/stash/rebase, branch change, file move or removal. The previous plan was read before revising this same file; no backup/new artifact is created.

TASKS currently retains HB-019.2 **Review / awaiting Owner Acceptance**, consistently with D54 even though its code is merged. Merge does not confer acceptance. HB-020 remains Planned/P0; HB-019.1 precedes it, and HB-019.2 is an independent MVP branch. No task status is changed here.

R1 changelog relative to the initial local plan:

1. Replace public “Create budget”/name entry and two-step creation with actual balance/date/full allocation review and **one explicit confirmation**; technical EUR account remains internal.
2. Propose one transaction containing account creation, the first real C/V, audit and receipt. Identify actual HB-017 integration gaps and a separately gated recovery alternative; no claim of existing support.
3. Remove income/receipt-trigger design, due-day/calendar scheduling and durable terminal SKIP. Ignoring/dismissing a suggestion writes nothing.
4. Keep one open product question: whether a new month's instance should be suggested separately while earlier debt is unpaid. Preserve conditional F-016 identity/uniqueness requirements.
5. Correct the Medium finding with an exact-schema transaction-local adapter into writeObligations; prove the outer accepted-template command and inner ordinary CREATE without a second receipt/transaction.
6. Replace zero-migration preference with an independent A/B storage comparison and explicit proof/selection gates.
7. Re-map all17 scenario IDs, include exact future normative edits, preserve PG/auth/browser/UNKNOWN/H/K requirements, and remove obsolete name/skip/trigger decisions.

User reports one technical Medium from independent review of the previous plan. This author verified the parser mismatch in R1. The owner now reports independent approval of that plan/correction; it remains **not runtime-proven**.

## 2. Authority: four distinct categories

**(a) Current owner authority D55 + D56:** actual first B/date/full A with atomic technical EUR account remains D55. D56 allows new-month offers despite old debt, explicit ACCEPT and durable month-only DECLINE, mutually exclusive/final per owned template+origin month. Ignore is local; disable/config and existing obligation lifecycle are distinct. Full old debt/history/funding persists until explicit existing actions. No payment timetable/income trigger.

**(b) Historical pre-D55 repository baseline (the conflicting live requirements below are now aligned by D55):** HB20 shared fixture/A02/A08 and TASKS/IMPLEMENTATION_PLAN specify a named account and separately resumable creation before first finance. PRD UC-04/BR-06 and TASKS retain accept/edit/skip and period/receipt proposals. HB20-T01 mentions new-income suggestions; T02 asks for an auditable skip. These conflict with the new direction where noted in §10. They cannot be silently treated as already amended or marked satisfied by different behavior. Existing financial invariants, optional ordinary-obligation dueDate, D43–D44, F-016 and D54 remain binding.

**(c) Resolved Q-HB20-NEW-INSTANCE:** [D56](../DECISIONS.md#hb-020-monthly-decisions--owner-2026-11-11) settles the new-month offer while old debt remains unpaid. ACCEPT alone creates the distinct full-reserve new bill; DECLINE durably suppresses only this month, no financial mutation. No product choice remains open here. The R1 changelog/D55 preserve the earlier question as history. Technical proof/storage selection and implementation authorization remain gates.

**(d) Author's technical proposals, not product decisions:** transaction-local commit helper, first-run preview translation, internal account label/version, typed acceptance adapter/evidence, storage alternatives and bounded readers. These require technical review and separate implementation authorization. They must not reopen the new owner direction as extra product choices.

Sources reread/consulted: `AGENTS.md`, `docs/BUSINESS_RULES.md`, `DECISIONS.md` D40–D45/D54, `TASKS.md`, `PRD.md`, `UX.md`, `AUTH.md`, `ARCHITECTURE.md`/`architecture.json`, `DATA_MODEL.md`, `DATABASE.md`, `IMPLEMENTATION_PLAN.md`, `OPEN_QUESTIONS.md`, conventions/AGENT_FACTORY/CODEX_WORKFLOW; Accepted ADR0001–0003; HB20 A/B/T and core F-016. Requested skills: create-planning-doc, create-scenarios, verify-financial-invariants, define-architecture, security-best-practices, configure-project, vercel-react-best-practices and web-design-guidelines; relevant server-action/auth/input/serialization references from the original planning inspection remain applicable. At the R1 planning stage, skills did not override the then one-file-only instruction. D55 now authorizes the scoped normative/scenario alignment recorded above; runtime work is still excluded.

Applicable BR-01/02/03/04/05/06/07/08/10/11 and ADR mathematics remain: integer bigint EUR cents; Europe/Berlin civil dates distinct from recorded time and origin/funding month; A>=0, ΣA=B for confirmed B>=0; complete full R and voluntary S, negative F allowed; no guessed income/expense, auto-debit, partial reserve, automatic funding shift or overwritten history. Unknown before a real observation is not0. Explicit real B=0 is valid with a complete confirmed vector. No mandatory transactions, receipt ledger, payment timetable or daily input.

Non-goals: second account/selector, rename/delete, public registration, new engine/library, arbitrary event endpoint, PWA/offline/service worker, bank import, cron, production/Neon work, HB-027 precision, changed safe-limit/selector/version, auto-accept, direct deployment/publication. Existing ordinary obligation optional dueDate stays intact.

## 3. Actual source and reuse constraints

| Files inspected | Actual behavior and R1 implication |
|---|---|
| `src/infrastructure/auth/{policy,config,auth,repository}.ts` | Allowlisted verified Google identity, subject/providerAccountId checks, encrypted JWT/current identity revalidation. bind serializes users-only provisioning. Keep login free of account/finance writes. Reauthorize every new action. |
| `src/app/dashboard-account-boundary.ts`, `dashboard-loader.ts`, `page.tsx` | Owned discovery distinguishes NO_ACCOUNT/ACCOUNT_SELECTION_REQUIRED/STORAGE_ERROR. Only proved absence enters first run; errors/multiple accounts never trigger creation or repair. |
| `src/infrastructure/db/schema.ts`, `drizzle/0000_foundation.sql`, `0001_integrity.sql` | Account requires display_name, owner FK, EUR/counter checks; unique(owner,id), **no UNIQUE(owner)**. Existing budget_updates scoped request/seq uniqueness, actor check, result; immutable batch/audit/fact constraints. No physical recurring-template/acceptance tables. |
| `src/infrastructure/db/commit.ts`, `audit-writer.ts` | commitBatch owns a transaction and locks an **existing** account; same-key replay before stale revision; writes one receipt/audit/counters, classifies UNKNOWN. Cannot create absent account or join an outer transaction through its current public signature. verifyReplay kind guards currently allow only BUDGET_UPDATE/PERIOD_TRANSITION/MONTH_CLOSE. |
| `src/domain/budget-update/{contracts,validation,planning}.ts` | Pure initial C/V planning is reusable with a validated empty context, null anchors and actual user B/A. Draft includes mandatory bank/full-vector consent and no transition on initial setup. It is not a public no-account orchestration API. |
| `src/infrastructure/db/budget-update-{reader,repository,writer}.ts` | loadBudgetContext needs an owned persisted account. preview/confirm open their own transactions; originalEvidence reconstructs original financial command, C/V and receipt. persistBudgetPlan is already transaction-local and can persist a validated initial plan. Reuse these parts; do not wrap existing public confirm in an outer transaction and assume atomicity. |
| `src/app/update-budget/actions.ts`, `update-budget-boundary.ts`; `src/features/budget-updates/budget-draft-provider.tsx` | Resolve owned account and reauthorize actions; draft/unknown command is memory-only. Existing financial preview cannot be invoked for a missing account. Reload resumes saved facts, not unsaved financial input. |
| `src/domain/obligations/validation.ts:parseObligationBatch` | Exact top-level keys are **{changes}**, length1..7. CREATE has exact field sets; new obligationId must be null. Extra template fields at root are rejected. This confirms the prior Medium. |
| `src/infrastructure/db/obligation-writer.ts:writeObligations` | Reads batch.command.payload via that parser; uses supplied tx/batch, generates new identity/revision and normal position/order/state/audit, returns audit descriptors. Ordinary CREATE needs no bankCheck and preserves bank/vector. Cannot receive the outer template wrapper unchanged. |
| `src/infrastructure/db/{transition-writer,funding-evidence,report-impact}.ts`, `src/domain/transitions` | Existing origin/funding/history and D44 refusals remain. No template action should bypass them or implement its own funding transfer. |
| `src/infrastructure/db/financial-history-{index,detail}.ts` | Explicit kinds/audit allowlists, original financial proof, daily H/K and20-row paging. Current month filter uses non-AUDIT sources; new audit-only config would disappear without explicit membership support. Add strict support, never hide unsupported batches. |
| `tests/integration/{auth,audit-idempotency,update-budget,obligations,financial-history}.test.ts` | Reusable real local-PG auth, rollback, immutable-history and real-COMMIT acknowledgement-loss patterns. Multiple synthetic account states are tested; no global unique-owner migration without separate necessity/review. |
| `package.json`, Vitest configs, CI, `src/infrastructure/db/local-target.ts` | Existing lint/typecheck/test/build/test:integration, pinned dependencies; no E2E script/Playwright package. Guard all three DB URLs and disposable loopback markers. No test or server startup is needed for this R1 document. |

## 4. Part A — one public first-run confirmation

### 4.1 User flow versus technical records

After normal admitted Google sign-in, show real card balance, observation date and complete month allocation with a review and one clear “Confirm balance and allocation” action. No budget-name input, account creation screen, technical receipt jargon or required income/expense explanation. Suggested A is never accepted implicitly. First-run view has no numeric B/A/F until real inputs are confirmed; a draft preview is explicitly a draft estimate.

Proposed server-only stable account displayName is literal `Home Budget`, internalLabelVersion1, independent of locale and request payload. It is not user-entered or mutable during retry and should not become a visible onboarding field. No arbitrary name validator or client currency/name/owner/account fields. Existing names are never overwritten. This is an author implementation detail, not a new product question.

Account creation audit is technical but real: before=null, after contains owner/account/currency/internal label version and the actual first-confirmation mapping. Bank checkpoint audit separately represents the **actual user's observation date/B**. Account insertion/recorded time cannot supply a bank observation. One receipt represents the atomic logical confirmation; no receipt or history is fabricated for an aborted attempt.

### 4.2 Proposed no-account preview/command contract

Future narrow domain/onboarding + features/onboarding ports compose through app actions; infrastructure supplies owned transactional persistence. Dependency direction remains app → features → domain, infrastructure implements ports. No DB/auth import in client/domain.

Proposed wire input: `{schemaVersion:1, requestId:UUID, observation:{observedDate, observedAt:null|explicitOffsetInstant, balanceCents}, allocations:[{period,amountCents}], completeVectorConfirmed:true}`, plus the exact server-returned financial review for final confirmation. Reuse existing checkpoint/period/money validators for the wire-to-draft mapping; do not invent an alternate cents/date contract. Reject unknown keys, owner/account/displayName/currency fields, duplicate months, negative/fractional/overflow money, invalid/future observation, contradictory instant and incomplete sums. Bound source/wire/work by existing finance limits; normalize/copy/freeze before the first await. No optional obligation/template/payment/transition changes in this initial command; those follow explicitly through existing flows.

Preview is authenticated and **read-only**. For confirmed absence, construct a typed empty *in-memory planning context* (K0/revision0/null anchors/no facts), then use the existing pure initial planBudgetUpdate and review calculation on the user's actual proposed observation/vector. This is not a fake bank observation or persisted empty account. loadBudgetContext cannot provide this context today; a dedicated, small initializer/translator is required.

Preview needs stable candidate IDs to match confirmation evidence. Proposed mechanism: server computes a domain-separated UUID from trusted owner + requestId + fixed first-run namespace using installed node:crypto; financial coordinates use existing request/scope derivation. Candidate account ID is not authorization and is never selected from client input. Validate UUID collision/scope under lock and fail safely. Internal label/translator version are pinned in copied original evidence. No signing secret, server draft session, preview INSERT, reservation or schema is introduced. This ID mechanism is a technical proposal requiring review.

Final command translation produces the **ordinary exact HB-017 BUDGET_UPDATE financial payload** (`{schemaVersion:1,draft,review,proposalId:null}`), expectedRevision0 for a new account, with null initial anchors, K0, a real checkpoint/full A, no transition/lifecycle edits and original reason/effectiveDate. Do not send the onboarding wrapper to parseBudgetDraft/confirm unchanged. Original observation date/effectiveDate remain user-confirmed and part of identity; server Berlin today/recordedAt are independent. Rebuild review under lock using current server calendar; a new month/day affecting review requires fresh explicit review, not silent mutation. Proven original replay is checked before new calendar checks.

### 4.3 Single transaction composition — proposed, not existing capability

One READ COMMITTED outer transaction on **one checked-out pg connection**:

1. requireOwner validates current admitted session for this action. Lock the existing trusted users row FOR UPDATE and verify its identity/verified binding, without provisioning/rebinding it. Login already created only that row.
2. Under owner lock query owned accounts in a fresh statement (limit2). For no account, derive candidate ID and INSERT EUR/internal name with counters0/null pointer **inside this transaction**. No durable empty-account stage is published. For one existing account, resolve original first-run request/proof or refuse/resume as below; never apply the stale first-run command as an ordinary new update. Ambiguity/storage error fails without writes/repair.
3. Extract a private transaction-local body from commitBatch, keeping its existing wrapper/validation/replay/counters behavior for current callers. Invoke that body for **kind BUDGET_UPDATE**, on the inserted account, expectedRevision0. Reuse loadBudgetContext on that same tx/new row, planBudgetUpdate, the existing reviewed-content comparison and persistBudgetPlan. No public createBudgetRepository.confirm or new pooled call: both would own another transaction.
4. Persist the real checkpoint, complete V/A and original BUDGET_UPDATE_REVIEW, ordinary ordering/bank-head audits, plus one additional typed ACCOUNT_CREATED descriptor carrying the original onboarding input, translator/label version and exact inner financial command/receipt mapping. One batch/seq1/aggregateRevision1 and one normal financial receipt; active pointer refers to that real vector. The standard financial command/hash remains financial, with the same scope, expected revision and original dates/review. No separate account-only budget_update is committed.
5. Outer COMMIT alone is success. Account/C/V/A/audits/receipt/counters all commit or roll back. Deferred constraint failure rolls everything back, retaining only the prior authenticated user. Unknown COMMIT acknowledgement is classified by the **outer** transaction lifecycle, not an inner helper's successful return.

New private helper must enforce validated prepared-command provenance and scope exactly as the current primitive; no arbitrary event endpoint. Original financial proof already understands BUDGET_UPDATE and reconstructs empty K0 context from the retained account row; add typed first-run proof to verify the creation audit and inner/outer translation. Extend history audit admission narrowly for ACCOUNT_CREATED, leaving BUDGET_UPDATE's ordinary financial cardinality requirements intact. Never relax receipt/hash verification or claim that the current HB-017 automatically has this composition.

Lock ordering: owner → account for first run; normal financial writers lock account only and must not later take owner FOR UPDATE. Same/different requestIds/two tabs/instances serialize on the user row even before account existence. READ COMMITTED subsequent account lookup sees a committed winner. Proposed local lock timeout3s/statement timeout10s is bounded safe retry, not automatic rebase. Existing scoped PK/FKs/EUR/counter/request/seq/immutable/sum constraints are reused. There is no UNIQUE(owner); cross-instance single-first-account correctness is an application writer protocol, not universal direct-administrator-SQL uniqueness. Inventory all runtime account creators before enabling it. A global SQL invariant would need separate legacy preflight/migration approval.

### 4.4 Replay, concurrent loser and recovery

Same requestId + same normalized financial command returns the original receipt after validating ACCOUNT_CREATED ↔ BUDGET_UPDATE_REVIEW ↔ C/V/receipt and canonical translation. Changed amount/date/vector/consent under the same key is REQUEST_PAYLOAD_CONFLICT, never an account rename or revised checkpoint. Internal label is constant, not a client override.

Different-key loser sees the existing initialized account and returns ALREADY_INITIALIZED with safe owned navigation; it writes no account/checkpoint/receipt/audit/counter and must not silently interpret its different B/A as a second bank check. The owner can explicitly start a later ordinary update after seeing saved facts. If the winner rolls back fully, the next explicitly confirmed valid command may create the account and first C/V.

Proposed owned read-only firstConfirmationStatus(requestId) discovers the sole owned account and checks its original batch/proof. COMMITTED means proved full atomic outcome; NOT_FOUND means no committed matching receipt is currently visible, **not proof of rollback**. A different original first request can resolve as ALREADY_INITIALIZED. Invalid/foreign/unprovable/stored failure is an error, not absence. Retry UNKNOWN with the same frozen key/payload; the lock serializes it with any still-running attempt. No automatic new key/action.

Retain command/request in React-instance memory during pending/UNKNOWN; no name/money/IDs in URL, logs, localStorage/sessionStorage/IndexedDB. Reload/relogin rediscovers saved owned state: no account means initial UNKNOWN flow; full C/V means existing budget/history; previously existing empty account resumes ordinary real B/A confirmation via HB-017 (no rename/recreation, using its existing revision). Partial/corrupt account state is a safe error, not zero/reset. Unsaved input is not promised after full reload; if a new explicitly confirmed command follows rediscovery, owner-lock exclusion still prevents duplicates with an older in-flight request.

An existing empty account can only be initialized by a fresh reviewed ordinary command with its true revision/null anchors. A stale “new account” preview is not automatically retargeted to it. This preserves A09 and separates legacy recovery from the new atomic first-run path.

### 4.5 Integration risk and minimal alternative

The proposed extraction/initializer/translator needs focused review and real PG proof before UI. Current transaction-owning public APIs cannot simply be nested, and the plan does not assert tested feasibility. If retaining a single batch with correct originalEvidence cannot be demonstrated without risky changes, stop that slice and present the specific failing proof.

A minimal **alternative for separate owner technical/product alignment**, not selected or authorized here, is two *visible and separately consented* stages on the same balance form: “Prepare workspace” (technical empty account/audit/receipt) and then “Confirm real balance and allocation” via existing HB-017, with no name field. Persisted empty stage remains UNKNOWN and resumes after reload; first-stage failure rolls back only that technical stage, second-stage failure retains an honest empty workspace. This weakens the new one-action atomic objective and requires explicit amendment/approval; it must never be disguised as one confirmation or two hidden commits. Do not implement this fallback automatically. No account creation on login or fake initial checkpoint is an alternative.

## 5. Part B — templates are explicit obligation-entry convenience

### 5.1 Meaning and fields

A monthly template supplies a reusable title and positive integer cents; user explicitly chooses/reviews origin month and funding month for the new obligation and may edit the amount before confirming. As a technical UI proposal, seed both month fields from the user's selected budget period, show both for review and permit explicit funding-period editing; the final command pins exact YYYY-MM values. This is a draft convenience, not a persisted schedule or an old-debt funding move. No schedule/day/deadline/receipt/income fields, no automatic posting, no required bank check for reserve-only CREATE. Use existing obligation title1..200-code-point and cents1..MAX_CENTS validators. Proposed config: templateId on update, previousRevisionId, title, amountCents, enabled, schemaVersion, requestId/expectedRevision/effectiveDate/reason. Ordinary month selection reuses existing period validation. No dueDay/start-end payment schedule or subscription to checkpoint changes.

Resulting ordinary obligation has dueDate=null in this template adapter; ordinary obligations elsewhere retain optional dueDate unchanged. Defaults are reviewable input, not consent. Configuration edits/disable never mutate previously accepted bills, their amounts, origin, funding, payment status or protected balances. History retains configuration before/after and real acceptance.

Open app/calendar change only reads configuration/suggestions. Choosing “Later”/closing/ignoring a suggestion is a local display action: **no server mutation, skip receipt, terminal status, audit, seq or reserve**. It may reappear on later access. Explicit DECLINE below is distinct: a durable audited monthly decision, never payment.

Terminal decision key is trusted owner/account + stable templateId + **origin period**, shared across ACCEPT and DECLINE. Funding period, edited amount/title, config revision, requestId and a later paid/cancelled status do not reset this key. An accepted November bill cannot be recreated by editing/re-enabling the template or moving its funding to December. DECLINE occupies this same key without an obligation; neither outcome may be overwritten.

### 5.2 Old debt, new-month offers and durable DECLINE — D56

Old unpaid identity and its full outstanding reserve remain until explicitly amended/partly paid/paid/cancelled through the existing lifecycle. Never recreate or merge it just because a new month opens. Origin is historical; current funding is a separate association. FRESH_START/CARRY may propose funding transfer only with explicit review/consent, retaining identity/amount/history and full reserve. No template/read action transfers it.

D43/D44 remain: same-identity funding transfer + lifecycle edit is SAME_IDENTITY_COMPOUND_NOT_SUPPORTED with no partial writes; first confirm transition, then a separate explicitly confirmed lifecycle update. No hidden two-save workaround. Disjoint identities preserve existing allowance.

Q-HB20-NEW-INSTANCE is resolved by D56: enabled templates may offer each new calendar month despite old debt. Reading writes nothing; ACCEPT creates the distinct new bill, durable DECLINE suppresses only this month without changing old debt/financial facts. Next month is independent of prior DECLINE. Disable stops offers, preserving obligations/decisions/history. Existing cancellation/payment or config/funding changes cannot reset the terminal key.

### 5.3 Durable monthly decision protocol — proposed, not runtime-proven

Under the same trusted owned account lock, read/prove the complete terminal-key
evidence for BOTH outcomes before admitting a new decision. Original-request
replay precedes stale/calendar checks. A different request for a decided key
resolves the proved winner or conflicts, explicitly naming actual outcome;
never overwrites it or reports the losing intent as success. Changed same-request
payload conflicts. Amount/funding/config revision/requestId/lifecycle never reset key.

Proposed narrow TEMPLATE_DECLINE contains schemaVersion, stable templateId,
reviewed config revision and originPeriod within the existing bounded prepared
envelope. Exact DTO/kind names remain technical proposals requiring review.
No obligation/payment/checkpoint/amount fields or arbitrary event endpoint.
Writer creates only typed immutable decision/audit/one outer receipt and required
batch/account counters; no writeObligations, financial position/C/V/A, R/S/F,
bank-date or report mutation. Original semantic proof reconstructs command,
outcome/key/config and absence of CREATE refs. Extend strict replay/history kind
allowlists narrowly; do not weaken existing guards or fake a financial payload.
Repeated DECLINE with same or new requestId for the same business key returns original without new batch/audit/counter.

Rollback covers the whole decision. Real COMMIT ack-loss is UNKNOWN for either
outcome; READ/STATUS/same-original retry on a fresh authorized connection resolves
it, never automatic opposite intent or new key. NOT_FOUND while in flight is not
rollback proof. H/K and audit-only month membership must expose DECLINE without
invented payment/bank evidence. Already paid before access and included in B may
be DECLINED only before a terminal decision/obligation exists for that key;
existing obligations use normal confirmed lifecycle. Disable/local close are not
DECLINE. Every decision/read/status/config action reauthorizes owned scope.

### 5.4 Medium correction: exact-schema transaction-local adapter

Outer accepted-template command, proposed kind TEMPLATE_ACCEPT:
`{schemaVersion:1,templateId,templateRevisionId,period,confirmed:{title,amountCents,fundingPeriod},placement}`,
inside the existing prepared envelope requestId/expectedRevision/effectiveDate/reason. period is immutable origin/business-key period; dueDate is not an input. Exact keys/validated bounds only. Load/status/config/accept independently reauthorize sole owned account. Normalize/freeze before authorization yields. Current original template/config must be owned/proved and explicitly reviewed; stale source/config/revision rejects without writes.

The outer payload **must not** be passed directly to parseObligationBatch. Restricted infrastructure adapter, under the existing account lock:

1. Validate complete outer command and its owned template/version/month/business key. Resolve original same-request or accepted-key outcome **before** stale/calendar checks. No accepted key: validate current review/revision and proceed.
2. Deterministically derive exactly one inner payload `{changes:[change]}`, with change keys exactly: key='template_create', action='CREATE', obligationId=null, expectedStateRevisionId=null, correctionId=null, previousChangeKey=null, effectiveDate=outer.effectiveDate, bankDate=null, placement=validated outer placement, bankCheck=null, paymentConfirmation=null, data={title:confirmed.title,dueDate:null,originalCents:confirmed.amountCents,isPossible:false,reserveFull:true,originatingPeriod:outer.period,fundingPeriod:confirmed.fundingPeriod}. No other action, field, client-selected identity or template field enters it.
3. Run **unchanged parseObligationBatch(innerPayload)**. Use the normal prepared-command constructor to copy/freeze an inner command with the same requestId/expectedRevision/effectiveDate/reason and only this payload. Its constructor wire input must serialize outer.expectedRevision as a canonical decimal string (the current counter parser does not accept bigint); likewise normalize inner originalCents to the canonical decimal-cent wire representation before digest/copy. This satisfies prepared provenance; do not cast an arbitrary object into PreparedCommand or pass a prepared bigint revision back to the wire constructor unchanged.
4. Invoke `writeObligations(tx,{...outerBatch,command:innerPreparedCommand})` **once on the same tx**, keeping outer id/seq/recordedAt/owned account. This is a transaction-local helper call, not commitBatch or createUpdateRepository again. Its returned descriptors supply actual generated obligation/CREATE revision/position mappings; verify exactly one created identity/revision in this outer batch and that returned/stored state equals the confirmed inner data.
5. Outer writer appends a TEMPLATE_ACCEPTANCE descriptor with copied original outer command, adapterVersion1, exact inner normalized payload and its digest, source config revision, key period and actual obligationId/CREATE event/position IDs. Return this plus normal writer descriptors to the single outer commitBatch, which writes **one outer receipt/hash/counter increment**. Inner command has no budget_update/receipt of its own and cannot be externally replayed.
6. On any parser/writer/identity/report/audit/deferred-COMMIT failure throw/rejectBatch; acceptance marker and ordinary CREATE both roll back. No saved marker before a separate obligation transaction, no second confirmation after a partial write.

Original evidence: canonical hash/receipt is over the **outer** TEMPLATE_ACCEPT command. Semantic verifier reconstructs inner {changes} solely from copied outer command + adapterVersion1, validates it with unchanged parser, compares saved inner bytes/digest, then proves actual owned identity/CREATE state/normal audits/position and batch/seq against those values at original H/K. The existing writeObligations audit does not need template fields. Outer technical wrapper is never disguised as an OBLIGATION_CREATE or BUDGET_UPDATE payload. Explicitly extend commit.ts verifyReplay allowlist for TEMPLATE_ACCEPT with its mandatory typed verifier; do not remove kind guards or expose generic hooks. History uses this verifier for source detail, not BUDGET_UPDATE originalEvidence that requires a vector.

Standalone acceptance creates normal full R via existing writer/history, changing neither B/A nor bank-check date; no redundant checkpoint/vector. Normal report impact may mark affected historical heads pending, but immutable reports remain. Preserve existing ordering/placement refusal on same-day/historical changes.

Same-request/same-payload replay returns original receipt; changed payload conflicts. Different request for an already accepted template+period resolves original proved accepted identity (equal semantic confirmation may return it); changed values return ALREADY_ACCEPTED/conflict, no amendment or new bill. Do not ignore expected revisions for a genuinely new acceptance. UNKNOWN resolves by original request or accepted business key on fresh authorized connection. No duplicate even after old accepted bill becomes PAID/CANCELLED. D56 additionally requires both winning orders of ACCEPT/DECLINE, repeated/concurrent DECLINE, competing ACCEPT amounts and serialized config-disable races. A config race must revalidate current source, preserve any proved winner and never fabricate a decision or mutate money.

This fixes the **design-level** parser mismatch; future tests must show inner parser acceptance, outer parser rejection, provenance safety, original semantic proof and one-transaction rollback before calling the Medium resolved in implementation.

## 6. Storage A/B comparison — selection requires proof

No physical storage option is selected by this R1 revision. Account-first atomic composition can reuse existing schema; recurring storage choice is a separate technical gate. No migration is created. Neither absent physical tables nor fewer changed files alone proves a winner.

| Dimension | A — existing budget_updates/audit_events typed records | B — minimal physical template + terminal decision tables |
|---|---|---|
| Representation | TEMPLATE_CONFIG/versioned state; TEMPLATE_ACCEPT with typed acceptance + ordinary CREATE; TEMPLATE_DECLINE with typed decision-only audit/receipt. Immutable proof for BOTH outcomes. | Scoped recurring_templates and template_decisions: terminal ACCEPT/DECLINE, config/batch/receipt refs; ACCEPT-only obligation/CREATE refs, none for DECLINE. Retain config/decision audit. |
| Integrity | Existing immutable PK/FK/request/seq constraints. JSON decisions lack SQL business-key UNIQUE; complete typed chain/ref/hash and cross-outcome proof on read/write/replay, fail closed on duplicates/corruption. | UNIQUE(owner,account,templateId,originPeriod) across BOTH outcomes, scoped FKs and outcome CHECK/immutability. SQL uniqueness alone does not prove consent or receipt/CREATE semantics. Exact migration separately approved. |
| Concurrency | Every config/ACCEPT/DECLINE obtains account FOR UPDATE, then complete lookup of both outcomes before stale check/admission. All writers must obey; no direct-SQL uniqueness claim. | Same serialized recheck plus shared UNIQUE decision key as defense; after conflict rollback/savepoint before proving winner. Separate acceptance/decline uniqueness allowing both is invalid. |
| Current config/read cost | Scoped kind/entity predicates and bounded chain folding at one K; no latest-page-only lookup. Must preflight full matching counts/bytes/work before parsing; use existing limits/statement timeout. No truncation or silently missing ACCEPT/DECLINE. | Direct scoped identity/pointer lookup and indexed terminal decision key; at-K config still needs retained immutable audit/version proof. Mutable current pointer cannot replace H/K evidence. |
| Scale/failure | Fewer schema changes, increasing audit query/validation cost; limits must reject before writes. Small personal usage does not prove unlimited scale. Measure realistic long retained history; if guarantees need unbounded scans, A fails. No proactive new index/cache without reviewed necessity. | More schema/migration work, predictable key lookup cost. Still bounded history/detail/source proofs; no claim that tables eliminate resource/ref integrity requirements. |
| HB-019.2 history | Audit-only config needs new kind/audit admission + month membership from real audit effectiveDate; ACCEPT includes ordinary CREATE proof; DECLINE needs typed audit-only month membership and no financial source. Existing unknown-kind rejection otherwise breaks browsing. | Config and both decision kinds still require history/proof support; new rows need source/provenance membership or typed audit mapping. Table storage does not automatically make events visible. Never add fake bank checks to list them. |
| Upgrade/maintenance | No migration if full protocol and semantic proof are demonstrated; a narrower runtime change can still carry substantial reader complexity. | Forward-only migration proposal must define scoped keys/FKs, cross-outcome decision uniqueness, retained version refs, immutable decisions, safe pointer updates and append-only audits. No backfill/deletion/history repair without separate review. |
| Evidence needed before selection | Multi-connection both-order ACCEPT/DECLINE races, repeated DECLINE and same/different-key accepts, corruption/ref/duplicate adversarial fixtures, all-key bounded read and scale failure, replay/UNKNOWN, history/filter proof; code review of all writers. | Fresh/upgrade/migration twice, SQL cross-outcome uniqueness/scope/rollback, both-order races and repeated DECLINE, legacy template mapping if any, same semantic replay/history/UNKNOWN proofs. No production schema introspection required now. |

Recommendation is **conditional**: use A only if a small reviewed implementation can prove complete bounded semantic lookup with no unsupported history; use B only if its integrity/query benefit is demonstrated to justify forward schema changes. The current inspection establishes neither runtime proof. Independent technical review should select one before S4 implementation. If B is chosen, prepare a separately authorized migration proposal first; do not create SQL as part of this plan. If A is chosen, do not call account locking a UNIQUE(template,period) constraint.

## 7. History, security and browser requirements

History must reach the real first BUDGET_UPDATE plus technical ACCOUNT_CREATED audit, config changes, accepted-template obligation sources and typed DECLINE decisions without omission, duplicate source or false bank check. Add only exact known kind/audit contracts and original semantic verifiers. Config is a control record with actual effective/recorded date and no financial position; update month-filter membership for audit-only controls explicitly. Acceptance origin/funding months must be discoverable as existing ordinary obligation sources require; source detail retains both refs and normal effective position. Do not hide controls from filtered browsing, invent a bank date or claim exact reconstructed same-day event state. Preserve daily H/K, original/later/report perspectives,20-row keyset basis, original corrections and all immutable closing versions.

No UI prerequisite or data change on history navigation. Unknown before first confirmation remains unknown; first actual observed zero is known. Every load/preview/confirm/status/config/accept/decline/disable reauthorizes current Google session and owned scope, not page state/client IDs. Retain verified allowlist/subject/session checks, PKCE/state/nonce, Auth.js CSRF and Next Origin/Host protections. Storage/auth error cannot become “no account”; no credentials/identity oracle in errors/logs.

UI: labelled B/date/allocation controls, complete-vector validation and explicit review; accessible pending/UNKNOWN/inline errors with appropriate focus and announcements; RU/DE/EN, light/dark/system,320px/desktop/native200% zoom, keyboard/pointer. Send only needed DTOs into small client components; no infrastructure imports/secrets or raw HTML rendering. Existing privacy rules override generic recommendations to put state into URLs. No persistent browser financial storage or auth bypass.

Existing independent real-browser requirements B01–B04 remain mandatory after their approved text alignment. D54 transfers **HB-019.2** browser/AT execution, not HB-020's own checks. Real Google sign-in requires an approved isolated client/identity/redirect plus synthetic DB. If unavailable, label browser proof NOT EXECUTED; jsdom/SSR/HTTP/mocked auth cannot substitute. Physical AT proof remains honestly separated from component assertions.

## 8. Current D56 scenario/test matrix — all NOT EXECUTED

The scenarios are aligned under D55/D56 documentation only. A/B rows retain R1 amendment labels as trace; T01–T03/F-016 now apply D56. No row is runtime proof. Preserve all17 original IDs (16 HB20 + F-016) and U/C, auth(A), isolated PostgreSQL(PG), real browser(B) requirements.

Proposed files: tests/onboarding.test.ts, onboarding-ui.test.tsx, onboarding-boundary.test.ts, integration/onboarding.test.ts; corresponding recurring tests; existing commit/history regressions. Future browser IDs B01–B04/T01–T03 can use the available in-app browser or a separately approved harness; no E2E script is invented now.

Common PG oracle N compares ordered full synthetic rows for users/preferences, accounts/counters/pointers, periods, all budget_updates/receipts/audits, C/V/A, positions/orderings, obligation/savings identities/events, proposal/transition/transfer/cancellation controls, report heads and immutable closing versions. No-write requires exact equality, not count-only. For accepted writes whitelist exact expected rows/counter delta; every unrelated row remains equal.

| Scenario | U/C and auth proof | Real isolated PG result/oracle | Actual browser counterpart / alignment |
|---|---|---|---|
| HB20-A01 **AMEND** | U/C no-account initial B/date/A; A Google/current identity, error vs absence | Login only users1/accounts0, all financial N; read/preview no writes | B01 sees actual-balance form, no name/Create budget screen or invented0 |
| HB20-A02 **AMEND** | Exact initial command translation, server-only account metadata, one explicit confirm | Account + one real C/V/A + financial batch/receipt/creation audit in one COMMIT; seq/revision1, active real vector; no durable empty intermediate | B01 one financial confirmation, resulting real date/money |
| HB20-A03 **AMEND** | Invalid B/date/partial/negative/duplicate allocations; reject client owner/name/account, expired/denied/session/Origin | Entire N for invalid/unauthorized attempt, including no empty account/audit/receipt | B02 field errors/input recovery; B04 stale form/auth; replace name validation |
| HB20-A04 **AMEND** | Frozen identity, canonical cents/date/vector; every status/replay auth | Fresh pool/original key returns same account+C/V/receipt. Same key/different B/A/date conflicts, no writes; later-day proved replay retains original dates | B02 interrupt/retry/reload resolves original full confirmation |
| HB20-A05 **AMEND** | No client-lock reliance; competing confirmations not silently ordinary updates | Independent clients/barrier, same/different keys/B/A: one account/initial checkpoint/vector/batch; loser no financial writes. Winner rollback permits next explicit valid attempt | B02 two tabs/Enter/double submit; winning data stays exact |
| HB20-A06 **AMEND** | UNKNOWN vs definite rollback, same-key status/replay UI/auth | Inject after account/batch/C/V/audit inserts and at deferred COMMIT; all rollback/N except original user. Real COMMIT then ack loss: fresh connection recovers complete account+C/V/receipt once | B02 network interruption, no assumed success/rollback/new observation |
| HB20-A07 **AMEND composition, retain financial oracle** | Existing validators/forecast, actual observation vs server time, full-vector review | In atomic initial confirmation B100000,A(P70000,Q30000),ΣA=B,F(P70000,Q30000),R=S0,safeAvailable70000. Separate explicit B0/A(P0) known0; no inferred income | B03 money/date/P-Q isolation, no separate named-account prerequisite |
| HB20-A08 **AMEND** | Cancel/reload loses unsaved draft honestly; owned discovery; existing-empty resume | Before initial COMMIT no account/financial writes on cancel/invalid total90000 for B100000. After success, reload same complete state; UNKNOWN resolves original once. Pre-existing empty account remains empty on invalid initial finance, initializes only via its fresh ordinary review | B03 cancel/relogin/resume UNKNOWN vs committed; no mandatory durable intermediate stage |
| HB20-A09 retained | Existing initialized budget skips first-run; existing empty resumes; ambiguity/storage error fail closed | N for established account on login/read/direct stale first-confirm attempt; preserve names/preferences/counters/C/V/R/S/v1/v2. Multiple-account fixture no repair/selection | B04 unchanged established flows, expired actions no writes |
| HB20-B01 **AMEND** | C labels/pending/errors/locales; real action auth retained | Browser-owned DB shows zero before confirm, one account and one valid initial update after | Real admitted Google sign-in, input B/date/complete A, one keyboard/pointer confirmation; no name field or automatic login writes |
| HB20-B02 **AMEND** | C financial validation/frozen UNKNOWN, server Origin boundary | Verify actual single account/C/V/receipt/winner values across UI races/recovery | Real invalid allocations, repeated submits/two tabs, response loss; useful errors and original-result recovery |
| HB20-B03 **AMEND** | C resume saved stage/draft limits; explicit known0 | Atomic first-confirm state/N for failed attempt; separately pre-existing empty-account recovery; invalid full sum rolls back | Real cancel/reload/logout-login then confirm actual B/A once; display real date, unknown before/known0 after |
| HB20-B04 retained | Existing UI and no-account-on-error behavior; A reauth old form | N for denied/expired/storage failures; existing money/name/history unchanged | Real established login/navigation/history, old form expiry, service retry; no auth bypass |
| HB20-T01 D56 | Read-only offer; exact ACCEPT adapter; scoped original decision proof | ACCEPT one full reserve; repeats/conflicts; both-order ACCEPT/DECLINE and competing-amount races; rollback/real ack-loss; auth no-write | Real confirm/revisit/two tabs/conflict/UNKNOWN with PG winner proof |
| HB20-T02 D56 | Edit5400→5000; local close distinct from durable DECLINE/disable | Correct edited reserve; DECLINE money no-change/audit/receipt; repeat/concurrent decline; already-paid no false history; Q independent; disable/re-enable/cancel retain keys | Real controls/reload/relogin/next month/pending/error/recovery |
| HB20-T03 D56 | Offer P despite unpaid M; distinct identities/full reserves/funding; D44 | M5400+P5400 R10800 safe59200; partial M4000 R9400 safe60600 at B100000/A(P70000,Q30000); DECLINE leaves M alone; H/K/report versions retained | Real old-debt/new-month offer, explicit ACCEPT/DECLINE and PG before/after |
| F-016 D56 | Stable owned template+origin key across both outcomes | One proved ACCEPT or DECLINE, never both; next month independent; old debt/full reserve intact, no false payment/debit | T01–T03 cover reads/repeats/races/disable/cancel/old debt |

Additional exact financial oracles (all synthetic cents, future assertions):

- After initial B100000,A(P70000,Q30000),S0, template P5400 acceptance changes only full R(P5400),F(P64600,Q30000),safeAvailable64600; edited5000 gives F(P65000,Q30000),safeAvailable65000. Main daily is safeAvailable div Berlin inclusive remainingDays. Existing C/V/B/A/observation date unchanged.
- Old M5400/new P5400 with A(M0,P70000,Q30000): F(M=-5400,P64600,Q30000),ΣF89200,safeAvailable59200 under all-period max protection. If old funding previously explicitly moved P, R(P10800),F(P59200), same total/safeAvailable. Template action never performs that transfer.
- B1000,A(P1000),R(P5400),S0: full R5400,F=-4400,safeAvailable/mainDaily0. Add voluntary S without auto-release/capping; checked overflow/1-cent rounding refusals leave no partial writes.
- Existing partial payment5400→4000 leaves full4000 reserve through fresh actual-balance/affirmation rules; paid flag never debits bank. Carry/FRESH_START retains old identity/history; same-identity funding+lifecycle request atomically refuses.
- ACCEPT/DECLINE control is absent at K before commit. After commit ACCEPT includes actual CREATE; DECLINE contains typed decision evidence and unchanged financial state. H/K resolves corrections before day selection; immutable reports unchanged; only ACCEPT may apply normal explicit historical report-impact pending flags; DECLINE leaves report heads/versions unchanged. No template event supplies a bank check, actual income, end-month balance or exact per-event state.
- Negative B remains rejected/outside write policy, expected income never B/A, future A never current cash, Berlin midnight/DST and client UTC/Los_Angeles preserve dates. No dueDay/leap-month payment-schedule tests: monthly period/date primitives still need leap/calendar regressions.

PG race protocol: at least two real separately checked-out clients/pools with different backend PIDs and barrier/latch at owner/account lock. Prove waiter overlaps before releasing winner; finally release latches with bounded test timeout. Cover first-confirm same/different keys and amounts, rollback winner, original status while uncommitted, accept/accept changed amounts, config edit vs accept, independent-owner isolation. Promise.all alone is not race proof. Ack-loss tests execute real COMMIT then suppress its acknowledgement as existing integration patterns do; new connections prove durable outcome and zero duplicate writes. Also test genuine rollback and NOT_FOUND while still in flight.

Adapter-specific proof groups: outer wrapper rejected by unchanged parseObligationBatch; derived exact {changes} accepted; forbidden extra/payment/identity fields reject; prepared provenance preserved; normal writer invoked once/same backend tx; copied outer↔inner↔actual CREATE evidence/hash/receipt validates; injected inner/audit/deferred failure rolls all back. Corrupt version/mapping/duplicate business-key evidence must fail closed.

## 9. Small ordered stages and acceptance gates

Each row is an HB-020 slice, not a created issue/new task ID; maximum5 acceptance gates and7 test groups. Finance/auth/PG proof precedes UI. No code follows this planning correction.

| Slice/dependency | Acceptance gates (<=5) | Test groups (<=7, future) |
|---|---|---|
| S0 alignment/review | Review coordinated D56 docs; retain first-run contract; review atomic risk; select storage after proof; authorize implementation separately | Normative/status/ID checks; decision policy; original-proof composition; adapter review; both-outcome storage; scenario matrix |
| S1 transaction-local reuse | Preserve ordinary wrapper semantics; private validated tx helper; outer sole COMMIT; correct UNKNOWN classification; no arbitrary hooks | Existing HB9/HB17 auth/replay; stale/hash; counters; audit rollback; deferred failure; real ack loss; lock-order/isolation |
| S2 first-confirm repository/evidence | Owner lock at most1 account; real C/V and creation audit atomic; exact translation/proof; owned status/loser safety; history compatibility | A02/A07; A03; A04; A05; A06; A08/A09; history source/filter/H-K |
| S3 first-run UI after S2 PG | B/date/full A one confirm; no account-name UX; safe errors/UNKNOWN; persisted-state resume; accessible locales | A01 C; financial validation C; B01; B02; B03; B04; known0/UNKNOWN/viewport-theme-zoom |
| S4 selected template config/read storage | Bounded owned config/version; read-only new-month offers despite debt; shared terminal key; both-outcome storage reviewed; history controls | Config/auth; read no-write; at-K config/decisions; bounds/corruption; storage/migration if approved; month membership; disable retention |
| S5 adapter/decisions after S4 | Exact ACCEPT adapter; decision-only DECLINE; one terminal key/receipt; original semantic proof; rollback/UNKNOWN safe | Adapter/provenance; T01/F016 races; T02 decline/repeat; T03 debt; config-disable races; failure/real ack-loss; H-K/D44 |
| S6 recurring UI after S5 PG | Reviewed editable ACCEPT; durable month DECLINE; separate local close/disable; honest conflict/UNKNOWN; accessible locales | T01 B; T02 B; T03 B; draft/config components; expired/Origin; read no-write/privacy; keyboard/themes/layout |
| S7 evidence/review | Preserve existing Finance Gate; fresh applicable checks; exact17-row proof; independent review; separate owner acceptance | lint/types; units; isolated PG; UTC/LA; existing gate freshness; actual HB20 browser; privacy/diff/no-write review |

Future implementation checks: existing pnpm.cmd lint/typecheck/test/test:integration/build. Isolated PG only with explicit DATABASE_URL/DATABASE_URL_UNPOOLED/TEST_DATABASE_URL loopback overrides and disposable markers; no inherited Neon/private env target, database wipe, truncation or production provisioning. Apply existing migration chain through existing setup; any selected new migration requires separate authorization first.

Finance Gate: do not add HB20 checker/bindings/CI scope, weaken fingerprints or edit old receipts. Existing gate PASS is not machine-enforced new HB20 proof. After authorized normative/source changes, a separate scoped freshness/fingerprint-maintenance stage and fresh checks are required before publication; one future verification report maps actual exact IDs/results/gaps. This plan file is not currently a listed protected context; no manifest/checker/receipt change now.

Browser/OAuth test-environment availability and storage/transaction implementation feasibility are technical execution prerequisites, **not additional unresolved product policies**. Record NOT EXECUTED if unavailable; never bypass Google/Origin/CSRF, substitute jsdom, or mark HB-020 Done on an unexecuted mandatory browser gate.

## 10. D56 coordinated correction map — applied for review, not runtime proof

D45/D55 remain dated history. Stage0 changes only Markdown requirements/planning/
scenarios. Task statuses/dependencies, existing D55 edits and ADR math remain.

| Location | D56 correction |
|---|---|
| DECISIONS / OPEN_QUESTIONS | New dated D56; Q-HB20-NEW-INSTANCE resolved, historical OPEN anchor retained. |
| BR-06 / PRD UC-04 / UX / TASKS / IMPLEMENTATION_PLAN | New-month offer despite debt; explicit ACCEPT/durable month DECLINE; separate ignore/disable/existing lifecycle, no false payment/debit. |
| DATA_MODEL / ARCHITECTURE / DATABASE / AUTH | Planned typed decision evidence/exclusion across BOTH outcomes, original replay/status/UNKNOWN and month/H-K history, trusted action auth. A/B unselected; no physical migration or working API claimed. |
| HB20 fixture/T01–T03/core F-016 | Both-order ACCEPT/DECLINE races, repeated decline, financial no-change, next month, already-paid, disable/re-enable/cancel; retain all original IDs/proof classes. |
| R1 §§2,5–9,11 | D56 policy, decision-only DECLINE proposal, expanded storage comparison and scenario/S1–S7 gates. Baseline/changelog/D55 introductory note retain history. |
| Accepted ADR0001–0003 / architecture.json | No math, selector, accepted status, layer/import-boundary or runtime config changes. |

No source/SQL/executable tests/protected hashes/CI/receipt/evidence edits.
No runtime checks including Finance Gate/lint/typecheck/build/PG/browser in stage0.
Stop for independent ChatGPT review and separate owner confirmation before code.

## 11. Remaining decisions, risks and handoff

**Product disposition:** Q-HB20-NEW-INSTANCE is resolved by D56: new-month offer despite old debt, explicit ACCEPT or durable month-only DECLINE. Ignore/disable are distinct. No automatic financial mutation.

**Technical review gates:** validate single-batch onboarding/helper/empty-preview translation and original proof without risky legacy changes; select A/B recurring storage based on integrity/bounds/history evidence; approve exact typed adapter and its verifier; ensure isolated real Google/browser test environment. These are concrete technical proposals/prerequisites, not permission to implement. If atomic path cannot be safely demonstrated, present §4.5 alternative and obtain explicit separate alignment instead of hidden partial commits.

Main risks: transaction-helper regression; loss of original financial evidence through wrappers; audit-only controls disappearing from month filters; incomplete A lookup missing a prior terminal decision; table design mistaking uniqueness for consent; stale different-key first-run command silently recording another check; UI confusing DECLINE with close/disable/payment or losing cross-outcome exclusion; normal funding+lifecycle restriction accidentally bypassed. Future proof matrix targets each risk.

Acceptance after later authorization requires approved normative alignment; reviewed D56 terminal-decision contract; proven atomic real first confirmation/legacy empty recovery; one final ACCEPT/DECLINE per owned template+origin period, exact amount/full reserve only on ACCEPT and financial no-change on DECLINE; original H/K/closed versions and existing B/A/S preserved; complete honest PG/auth/real-browser evidence and independent review; separate owner acceptance. No implementation, migrations, tests, commits/push/PR/merge/deploy or Done is authorized here.

**Historical R1 planning verification (before D55/D56 edits):** R1 execution evidence was limited to source/document inspection, live Git reference and document/scope checks. **No unit/auth/PG/browser/build/Finance Gate execution and no runtime PASS claimed.** Documentation verification: git diff --check exited0 (tracked files unchanged); independent whitespace/conflict-marker scan passed for the untracked plan; the section8 matrix contains exactly17 unique IDs; git status --short shows only this same untracked plan. The first row-count command also matched the future-amendment table; it was corrected to section8 scope, then confirmed17 unique scenario rows. Old named-creation and terminal-skip test results were never executed and are not carried forward as proof. Hand this R1 plan to the owner for independent review, then stop.
