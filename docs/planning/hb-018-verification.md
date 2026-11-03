# HB-018 — local implementation verification

## Owner Acceptance — 2026-11-03

Владелец окончательно принял HB-018 **2026-11-03** после повторного независимого
ревью ChatGPT R1: **APPROVED; Critical 0 / High 0 / Medium 0 / Low 0** (со слов
владельца). HB-018 переведена из Review в **Done**.

Medium 1 исправлен: чистая форма получает свежий серверный seed, подтверждённый
receipt сохраняется, dirty draft и исходные requestId/payload при unknown outcome
не сбрасываются; изоляция owner/account и отсутствие автоматического submit
сохранены. Исправление подтверждено шестью component-регрессиями в
[budget-draft-lifecycle.test.tsx](../../tests/budget-draft-lifecycle.test.tsx).
Фактические результаты R1 сохранены: **861 unit/component, 332 PostgreSQL,
509 timezone и 22 дополнительных LA**. Это ранее выполненные Codex проверки,
а не новые прогоны при документационной финализации и не выполнение тестов ChatGPT.

**Принятые ограничения:** browser QA **B01–B07 не выполнялись**, физический
screen reader не проверен из-за недоступности runtime. Владелец сознательно
принимает этот остаточный риск. Эти проверки не объявляются PASS; unit/component/
PostgreSQL не заменяют browser evidence. Все сценарии HB-018 не объявляются
выполненными. History cursors остаются **process-local**: смена процесса или
перезапуск может инвалидировать cursor; безопасный отказ требует обновления
истории. Ранее принятое ограничение **HB17-A03** сохраняется без изменения и
не объявляется исправленным.

**Owner Acceptance разрешает завершение документационного этапа, но сама по себе
не является разрешением на публикацию.** Commit, push, PR, merge и deploy требуют
отдельного разрешения владельца.

Ниже без изменения сохранены исторические implementation/R1 отчёты и evidence.
Их формулировки Review/pending относятся к соответствующим этапам; текущий
статус определяется настоящим Owner Acceptance. Утверждённые план/сценарии,
финансовые правила, Accepted ADR, исходники, тестовые реализации, БД, зависимости
и конфигурация при этой финализации не меняются.

## Documentation finalization checks — 2026-11-04

Owner Acceptance date remains **2026-11-03**, as explicitly supplied by the owner;
documentation checks completed after local midnight on2026-11-04.

Only TASKS, DECISIONS, this report and two existing normative SHA values in
`tests/finance/coverage.json` changed relative to the start of finalization.
All447 other captured repository files remain byte-unchanged, including every
implementation/test file and the approved plan/scenarios. Prior report sections
and decisions are byte-preserved. Both review ZIPs still match their original
SHA256 sidecars; evidence, receipts, local files and `.vscode/` were not modified
or removed. No commit/push/PR/merge/deploy or publication was performed.

Document checks: **81 local link targets and14 anchors, strict UTF-8 and trailing
whitespace checks — PASS**. `git diff --check` passed; the untracked verification
report was checked explicitly too. The existing `sourceContexts` mechanism computed
the updated TASKS/DECISIONS digests; only those two hashes were replaced, with no
mapping, scenario, test-history or gate-policy change. Current `validateManifest`
validation passed. Targeted `vitest run tests/finance-coverage.test.ts` passed
**84/84** (one file); its expected negative-fixture gate rejections are not failures.

The existing CLI `check` was also rerun successfully in the **unchanged original
R1 verification copy**, against its preserved run and receipts: **PASS**,498
foundation scenarios (442 required/54 partial/2 deferred),680 obligations,951
references,861 unit/332 PostgreSQL/509 timezone. This checks the retained R1
execution snapshot, not a new full run against changed documentation. Current
document hashes were validated separately as above. The CLI binds execution to
its original source/context fingerprint and freshness window; neither that
fingerprint, report timestamps nor receipts were rewritten or rebound to the new
documentation. No fresh full-suite execution PASS is claimed for finalization.
Full unit/PostgreSQL/timezone suites, build and live browser/OAuth checks were
not rerun for these documentation-only changes. B01–B07/screen reader remain
owner-accepted NOT EXECUTED and HB17-A03 remains unchanged.

## Correction R1 — owner decisions and scope

**Status remains Review.** The owner reports independent ChatGPT review with two
Medium findings: **Medium 1 must be corrected**; **Medium 2 is accepted by the owner
as a known residual risk**. This is not final acceptance, Done, or permission to
publish. R1 requires repeat ChatGPT review and final owner acceptance.

Medium 1 root cause: provider values outlived the form, and
`useBudgetState('seed', initialSeed)` only initialized an absent key. A completed,
clean session therefore reused the old seed/form when a new server seed arrived.
New component regressions reproduced this before the fix:2 failures (old500.00
instead of new600.00) and4 passes, without changing financial expectations.

Correction: `openBudgetSession` initializes a clean session from fresh server props
on opening/remount or a new seed/scope. It clears old edits/review/consents and
temporary request state while retaining the confirmed receipt, copied history and
read-failure metadata. Dirty, pending, busy, unknown-outcome and access-lost
sessions remain protected; they are not automatically rebased. Owner/account
changes still bind a new isolated store. No load/preview/confirm/status call is
created by reconciliation. All HB-017 domain/writer/payment/consent rules remain.

`tests/budget-draft-lifecycle.test.tsx` adds six actual component regressions:
clean reopen; successful save plus fresh seed and retained receipt; dirty draft
return; unknown outcome with exact original payload/requestId and explicit-only
retry; owner change; account change. Before the full run, these and the existing
management/HB-017 form suites passed29/29.

**Medium 2 — owner-accepted limitation, not PASS:** browser QA **B01–B07 remains
NOT EXECUTED** because the required runtime was unavailable. Physical screen
reader testing was not performed for the same runtime/access limitation. The
owner explicitly accepts this residual risk. Unit/component/PostgreSQL evidence
does not replace browser or physical screen-reader evidence. No claim that all
HB-018 scenarios were executed is made. Historical HB17-A03 Medium is unchanged.

Only the two specified implementation files, the new regression suite and this
report change in R1 relative to the previous review bundle. Earlier sections and
results below describe the initial delivery; R1 full-run evidence is appended
separately after execution. Financial rules, Accepted ADRs, schema, dependencies,
approved planning/scenarios and HB-018 Review status remain unchanged.

**2026-11-03 · Review, not Accepted/Done.** Base
`8e650d1b286a14b2ae4bb1a20cd625fa816f9f7a`; branch
`feat/hb-018-obligations-savings`. Owner explicitly authorized local implementation,
tests, verification and a review ZIP after owner-reported independent ChatGPT
planning review APPROVED, Critical/High/Medium/Low 0/0/0/0. The initial delivery
subsequently received the two-Medium review described in R1 above. Final owner
acceptance remains pending. No commit/push/PR/merge/deploy.

The original [approved plan](hb-018-obligations-savings.md) and
[42 scenarios](../../tests/scenarios/phase-01/hb-018-obligations-savings.md) remain
byte-for-byte intact. Their historical planning-only status paragraphs are retained;
the later authorization above governs this implementation. BUSINESS_RULES, Accepted
ADRs, OPEN_QUESTIONS, schema, migrations, dependencies and configurations unchanged.

## Implemented scope and source changes

- A: `domain/management/contracts.ts`, feature read boundary, app composition,
  `infrastructure/db/management-reader.ts`. Owned coherent READ ONLY snapshot,
  full bounded lineage/evidence validation before50-event pages; authenticated
  opaque cursors pin scope/identity/H/K/order, concurrent changes explicitly marked.
- B/C: protected obligations/savings pages, loading/error/empty/no-account states,
  filters, detail/history, terminal read-only states, full reserve and savings
  explanations, exact money, current projection and voluntary release proposal.
- D: `budget-draft-provider.tsx`, shared `budget-editors.tsx`, narrow refactor of
  UpdateBudgetScreen state lifetime. Fresh server-authorized seed + exact expected
  state revision resolves memory handoff. One client-instance draft, original
  unknown request and generation survive route unmount. Scope markers only clear
  client state; every server action still authorizes. New handoff requires explicit
  discard when dirty and is blocked when pending/unknown/access revoked.
  Owner/account keys also remount page screens on scope changes. Changing ordinary
  to possible now starts unelected; full reservation requires a separate checkbox
  action. This frontend default is covered by its own component test, not a new
  financial operation or policy.
- No financial writer/policy changes. Existing readProjectionContext now also
  returns its already validated audit collection for history actor/reason.
  Wire<T> preserves primitive string/literal/branded-string types rather than
  mapping string methods as objects; serialization/runtime money is unchanged.
- E/F: unit/component and real PG assertions plus existing regression suites;
  RU/DE/EN copy, MUI themes inherited; architecture/data/interface docs synchronized,
  HB-018 marked Review. Finance manifest updates only current normative context
  hashes through existing sourceContexts; no historical scenario/test association
  or checker policy is weakened. Complete file list and SHA256 supplied in ZIP
  companion manifest.

## Execution environment and safety

Windows PowerShell, existing installed toolchain, own disposable `postgres:18`
container named `hb018-codex-db`, label `home-budget.task=HB-018`, loopback-only
ephemeral port. No other container inspected or modified. Every integration call
explicitly overrides all three database URLs plus both local-target markers and
uses the existing guards; each suite creates a fresh synthetic child database.
No Neon/production/real bank data/OAuth credentials or `.env` contents accessed.

Full verification runs in a task-owned source copy with no `.env*`, sharing only
installed node_modules through a junction. Build/typegen cannot load the original
project's `.env.local`. The copy preserves current source/tests/docs/config;
fingerprints and current-run receipts protect finance gate evidence. The approved
planning files, `.vscode/`, index and pre-existing ignored/local files are retained.

## Commands and actual results

Initial targeted execution: 16/16 new unit checks; 28/28 including HB-017 form;
27/27 new unit/component plus architecture; 29/29 component/HB-017/i18n;
7/7 new PostgreSQL management checks; 126/126 HB-011/012/017 PostgreSQL regression
tests with new reader assertions. tsc and lint passed during implementation.
Final immutable source run: `tmp/hb018-evidence/review-run`, executed in
`tmp/hb018-verify` without `.env*`.

| Command | Actual final result |
|---|---|
| `pnpm.cmd --config.verifyDepsBeforeRun=false lint` | PASS |
| `pnpm.cmd --config.verifyDepsBeforeRun=false typecheck` | PASS, Next route typegen + tsc |
| `pnpm.cmd --config.verifyDepsBeforeRun=false build` | PASS, nine dynamic routes including both management pages |
| `TZ=UTC pnpm.cmd --config.verifyDepsBeforeRun=false test --reporter=default --reporter=json --outputFile.json=<run>/unit.json` | **855/855**,39 files,20.28s |
| `pnpm.cmd --config.verifyDepsBeforeRun=false test:integration --reporter=default --reporter=json --outputFile.json=<run>/integration.json` | **332/332**,10 files,182.33s; real disposable PostgreSQL18 |
| `TZ=America/Los_Angeles node scripts/check-finance-coverage.mjs timezone <run>` | **509/509**,14 files,13.87s; exact UTC test identity parity checked by gate |
| `TZ=America/Los_Angeles pnpm.cmd --config.verifyDepsBeforeRun=false exec vitest run tests/management.test.ts --reporter=json --outputFile.json=<run>/management-la.json` | **16/16**, supplementary new finance/age oracles |
| `node --conditions=react-server --import tsx scripts/db-migrate.ts` | Existing migrations apply/reapply PASS twice on owned loopback target; no optional env loader |
| `pnpm.cmd --config.verifyDepsBeforeRun=false test:integration -t DB17 --reporter=json --outputFile.json=<run>/db17.json` | **2/2** matching tests (BIGINT round-trip and HB10-DB17 input capture),330 others excluded by filter |
| `node scripts/check-finance-coverage.mjs init <run>`; `record <run> unit/integration/timezone`; `check <run>` | PASS:498 scenarios,442 required/54 partial/2 deferred,680 obligations,951 references; unit855/integration332/timezone509 |

Final gate binds these reports to the same unchanged source fingerprint and run
identity. Earlier runs were superseded after code changes; their receipts are not
relabelled/reused. Expected `HB015_GATE_REJECTED` output from adversarial unit
fixtures is separate from the successful final standalone checker.

Sandbox initially blocked native SWC cache loading and tsx `os.userInfo` (reported
as ENOMEM). Narrow approved executions in the env-free copy succeeded using the
installed native binding and a task-specific cache. No reinstall, dependency,
project config or database-target change. Full unit initially caught direct page
auth guards moved into a child RSC; guards were restored at both route entrypoints,
and all17 actual auth-boundary tests passed in the final run.

Two initial PG expectations incorrectly required a one-element periods array;
the correct actual projection included the protected future month. Assertions were
corrected to arrayContaining without changing expected money. Three initial locale
component assertions matched multiple amount labels; corrected to getAllByText.
The console transport also damaged new non-ASCII copy; UTF-8 file-based copy
replaced it, then locale/i18n checks passed. No product formula was changed to fit
an expectation.

## 42-scenario traceability

Paths below are under `tests/`. Each quoted prefix identifies the actual test name
in the retained JSON reports. Inherited tests are identified as HB17/HB11/HB12;
they do not turn a different fixture or manual browser expectation into full PASS.

| ID | Exact test selector / evidence | Coverage boundary |
|---|---|---|
| HB18-U01 | management.test.ts: `HB18-U01 ordinary CREATE reserves full amount without bank debit` | Pure aggregate + exact oracle |
| HB18-U02 | management.test.ts: `HB18-U02 possible reservation is explicit full or zero`; management-ui.test.tsx `HB18-U02 possible editor requires a separate explicit full-reserve selection` | Domain selected/unselected and actual checkbox component; not UI browser |
| HB18-U03 | management.test.ts: `HB18-U03 amount AMEND retains settled portion and refuses implicit zero settlement`; integration/obligations.test.ts `HB11-11/M1/M2/M3/M5 amend preserves paid amount and metadata history` | Domain + real stored history |
| HB18-U04 | management.test.ts: `HB18-U04 partial payment has one actual checkpoint and full remainder`; integration/management.test.ts `HB18-P01 HB18-U04 HB18-U11 atomic payment/release uses one actual checkpoint and exact evidence` | Exact independent unit vector; PG uses full payment composition |
| HB18-U05 | management.test.ts: `HB18-U05 paid changed/equal balances require actual affirmation and separate equal ack` | Changed/equal/reuse refusal; inherited PG payment coverage |
| HB18-U06 | management.test.ts: `HB18-U06 cancelled retains unpaid amount, releases reserve and is terminal` | Domain + inherited PG lifecycle |
| HB18-U07 | management.test.ts: `HB18-U07 invalid payments/reserves and outside-card requirements refuse` | Parameterized invalid/source cases; inherited HB11 real PG source rules |
| HB18-U08 | management.test.ts: `HB18-U08 savings CREATE reduces free without changing bank` | Existing aggregate used |
| HB18-U09 | management.test.ts: `HB18-U09 savings AMEND title only` | No amount rewrite |
| HB18-U10 | management.test.ts: `HB18-U10 increase is incremental with exact evidence` | Exact input evidence |
| HB18-U11 | management.test.ts: `HB18-U11 partial release has exact evidence and retains observation` | No checkpoint/repeated debit |
| HB18-U12 | management.test.ts: `HB18-U12 full release is terminal and no new cash` | Terminal state |
| HB18-U13 | management.test.ts: `HB18-U13 deficit proposal is read-only, full release can leave negative free`; integration/management.test.ts `HB18-U13 release suggestion is pinned and read-only, not a hidden financial update` | Real read-only row bytes, proposal refs |
| HB18-U14 | management.test.ts: `HB18-U14 D36 protects future shortage without adding future cash or double reserving` | 14000/500 independent oracle |
| HB18-H01 | integration/management.test.ts `HB18-H01 HB18-P07 coherent owned list/history preserve exact prior titles and read-only row bytes` | Immutable title/before-after; numeric amendment/payment suffix inherited separately |
| HB18-H02 | integration/update-budget.test.ts `HB17-U15 HB17-P01 disjoint CARRY and PAID persist one vector/position with full funding proof` | Added management funding timeline assertions |
| HB18-H03 | integration/obligations.test.ts `HB11 correction CREATE is legal and retains identity and original K`; integration/savings.test.ts `HB12-S26/E08/E09/O01 reviewed suffix has two revisions, two savings audits and all nine H/K cuts` | Added management superseded/corrected history; original historical selectors retain H/K assertions |
| HB18-H04 | integration/savings.test.ts `HB12-E03..E07 direct SQL $evidence full=$full refuses read and write without fallback` | Management list/history now assert refusals for malformed evidence variants; funding tampering covered inherited HB13 tests |
| HB18-H05 | integration/management.test.ts `HB18-H05 pagination pins K during a concurrent update, rejects tampering and foreign cursors` | 51 events / pages50+1 / new K / HMAC tamper |
| HB18-H06 | integration/management.test.ts `HB18-H06 known identities survive NO_OBSERVATION and are not invented zero bank values`; integration/obligations.test.ts `HB11-15 payment requires actual check; no-observation reserve is still readable` | Empty and known-identity unavailable states; source budget limits reuse HB014 tested preflight |
| HB18-H07 | integration/update-budget.test.ts `HB17-P12 current transition preserves nonempty report bytes while historical aggregate flags only the affected head` | Added list/history reads with full row-byte equality; no report viewing/creation UI in HB-018 |
| HB18-P01 | integration/management.test.ts `HB18-P01 HB18-U04 HB18-U11 atomic payment/release uses one actual checkpoint and exact evidence` | One batch/C/V/counters, B70000/R0/S8000/F42000 |
| HB18-P02 | integration/management.test.ts `HB18-P02 snapshot list is coherent across an actual concurrent commit`; integration/update-budget.test.ts `HB17-P05 real concurrent distinct commands have one winner and one stale loser` | Actual concurrent connections/snapshot and stale rejection |
| HB18-P03 | integration/update-budget.test.ts `HB17-P04 real concurrent identical commands wait on the account lock and commit once`; `HB17-P02 HB17-P03 exact replay precedes stale, changed reviewed payload conflicts` | Inherited writer unchanged, complete row-byte replay assertions |
| HB18-P04 | integration/update-budget.test.ts `HB17-P06 controlled failure %s rolls back complete rows, head, counters and receipt`; `HB17-P07 real COMMIT acknowledgement loss preserves the original request identity` | Actual INSERT/deferred COMMIT failure and lost-ack injection |
| HB18-P05 | integration/management.test.ts `HB18-P05 direct foreign/unknown identities, history and release proposal reveal no data`; management.test.ts boundary capture test | Account refusal, direct requests, unchanged rows; existing update auth regressions |
| HB18-P06 | integration/update-budget.test.ts `HB17-U14 preview AND direct confirm reject same-identity compounds without any partial rows`; `HB17-U15 HB17-P01 disjoint CARRY and PAID persist one vector/position with full funding proof` | Same-identity NONE + disjoint success; not a new compound policy |
| HB18-P07 | integration/management.test.ts `HB18-H01 HB18-P07 coherent owned list/history preserve exact prior titles and read-only row bytes`; inherited HB17-P12 and transition calendar tests | Read immutability and original report flags; target-month refusal inherited |
| HB18-C01 | management-ui.test.tsx `HB18-C01 handoff selects one exact revision/action without copying consents or deriving card balance`; `HB18-C01 real management selection stages action and navigates only to static update route` | Component action/route, not real tab navigation |
| HB18-C02 | management-ui.test.tsx `HB18-C02 HB18-C07 draft survives route unmount, blocks silent replacement and clears on account scope change` | Actual React provider unmount/remount; dirty replacement gate |
| HB18-C03 | management-ui.test.tsx `HB18-C03 stale or terminal handoff refuses instead of converting it to a new identity` | Refusal before editor selection |
| HB18-C04 | update-budget.test.tsx `HB17-X03 delayed preview cannot reactivate confirmation after the generation changes`; `HB17-X03 an edited amount invalidates the previously reviewed payload` | Runs against refactored shared form |
| HB18-C05 | management-ui.test.tsx `HB18-C05 unknown outcome retains original identity across unmount and refuses replacement`; update-budget.test.tsx `HB17-X11 unknown commit status retains original command and never silently resubmits` | Provider lifetime + original command retry |
| HB18-C06 | update-budget.test.tsx `HB17-X06 HB17-X08 a saved receipt stays success even when the following history read fails` | Saved success retained, no repeated payment |
| HB18-C07 | management-ui.test.tsx `HB18-C07 actual budget form input survives unmount within one provider without browser storage`; scope-change harness test | Component memory retention, no full-browser/OAuth crash recovery claim |
| HB18-B01 | management-ui.test.tsx `HB18-B01 nullable due dates sort last and status filters keep closed history available`; translated list tests | Component only; actual320/375/1280 geometry NOT EXECUTED |
| HB18-B02 | management.test.ts HB18-U14 + management-ui list facts | Domain exact safe guidance; real browser review NOT EXECUTED |
| HB18-B03 | management-ui.test.tsx `HB18-B01 HB18-B03 translated list/details %s do not fake zero observation`; i18n.test.ts | RU/DE/EN component/catalog only; theme/viewport/screenshots NOT EXECUTED |
| HB18-B04 | Semantic MUI controls, headings/labels/status, existing component tests | Manual keyboard/screen reader/reduced-motion/zoom QA NOT EXECUTED |
| HB18-B05 | management.test.ts U04/U11; integration/management.test.ts atomic composition | Financial engine/PG executed; actual browser payment→release flow NOT EXECUTED |
| HB18-B06 | management-ui provider/static route tests and source/privacy scan | No network/storage inspection in real browser; NOT full browser PASS |
| HB18-B07 | management.test.ts `HB18-B07 Berlin age oracle dates are calendar dates`; inherited transition/calendar/forecast tests | Actual pure age6/7 + 1739/r3,1818/r4; browser clock/month rollover NOT EXECUTED |

## Browser QA matrix and limitations

No in-app Node REPL `js` execution tool was exposed after tool discovery;
browser skill was read, but its required runtime could not be started. No external
browser fallback or auth bypass was introduced. **Actual local browser QA was not
executed**: no claimed viewport/locale/theme combination, screenshots, geometry,
accessibility-tree, network/console/storage capture, live Google OAuth or physical
screen-reader result. Component RU/DE/EN tests are not browser evidence.
Requested matrix remains320/375/1280 × RU/DE/EN × light/dark/system, plus keyboard,
zoom200%, reduced motion, actual payment/release/navigation/unknown flows. These
are explicit review/acceptance limitations, not PASS. HB-018 remains Review.

Historical accepted **HB17-A03 Medium** is preserved; its separate trusted OAuth
failure public message remains incomplete. This task does not fix or reclassify it.
No new product decision was needed. Source filenames were consolidated into
one shared ManagementScreen and BudgetEditors instead of separate per-kind
components; both use the same typed domain contracts and finance flow.
Read cursor signatures are process-local: restart or routing to another process
may invalidate a continuation cursor. The safe result is refusal; refreshing
starts a new owned history snapshot. No durable cross-instance cursor guarantee
is claimed and no auth secret/new persisted key was introduced.

## Packaging and final state

The review ZIP contains the complete local changed/new files relative to the base,
not node_modules/build/git/env/private QA data. Companion JSON manifest records
each member path/size/SHA256; archive digest is external to the archive. Paths,
symlinks, forbidden entries, sentinel secrets and unpacked hashes are checked
before delivery. Final digest is external to the archive, alongside the complete
file manifest, so it does not create a self-hashing cycle. Local artifact paths:
`tmp/hb018-review.zip`, `tmp/hb018-review-file-manifest.json`,
`tmp/hb018-review.sha256`.
Index stays empty; no publication, no Done. All PostgreSQL and component execution
in this report is **Codex execution**, not ChatGPT test execution. Independent
ChatGPT implementation review and owner acceptance are still pending.

Document checks covered all36 changed/new text files: strict UTF-8, no trailing
whitespace or symlinks,113 local links valid before this results append;
`git diff --check` passed. The two approved baseline files were not edited:

- Plan SHA256: `e631c65fdac626fb0a5ea3c295925c309b58df05cf5e6ec889b267e1c07a8876`.
- Scenario SHA256: `0c3fe9fca7c11f50cf16eac146f7d685c7ddaaf45dea5b464ab8aed568696fe0`.

Source-integrity evidence compares the deliverable's implementation/tests and
normative sources with the executed copy. Verification report results are metadata
added after execution; they do not alter the tested source fingerprint. Final
Git state:18 tracked modified files and18 new files, branch unchanged, index empty,
HEAD remains the base SHA. Ignored `.vscode/` and original local files untouched.

## R1 execution results and review handoff

The following are **new Codex executions for R1**, not reused initial-delivery
reports or independent ChatGPT test execution. Source was frozen in the env-free
copy `tmp/hb018-r1-verify`; evidence lives in `tmp/hb018-r1-evidence/run`.
PostgreSQL18 was a new owned disposable container `hb018-r1-codex-db`, label
`home-budget.task=HB-018-R1`, published only on127.0.0.1 with synthetic credentials.
All three database URLs and both target markers were explicitly overridden.
The original ZIP and its manifest were preserved.

| R1 executed command | Actual result |
|---|---|
| `TZ=UTC pnpm.cmd --config.verifyDepsBeforeRun=false test --reporter=default --reporter=json --outputFile.json=<R1-run>/unit.json` | **861/861**,40 files,23.54s |
| `pnpm.cmd --config.verifyDepsBeforeRun=false test:integration --reporter=default --reporter=json --outputFile.json=<R1-run>/integration.json` | **332/332**,10 files,187.64s; real PostgreSQL |
| `TZ=America/Los_Angeles node scripts/check-finance-coverage.mjs timezone <R1-run>` | **509/509**,14 files,17.10s; full UTC identity parity verified by gate |
| `TZ=America/Los_Angeles pnpm.cmd --config.verifyDepsBeforeRun=false exec vitest run tests/management.test.ts tests/budget-draft-lifecycle.test.tsx --reporter=json --outputFile.json=<R1-run>/management-la.json` | **22/22**, including all six R1 regressions |
| `pnpm.cmd --config.verifyDepsBeforeRun=false lint` | PASS |
| `pnpm.cmd --config.verifyDepsBeforeRun=false typecheck` | PASS, Next route typegen + tsc |
| `pnpm.cmd --config.verifyDepsBeforeRun=false build` | PASS, nine dynamic routes |
| `node --conditions=react-server --import tsx scripts/db-migrate.ts` | Existing migrations apply/reapply PASS twice on own loopback DB, no env-file loader |
| `node scripts/check-finance-coverage.mjs init <R1-run>`; `record <R1-run> unit/integration/timezone`; `check <R1-run>` | **PASS**:498 scenarios,442 required/54 partial/2 deferred,680 obligations,951 references;861 unit/332 integration/509 timezone |

All six regression names in `tests/budget-draft-lifecycle.test.tsx` are retained
in the unit JSON and R1 `commands.json`:

1. `HB18-R1 clean reopen uses fresh server seed and creates no financial request`
2. `HB18-R1 saved receipt survives navigation while clean fields and consents use fresh seed`
3. `HB18-R1 dirty draft retains its reviewed base across navigation instead of auto rebasing`
4. `HB18-R1 unknown outcome retains exact original request and only retries on explicit action`
5. `HB18-R1 owner change isolates dirty state and confirmed receipt`
6. `HB18-R1 account change isolates dirty state and confirmed receipt`

The successful-save case checks fresh fields, cleared consent/review, retained
receipt and exactly one submit. The unknown case checks no submit on return,
the original requestId for status, and object-identical original payload on an
explicit same-request retry. Dirty input and its original base survive return;
owner/account changes do not inherit the old receipt or draft. Existing HB-017
generation, authorization, atomicity, replay, rollback, financial invariants and
history tests remain green. No financial action is dispatched by the new opener.

**Medium 2 remains owner-accepted NOT EXECUTED:** no B01–B07 browser matrix, physical
screen reader, screenshots, geometry or browser network/storage evidence was
produced in R1. Runtime unavailability is the retained reason. Owner acceptance
of the residual risk does not change this into PASS, reviewer approval, or a claim
that all42 HB-018 acceptance scenarios were executed. Unit/component/PG evidence
remains separate. HB17-A03 and the initial cursor-process limitation are unchanged.

New handoff artifacts: `tmp/hb018-r1-review.zip`,
`tmp/hb018-r1-review-file-manifest.json`, `tmp/hb018-r1-review.sha256`.
The ZIP contains the complete local HB-018 difference from base8e650d1, including
the approved untracked plan/scenarios and new regression file, plus R1 reports,
receipts,42-ID mapping and individual hashes. Only four files differ from the
previous review bundle; `review/evidence/r1-changes.json` records that comparison.
The external digest avoids a self-hashing archive cycle. Path, symlink, unpacked
hash and private-QA sentinel checks are performed before handing off the archive.

Final R1 state: HB-018 **Review** pending repeat ChatGPT review and final owner
acceptance;18 tracked modified and19 new files relative to base, index empty,
HEAD unchanged. No commit/push/PR/merge/deploy, schema/dependency/ADR/policy change,
or alteration to original approved plan/scenarios. No new product decision needed.
