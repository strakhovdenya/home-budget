# Product decision log — current correction and archived chronology

## HB-022 Owner Acceptance and gated release — 2026-11-17

- **D63 — full Owner Acceptance; release remains conditional.** In the explicit in-chat instruction titled “HB-022 — OWNER ACCEPTANCE, QA POLICY, RELEASE”, the owner states: **«Я, владелец проекта, подтверждаю полную приёмку HB-022 (Owner Acceptance).»** This is full task acceptance, separate from the independent APPROVED reported for the final mobile CSS correction. It must not be attributed to an independent reviewer as approval of the entire implementation. See the [acceptance record](planning/hb-022-readonly-verification.md#owner-acceptance-and-practical-ui-qa-finalization--2026-11-17). HB-022 is **Done as an accepted implementation**; this is not a production-release PASS.
- The owner consciously accepts the preflight's optional unexecuted accessibility/zoom200%/extended-browser/resource research and residual limitations. They remain **NOT EXECUTED**, not PASS. D62 governs future practical UI QA; ordinary visual readability problems, particularly dark chart labels, still require correction. Existing tests and working accessibility are preserved.
- The owner authorizes necessary documentation finalization, one scoped feature commit, ordinary push of `feat/hb-022-p1-feasibility`, PR into main, CI, squash merge and production deployment **only through satisfied gates**. Full CI for the exact PR SHA, a synthetic preview/staging covering frontend, authorization, account isolation and read-only behavior, and confirmed production configuration/safe deployment remain mandatory. No force push, bypass/forced merge, configuration/secret/Neon changes, migrations, financial writes, financial-engine or existing financial-test changes are authorized. No repeated acceptance is needed for the same accepted limitations.
- Preserve the three read-only tabs and excluded confirmed-transfer chronology. Keep all prior findings, failed attempts and dated reports. A new blocker stops the relevant release stage; never convert optional risk acceptance into evidence for a mandatory unexecuted check.

## Practical UI QA — owner 2026-11-17

- **D62 — practical desktop/phone QA is the standing personal-app policy.** The owner's primary interactions are desktop mouse and phone finger. For current and future UI work, verify normal desktop/mobile browser operation; buttons/fields/tabs/filters via mouse/touch; readable text, exact sums and chart labels in light/dark; no overlap, clipping or horizontal overflow; correct states/errors/retries; RU/DE/EN; and financial information without loss. Low-contrast or unreadable dark chart labels are real UI defects, not an optional audit concern.
- Do not require separate Tab/Enter/Space suites, screen readers, formal WCAG audits, zoom200%, a full ARIA matrix, physical accessibility devices, live OS theme switching or coverage-only accessibility tests by default. They become acceptance criteria only when separately requested. Preserve working semantics, keyboard support and all existing tests; do not deliberately degrade accessibility or remove tests to implement this policy. No new framework/dependency/process is introduced.
- This is a prospective QA-scope decision. Historical requirements, executions and NOT EXECUTED entries remain dated facts. Financial correctness, auth/privacy, account isolation, read-only guarantees, mandatory CI and explicitly required release checks are unchanged. AGENTS.md routes future work to this decision.

## HB-022 reduced read-only analytics scope — owner 2026-11-16

- **D61 — remove confirmed-transfer chronology; authorize the bounded read-only P1→P4 pass.** This later owner decision supersedes D60 only for the scope and authorization stated here. D59/D60 remain unchanged historical decisions. Three tabs remain: «Остатки», «Месяцы», «Финансирование». HB-022 excludes any separate confirmed CARRY/FRESH_START/decision/transfer chronology, action-date filter, confirmation summary/export or equivalent block under another name. It is not relocated into another tab or existing History. Reintroduction requires a separate owner decision/task.
- Funding analytics is only selected distinct UNPAID/reserveFull obligations grouped originPeriod→fundingPeriod, checked against the same complete snapshot's R[p] before filters/paging. Existing CARRY/FRESH_START/FUNDING_TRANSFER effects on A/R/S/identity funding remain authoritative state facts; no original cash-only command listing or reconstruction is required. Existing funding readers still prove the funding facts actually shown. Metadata VALID is not full proof of displayed data; missing necessary proof remains fail-closed/STOP.
- The owner authorizes this one sequential, strictly read-only implementation pass: scope correction → P1 contract/feasibility → P2 balances → P3 months → P4 funding, only after each preceding gate is proved. No repeated approval is needed inside this scope. Q22-01–04, UX A, H/K/report isolation, UNKNOWN/zero, integer cents/Berlin dates, D36, full R/S and initial UX bounds remain unchanged.
- Allowed implementation is confined to new analytics read/validation/grouping/UI/tests and minimal shell navigation/icon/RU-DE-EN integration. Existing financial engine, calculations, selectors, source proof/verifiers (including originalEvidence/legacyProof), persistence, commands, auth/OAuth, schema/migrations, infrastructure/config/dependencies/CI/Finance Gate and every pre-existing test/scenario are immutable. If the remaining displayed data require any such change, stop and report one concrete residual blocker with a synthetic reproduction and narrower alternative; do not implement that alternative or weaken proof.
- The previous P1 B01 and measured57/111 SQL remain historical evidence for the now-excluded chronology, not an engine fix or automatic pass for the remaining scope. Recheck the necessary proofs independently. HB-022 remains unfinished pending independent review and separate Owner Acceptance. No commit/push/PR/merge/deploy, production/Neon, real data or financial runtime writes are authorized. Synthetic setup in a verified owned disposable local PG and new read-only tests are allowed.

## HB-019.2 and HB-020 separate Owner Acceptance — 2026-11-16

- **D59 — separate acceptance of both delivered dependencies.** The owner explicitly grants **Owner Acceptance 2026-11-16** to **HB-019.2** and, separately, **HB-020**; both are **Done**. This new decision follows D58 and is not inferred from merge, implementation, integration tests or HB-021 acceptance. D54–D58 and their earlier pending-review/acceptance statements remain dated history.
- Evidence: HB-019.2 [implementation verification](planning/hb-019-2-verification.md) and integrated [HB-021 F history proof](planning/hb-021-f-history-verification.md); HB-020 [implementation verification](planning/hb-020-implementation-verification.md) and integrated [D finance](planning/hb-021-d-finance-verification.md) / [E recurring proof](planning/hb-021-e-recurring-verification.md); consolidated [J evidence](planning/hb-021-j-verification.md) and [D58](#hb-021-owner-acceptance--2026-11-16). These are historical executions on their recorded sources, not reruns for this decision or proof of the current documentation tree.
- Retain all original results, fingerprints, failed attempts, pending review entries and **NOT EXECUTED** limitations. Actual Google provider login/relogin, native zoom 200% and full WCAG/physical AT/NVDA/VoiceOver are not newly executed or declared PASS by this acceptance. HB-021 remains a separate accepted task. No financial rules, scenario oracles or source evidence are changed; no publication or runtime work is authorized here.

## HB-022 approved planning and UX — owner 2026-11-16

- **D60 — plan and Q22-01–04 APPROVED; documentation only.** The owner approves the [HB-022 plan](planning/hb-022-analytics.md) and authorizes **DOC-HB22-01** plus recording the UX below. HB-022 remains **Planned — plan approved; implementation not authorized**, not Done. **P1–P4 implementation NOT AUTHORIZED**; each future part requires separate owner authorization. No commit/push/PR/merge/deploy, DB operation, code/test/schema/dependency/env/CI change is authorized.
- **Q22-01:** compare financing months at one common H/K or inside one selected immutable report snapshot. No mixing independent closings with different versions/dates without a separate decision.
- **Q22-02:** three tabs: «Остатки», «Месяцы», «Финансирование». REPORT balances show the last real confirmed bank check and the separate honest endBalance status; no invented series. A full series requires an explicit move to daily history with a proven owned anchor and preserved basis; otherwise the action is unavailable.
- **Q22-03:** approve the principle of a narrow private read-only contract and checked grouping over existing selectors. No new financial rules, DB schema or assembler. Separately authorized P1 must prove feasibility, owner isolation, completeness and combined resource cost before UI work; failure returns to the owner without silently extending scope.
- **Q22-04:** initial UX hypotheses: a request window up to 12 months with older windows reachable, at most 100 chart points per page, 20 details per page and an initial visible period of 3 months. These are subject to P1 resource/performance proof, not performance guarantees or history-retention limits.
- **Approved simple interface A:** primary values, dates, charts/tables and understandable filters are immediately visible. Raw H/K, versions, source IDs, evidence and advanced settings stay available in an expandable block. Always distinguish the state date from the actual last bank-check date and visibly identify an old checkpoint. Add «Аналитика» after «История», opening on «Остатки»; preserve existing Overview/Months/History flows. All analytics interactions are read-only, with links to existing sections and no automatic financial writes.
- **Balances:** discrete real check markers and an exact table, no connecting lines/interpolation/invented days; explicitly select two points/rows, show both dates and D without calling it income/expense. Preserve corrections, same-date ordering and original/later K. REPORT uses a meaningful last-check card and separate UNKNOWN endBalance when month-end is unobserved.
- **Months:** primary aligned A/R/S/F table, secondary simple chart with zero axis and signed F/«Дефицит». R/S are not funded portions of A. No second Dashboard or competing safe daily limit. **Funding:** readable «Возникло в X → Финансируется Y» groups with identity disclosure and a separate chronology of confirmed transfers/decisions. Keep A carry, obligation/savings funding and bank movements distinct. Full U[p]=R[p] is proved before filters; filtered subtotals/counts are page-independent and do not have to equal full R[p] under an origin filter.
- **Responsive/accessibility:** compact 320/375px cards, accessible tabs, vertically expandable filters, comparison beside selected items and local pagination; desktop 1280px, RU/DE/EN, existing MUI/themes, keyboard/focus/loading/error/UNKNOWN. Values remain available without hover, color or chart. Native zoom 200% is excluded from mandatory HB-022 acceptance and remains **NOT EXECUTED**, not PASS. Other required checks remain future obligations.
- No Sankey, report builders, decorative animation, balance-growth percentages, unsupported flow/K/U, guessed balances or visualization libraries. D36, full reserves/savings, H/K, immutable reports, Europe/Berlin, checked bigint, UNKNOWN and owner isolation remain unchanged. HB22-01–17 and resource gates remain future proof obligations, not executed tests. DOC-HB22-01 creates no new HB task.

## HB-021 Owner Acceptance — 2026-11-16

- **D58 — accepted browser QA with explicit MVP exceptions.** The owner reports independent approval of all HB-021 parts A–J; J is **APPROVED with no findings** and HB-021 is **Done**. This is the owner's acceptance decision, not a new reviewer claim by the publishing agent. See the [publication record](planning/hb-021-publication.md), [plan](planning/hb-021-browser-e2e-a11y-responsive.md) and preserved [J evidence](planning/hb-021-j-verification.md).
- Accepted evidence: unit UTC1170/1170, PostgreSQL544/544, LA552/552, separate DB17 two selected tests, H48/48, reduced I MVP Accessibility Smoke2/2, and J Finance Gate596 scenarios /803 obligations /1171 references with three fresh receipts. J run `1cf82f39-3cef-42e3-8ab5-e82e4f75aadc` applies to its recorded pre-finalization source only.
- Google OAuth provider login/relogin and native browser zoom200% remain **NOT EXECUTED**. Full WCAG/AT/NVDA/VoiceOver is outside mandatory personal-MVP acceptance and was not executed. The owner accepts these limitations without further checks; none becomes PASS or a new HB-021 blocker. Synthetic session E2E is not genuine Google provider proof. The earlier D54/HB-021 planning requirements are superseded only for these explicitly accepted exceptions; financial, authorization, privacy and history assertions remain mandatory.
- Dependency runtime and integrated HBH/HB20 paths are covered by accepted A–I evidence. The owner accepts HB-021 on that basis and the exceptions above. This does not independently mark HB-019.2 or HB-020 Done, grant them separate Owner Acceptance, or claim execution of their outstanding provider/AT branches. Their own dated task records remain intact.
- The owner authorizes documentation finalization, necessary normalized context-hash maintenance, commit, ordinary push and a PR into main without intermediate reconfirmation. Only stale `contexts[].sha256` entries may change in the Finance manifest; scenario definitions, dispositions, assertions, references and checker remain unchanged. Protected TASKS/DECISIONS/OPEN_QUESTIONS edits invalidate the old J source fingerprint: fresh Finance Gate execution on the final proposed source is required in CI; old receipts must not be rewritten or reused.
- Preserve A–J reports, failures, source inventories and historical receipts. Preserve published hotfixes. No new functionality, refactoring, schema, financial/auth changes, production access, main update, merge or deployment is authorized. A merge conflict requires stopping with exact evidence.

## HB-020 contextual month — owner 2026-11-12

- **D57 — one proposal month and initial funding.** The owner directly clarifies D55 after independent implementation review. This supersedes D55's bullet beginning “Templates prefill title/amount and reviewed origin/funding month” only insofar as it suggests two independent user choices, and clarifies D55's “Origin and funding remain distinct” for the initial template ACCEPT. D45/D55/D56 text below remains dated history; D56 terminal decisions are unchanged.
- Each proposal has one contextual month P (YYYY-MM): the month being viewed, or the current Europe/Berlin month when no separate context exists. No independent origin/funding month controls appear in its card. Show P in the offer and confirmation; the integer-cent amount may be edited.
- Initial explicit ACCEPT saves originPeriod=P and fundingPeriod=P with the full unpaid reserve R[P], one ordinary CREATE and no bank debit/checkpoint/allocation change. The server and original semantic proof reject unequal periods. The financial event is recorded on the actual confirmation day; P does not backdate the event or invent a future bank observation.
- Old unpaid obligations retain identity, full remainder/reserve, status, origin/current funding and history. Moving their funding is a separate existing explicitly reviewed FRESH_START/CARRY under D43/D44, never a side effect of accepting a new monthly instance. General obligation origin/funding and legitimate transfers remain distinct domain concepts.
- D56 ACCEPT/DECLINE stays terminal per owned template+origin period. DECLINE only P; next enabled month independently reoffers despite old debt. Already paid before first access may be DECLINED without a counterfeit PAID/bank debit; an existing obligation uses its normal PAID/PARTIAL/CANCELLED lifecycle. Disable preserves historical facts; Later is local and writes nothing.
- No dueDay, payment schedule or income trigger is introduced; ordinary optional dates are retained. Accepted ADR0001–0003, D36, ΣA=B, full R/S, UNKNOWN, H/K and immutable closing versions are unchanged.
- The owner authorizes this local correction, focused normative alignment and only the necessary F-016 definition/reference maintenance in Finance Gate. Broader manifest/context-fingerprint maintenance requires separate approval. No publication or Owner Acceptance is granted.

## HB-020 monthly decisions — owner 2026-11-11

- **D56 — new-month offers and durable ACCEPT / DECLINE.** The owner accepts
  the independently reviewed D55 documentation and supplies this later product
  correction. D45/D55 remain historical; D56 supersedes their open suggestion
  policy and acceptance-only persistence design. This patch awaits independent
  ChatGPT review and separate owner confirmation before implementation.
- In each new Europe/Berlin calendar month an enabled monthly template may offer
  a separately reviewable new instance even while the previous bill is unpaid.
  Opening the site never accepts/declines or writes anything automatically.
  Old debt retains separate identity, full unpaid remainder/reserve, origin and
  current funding months and history; no automatic payment/cancellation/transfer.
- Explicit **ACCEPT** creates exactly one normal full-reserve obligation per
  **owner/account + templateId + originPeriod**, even under retry/race/reopen.
  The owner may edit integer EUR-cent amount before confirmation. Another
  obligation's historical funding month remains unchanged.
- Explicit **DECLINE — «Не добавлять за этот месяц»** is durable, idempotent and
  provable for exactly that key. It creates no obligation/payment/bank operation,
  changes no B/A/C/V, R/S/F or observation date, and suppresses that month's
  offer after reopen/relogin. Next enabled month is offered independently of
  prior DECLINE. ACCEPT and DECLINE are mutually exclusive final decisions;
  parallel commands yield one proved result. Replay preserves original evidence;
  conflicting/losing commands cannot overwrite the winner or report false success.
- A bill already paid before first monthly access and included in confirmed B
  may be DECLINED without invented payment history or a second debit. An already
  created obligation uses Paid / Partial / Cancelled and the existing required
  financial confirmations; DECLINE cannot remove its reserve.
- **Disable template** stops future offers, preserving obligations, decisions
  and history. Closing/ignoring without DECLINE is local UI only: no durable
  rejection/audit/receipt. Declining a month, disabling config, cancelling an
  obligation and paying are distinct. None resets an existing terminal key.
- Q-HB20-NEW-INSTANCE is **RESOLVED by D56**. Storage A/B remains unselected.
  A needs typed immutable audit/receipt, serialized admission and bounded proof
  for BOTH outcomes. B needs a separately approved migration and scoped UNIQUE
  across both outcomes on owner/account+templateId+originPeriod. Both must prove
  replay/status/UNKNOWN and complete H/K history. No schema is added here.
- D55 first-run atomic real B/date/full-A confirmation, D36, full R/S, ΣA=B,
  D43/D44 and immutable reports remain. No income tracking, payment schedule,
  automatic transfer/debit, daily expenses, new login method or multiple cards.
  HB-020 stays Planned/P0; HB-019.2 status is unchanged. Stage 0 changes only
  documents/scenarios; runtime checks are NOT RUN. Finance Gate/hashes/CI/evidence
  remain untouched pending later authorized freshness maintenance and checks.
  Stop for independent ChatGPT review and separate owner permission before code.
  No commit/push/PR/merge/deploy, acceptance or Done.

## HB-020 product alignment — owner 2026-11-11

- **D55 — one first financial confirmation and monthly entry templates.**
  The owner reports independent approval of the [HB-020 R1 plan](planning/hb-020-first-run-and-recurring-templates.md)
  and authorizes coordinated documentation/scenario alignment only. This records
  the supplied review, not an independent review by this editor or runtime proof.
  After admitted Google OAuth, first run asks for actual B, observation date and
  complete A; one explicit confirmation atomically creates any missing single
  owned EUR technical account (stable internal name), the first real checkpoint,
  full vector, audit and durable receipt. No public “Create budget” screen or
  name field, no account on login, no preliminary hidden commit or synthetic
  observation. Before confirmation B/A/F remain UNKNOWN; explicit B=0 is valid.
  An existing empty account resumes real confirmation without recreation/rename.
- Templates prefill title/amount and reviewed origin/funding month for explicit
  monthly obligation creation, including amount editing before confirmation.
  No template due-day/payment schedule, automatic debit, standalone income/receipt
  tracking or receipt-triggered proposals. Template-created dueDate=null;
  ordinary obligations retain their optional dueDate and lifecycle unchanged.
  Checkpoint differences never prove income. Optional explanatory operation
  detail and unrelated future capabilities remain outside this HB-020 correction.
- Ignoring/closing a proposal is local UI only: no server write, saved SKIP,
  terminal skip, receipt, audit, reserve or counter increment. Only an explicit
  accepted creation adds an obligation, fully reserving its outstanding amount.
  At most one accepted obligation per template+origin period. Old unpaid debt
  retains identity, full remainder, reserve and history; a separately confirmed
  new bill has its own identity, never a merge or automatic replacement.
  Origin and funding remain distinct. Funding changes require explicit existing
  FRESH_START/CARRY consent; D43/D44 and SAME_IDENTITY_COMPOUND_NOT_SUPPORTED remain.
- **OPEN [Q-HB20-NEW-INSTANCE](OPEN_QUESTIONS.md#hb-020-monthly-instance-suggestion--open):**
  whether to suggest a new monthly instance while older debt remains unpaid.
  No option, default suppression or automatic creation is selected. F-016/T03
  describe the conditional separately confirmed outcome, not final UI policy.
- Atomic composition/original proof, the exact-schema obligation adapter,
  recurring storage A/B and complete history support remain technical review
  gates, not additional owner product decisions. A requires bounded semantic
  proof; B tables/migration require separate consent. Current HB-017 does not
  already expose no-account atomic composition. No fallback with hidden commits.
  Accepted ADR0001–0003, D36, bigint cents, A>=0/ΣA=B, full R/S, negative F,
  H/K, immutable reports, privacy and per-action authorization are unchanged.
  HB-020 remains Planned; HB-019.2 remains Review / awaiting Owner Acceptance.
  D54 does not waive HB-020's own real-browser proofs.
- This dated decision supersedes conflicting current named/two-step onboarding,
  receipt-trigger and persisted-skip requirements; D45 and older decisions stay
  historical. Implementation, SQL/migrations, executable tests, commit/push/PR/
  merge/deploy and Done are not authorized. Protected normative hashes are now
  intentionally stale: leave the Finance Gate/checker/CI/bindings/receipts and
  existing evidence untouched. Separate authorization and fresh verification
  are required later, before publication. Runtime tests: NOT RUN
  (documentation-only, owner instruction).

## HB-019.2 browser verification handoff — owner 2026-11-11

- **D54 — HB-021 owns the outstanding real-browser and physical-AT execution.**
  The owner reports independent approval of HB-019.2 R1 and the separate Finance
  Gate context maintenance (both APPROVED, 0 Critical / 0 High / 0 Medium / 0 Low).
  HB-019.2 is **Review / awaiting separate Owner Acceptance**, not Done.
  All unexecuted real-browser/assistive-technology portions of HBH-001–007 move
  to **HB-021**, which must execute and record them before its own acceptance:
  authenticated access/navigation, current/past history and all three perspectives,
  explicit v1/v2 reload, complete pagination/filter/refresh/error/basis behavior,
  privacy and read-only browser flows; RU/DE/EN; 320px and desktop layouts; native
  200% zoom; keyboard/focus/announcements; physical screen-reader output.
  Their current status remains **NOT EXECUTED**, never PASS. Scenario IDs,
  financial oracles and required unit/component/isolated-PostgreSQL evidence stay
  with HB-019.2; HB-021 inherits the browser/AT assertions without redefining them.
  This transfer neither waives those requirements nor turns component tests into
  browser evidence. HB-021 acceptance must include their actual execution results.
  D46–D53 and Accepted ADR0001–0003 retain their history and financial meaning;
  D50–D53 daily H/K, 20-row paging, existing resource bounds and no gate expansion
  remain binding. HB-027 remains Post-MVP, A/B unselected, not an MVP blocker.
  The owner authorizes scoped documentation finalization, necessary context-only
  SHA maintenance, fresh checks, feature-branch commit/push and a PR to main.
  No merge/auto-merge/squash, main update, deploy, Owner Acceptance or Done is
  authorized. See [HB-021](TASKS.md#hb-021--core-browser-e2e-a11y-and-responsive-qa)
  and the [HBH execution boundary](../tests/scenarios/phase-01/hb-019-2-financial-history.md).

## HB-019.2 MVP boundary — owner 2026-11-09

The owner reports the preceding HB-019.2 technical plan independently APPROVED
and authorizes this documentation/planning amendment only. The four decisions
below supersede conflicting proposed implementation details, not the historical
text of D46–D49 or Accepted ADR0001–0003. The amended documents require **repeat
independent review**. No code, test code, SQL, migration, evidence deletion,
commit/push/PR/merge/deploy, acceptance or Done is authorized.

- **D50 — daily historical selection for MVP (option C).** HB-019.2 retains all
  committed batches and typed sources, original revisions/IDs/timestamps, confirmed
  same-day ordering evidence, full vectors/funding/lifecycle provenance and all
  immutable closing versions. Its three perspectives use the existing provable
  **day H / original or later K** path and the existing report reader. Do not add
  through-position to readAt/assembleSnapshot, build a new intra-day assembler,
  change formulas/selectors/selectionContractVersion or damage existing ordering
  support elsewhere. Complete evidence access is not a promise of reconstructed
  before/after state at every same-day position. Label daily state “Through [day],
  as known at [recorded cut]”, never “after this event” when only day precision is
  proved. Unknown is not zero or today's balance; missing proof is an explicit
  limitation/error, not guessed state or PASS. Existing numerical HBH oracles stay.
  Add **HB-027**, Planned/Post-MVP, for exact intra-day reconstruction; it does not
  block HB-021/MVP/release. HB-022–026 are occupied; no HB-019.3 or deployment task.
  HB-027 must separately plan/review and obtain a direct owner choice between
  **A**, narrow existing read-only H/K/through-position extension (shared logic,
  regression risk), and **B**, separate history assembler reusing current selectors/
  validators (isolation, duplication/drift risk). Neither option is selected or
  authorized, and no new HB-027 plan/ADR is created now.
- **D51 — ordinary server pagination.** Use budget_updates and unique scoped
  recordedSeq,20 rows, Previous/Next, upper K_index captured on entry and lastSeq
  keyset. New commits cannot shift a pinned view; re-entry/explicit refresh captures
  a new view. UI may keep a page stack in memory only. No encrypted/signed cursors,
  cursor secret,20-minute TTL, server history sessions or new tables. Private
  actions/request bodies carry bounded untrusted parameters; every read resolves
  owner/account again and validates K/lastSeq/filter/source membership. Page keys
  confer no access. Validate retained owned batch anchors rather than accepting a
  free numeric K as authority. Echo the full validated basis; UI never appends a
  different-basis response. No financial URL/log/persistent browser state.
- **D52 — demonstrated scale only.** Typical use is about4 bank checks/month;
  enumerate all retained batches without a total/age cutoff and load details on
  demand. Keep current timeouts/resource guards unchanged. No proactive cache,
  read model, background work, partition/materialization/index/migration. A real
  reproduced limit failure needs honest error, measurements and later owner
  decision; it cannot hide partial history or authorize optimization in HB-019.2.
- **D53 — existing finance gate through MVP.** Do not expand checker, mandatory
  HBH bindings in coverage.json or CI. Keep current gate/fingerprint, UTC/LA,
  isolated PostgreSQL and no-write checks. Execute applicable HBH U/C/PG/browser
  proofs under separate implementation authorization and map exact results in
  **one** main verification report for independent review. Old gate PASS is not
  machine-enforced HBH coverage. Discuss additional gate enforcement only after
  MVP; no automatic follow-up implementation. This is separate from required
  freshness maintenance: these protected-document changes invalidate context
  hashes/old receipts. No manifest/receipt edit or fresh runtime PASS now; before
  publication a separately authorized context-only maintenance stage must restore
  existing CI validity and run fresh evidence without weakening/extending the gate.

The41-candidate controlled cleanup (33 HB-019.1 plus8 conditional HB-017 images),
final/unique proof preservation, exact historical SHA/permalinks and minimal-file
policy remain. [Plan](planning/hb-019-2-financial-history.md),
[HBH](../tests/scenarios/phase-01/hb-019-2-financial-history.md) and
[TASKS](TASKS.md#hb-027--exact-intra-day-historical-state-reconstruction) carry
the scope/test mapping. If even the daily three-perspective contract cannot be
met by the permitted existing path, record the exact blocker and obtain an owner
decision before coding; no partial implementation is called complete.

## HB-019.1 implementation acceptance and publication authorization — 2026-11-08

The owner reports independent repeat ChatGPT review **APPROVED**, with
Critical/High/Medium/Low **0/0/0/0**, and accepts the HB-019.1 implementation on
2026-11-08. The previous Medium finding about an actual final-day observation
versus unconditional UNKNOWN is corrected. This records the owner's supplied
review outcome, not an additional review performed by the implementing agent.
HB-019.1 is Done; HB-019.2 remains Planned P0. D46–D49, accepted ADR0001–0003,
H/K, observed zero, real dates and immutable closing versions are unchanged.

Authenticated browser QA, real 320px, real 200% zoom and physical AT remain
NOT EXECUTED. HB19-Q07 remains OPEN / NOT REPRODUCED; these limits are explicitly
retained in acceptance. Prior verdicts, receipts and authorization stages below
remain historical. Current evidence is linked in the
[UX report](planning/hb-019-1-verification.md) and
[finance report](planning/hb-019-1-finance-gate-verification.md).

The owner authorizes documentation finalization, one logical commit in
feat/hb-019-1-budget-update-ux, push to origin, a PR to main and CI follow-up
within this approved scope. Merge (including squash), deploy, production changes
and scope expansion require separate owner authorization.

## HB-019.1 documentation acceptance and implementation authorization — 2026-11-08

The owner reports independent ChatGPT review of the20 local documentation files:
**APPROVED, Critical/High/Medium/Low 0/0/0/0**, and accepts the documentation stage
on2026-11-08. D46–D49 remain binding; this is not an implementation-review verdict.
The owner explicitly authorizes the separate finance-fingerprint correction with
FPG regressions and the remaining HB-019.1 UX implementation/verification, through
Review only. No commit/push/PR/merge/deploy, production, schema or financial-policy
change is authorized. HB-019.2 remains Planned P0 and is not implemented here.
Baseline20 documents and their SHA-256 were preserved locally before implementation.
Implementation must be independently reviewed and separately accepted by the owner.

## Saved financial history and evidence scope — 2026-11-08

**Owner decisions D46–D49 — approved for documentation and product scope.**
The owner reports independent ChatGPT review of the documentation-audit plan:
**APPROVED**, and approves all four proposed decisions on 2026-11-08. This records
that report, not an additional independent review, runtime proof or implementation
approval. HB-019.1 remains Planned; HB-019.2 is added as Planned P0.

- **D46 — product principle and complete MVP history.** Home Budget shows available
  money from the last confirmed financial state with its real bank-check date and
  lets the user reconstruct all saved checks and financial states in current/past
  months. Unknown movements and balances remain unknown. D37 dated old-state
  estimates survive; this promises neither today's unobserved bank cash nor a
  reconstructed transaction ledger between checks. A latest-ten list is insufficient.
- **D47 — delivery split.** HB-019.1 owns current-budget/update/transition UX,
  historical input preview/saved result and correct presentation of existing
  selected-month/report data (HBUX-001–036). Add HB-019.2 P0 for complete historical
  browsing (HBH-001–007), after HB-019.1 and the existing history foundations.
  HB-020 independently follows HB-019.1; HB-021 waits for both HB-019.2 and HB-020.
  HB-022 remains post-MVP extended analytics, not the basic history viewer.
- **D48 — three historical perspectives.** Distinguish state(H,K) as known at a
  pinned original knowledge cut, state at the same H with later corrections at a
  clearly identified later K, and a selected immutable closing version with its
  own H/K/source contract. Preserve observed/effective/recorded dates and confirmed
  same-day order. UNKNOWN differs from observed zero. A corrected-state view cannot
  publish a report version, change the active financial head or overwrite v1.
- **D49 — separate finance-fingerprint technical stage.** Plan inclusion of SQL
  migration contents, safe separation of pure administrative files from protected
  financial contracts, and regression tests of evidence freshness before HB-021
  final evidence. The current checker/manifest/receipts remain unchanged here.
  Significant edits require a fresh run; archived HB-019 PASS cannot become current
  evidence. See [technical plan](planning/finance-fingerprint-follow-up.md).

**Applicability without rewriting decisions:** D32–D35 supersede earlier signed-A
interpretations in D29–D31; D41–D42 and the existing ADR0001/0002 addenda establish
FRESH_START as the primary deliberately selected new-month action, with working
secondary CARRY/DEFER. Primary placement never means preselection or automatic
execution. D44/Q-HB17-01 still requires separate confirmed updates for funding
transfer plus lifecycle edit of the same identity. D36–D39, H/K algorithms, full
R/S, actual-money conservation, unknown month-end cash and immutable versions
remain intact. Earlier decisions, Accepted ADR text and original evidence are
retained as chronology. D45's delivery order is extended by D47, not erased.

References: [PRD](PRD.md), [task register](TASKS.md),
[HB-019.1 plan](planning/hb-019-1-budget-update-ux.md),
[HB-019.2 plan](planning/hb-019-2-financial-history.md),
[history scenarios](../tests/scenarios/phase-01/hb-019-2-financial-history.md).

## HB-019.1 budget-update UX and HB-020 first-run scope — 2026-11-04

**Owner product decision — accepted for planning; implementation NOT authorized by this record.**
These are UX/orchestration clarifications to accepted D29–D39 and Q-HB17-01, not
permission to change financial invariants, history algorithms, or the database.

- **D40 — one primary action.** "Обновить бюджет" is the everyday entry point.
  Within the same current Berlin month, an ordinary actual-check update confirms
  one real balance, complete nonnegative allocation vector and optional supported
  lifecycle edits. No month-transition selection is demanded unless unresolved
  funding/allocations from an earlier month still need an explicit decision.
- **D41 — new-month primary route.** Present the clearly named action
  "Начать месяц с актуального остатка" as the *explicit user choice* of
  `FRESH_START`, followed by reviewed actual bank observation, complete vector,
  affected old-period funding identities and required non-carry/future-edit
  consent. Do not preselect a transition on page opening or silently infer it from
  dates/amounts. This refines D29–D35 **UI** while preserving nondefault domain
  transition decisions. Preserve untouched future allocations unless explicitly
  reviewed and confirmed otherwise. No automatic saving creation or release.
- **D42 — remaining modes.** Offer `CARRY` as a separately named secondary
  "Перенести прежнее распределение" action; it supports a fresh actual check or
  explicit reuse of the last valid confirmed check when allowed. `DEFER` is a
  secondary "Оставить распределение без переноса" action: it does not move old
  cash or earmark funding, but may accompany a valid explicitly confirmed update.
  Neither action runs automatically. Existing canonical modes/events remain.
- **D43 — obligations and savings.** An unpaid November bill can retain November
  origin/due date yet be fully reserved in December after explicitly reviewed
  funding transfer. Saved amounts persist with identity and current funding;
  new savings and savings increases are voluntary. A mental "€400 left from
  November" is not a verified November 30 bank balance or automatically created
  savings. Actual card debits are never posted by payment flags; no double
  subtraction. Retain full reserves even when R+S>B and display deficit.
- **D44 — restricted same-identity sequence (owner chose option A).** Keep
  Q-HB17-01 intact. If `FRESH_START`/`CARRY` moves funding of an existing
  obligation or saving, changing that **same identity** (paid/partial/cancelled,
  amend/increase/release) in the same atomic update remains unsupported with
  `SAME_IDENTITY_COMPOUND_NOT_SUPPORTED`, retained draft and no partial financial
  writes. The user first confirms month transition/funding, then submits the
  lifecycle edit in a **separate later explicitly confirmed update**. UI explains
  the sequence without silent two-step commits, fake historical positions,
  inferred payment or relaxed SQL guards. Disjoint-identity compositions keep
  their existing contract.
- **D45 — delivery boundaries.** Finish HB-019's existing closing-review defect
  and independent owner acceptance first. Add **HB-019.1** (P0, planning then
  separately authorized implementation) before HB-020; it changes UX/orchestration,
  not D36, schema or the established finance engine. Include **HB-020** in MVP as
  P0, extending it with first-run authenticated *owned account creation* and
  initial actual checkpoint/full allocation onboarding alongside recurring
  obligation templates; no second card/multi-account UI. HB-021 tests the full
  chain after both. Proposed HB-027 deployment remains unapproved.

Closing remains independent of transition. History still resolves `state(H,K)`;
without an observed month-end checkpoint, month-end bank balance stays UNKNOWN.
Neither CARRY nor FRESH_START establishes how much cash physically existed on the
last day of the previous month. Keep immutable old reports and all revisions.

References: [rules](BUSINESS_RULES.md), [new task](TASKS.md#hb-0191--budget-update-ux-and-month-transition-clarity),
[planning contract](planning/hb-019-1-budget-update-ux.md),
[scenarios](../tests/scenarios/phase-01/hb-019-1-budget-update-ux.md).

## HB-018 Owner Acceptance — 2026-11-03

The owner finally accepted HB-018 on **2026-11-03** after owner-reported independent
ChatGPT repeat review R1: **APPROVED; Critical 0 / High 0 / Medium 0 / Low 0**.
HB-018 is Done. Medium 1 is corrected with six component regressions; retained
Codex R1 evidence is861 unit/component,332 PostgreSQL,509 timezone and22 LA.
No new execution or independent ChatGPT test run is claimed here.

The owner consciously accepts browser QA B01–B07 and physical screen reader
NOT EXECUTED because the runtime was unavailable; unit/component/PG do not replace
browser evidence. Process-local history cursors remain a limitation: restart or
another process can invalidate a cursor, with safe refusal and explicit refresh.
The previously accepted HB17-A03 exception is unchanged and not declared fixed.

Owner Acceptance completes documentation; **it is not itself authorization to
publish**. Commit/push/PR/merge/deploy require separate owner permission. Existing
product decisions, financial rules, Accepted ADRs and historical evidence remain
unchanged.

References: [task](TASKS.md#hb-018--obligations-and-savings-management-screens),
[approved plan](planning/hb-018-obligations-savings.md),
[Owner Acceptance and verification](planning/hb-018-verification.md#owner-acceptance--2026-11-03).

## HB-017 Owner Acceptance with known Medium — 2026-11-03

The owner explicitly accepts the current HB-017 implementation and authorizes
publication in principle. Owner-reported independent ChatGPT implementation review:
**CHANGES REQUESTED; Critical 0 / High 0 / Medium 1 / Low 0**. HB-017 is **Done by
Owner Acceptance with a known exception**, not by an APPROVED implementation review.

**Accepted exception: HB17-A03.** A separate public message for reliably known OAuth
failure is not fully implemented. The owner consciously accepts the current neutral
public fallback without fixing this Medium. A03 remains partially implemented;
its full acceptance criteria must not be reported as passed, and the finding is
not resolved. This narrowly qualifies Q-HB17-02's mandatory A01–A07 acceptance scope;
it does not waive fail-closed, Google OAuth checks, JWT, CSRF/Origin, ownership,
safe logging, privacy or protection against account enumeration. AccessDenied alone
still does not establish Google rejection.

Earlier scope/planning decisions and implementation evidence remain preserved as
chronology. Q-HB17-01/03, D36–D39, Accepted ADR0001–0003 and financial rules are
unchanged. No new HB-ID or implementation/test/schema change is introduced.
This turn is documentation finalization only: no commit, push, PR, merge or deploy.

References: [task](TASKS.md#hb-017--single-atomic-update-budget-flow),
[Owner Acceptance and retained evidence](planning/hb-017-verification.md#owner-acceptance--2026-11-03),
[original scope decisions](#hb-017-scope-decisions--2026-11-03).

## HB-017 scope decisions — 2026-11-03

The owner reports independent ChatGPT review of the HB-017 plan: **APPROVED**,
Critical 0 / High 0 / Medium 0, and accepts the following three decisions.
This records owner-reported review and scope acceptance, not a new independent
review, executed tests or authorization to implement. HB-017 remains **Planned**.

References: [HB-017 plan](planning/hb-017-update-budget.md),
[acceptance scenarios](../tests/scenarios/phase-01/hb-017-update-budget.md),
[retained question register](OPEN_QUESTIONS.md#hb-017-planning-review--2026-11-03).

- **Q-HB17-01 — option A accepted, disjoint identities only.** One atomic update
  may combine lifecycle edits with funding transitions for different identities.
  A lifecycle edit/payment/release and FUNDING_TRANSFER of the same obligation or
  saving identity at one position is forbidden in MVP. Return an explicit typed
  refusal with zero partial financial writes and preserve the user's draft.
  Never automatically split commits, create fake dates/positions or weaken SQL
  constraints/historical ordering. Positive disjoint combinations and negative
  same-identity combinations must be tested. This accepts an MVP restriction;
  it does not claim implemented same-identity compound support.
- **Q-HB17-02 — auth diagnostics included in HB-017 as an isolated change set.**
  No separate HB-ID. Financial and auth changes require independent test evidence;
  **HB17-A01–A07 are mandatory acceptance**. Provide clear safe RU/DE/EN messages,
  distinguish a reliably known technical failure from access refusal only where
  safe, and never equate every AccessDenied with Google rejection. Do not disclose
  allowlist membership, SQL, DB URLs, email, tokens, secrets or internal data.
  No account-enumeration oracle through messages, HTTP statuses, redirects or
  cookies. Keep fail-closed, Google OAuth, JWT, CSRF and ownership; use safe server
  diagnostic categories and verify actual Auth.js callback/session boundaries,
  not only mocked signIn behavior.
- **Q-HB17-03 — memory-only draft accepted.** Retain input on ordinary errors,
  conflicts and navigation inside the mounted form; warn about unsaved changes.
  No financial localStorage, sessionStorage, IndexedDB or offline persistence.
  Do not promise recovery after reload, crash or full OAuth redirect. An unknown
  commit outcome uses the original requestId and safe result checking, without
  an automatic new financial action or replacement request key.

D36–D39, Accepted ADR0001–0003, financial formulas and existing runtime contracts
are unchanged. All three Q-HB17 questions are resolved; implementation, feature
branch creation, commit/push/PR/merge/deploy still require separate authorization.
This turn authorizes documentation finalization only.

**Current rule:** D32..D35 below supersedes signed actual-cash interpretations in the archived D10/D22/D28..D31 text. Earlier decisions and acceptance records are preserved as chronology,not current permission for negative A.

## Archived original interview and clarifications

- D01: web app on Vercel, **not PWA**, responsive mobile and desktop.
- D02: user-entered actual card balance is main fact; intermittent updates are normal; optional individual transactions.
- D03: marking an obligation paid changes status/full reserve, NOT card balance; require fresh user-confirmed bank balance and warn if unchanged.
- D04: reserve the entire unpaid obligation; partial reserves explicitly **rejected**; partial payment may reduce outstanding.
- D05: savings are voluntary and adjustable, automatically roll forward; suggest release on deficit, never release automatically.
- D06: dynamic per-day guideline covers all discretionary purchases together; categories optional for later statistics.
- D07: original interview described splitting receipts/expenditures across months; **clarified by D21/D22**: primary input is complete remaining balance distribution, optional operation funding is separate; bank date remains separate.
- D08: future-period income must not inflate current-month daily forecast; next-month preview divides by all days in next calendar month.
- D09: original automatic contribution of previous free cash is **superseded by owner D23**: automatic month opening, proposed cash transfer requiring one-button confirmation; retain historical origin.
- D10: current-month budget can be negative; additional income/cash recharge/future allocation or savings release can cover deficit.
- D11: automatic start of month, manual review/close; close stores immutable original and revisions on later correction.
- D12: all financial changes and balances have history; late entry allowed; later observed balances are not overwritten.
- D13: regular payment templates propose creation upon start of new financial period or future-month income; user accepts/edits/skips.
- D14: PDF bank statements OPTIONAL, can be uploaded after close; proposal-based statement reconciliation without double debit.
- D15: v1 one bank card; later additional independent accounts/aggregate may be added. No cash ledger now.
- D16: one allowlisted user via Google OAuth; no public signup.
- D17: bank-like minimal UI built with MUI; light/dark/system; Russian/German/English.
- D18: change obligation amount with simple edit plus immutable event; separate paid vs cancelled, on cancellation release reserve to current free.
- D19: gentle stale checkpoint reminder after around 7 days, no mandatory daily tracking.
- D20: Codex in VS Code, Dark Factory-inspired **spec-first workflow**, not Claude-specific factory runtime.

## Owner clarification — 2026-11-01 (ADR was Proposed at this stage)

- D21: everyday workflow requires only actual card balance/date and a complete user-confirmed distribution of that balance among financial months. No purchases, expense totals, receipts, categories or explanation of net difference required. Sum(month balances)=bank balance in integer cents; no user suspense. Suggested values must be confirmed.
- D22: bank net change, allocation-state change and optional bank operations are separate facts. Negative budgets may represent advances while preserving the total. Optional split operation details/PDF evidence never repost a debit or silently replace confirmed distributions; K/U may exist internally only.
- D23: new month opens automatically; next-open proposal transfers remaining old-month cash ONLY after one-button confirmation (option A). Retain existing new-month funds once and preserve unpaid obligation/savings identities, full reserves, amounts and history. Transfer is internal; already confirmed unchanged bank need not be entered again; changed balance and full distribution can be confirmed together. D03 paid affirmation/warning remains in force.
- D24: no last-calendar-day checkpoint is required for closing/transfer. Close with either confirmed end balance or incomplete bank data: actual end balance unknown, last historical checkpoint/date, known allocation/obligation/savings states and completeness flag. No guessed month-end point, inferred zero spending or automatic month assignment of interval net. Original report survives later transfer/correction; reviewed new versions allowed. HB-002 details the contract.
- D25: normal daily forecast uses agreed current budget less obligations/savings, with future allocations isolated and no double subtraction. The physical-liquidity warning/final forecast formula for planning funds exceeding available cash remains OPEN for HB-003; no cap approved. These clarifications alone did not decide HB-020 MVP membership or accept ADR 0001; the later acceptance is recorded below.

Coverage: [HB1-001..020](../tests/scenarios/phase-01/hb-001-checkpoints-and-allocations.md); accepted technical decision: [ADR 0001](adr/0001-checkpoints-and-allocations.md). No application test execution is implied by a decision log entry.

## HB-001 acceptance — 2026-11-01

Owner reports independent review of ADR 0001 revision 2 and all 20 scenarios completed and approves the checkpoint-first model. Final clarifications retain Nov 28 as the last bank observation after a Dec 1 transfer without a new check, and prohibit reporting allocation deltas as actual spending/confirmed income without operation evidence. These clarify existing separation of observations, budget states and optional operations; no new liquidity policy is selected. Following local document/arithmetic verification, ADR 0001 is Accepted and HB-001 is Done as a specification task. Detailed historical contracts remain HB-002; forecast/liquidity edge remains HB-003.

No user personal details or confidential source document values are copied into this repository.

## HB-002 proposal prepared — 2026-11-01 (not an accepted decision)

[ADR 0002](adr/0002-month-closing-and-corrections.md) and [HB2-001..030](../tests/scenarios/phase-01/hb-002-month-closing-and-corrections.md) propose deterministic historical/knowledge cuts, explicit same-day order, immutable close versions and transfer concurrency/lineage. HB-002 is in Review; independent review and owner acceptance are pending. D21..D25 and Accepted ADR 0001 remain unchanged. [Q-HB2-02a/b/c](OPEN_QUESTIONS.md#hb-002-review-questions) present multiple-source/signed-carry options without selecting policy; no new forecast formula, implementation or owner decision is claimed.

## HB-002 owner UX clarification — 2026-11-01

- D26: ordinary month transition is one actual-check budget update: enter current card balance/date, review carry and complete distribution, confirm once. Save real checkpoint, full vector, transfer consent and existing obligation/savings funding history atomically. Example Nov28 B=90000,Nov=40000/Dec=50000,R[Nov]=30000 → Dec2 actual B=84000,Nov=0/Dec=84000,R[Dec]=30000,F[Dec]=54000. No artificial intermediate state or attribution of -6000 as a month's expense. D23 consent remains, now embedded in the primary update UX.
- D27: equal observed amounts still represent a new actual bank check/date; choose observation mode by what the user did, not amount comparison. Explicit redistribution/transfer-only may reuse a confirmed checkpoint and remains a technical alternative. Detect current period on website open; no background financial mutations. Unconfirmed visits do not change money. Carry can be deferred while a valid complete ordinary update is confirmed.
- D28: an untouched negative unrelated month alone does not invalidate carry. B=89000,Nov=40000/Dec=50000/Jan=-1000 → Nov=0/Dec=90000/Jan=-1000 is arithmetically valid; preserve that month's amount and earmarks. Review actual source/target/funding dependencies, not a global negative-month ban. Simultaneous multiple-source UX and negative source/target carry policy remain open; no HB-003 liquidity formula chosen.

These are explicit owner requirement clarifications, not acceptance of ADR 0002. The transfer-only emphasis in Accepted ADR 0001's month-opening section is addressed by a minimal proposed addendum in [ADR 0002](adr/0002-month-closing-and-corrections.md#owner-clarification-one-ordinary-budget-update); ADR 0001 is not edited. [HB2-031..038](../tests/scenarios/phase-01/hb-002-month-closing-and-corrections.md) cover this clarification. ADR 0002 stays Proposed, HB-002 stays Review; independent review pending.

## HB-002 fresh-start owner decision — 2026-11-01

- D29: past negative month allocation is a planning deficit, not a real unpaid obligation. At the first visit after a month change offer A CARRY or B FRESH_START with explicit user choice and neither default. B records consent NOT to carry past signed budget balances, a real fresh checkpoint and one complete active distribution; the old allocation revisions and deficits remain historical. B is not income/expense, a bank movement or forgiveness/payment of a liability.
- D30: B works in one atomic update after any number of missed months, without mandatory intermediate carries/checkpoints/closes. Synthetic example Nov20 2026 actual B=10000,A={Nov:-5000,Dec:15000};no December visit;Jan5 2027 actual B=8000,A={Nov:0,Dec:0,Jan:8000}. Keep both real observations, Nov deficit and December's last known allocation effective Nov20;Dec31 actual balance stays unknown. D=-2000 is not attributed as income/expense. No +5000 compensation or -15000 write-off is posted.
- D31: all existing unpaid obligations retain identity/origin/full outstanding reserve; all savings retain identity/amount unless separately explicitly changed/released. In B review/confirm their funding from affected old periods into the current period, with immutable history and no duplicate or disappearance. Full reserves persist even if fresh money is insufficient. The former negative/multiple-old-month carry gates do not apply to B; invalid data/authorization/revision conflicts still do. Detailed signed/multi-source proposal semantics under A remain for review; neither mode is automatically chosen.

Coverage: [HB2-039..046](../tests/scenarios/phase-01/hb-002-month-closing-and-corrections.md). This is explicit product approval of the fresh-start option, not acceptance of the entire ADR. Accepted ADR 0001 remains unchanged: its complete-vector model and technical carry examples coexist with this additional explicit non-carry decision. ADR 0002 remains Proposed, HB-002 Review; no new forecast formula or runtime implementation.

## HB-002 acceptance — 2026-11-01

The owner reports independent review of ADR0002 and all46 HB2-001..046 scenarios completed and explicitly approves the scoped architectural contract. After successful final local document/arithmetic checks,[ADR0002](adr/0002-month-closing-and-corrections.md) is Accepted and HB-002 is Done as a specification task. Earlier Proposed/Review entries above are chronological preparation records,superseded as current status by this acceptance.

Accepted:fresh actual card check and full confirmed distribution in one atomic update;no background monetary transfer;closing without a last-day check;unknown actual end balance remains null;immutable original reports;late corrections publish a new version only after confirmation. Past planning deficits are not unpaid liabilities. Explicit B FRESH_START works after one or several missed months,retaining all real unpaid obligations at full remaining reserve and all savings unless separately explicitly amended. A/B is never auto-selected. An unrelated untouched negative month alone cannot block otherwise permitted carry. Allocation differences are not confirmed income/expenses.

**Scope exclusion Q-HB2-02:**complex A CARRY with several past months or affected negative budgets is NOT approved. Future implementation must reject that unsupported A request with OWNER_POLICY_REQUIRED and zero financial writes until a separate owner decision and scenario approval. Do not invent its algorithm,require a per-missed-month transition chain or choose B automatically. Explicit FRESH_START remains available and must preserve full earmarks/history. Q-HB2-01 is resolved by this accepted contract;Q-HB2-02 remains open and is not a completion blocker for the scoped HB-002.

Evidence:[46 reviewed scenarios,acceptance trace and local checks](../tests/scenarios/phase-01/hb-002-month-closing-and-corrections.md). Independent review completion is owner-reported;local checks are not an additional independent/runtime review. Accepted ADR0001 is unchanged. Python is unavailable;Node equivalents do not claim execution of `scripts/check_agent_docs.py`. No app/dependencies/migrations introduced. HB-003 must still decide physical-liquidity warnings/final forecast without assuming a cap;Q-HB1-03 recurring-template MVP scope also remains open. One local HB-002 documentation commit is authorized;no push/PR.

## Actual-money allocation correction — 2026-11-01

The owner reviewed the allocation-error analysis,approved its correction in substance,and explicitly authorized editing all affected documents including previously Accepted ADR0001/0002. These statements supersede the erroneous earlier signed-A interpretation;Git history is not rewritten.

- D32: ordinary one-card B>=0 is distributed as A[p]>=0,sum(A)=B. Negative new A rejects even if its sum matches. F=A-R-S may be negative;deficit=max(0,-F)>=0 and daily=floor(max(0,F)/inclusiveDays). Full reserves persist and savings never release automatically. D10's negative-budget wording means free deficit,not negative distributed cash;D22's signed-A extension is replaced.
- D33: only actually observed money may be allocated to any financial month. Expected receipts do not enter B/A. A later real checkpoint may include received money without requiring an income operation. D07 split financing remains possible using existing money;optional signed operation details never repost cash.
- D34: ordinary CARRY moves nonnegative allocated cash and full R/S with consent,even if source F<0. FRESH_START confirms fresh actual B and full nonnegative A after missed months,preserving all history,obligations and savings. D28's untouched-negative-A exception and D30's signed initial example are replaced in active specifications;their original text is archival. No mode is auto-selected;simultaneous multi-source CARRY remains open.
- D35: no app/user financial records exist,so no migration,tables or legacy-conversion machinery is needed. Earlier negative-A examples survive only as archived interpretation or rejection fixtures. Historical reports/revisions remain immutable;no net difference or old negative A proves historical overspend. A separate historical-overspend feature,overdraft scope and cross-period earmark liquidity presentation require further decisions if needed. No automatic credit/debt mechanism is accepted.

Original HB-001/HB-002 completion and owner-reported review evidence are retained above and in Git. Their tasks are reopened to Review only for the allocation amendment;ADRs0001/0002 are Amendment Review until renewed independent review and owner confirmation. This is owner approval of the corrected requirement,not re-acceptance of amended contracts. ADR0003 remains Proposed,HB-003 Review. No runtime tests,commit,push or PR are authorized/claimed by this entry.

## Corrected ADR 0001 and 0002 re-acceptance — 2026-11-01

The owner confirms repeated independent review of the D32..D35 amendment and that all four subsequent findings are resolved. The corrected financial model is approved: [ADR0001](adr/0001-checkpoints-and-allocations.md) and [ADR0002](adr/0002-month-closing-and-corrections.md) are Accepted again;HB-001 and HB-002 are Done as documentation/scenario tasks. Review completion is owner-reported;this entry does not claim an additional local independent review or runtime tests.

Acceptance applies to B>=0,A[p]>=0,sum(A)=B,F=A-R-S,deficit=max(0,-F);full selected obligation reserves and retained savings may exceed A/B without creating cash or automatic reduction. Possible claims are included only when explicitly fully selected;unselected possible claims contribute0. Expected income never enters B/A before an actual bank check;income operations remain optional. CARRY/FRESH_START consent,full funding/history and no repeated debit are preserved. The four fixes clarify R/S semantics,possible-claim reservation flags,chronological February fixtures,and the separate negative-observation DTO without an invented allocation vector.

The original signed-allocation interpretation was erroneous and is superseded,not retrospectively validated. Earlier acceptance,reopening and document/arithmetic evidence remain preserved as chronology and in Git. Current evidence: [correction regressions and review-fix checks](../tests/scenarios/phase-01/hb-003-allocation-correction.md).

ADR0003 remains Proposed,HB-003 Review,Q-HB1-01 Open;no liquidity policy selected. Multi-source CARRY,overdraft allocation and a separate historical-overspend feature remain unapproved. HB-004 is not started. No app,dependencies,migrations,commit,push or PR are introduced by this status update.

## All-period safe main daily limit — 2026-11-01

- D36 (owner product decision for Q-HB1-01): choose option B. The main current daily limit must protect all existing fully selected unpaid obligations and retained voluntary savings across every financial period,regardless of due date,and must not reuse money allocated to other months. The ordinary current-month budget guideline may be secondary,but cannot replace the main safe estimate. B10000,A={Nov:10000,Dec:0},reserved December unpaid20000 gives obligation shortfall10000,safely available0,main daily0.
- Protection does not move funding periods,change due dates,status,reservation selections or savings,and does not invent bank debits or November expenses. Financing period,due date and actual bank debit date remain separate. Possible claims enter R only under the existing full-reservation selection rule. Expected income remains excluded;no income/expense operation is mandatory.
- Exact mathematics is proposed for review in [ADR0003](adr/0003-daily-forecast-and-liquidity.md):protect max(A[p],R[p]+S[p]) for each other period plus current R/S,and floor the nonnegative residual over inclusive remaining days. The proof,numerical fixtures,shortage labels and pure DTO require independent review;this decision selects product behavior,not final acceptance of that formula or ADR0003.

ADR0001/0002 remain Accepted,HB-001/002 Done. ADR0003 stays Proposed,HB-003 Review;Q-HB1-01 presentation choice is resolved to B while formula verification remains open. Multi-source CARRY,overdraft allocation and a historical-overspend feature are not approved;HB-004 not started. Earlier statements that no liquidity presentation was selected are historical stages superseded by D36. No implementation,commit,push or PR.

## HB-003 stale data and informational warnings — 2026-11-01

- D37 (owner choice A):a coherent last confirmed financial state continues to produce the displayed safe daily estimate even when old. Use current Europe/Berlin asOfDate for remaining days;show the real last bank-check date,an explicit older-data label and a gentle Update balance action. Never claim today's observed cash or invent checkpoints/operations. No valid confirmed state means unavailable,not a fabricated0. Calendar opening alone never executes CARRY/FRESH_START;current month uses only its confirmed allocation and explicit transitions.
- D38 (owner choice A):shortage,underfunding and bank-data-age warnings are visible information. No acknowledgment button,view blocker or repeated confirmation on site open. Warnings never mutate bank/allocation/reserve/savings state. Group overlapping comparisons without adding or repeating identical shortage amounts. Explicit confirmation/authorization for actual financial actions remains mandatory,including updates,allocation/lifecycle edits and CARRY/FRESH_START.
- D39 (owner choice A):ageDays is the number of Berlin calendar dates between observedDate and current asOfDate;showReminder iff ageDays>=7. Nov20→Nov26 age6:no reminder;Nov27 age7:show;Nov28 age8:keep showing. Count civil dates across DST,not elapsed milliseconds divided by24 hours. This is a gentle in-app reminder,not a required bank check,background bank polling,money action or push-notification system.

D36 safe-main formula remains unchanged. HBL-018 is corrected to independent CARRY/FRESH_START alternatives from the same base,with distinct consent/requests and retained obligation/savings identity. These UX decisions close the remaining owner product questions within HB-003;final independent review and explicit acceptance are still pending. ADR0003 remains Proposed,HB-003 Review;ADR0001/0002 Accepted,HB-001/002 Done. HB-004 is not started;multi-source CARRY,overdraft allocation and historical-overspend features remain outside approval. No implementation,commit,push or PR.

## HB-003 final acceptance — 2026-11-01

The owner confirms final independent review and explicitly accepts [ADR0003](adr/0003-daily-forecast-and-liquidity.md),including the safe-main mathematical model D36 and UX D37..D39. Three final editorial fixes are incorporated:HB3-010 asserts the selected cross-period safe formula,C01..C08 are accepted-policy scenarios,and F-003 explicitly uses already received December funds inside a real confirmed full balance. Review completion is owner-reported;no additional local independent review or runtime test execution is implied.

ADR0003 is Accepted,HB-003 Done,Q-HB1-01 resolved within this specification scope. The contract is B>=0,A[p]>=0,sum(A)=B,E=R+S,protected=E[current]+sum(max(A[p],E[p])) over other periods,L=B-protected,safeAvailable=max(0,L),mainDailyLimit=safeAvailable div inclusive Berlin remaining days. Full selected unpaid obligations and retained savings can exceed A/B;possible claims count only when explicitly fully selected. Budget F/deficit/guideline stays separate,no expected income or duplicate bank debit enters the state.

Accepted UX:display old valid-state estimates with true dates and old-data label;warnings are informational/grouped without acknowledgment or view blocking;reminder iff Berlin civil age>=7. Unknown/incomplete/negative-bank states have no fabricated numerical limit. HBL-018 uses alternative CARRY/FRESH_START branches from one original revision,never sequential double transition. History/identities/explicit financial consent are preserved.

Original drafts,erroneous signed-allocation interpretation,corrections D32..D35,prior acceptance/reopening and all dated verification remain archived and in Git;this final acceptance does not retroactively validate earlier mistakes. Current reviewed cases and exact local evidence:[HB3](../tests/scenarios/phase-01/hb-003-daily-forecast.md),[HBL](../tests/scenarios/phase-01/hb-003-safe-liquidity.md).

ADR0001/0002 remain Accepted,HB-001/002 Done,HB-004 Planned and not started. Q-HB1-03 recurring-template MVP membership,Q-HB2-02 multi-source CARRY,Q-HB3-02 overdraft allocation and Q-HB3-03 historical overspend remain open;none is approved by HB-003 completion. No application,migrations,dependencies,commit,push or PR.
