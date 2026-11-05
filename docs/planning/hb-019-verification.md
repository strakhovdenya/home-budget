# HB-019 — MINIMAL R03 acceptance correction: verification

**Current status: Done — Owner Acceptance 2026-11-05; independent review APPROVED
(Critical/High/Medium/Low 0/0/0/0), as reported by the owner.** See the final
[acceptance record](#documentation-finalization-and-owner-acceptance--2026-11-05).
The records below are preserved chronology: their earlier Review/pending labels
and receipts do not describe tests on the finalized documentation.

## Historical R03 verification record

Status: **Review, not Done**. The owner authorized ONLY the R03 test-acceptance amendment after R2. Automated final gate passes on the fingerprint below; browser/AT, independent repeat review and Owner Acceptance remain pending. No APPROVED claim.

## Minimal scope and owner decision

Exact8MiB PostgreSQL persistence is no longer required. Two independent synthetic profiles exceeded the unchanged source budget before report construction. Stop exact-boundary research and do not reinterpret the old failed/unexecuted stages as PASS. No new8MiB fixture or new PostgreSQL test was added. The former failing case was converted to an expected source-limit refusal using the already measured R2 profile and its historical fixed8246626-byte padding, without calibration/search.

Relative to the delivered R2 snapshot, only the plan, scenario document (R03 plus its R07 cross-reference), integration test, finance mapping and this non-normative verification report change. Superseded additions from the interrupted broader correction were removed; their execution is not used as final acceptance evidence. All previous unrelated local files and artifacts remain.

Production code/formulas, source/report/wire/work/audit limits, generic required-verification guard, schema/migrations and accepted BUSINESS_RULES/ADRs remain byte-identical to R2. production-unchanged.json verifies185 source/normative files against the R2 ZIP manifest. No task status change, staging, commit, push, PR, merge or deploy.

## Revised R03 proof by layer

| Layer | Actual revised evidence | Result |
| --- | --- | --- |
| Production PG large-report round-trip | Existing1MiB and1MiB+1 reports: production close, validated historical source/manifest/audits, chunks, <=1MiB wire, exact bytes/length/SHA-256 and cross-instance reads | PASS in the final suite |
| Independent atomic/audit/manifest proof | Existing B01 atomic commit and C12/E02 digest-bound audit/manifest/history proofs; no duplicate fixtures | PASS |
| Codec/protocol boundary | Existing exact8MiB codec and complete64-chunk reassembly, including multibyte boundary; existing8MiB+1 codec refusal | PASS, U/C only |
| Source overflow | Converted existing measured R2 profile: production preview and confirm refuse;20 scoped table/user/account baselines remain identical | PASS, expected refusal |
| Previous exact8MiB PG persistence | Retired by explicit owner amendment; original failure remains historical | Never PASS; no longer required |

Exact converted test: `HB19-R03 measured R2 source overflow refuses preview and confirm with complete PostgreSQL rollback`.
It asserts actual source bytes>8388608, zero materialized roots, REPORT_LIMIT_EXCEEDED from production preview/confirm and complete before/after baselines. The negative confirm uses the current H/K/revision and syntactically valid consent input; source admission refuses before digest acceptance or writes can commit. It does not claim a source-admissible oversized report reaches report encoding.

Current full-suite source measurement: **8474355 bytes**, cap8388608; roots0. All20 scoped baselines unchanged. The targeted check ran only this changed negative case (1 PASS /102 not selected), not the previously passed R2 round-trip/unit checks. They ran again only as part of the one required final gate.

Report budget remains8MiB, wire1MiB, chunk128KiB, depth32/nodes100000, work4000000 and all existing source/audit/chain bounds. Codec8MiB+1 fails before use. PostgreSQL source-overflow rollback is a separate guarantee; no invented report-budget PG persistence proof is claimed.

## Finance mapping and guard

Preserved589 definitions,91 HB19 scenarios,46 HB2 mappings, F-009/F-013 and every older obligation/deferral. Added only the actually passed converted negative identity; references=1157. R03 now also explicitly cites existing independent atomic/audit evidence. Normative definition/context hashes were refreshed for the owner-approved wording.

Only two obsolete R03 blockers were removed from blockingVerification. The generic guard implementation and its95 regression tests are unchanged; any remaining required FAILED/NOT_EXECUTED blocker would still reject. The retired exact8MiB PG name was never entered as a passing test reference. The finance gate validates current-run receipts, all registered executed identities, source fingerprint and exact UTC/LA subset parity.

## One definitive automated final gate

Source fingerprint: `42b103d3f62e353701f2f8b1c7ae9ec92d2b21e33f97def4771d5ab9fa05d101`.
Run context, full safe raw logs/JSON, exit codes and SHA-256 manifest are included in the ZIP. Exact commands/cwd/environment are in evidence/current/commands.json. All final commands ran once after the last source/test/mapping/normative-context edit. This report is outside the gate normative context set.

| Check | Actual result |
| --- | --- |
| Full source lint | PASS exit0 |
| Next typegen / TypeScript / build | PASS / PASS / PASS, exit0 |
| UTC unit/component | 931 PASS, 44 files |
| Real PostgreSQL migrations / reapply | PASS / PASS; fresh integration databases migrate existing0000-0005 |
| Full PostgreSQL integration | 435 PASS, 11 files; no failed/skipped assertions |
| Separate DB17 | 1 PASS /18 not selected |
| America/Los_Angeles timezone subset | 552 PASS, 16 files; exact identity parity with UTC subset |
| Finance coverage CLI | PASS exit0, all current receipts verified |

The positive v1/v2/v3 historical chain and negative999/1000/1001 metadata/count/rollback proofs remain in the full PG suite. H02 same-money/ref-change UI/PG checks and all independent PostgreSQL/DST/race/rollback/replay guarantees are retained. No admitted999/1000-version chain is newly claimed.

## Isolation and qualifications

Only the owned synthetic local container hb019-20261104-isolated was used, ID b1321b930576dcc8c84f10f1644fd2be99dbbb00752464b71c163c612b0ca0d7, bound127.0.0.1:52676. Explicit DATABASE_URL/DATABASE_URL_UNPOOLED/TEST_DATABASE_URL and local-target markers were supplied; no .env loader, Neon, other containers or real financial data/identities.

Lint/typegen/typecheck/build ran in a fresh allowlisted copy without .env or tmp directories, using existing installed dependencies and synthetic build-only auth values. All337 copied inputs matched workspace SHA-256 before this report update. Exact direct equivalents and working directories are recorded, not misreported as root package-command execution. No local files were deleted and no config was changed to exclude old tmp copies. Migration uses the direct command without the package script .env.local loader.

## NOT EXECUTED / pending

- Retired exact8MiB PG creation/confirm/stored manifest/audit/digest/64-chunk/new-reader stages: not executed successfully, never PASS; no longer required by the owner-amended R03. Do not confuse this with the passing8MiB U/C stream.
- Browser E08-E14: required in-app browser/node_repl execution tool is unavailable (tool discovery returned none). No fallback installation/auth bypass/real OAuth configuration access. Existing server-relative completed fixtures and all calendar checks remain.
- Physical screen reader. Component results do not substitute for browser/device proof.
- Independent repeat implementation review and Owner Acceptance. F05 remains outside runtime gate, F06 pending independent review, F07 historical planning-only proof. HB-019 remains Review.

## Artifact and Git handoff

The new ZIP contains full changed/new repository files and supporting source/spec/configs, this report, current safe logs/JSON/receipts/commands, source integrity, Git status/diff and a path/size/SHA-256 manifest. External delivery.json records ZIP/manifest/report hashes and source fingerprint. Every ZIP entry/length/hash is checked. .env, secrets, real data, node_modules, caches/build copies, .git and unrelated local files are excluded. Prior ZIPs/logs are preserved locally; historical failed exact8MiB evidence is not relabelled current PASS.

Branch feat/hb-019-month-closing-versions-rollover; baseline HEAD3288ce91ba197d52ac51de036e1bccea55420a4f remains unchanged. Deliver to the owner for independent review; no publication or acceptance is implied.

## Owner manual browser QA — 2026-11-04

**Separate dated evidence: owner observed; no independent rerun.** Current
HB-019 status is **Review / CHANGES REQUESTED**, not Done or Owner Accepted.
The automated gate/fingerprint and earlier baseline/no-staging statements above
are historical records of that run, not the current source or Git state.

Documentation-stage start: branch `feat/hb-019-month-closing-versions-rollover`,
HEAD and `hb-019-before-ux-corrections` both
`98f8890c07bbea7f102d2d4de18f837a713daf74`, clean tracked/untracked tree.
That owner-authorized local 48-file checkpoint is retained, not amended; new
documentation is uncommitted. HB-019.1 remains Planned. No implementation
authorization follows from recording the findings.

Owner reported runtime `localhost:3007`, synthetic PostgreSQL container
`hb019-20261104-isolated`, 127.0.0.1:52676. This is provenance only; no connection,
Docker operation or runtime test was performed in this documentation task.

| Owner-reported step | Observation and qualification |
|---|---|
| Initial October close | v1 saved with no historical observation, unknown Oct31 bank and R/S=0; no fake checkpoint reported |
| Reason-only revision | Reason `2222` with unchanged canonical facts refused correctly; v1 retained |
| Backdated budget update | Actual Oct31 B90000 and complete AOct90000 saved; success showed UUID twice (presentation, not proven duplicate writes) |
| Current state | UI still showed Nov04 B100000 and active Nov allocation100000; no independent PG inspection |
| Explicit correction | Pending history, before/after, all four pages and consent produced v2; version1/version2 links visible |
| Conflicting view | Historical v2 B/A/F90000,R/S0 vs upper active Oct A/F0 and “Исторический отчёт здесь пока недоступен” |
| Navigation error | Reported React use() suspension error near /savings and /months with GET200; no stack or proven cause/ownership |

The exact error, text-only screenshot descriptions, severity/risk split and
correction proposals are in the single [findings register](hb-019-browser-qa-findings-2026-11-04.md).
No screenshot files are asserted present. HB19-UX-01–08 remain OPEN; wider
HB19.1-UX-01–05 are separately Planned. The page gate worked at 4/4; its unclear
explanation is not a failed checkbox. Raw90000 means cents, not proof of a wrong
balance. No wrong D36 result, broken DB or duplicate audit is established.

**NOT EXECUTED / still OPEN:** independent rerun of these owner steps; v1/v2
immutability after reload/relogin; post-v2 DB state/audit/digest/head assertions;
React error reproduction/root cause; full authenticated app browser regression;
new targeted component/PG tests Q01–Q07 and HBUX-033–036; physical AT; independent
repeat review and Owner Acceptance. No new all-browser PASS or fresh final-gate
receipt is recorded. The older targeted component/repository browser evidence,
where retained locally, cannot discharge real application/auth/relogin proof.

This stage changes documentation only; finance mapping, required-verification
guard, source/tests/runtime/JSON translations/schema/ADRs remain untouched. All
financial invariants, R03 owner-amended acceptance, 46 HB2 mappings, F-009/F-013,
independent PG/DST/race/rollback/replay and final gate remain required. New
normative scenario context means old source receipts cannot be called current;
future authorized corrections require current-source verification after the last
edit. This entry grants no implementation, commit or publication authorization.

## HB-019 UX correction A1/A2 — actual verification, 2026-11-05

**Status: Review / CHANGES REQUESTED; independent review and Owner Acceptance pending.**
Owner authorized HB-019 implementation A1/A2, not HB-019.1. Checkpoint HEAD/tag
remain `98f8890c07bbea7f102d2d4de18f837a713daf74` / `hb-019-before-ux-corrections`.
Start status was six modified Markdown files plus one untracked QA register;
all are preserved. Current changes are uncommitted/unstaged. No publication.

### Delivered presentation and completeness

Changed financial items lead, unchanged reserves/savings remain distinct. Initial
close has a report summary, not absent-document diff. Groups cover card/date,
distribution, obligations/savings, other historical evidence. Every complete-leaf
old/new fragment receives a coverage identity and a mandatory summary/evidence
destination. Grouping verifies a total unique mapping; unknown/duplicate coverage
blocks confirmation. Financial summary rows are not repeated as separate evidence
facts. Identical representations merge only within the same source context;
independent events/refs/order/before-states remain mandatory. Raw schema/counters/
IDs/hashes are secondary diagnostics; full original evidence can be downloaded
explicitly from the already verified documents. Missing prior record stays missing.

All required financial-detail/evidence pages must be visited; progress explains
the disabled consent. Completion only enables unchecked consent. Fresh preview,
reload/unmount and known confirmation refusal discard credit/consent. Server
H/K/head/revision/digest/authorization/replay/unknown-result safeguards are unchanged.

CLOSED server page leads with selected accepted history; latest is default and
explicit old selection stays immutable. Latest and selected links remain present
even beyond the first metadata page; links are sorted descending and deduplicated.
Acceptance date is omitted because the existing client DTO does not expose it.
Current active distribution is below in an initially collapsed, dated, explicitly
nonhistorical section. Current/unclosed/future Dashboard behavior is retained.
No-change is neutral and does not invite reason-only revision; proposed/confirmed/
saved/unknown states are distinct. Successful exact command version is derived
from its pinned expected head, never from a later concurrent head returned by reread.

### Final current-source automated gate

Source fingerprint: `6974c9cd2e5c04a8357e32d5ff89768394c0b542f6ccbe43ac30027798746aa3`.
All final commands below exit0. Raw safe logs/JSON/receipts and exact absolute
commands/cwd/TZ are in the review ZIP under evidence/final and evidence/commands.json.

| Check | Result |
|---|---|
| Full lint | PASS |
| Next typegen / build / TypeScript | PASS / PASS / PASS |
| Full UTC unit/component, one worker | 957 PASS, 46 files |
| Owned local PG migrations / reapply | PASS / PASS, existing0000–0005 |
| Full real PG integration | 436 PASS, 11 files |
| Separate DB17 | 1 PASS; 18 not selected |
| America/Los_Angeles parity | 552 PASS, 16 files; exact UTC identity parity |
| Finance coverage and fresh receipts | PASS; 596 definitions, 98 HB19 incl. Q01–Q07, 46 HB2 rows retained |

Direct command equivalents (root unless build-copy cwd stated):

```text
node scripts/check-finance-coverage.mjs init tmp/hb019-ux-20261105-final-03/gate
node <repo>/node_modules/eslint/bin/eslint.js . --max-warnings=0
node <repo>/node_modules/next/dist/bin/next typegen
node <repo>/node_modules/next/dist/bin/next build
node <repo>/node_modules/typescript/bin/tsc --noEmit
TZ=UTC node node_modules/vitest/vitest.mjs run --maxWorkers=1 --reporter=default --reporter=json --outputFile.json=tmp/hb019-ux-20261105-final-03/gate/unit.json
node --conditions=react-server --import tsx scripts/db-migrate.ts
node --conditions=react-server --import tsx scripts/db-migrate.ts
TZ=UTC node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts --reporter=default --reporter=json --outputFile.json=tmp/hb019-ux-20261105-final-03/gate/integration.json
node scripts/check-finance-coverage.mjs timezone tmp/hb019-ux-20261105-final-03/gate
node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts tests/integration/persistence.test.ts -t DB17 --reporter=default --reporter=json --outputFile.json=tmp/hb019-ux-20261105-final-03/gate/DB17.json
node scripts/check-finance-coverage.mjs record tmp/hb019-ux-20261105-final-03/gate unit
node scripts/check-finance-coverage.mjs record tmp/hb019-ux-20261105-final-03/gate integration
node scripts/check-finance-coverage.mjs record tmp/hb019-ux-20261105-final-03/gate timezone
node scripts/check-finance-coverage.mjs check tmp/hb019-ux-20261105-final-03/gate
```

Lint/typegen/build/typecheck cwd was `tmp/hb019-ux-20261105-final-03/build-source`, a fresh allowlisted
byte-matched copy with no .env/tmp/cache input. Existing dependencies/native SWC
were reused; only synthetic build-only auth values. No root config change.
Final runner: `tmp/hb019-ux-20261105/gate-final-source.mjs`. No limits/assertions/timeouts were increased.

### Independent PG and browser qualifications

New real production-path PG test: `HB19-Q01/Q02/Q04 production backdated budget update preserves current head and independently readable immutable versions` — PASS.
The current real check is server-relative (Nov05 at this run), B100000/full current
A100000; historical final-day B90000/full past A90000 is confirmed through normal
budget preview/confirm. v1 remains byte-identical with unknown bank/A/F. v2 has
end/A/F90000,R/S0, linear predecessor, exact replay, full chunk reassembly/SHA
and fresh repository reads. Current checkpoint/vector anchors and B100000 stay
unchanged; read-only baselines prove no side effects. Existing actual-zero,
older-last-check, manifest/audit/H/K/foreign/stale/race/rollback proofs also ran.

R03 amendment retained: PG1MiB and1MiB+1 round trips, codec8MiB and8MiB+1 refusal,
source-overflow rollback all ran in the final suites. No new8MiB fixture search,
no exact8MiB PG PASS. Positive v1/v2/v3 and negative999/1000/1001 chains retained.

Owner authorized separate Chrome fallback because in-app browser/node_repl tools
were unavailable. Actual Chrome: `Chrome/155.0.8059.85`, fresh isolated test profile,
localhost production React components + production repositories on owned
synthetic PostgreSQL: **9/9 PASS**, RU/DE/EN; initial unknown, equal-money changed
refs, and historical900 after current1000; full required paging/unchecked consent,
save once, reload latest and explicit v1 selection. Actual final UI hashes match.
Three dark-theme correction cases, keyboard Tab smoke and RU320px no horizontal
overflow also passed. Screenshots are included, with full-page and mobile views.
Browser Q fixture uses real synthetic Nov04/Oct31 dates admitted against server
Nov05; no calendar override. Browser persisted reads validate both original report
versions; fresh reader/digest/current-head proof is independently in PG.

This is **not** authenticated Next/Auth.js/Google end-to-end proof. A test-only
HTTP adapter provides synthetic scope; component/page-composition and production
repository tests cannot validate real app route/Suspense or Google relogin.
**NOT EXECUTED:** true authenticated route chain /savings -> /months -> versions,
real Google/relogin durability, physical screen reader, actual browser200% zoom,
independent review and Owner Acceptance. Q07 remains **OPEN / NOT REPRODUCED**;
no root cause is claimed and no speculative React/dependency change was made.
HB19-UX-01–07 are implemented with automated evidence, still OPEN for independent
and owner UX review. HB19.1-UX-01–05 remain future Planned work.

Only container hb019-20261104-isolated, ID
b1321b930576dcc8c84f10f1644fd2be99dbbb00752464b71c163c612b0ca0d7,
127.0.0.1:52676 was used. Explicit synthetic local target variables, no .env,
Neon/production, real bank data, OAuth credentials or foreign containers. Native
tool escalation was limited to the owned local environment/Chrome/build.

### Failed attempts retained honestly

Earlier targeted test setup wrongly wrapped an already returned receipt as a
Result; fixed only the test call. Initial lint found an unused initial digest
assignment in that new test; corrected without changing assertions. A preliminary
gate incorrectly passed build AUTH_URL3007 to auth tests expecting3000; isolated
test environment corrected. A later parallel full UTC run hit existing5s/20s
timeouts under competing build/PG/Chrome load; final UTC ran one worker with the
same timeouts/assertions. Version-page and missing-prior-record regression fixes
then changed the source fingerprint: all final commands were rerun after the
last change. Earlier successes/failures are historical, never reused as current
receipts. Exact final commands all passed on the fingerprint above.

The runner post-build copy assertion initially exited1 because Next regenerated
next-env.d.ts only inside the build copy. Independent read-only integrity proof
verified349 workspace inputs unchanged and every copied input identical except
exact .next/dev/types -> .next/types generated imports. All15 actual gate commands
exited0; postbuild-integrity.json records this distinction. No source/config was
changed and no financial test was waived for the generated artifact.

Protected diff against checkpoint: domain/infrastructure/drizzle/accepted ADRs/
BUSINESS_RULES unchanged. HB-019.1 runtime untouched; its preexisting docs retained.
Only Q07 was explicitly added to the existing external-verification status map;
no required financial proof, old mapping, finance guard or resource budget was
removed. Final report/QA evidence appendices are outside the normative source
fingerprint; normative source/scenario/mapping files remain frozen after gate.

Review archive: HB-019-UX-correction-20261105.zip, packaged full source/test/docs
context plus safe evidence and path/length/SHA-256 MANIFEST.json. External delivery
metadata records ZIP hash and completeness check. No .env/.vscode/.git,
node_modules, browser profiles, caches or real data. No staging/commit/tag change,
push/PR/merge/deploy. HB-019 remains Review; HB-019.1 remains Planned.

## Medium correction: NO_REPORT_CHANGE preserves server pending — 2026-11-05

Independent ZIP review found an optimistic UI-only mutation: preview refusal set
correctionPending=false without a server read or write. **Corrected; HB-019 stays
Review, repeat independent review and Owner Acceptance pending.**

Scope relative to the previous reviewed ZIP: month-closing-screen.tsx,
RU/DE/EN monthClosing messages, closing-ui.test.tsx, executed finance references
and this report only. Existing local changes, checkpoint/tag98f8890c and HB-019.1
are preserved. No financial/domain/infrastructure/schema/config/ADR changes.

The NO_REPORT_CHANGE branch now leaves the server-derived MonthView untouched.
Its neutral message distinguishes no meaningful candidate diff/no new version
from an existing server pending flag. The immediate contradictory invitation to
prepare v2 is suppressed after this refusal; the pending indicator and accepted
v1 remain visible. No implicit confirm, server mutation or extra action is issued.
Only a successful explicit reload may replace pending with the returned server
state. That reload clears the old refusal message so it cannot contradict the
fresh result. Reason clearing remains the preexisting local-draft behavior.

### Targeted and scenario evidence

- HB19-C04/Q01/Q06 ru NO_REPORT_CHANGE preserves server pending and accepted version without confirmation or optimistic writes — PASS
- HB19-C04/Q01/Q06 de NO_REPORT_CHANGE preserves server pending and accepted version without confirmation or optimistic writes — PASS
- HB19-C04/Q01/Q06 en NO_REPORT_CHANGE preserves server pending and accepted version without confirmation or optimistic writes — PASS

Each component case starts pending=true, submits a preview returning
NO_REPORT_CHANGE and asserts: pending remains visible, one accepted v1 link,
no consent/confirm/new-version UI, no confirm/review/chunk/load/status calls,
and no misleading no-pending or proposed-v2 status. It then explicitly reloads
a mocked pending=false response and verifies that only this authoritative read
changes the UI and removes the stale message. Component mocks do not prove PG
writes; existing production HB19-C04 asserts complete unchanged scoped baseline
after no-op. That PG test ran in the fresh full integration suite below.

HB19-C04 already requires pending not be silently cleared; Q01/Q06 retain no-op,
zero-write and truthful reread/recovery contracts. No scenario or normative text
was changed. Three actually executed locale cases were added to their finance
obligations; all older tests/mappings and the external-verification guard remain.

Targeted command (TZ=UTC, exit0):
    node node_modules/vitest/vitest.mjs run tests/closing-ui.test.tsx tests/closing-page.test.tsx tests/closing-review-content.test.ts tests/i18n.test.ts --maxWorkers=1 --reporter=default --reporter=json --outputFile.json=tmp/hb019-pending-target-final.json
Result: 49 PASS, 4 files.
Finance mapping contract regression: 95 PASS, exit0.

### Fresh gate after the final source/test/mapping edit

Source fingerprint: 62dd581631f76cfeb84596bd2ea4b01722004761c0aed679e31241290277f060
Normative contexts unchanged from the previous ZIP; normalized context-list
fingerprint: ca728f5a4e5f10379773991a45bb95135455bced09e340d422fdf414a3d2756e.
The runtime source fingerprint changed, so old receipts were not reused.

| Actual check | Result |
|---|---|
| Full lint | exit0 |
| Next typegen / build / TypeScript | exit0 / exit0 / exit0 |
| Full UTC unit/component, maxWorkers1 | 960 PASS, 46 files |
| Existing migrations / idempotent reapply | exit0 / exit0, no new schema |
| Full real local PG integration | 436 PASS, 11 files |
| Separate DB17 | 1 PASS, 18 not selected |
| America/Los_Angeles exact UTC subset parity | 552 PASS, 16 files |
| Current-run finance gate / receipts | exit0; 596 definitions, 98 HB19, 46 HB2; F-009/F-013 retained |

Exact commands/cwd/TZ/exit codes are in tmp/hb019-pending-20261105/commands.json
and the updated ZIP evidence/commands.json; all15 commands exited0. Raw logs,
JSON and receipts are in evidence/final. Verification runner is evidence/gate.mjs.
Lint/typegen/build/typecheck use a fresh allowlisted build copy with existing
dependencies, synthetic build-only auth values and no .env. Workspace inputs
remain unchanged; the only expected generated-copy difference is next-env.d.ts
dev/types -> types imports. No timeouts, assertions or resource limits changed.

Only the owned synthetic container hb019-20261104-isolated, ID
b1321b930576dcc8c84f10f1644fd2be99dbbb00752464b71c163c612b0ca0d7,
127.0.0.1:52676 was verified/used. Explicit synthetic local DB variables;
no production/Neon/OAuth secrets/real data or foreign container access. PG fixtures
use their own isolated child databases. Production financial code and schema
remain byte-identical to the checkpoint; no new PG test or fixture was needed.

### Limits and delivery

NOT EXECUTED for this narrow correction: new browser run/authenticated Next or
Google/relogin E2E, physical AT, real200% zoom, Q07 React root-cause proof,
independent repeat review and Owner Acceptance. Previous9 Chrome cases belong
to the previous source fingerprint and are included only as historical evidence,
not relabelled current PASS. Existing broader pending items are not closed here.

Updated ZIP includes current full changed source/test/document files, supporting
context, current verification reports/commands/diff and path/size/SHA-256 manifest.
Every ZIP entry is checked against the manifest. .env/.vscode/.git/node_modules,
caches, real financial data and secrets are excluded. Changes remain unstaged
and uncommitted, no push/PR/merge/deploy; checkpoint/tag and branch unchanged.

## Documentation finalization and Owner Acceptance — 2026-11-05

**HB-019: Done.** The owner confirmed completion of manual testing and gave
**Owner Acceptance on 2026-11-05**, then explicitly authorized this documentary
closure and the resulting context-hash/fingerprint changes. HB-019.1 and HB-020
remain Planned. Later product decisions/follow-ups are outside this acceptance;
no financial or historical-selection rule is introduced here.

### Distinct sources of evidence

| Evidence source | Recorded result and exact scope |
|---|---|
| Owner | Confirmed manual testing completed and accepted HB-019 on 2026-11-05. This is the owner's acceptance statement, not a new independent Codex browser rerun. |
| Independent ChatGPT static review, reported by owner | **APPROVED, Critical/High/Medium/Low 0/0/0/0** for `HB-019-pending-correction-20261105.zip`, SHA-256 `e5ff2dff103e376516833592cd69912ffc1e7ffbcc2a6e41207c27e941dc89b4`. Approval applies to that reviewed archive; it is not execution of authenticated browser/PG tests by the reviewer. |
| Previously executed Codex gate | **960 UTC unit/component (46 files), 436 real isolated PostgreSQL (11 files), DB17 PASS (1 passed/18 not selected), 552 timezone (16 files), lint/typegen/typecheck/build/finance gate PASS**. Exact commands, logs and receipts are retained in the accepted ZIP and `tmp/hb019-pending-20261105/commands.json`. No results were regenerated for this closure. |

Accepted and tested **implementation fingerprint**:

`62dd581631f76cfeb84596bd2ea4b01722004761c0aed679e31241290277f060`

That fingerprint identifies the accepted implementation/gate archive. It is
**not** the fingerprint of the subsequently finalized documentation workspace.
The archive and its original receipts remain unchanged. They must not be used
as current-run evidence for the new fingerprint below.

### Final findings and retained limitations

- HB19-UX-01–07 are corrected and accepted, including the independently reviewed
  NO_REPORT_CHANGE/pending correction and its three-locale component regressions.
- HB19-UX-08 / HB19-Q07 React `use()` remains **OPEN / NOT REPRODUCED**. No proven
  cause or fix is asserted; completion of HB-019 does not silently close this item.
- Google/relogin authenticated E2E, physical assistive technology, actual browser
  zoom200% and browser checks not repeated on the accepted final implementation
  fingerprint remain **NOT EXECUTED**. Owner Acceptance is not a substitute PASS.
- Previous Chrome9/9 belongs to its older source and remains historical evidence,
  not a new final-fingerprint browser run or authenticated Next/Google E2E.
- Historical finance-manifest verification dispositions/receipts are preserved;
  their pending-review labels describe the accepted gate record. Completion is
  recorded here, not by changing historical test mappings/statuses or the guard.

### Document-only finalization checks

Only TASKS, this plan's current completion record, this report and the findings'
final dispositions changed. In `tests/finance/coverage.json`, only the SHA-256
values of the contexts for `docs/TASKS.md` and
`docs/planning/hb-019-month-closing-versions-rollover.md` were refreshed. Scenario
definitions, test associations, dispositions, guards, source, formulas, schema,
architecture, BUSINESS_RULES, ADR and existing HB-019.1 work remain unchanged.

Finalized-workspace fingerprint (documentation/context hashes included):

`eb0d71a3455cd74c578db926154f183dc74684910a8ba2f55fca05e840133a01`

This value is computed after status edits and the allowed manifest SHA updates
using the existing finance fingerprint algorithm. Document hashes and manifest
structure are validated read-only; links/Markdown, whitespace, narrow diff,
empty index and unchanged HEAD/tag are checked. **No Vitest, PostgreSQL, browser,
build or runtime finance gate is rerun for this fingerprint.** Fresh CI evidence
must be produced later after separate publication authorization; the earlier
tested fingerprint and PASS results remain historical acceptance evidence only.

Branch `feat/hb-019-month-closing-versions-rollover`; HEAD and
`hb-019-before-ux-corrections` remain
`98f8890c07bbea7f102d2d4de18f837a713daf74`. Existing local work is preserved,
index empty, finalization changes uncommitted. No commit/push/PR/merge/deploy or
production/Neon/OAuth access is authorized or performed by this closure.
