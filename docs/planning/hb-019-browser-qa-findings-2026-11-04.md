# HB-019 / HB-019.1 — browser QA findings, 2026-11-04

**Current final status (2026-11-05): HB19-UX-01–07 corrected and accepted;
HB19-UX-08 / Q07 OPEN / NOT REPRODUCED.**
HB-019 = **Done / Owner Accepted**; HB-019.1 = **Planned P0**.
Owner-reported independent review of the final pending-correction ZIP is APPROVED
(0/0/0/0). [Final acceptance and retained verification limits](hb-019-verification.md#documentation-finalization-and-owner-acceptance--2026-11-05).
The OPEN/Review labels in the dated register and implementation evidence below
are their historical states, retained unchanged; current dispositions follow.
Source: owner-supplied manual QA narrative dated 2026-11-04. **Owner observed;
no independent rerun.** No screenshot files were supplied to this repository;
the descriptions below are textual evidence, not links to existing images.

**Owner implementation authorization, 2026-11-05:** A1 financial changed/unchanged
summary followed by complete grouped readable confirmations; A2 selected accepted
history first for CLOSED, latest default, with active distribution below in an
initially collapsed, dated, explicitly nonhistorical context. These resolve the
presentation direction in OPEN-01/04, not evidence of runtime success. Exact
coverage must still be proved. Acceptance dates may be omitted if unavailable
through current read contracts (OPEN-02); no cosmetic API/schema expansion.
HB-019 corrections only are authorized; HB-019.1 remains Planned. Findings stay
OPEN until actual verification links are recorded; no commit/publication approval.

## Provenance and limits

At documentation start, local branch `feat/hb-019-month-closing-versions-rollover`,
HEAD and tag `hb-019-before-ux-corrections` both resolved to
`98f8890c07bbea7f102d2d4de18f837a713daf74`; `git status --short` was empty.
The 48-file checkpoint is preserved. That documentation stage made uncommitted documentation
changes only, added no runtime evidence and granted no implementation permission.

Owner runtime provenance only: `http://localhost:3007`, synthetic Docker PostgreSQL
`hb019-20261104-isolated`, `127.0.0.1:52676 -> 5432`. Neither runtime, Docker nor
database was accessed for this task. No external/production/OAuth data was used.
Earlier automated results in [verification](hb-019-verification.md) belong to
their recorded source fingerprint; they are not a current full-gate PASS.

### Observed sequence (owner report; values are synthetic EUR cents)

| Step | Owner observation | What it establishes / does not establish |
|---|---|---|
| A | Latest actual check Nov04 B=100000; active A={Oct:0,Nov:100000}; R/S=0 | UI displayed current November state; not independent PG inspection |
| B | October v1 saved without an October observation; Oct31 balance unknown, R/S=0 | Initial incomplete-data close was demonstrated; no invented checkpoint was reported |
| C | New reason `2222`, same facts: server refused a new version | No-change refusal observed; not exhaustive replay/race/rollback proof |
| D | Through ordinary Update budget, actual backdated Oct31 B=90000 with complete V={Oct:90000} saved; one UUID displayed twice | Success UI and duplicate presentation observed; not evidence of duplicate writes |
| E | Latest displayed check stayed Nov04 B=100000, active Nov A=100000 | Current head retention observed in this case, not a rule that all historical updates can never affect current state |
| F | Historical changes detected; v1 retained, before/after preview, four pages plus explicit consent, then v2 and two version links | Partial happy path demonstrated; neither reload/relogin durability nor PG state independently checked |
| G | v2 showed Oct31 B/A/F=90000,R/S=0; upper Dashboard showed active Oct A/F=0 and “Исторический отчёт здесь пока недоступен” | Conflicting presentation/data bases; not inconsistent arithmetic or broken storage |
| H | Reload/relogin and PG assertions after v2 not performed | OPEN / NOT EXECUTED |
| I | Browser React error near /savings and /months despite GET 200 | Render/navigation error observed; stack, cause, exact triggering route and HB-019 ownership unproven |

Exact owner-reported console message:

```text
[browser] Error: This library called use() to suspend in a previous render
but did not call use() when it finished. This indicates an incorrect use
of use().
```

## Findings register

Severity reflects demonstrated comprehension/workflow risk. No Critical, data
loss, wrong D36 calculation, duplicated DB event or authorization breach is
claimed. Every entry below is **OPEN**. High findings must be corrected/reviewed
for HB-019 acceptance; Medium findings remain explicit review items, not silently
waived. HB-019.1 requirements are broader planned work and do not block HB-019
completion as a whole; the closed-month conflict itself stays in HB-019.

### HB19-UX-01 — High · meaningful correction summary · HB-019

- **Observed / text evidence:** v1 unknown versus v2 900 EUR is buried in a long
  history comparison. Surface: `month-closing-screen.tsx` Summary/Details and
  `review-content.ts`; screenshot description: multiple before/after/source rows
  around the same 900 EUR, without a concise changed-items-first narrative.
- **Risk:** consent to a historical version without understanding its financial
  and provenance changes. This is a presentation risk, not a false bank figure.
- **Proposed acceptance:** leading changed-items summary: end balance on Oct31
  unknown -> 900 EUR; allocation unknown -> 900 EUR; free unknown -> 900 EUR;
  check absent -> Oct31; correction basis/date. R/S remain zero and are marked
  unchanged, not highlighted as new facts. Distinguish unknown, known zero and no
  record. A final-day check does not prove complete operations; Nov04 minus
  Oct31 is not confirmed income/expense. Equal-money source changes remain
  significant and visible. Planned proof: **HB19-Q02/Q03**, extends A04/C02/E02.

### HB19-UX-02 — High · grouped provenance without lost evidence · HB-019

- **Observed / text evidence:** repeated “Подтверждение проверки карты” and
  “Подтверждение распределения” plus repeated amounts. Surface: EvidenceReview,
  `review-content.ts`, `review-difference.ts`. The precise duplication mechanism
  is a source-inspection hypothesis; independent events are not duplicates.
- **Risk:** user reads several representations of one fact as separate money.
- **Proposed acceptance:** four layers: financial result; linked confirmations
  serving as sources; expanded history/audit; optional machine diagnostics.
  Group repeated representations by meaning with provenance links; retain every
  independent event, old/new ref, order and before-state. No storage deduplication,
  altered digest or hiding meaningful evidence behind optional diagnostics.
  Complete immutable trail/exact comparison remains accessible and bounded.
  Planned proof: **HB19-Q02/Q05**, extends A11/E03/R07.

### HB19-UX-03 — High · contextual values, no machine-field review · HB-019

- **Observed / text evidence:** primary comparison included raw cents `90000`,
  service numbers and vague repeated labels. The supplied findings also require
  protection against JSON paths/UUID/SHA/`absent/object/null` and damaged `?`
  strings; not every prohibited token was independently observed on every locale.
  Surface: review model, screen and RU/DE/EN messages.
- **Risk:** unreadable evidence or confusing cents, counters, unknown and zero.
- **Proposed acceptance:** format money as EUR (RU e.g. 900,00 €), contextualize
  missing record, unspecified time and unknown balance separately; define labels
  from actual field semantics. No raw paths, IDs, hashes, protocol/schema numbers
  or unexplained service values dominate primary review. Technical raw values
  belong only in marked diagnostics (“internal values / euro cents” if relevant),
  without inventing meanings. Full account-scoped proof remains accessible.
  Planned proof: **HB19-Q02/Q05**, extends E01/E03/E05.

### HB19-UX-04 — Medium · explain mandatory page gate · HB-019

- **Observed / text evidence:** disabled checkbox at 1/4 enabled after all four
  pages were visited. The gate worked; its prior explanation was insufficient.
  Surface: EvidenceReview/Details progress and consent controls.
- **Risk:** apparent dead end or blind paging instead of informed review.
- **Proposed acceptance:** visible “Просмотрите все 4 страницы подтверждений;
  просмотрено 1 из 4”, readable section titles, back/next, keyboard focus and
  screen-reader progress. 4/4 makes consent available, never checks it or confirms
  automatically. All other required sections must also be read. Pinned H/K/head,
  digest, bounds, stale/TOCTOU checks remain. Changed candidate or lost local
  review invalidates page credit/consent; never mix credit across previews.
  Planned proof: **HB19-Q03/Q05/Q06**, extends E02/E04/R01/R07.

### HB19-UX-05 — Medium · phase-aware actions and messages · HB-019

- **Observed / text evidence:** reason + “Просмотреть закрытие” offered on v1
  without meaningful changes, producing correct no-op rejection. Source confirms
  the form is offered in CLOSED state; `noChange` is presented as an error.
- **Proposed acceptance:** neutral “Нет новых исторических изменений. Версия 1
  сохранена”; no misleading new-version invitation. For pending changes:
  “Версия 1 сохранена. Можно подготовить версию 2” and “Просмотреть изменения
  для версии 2”. Require reason; confirm names proposed version; success says
  which version was saved, preserving links to both. A reason-only change never
  creates v2; authoritative no-op/stale/concurrent/replay guards remain.
- **Action semantics verified in source:** update button is a Link to
  `/update-budget`, a separate financial update, unnecessary for simple close.
  Refresh button invokes `load()` and clears local review/consent, not a financial
  write. Name/explain it as reread/review, not cash update. Warn only for actual
  unsaved reason/review or unresolved outcome, clearly distinguishing those from
  already saved versions; clean navigation needs no false warning. Unknown COMMIT
  keeps original request/status/retry semantics. Proof: **HB19-Q01/Q06**.

### HB19-UX-06 — High · closed history primary, active allocation distinct · HB-019

- **Observed / text evidence:** upper selected-October A/F=0 with “historical
  report unavailable here”, lower v2 A/F=900 EUR. `src/app/months/page.tsx`
  composes DashboardScreen before MonthClosingScreen; `dashboard.pastBasis`
  contains the misleading sentence. This explains presentation, not DB damage.
- **Proposed acceptance:** closed past month leads with accepted historical
  version (latest by default; explicit old selection respected). Active Oct
  allocation anchored on Nov04 is a separate subordinate, accurately labelled
  current distribution if shown; do not overwrite either source. No “report
  unavailable” claim when one exists. Unknown v1 never borrows November B100000.
  General Overview redesign belongs to HB-019.1. Proof: **HB19-Q04**, extends
  C03/C14/E07 and clarifies HBUX-027's two data bases.

### HB19-UX-07 — Medium · selected vs latest version · HB-019

- **Observed / text evidence:** “Версия 1” and “Версия 2” links exist after save;
  latest/previous roles and accepted metadata need clearer presentation.
- **Proposed acceptance:** latest v2 default; v1 explicitly selectable with its
  original unknowns. Show clear chronology, selected accessible state and labels
  “Версия 2 — последняя принятая” / “Версия 1 — предыдущая”. Date/reason only
  from trustworthy existing data: current MonthView version-list entries expose
  version/id, not acceptance time. Never derive acceptance time from bank date or
  client clock; availability and bounded read-only presentation need review.
  Version choice cannot change active B/A/R/S. Proof: **HB19-Q04/Q05**, extends E07.

### HB19-UX-08 — Medium provisional · React suspension error · scope pending

- **Observed:** exact log above, GET 200 near /savings and /months; no stack.
  Candidate surfaces: route composition, shared Suspense/providers, use(), version
  navigation; no component/library has been proven responsible.
- **Risk / proposal:** possible workflow interruption; High only with demonstrated
  blocking impact. After separate implementation authorization, reproduce
  `/savings -> /months -> /months?period=2026-10 -> versions`, capture stack/build/
  locale/context and identify the component/library before a narrow correction.
  Do not suppress the error, upgrade dependencies or change architecture on
  speculation. If outside HB-019, obtain owner scope disposition. Real-browser
  regression and component regression where meaningful. **HB19-Q07**, OPEN,
  NOT REPRODUCED independently; HTTP 200 is not render correctness.

### HB19.1-UX-01 — Medium · distinct Overview and Months · HB-019.1

- **Observed / text evidence:** overlapping Dashboard blocks make pages look like
  clones with different buttons. Surface: DashboardScreen, `/` and `/months`.
- **Proposed acceptance:** Overview prioritizes current cash, Update budget, D36
  safe daily limit, check age and aggregates. Months prioritizes selected period,
  historical result/version/close and explicit transition entry. Same financial
  read model, distinct page purpose; no duplicated formulas or hidden writes.
  Proof **HBUX-033**, plus HBUX-026–032; Planned, not HB-019-wide redesign.

### HB19.1-UX-02 — Medium · noncurrent cash attribution · HB-019.1

- **Observed:** October selection led with Nov04 1000 EUR. Not an incorrect latest
  bank value; incorrect implied month association. Surface: Dashboard hierarchy.
- **Proposed acceptance:** section 1.1 of the existing plan governs CURRENT,
  PAST and FUTURE. Closed past uses the accepted historical version as primary;
  latest card is dated and secondary. Unclosed unknown end balance stays unknown.
  Future allocation is confirmed planning, not current B or expected income as
  future bank cash. Proof **HBUX-026–032** (retained; no duplicate case);
  closed-page immediate correction remains **HB19-Q04 / HB19-UX-06**.

### HB19.1-UX-03 — Medium · historical preview vs current guidance · HB-019.1

- **Observed / text evidence:** adding Oct31 900 EUR showed prominent safe daily
  37,03 EUR based on Nov04 1000 EUR. No wrong D36 arithmetic is established.
  Surface: budget-updates Review / server-supplied financial projection.
- **Proposed acceptance:** primary proposed historical check/distribution, separate
  secondary current November guidance with its actual anchor/date. In this case
  current Nov head stays unchanged and affected historical report becomes pending,
  not automatically v2. Exact impact follows existing H/K/anchors; do not promise
  all historical commands leave current state unchanged. No D36/ALL_PERIOD_MAX_V1
  change or inferred proceeds. Proof **HBUX-034**.

### HB19.1-UX-04 — Medium · one human-readable success · HB-019.1

- **Observed:** same UUID appears in success banner and read-only result card.
  Source confirms `receipt.updateId` is rendered in both. This proves duplicate
  presentation only, not two saves or duplicated audit.
- **Proposed acceptance:** one clear success “Проверка от 31 октября сохранена:
  900 €”, with actual date, distribution month and saved state. UUID secondary
  diagnostics only; preserve request recovery and saved-but-refresh-failed state.
  Proof **HBUX-035**, existing HBUX-023 still covers replay/auth.

### HB19.1-UX-05 — Medium · explicit update/transition paths · HB-019.1

- **Context:** owner requires clearer ordinary/FRESH_START/CARRY/DEFER journeys;
  this is not new permission to redesign the finance engine.
- **Proposed acceptance:** retain D40–D45, full actual vector, explicit nondefault
  choices, voluntary savings, history and Q-HB17-01 option A (same identity:
  transfer first, later separately confirmed lifecycle edit). No hidden split
  writes, cash-flow inference, automatic savings or forced close. Reuse
  **HBUX-001–025**, with **HBUX-036** for screen/action semantics.

## Correction slices and planned proof matrix

### Source-inspection notes (not a runtime diagnosis)

| Field / surface | Meaning verified in current source | Presentation constraint |
|---|---|---|
| `eventIndex` | `audit-writer.ts` assigns the zero-based index while mapping entries in one update's audit document set; closing reader requires report-version index0 and head index1 | Not a bank operation number or independent monetary fact |
| Audit `schemaVersion=1` | Version of the exact audit document shape validated by `closing-reader.ts` | Not version1 of the user's report; keep raw schema values diagnostic |
| `recordedSeq` / `knowledgeCut` | `commit.ts` advances account commit sequence; closing reader bounds visible evidence by the knowledge cut | Not wall-clock time, money or calendar date; do not turn a displayed3 into a timestamp |
| Actual acceptance timestamp | Closing writer persists `closedAt=batch.recordedAt`; current client version-list DTO exposes version/id only | Existing authoritative data exists, but read availability must be traced/bounded before adding display copy; never infer from bank date |
| Raw value `90000` | Canonical integer EUR cents where the field is known to be money | Format900 EUR; a numeric field with unknown type must not be guessed as money |

The exact path behind the owner's label “время учётной истории 3” is not known
from the narrative. The sequence definition above is a verified candidate
explanation, not attribution of that specific screenshot label. Identify its
actual source before implementing a replacement. Generic React performance
guidance is not evidence that Suspense/use() caused this failure.

All new cases are **Planned / NOT EXECUTED**, not new finance mapping PASS entries.
U = pure/presentation unit; C = component; P = real isolated PostgreSQL;
B = real authenticated app browser; A = keyboard/physical assistive technology.
Mocked component or direct-repository browser harness does not substitute for B/P.

| Owner / slice | Acceptance criteria (bounded slice) | Scenario / verification layers |
|---|---|---|
| HB-019 summary + presentation | Changed-items summary; four groups; contextual values; exact meaningful-ref coverage; no financial mutation | Q01/Q02/Q05; U/C/P/B/A |
| HB-019 review + phase actions | Visible page gate; pinned snapshot; invalidation; correct no-op/success phases; dirty vs saved recovery | Q01/Q03/Q06; U/C/P/B/A |
| HB-019 closed page + versions | Historical primary; active secondary; latest default/explicit old selected; truthful metadata; immutable/read-only | Q04/Q05; C/P/B/A |
| Scope pending render diagnosis | Reproduce; capture stack; prove cause/ownership; minimal approved fix; browser/component regression | Q07; B/C where applicable |
| HB-019.1 general UX | Distinct page purpose; noncurrent hierarchy; historical/current preview separation; single success; explicit transitions | HBUX-026–036 plus existing 001–025; separate slices in HB-019.1 plan |

Existing coverage retained: all 91 base HB19 cases, all 46 HB2 mappings,
F-009/F-013, R03 owner-amended acceptance, source/report/wire/work/audit/chain
bounds, replay/unknown COMMIT, PG rollback/race/DST/authorization, final gate.
New Q cases specify narrower UI regressions, reusing these proofs; they do not
replace them or claim they ran on this documentation state. Finance mapping and
required-verification guard are deliberately untouched in this task.

## Open review questions and next-stage boundaries

1. **OPEN-01:** approve grouped visible review with an explicit coverage mapping
   from each significant changed source/order/evidence item to mandatory readable
   content. Optional raw diagnostics cannot earn review credit or conceal meaning.
   If complete bounded display cannot be proved, confirmation must stay blocked;
   return with a scoped proposal, not relaxed consent/digest/resource guards.
2. **OPEN-02:** acceptance-date availability in existing report/read DTOs must be
   traced before promising per-version dates. A narrowly scoped authenticated,
   bounded read-only presentation adapter may be proposed; domain/storage/contract
   changes beyond existing data require separate proven need and owner approval.
3. **OPEN-03:** reproduce React error and establish ownership/impact. No independent
   diagnosis or severity escalation from an unattributed console line.
4. **OPEN-04:** owner/independent reviewer must approve the page composition/copy
   and scope split before separate implementation authorization. No new financial
   question is decided here; D36, D40–D45 and option A remain authoritative.

Future authorized implementation must preserve owner/account auth before every
read/action/replay, H/K/head/digest binding, exact int64 cents, Berlin dates,
immutable versions, source completeness, resource limits and atomic rollback.
Run current-source isolated synthetic PG and real application browser E2E,
locales/mobile/a11y and the full final gate after the last correction. Report
all NOT EXECUTED, new source fingerprint and limitations honestly.

Related documents: [HB-019 plan](hb-019-month-closing-versions-rollover.md),
[HB-019 scenarios](../../tests/scenarios/phase-01/hb-019-month-closing-versions-rollover.md),
[verification chronology](hb-019-verification.md),
[HB-019.1 plan](hb-019-1-budget-update-ux.md),
[HB-019.1 scenarios](../../tests/scenarios/phase-01/hb-019-1-budget-update-ux.md),
[task register](../TASKS.md).

## Documentation-only verification and handoff

Checks completed on 2026-11-05 (Europe/Warsaw); the manual QA record and finding
date remain 2026-11-04. This is not new runtime verification.

- `git diff --check`: exit0, no whitespace errors. Warnings only: existing Git
  LF-to-CRLF policy for the changed HB-019 plan/report/scenario files.
- `python scripts/check_agent_docs.py`: exit1; PowerShell reported
  `The term 'python' is not recognized`. The Python script did **not** execute;
  no interpreter was installed and no configuration was changed.
- Read-only Node equivalent of that inspected bootstrap script plus scoped
  documentation assertions: exit0. Exact success output:

```text
Documentation scope OK: 6 modified Markdown files, 1 new findings register; index empty.
UTF-8, whitespace and local link targets OK: 7 files.
Scenarios OK: 91 base HB19 cases + 7 planned Q cases; HBUX-001..036 unique; 46 HB2 mappings unchanged.
Bootstrap documentation OK (Node read-only equivalent): 22 core files, 10 Codex skills, architecture JSON.
Runtime / PostgreSQL / browser / Docker / finance gate: NOT EXECUTED.
```

The Node check read the Python REQUIRED/SKILLS lists, checked file/frontmatter
and seven architecture layers; it also checked the seven-path allowlist, one
new document, empty index, UTF-8/whitespace/local-link targets, scenario IDs and
unchanged HB2 mapping rows against HEAD. It did not run financial tests or
validate current finance receipts. An initial inline Node command failed with
`SyntaxError: Unexpected end of input`; rerunning the read-only assertions via
ASCII stdin succeeded without file changes. Git additionally warned that the
global ignore file `C:/Users/Denys/.config/git/ignore` was inaccessible; local
repository status/checks completed. No suppression or config edits were made.

Diff for independent review: six existing Markdown files add the scoped plans,
owner-evidence chronology and regressions; HBUX-027 is clarified for historical
priority; this is the only new document. All 13 findings remain OPEN. Actual
source/runtime/tests-TS/JSON/schema/package/finance mapping files are unchanged
from the checkpoint, and no paths are staged. HEAD/tag remain the checkpoint;
no additional commits/publication. HB-020/HB-021 remain Planned P0 and accepted
HB-001–018 statuses are untouched. Stop here for owner/ChatGPT review.

## Implementation evidence — 2026-11-05

Owner A1/A2 authorized HB-019 corrections. [Actual verification and qualifications](hb-019-verification.md#hb-019-ux-correction-a1a2--actual-verification-2026-11-05) records fingerprint `6974c9cd2e5c04a8357e32d5ff89768394c0b542f6ccbe43ac30027798746aa3`: UTC957, PG436, timezone552, DB171, lint/typegen/build/typecheck/finance exit0; 9 separate-Chrome component/repository cases. This does not claim authenticated Next/Google/relogin, physical AT or200% browser zoom.

| Finding | Delivered files / executed evidence | Review status |
|---|---|---|
| UX-01 | ChangeSummary; Q02 component; new Q01/Q02/Q04 PG | Implemented; OPEN for independent UX review |
| UX-02 | grouped-review total coverage and same-context dedup; Q02/Q05 U/C | Implemented; OPEN for independent UX review |
| UX-03 | review-content contextual EUR/null, service metadata grouped; Q02/Q05; RU/DE/EN Chrome | Implemented; OPEN for independent UX review |
| UX-04 | all-page progress/unchecked consent/fail-closed coverage; existing E02/E04/E07 plus Chrome paging | Implemented; OPEN, physical AT pending |
| UX-05 | neutral no-change, phase/version actions, stale/reset/exact outcome; Q01/Q06/E04 component and PG no-op/replay | Implemented; OPEN for independent UX review |
| UX-06 | CLOSED page composition + collapsed active context; Q04 page/component/PG, Chrome historical fixture | Implemented; OPEN, authenticated app proof pending |
| UX-07 | latest/selected/previous roles, descending/deduplicated links including off-page73/61; Q04/E07 | Implemented; OPEN for independent UX review; acceptance date intentionally omitted |
| UX-08 | No authenticated app session/stack; synthetic harness cannot reproduce route/Suspense failure | OPEN / NOT REPRODUCED, not FIXED |

OPEN-01 has executable coverage mapping evidence, still needs independent review. OPEN-02 is resolved by owner-approved omission of acceptance dates; no API/schema expansion. OPEN-03 remains unattributed React diagnosis. OPEN-04 remains owner/ChatGPT review, not a new implementation question about A/A. All HB19.1 findings stay Planned and were not implemented. Checkpoint/tag preserved, changes unstaged/uncommitted, no publication.

## Final dispositions — Owner Acceptance 2026-11-05

Owner confirmed completion of manual testing and accepted HB-019. Separately,
the owner reported independent ChatGPT static review APPROVED (0/0/0/0) for
`HB-019-pending-correction-20261105.zip`, SHA-256
`e5ff2dff103e376516833592cd69912ffc1e7ffbcc2a6e41207c27e941dc89b4`.
These are acceptance/review evidence, not new Codex runtime executions.

| Finding | Final disposition |
|---|---|
| HB19-UX-01 | Corrected / accepted |
| HB19-UX-02 | Corrected / accepted |
| HB19-UX-03 | Corrected / accepted |
| HB19-UX-04 | Corrected / accepted; physical AT remains NOT EXECUTED |
| HB19-UX-05 | Corrected / accepted, including the NO_REPORT_CHANGE pending correction |
| HB19-UX-06 | Corrected / accepted; authenticated app E2E is not newly claimed |
| HB19-UX-07 | Corrected / accepted; acceptance-date omission retained |
| HB19-UX-08 / Q07 | **OPEN / NOT REPRODUCED**; no root-cause/fix claim |

OPEN-01/04 review/acceptance conditions are satisfied by the reported independent
APPROVED and Owner Acceptance; OPEN-02 remains resolved by date omission;
OPEN-03 remains open. HB19.1-UX-01–05 stay Planned, not implemented here.
Google/relogin authenticated E2E, physical AT, actual200% zoom and browser checks
not repeated on the accepted final fingerprint remain NOT EXECUTED. Previous
Chrome9/9 stays historical, not final authenticated E2E. No new tests or Git
publication are implied by these dispositions.
