# HB-017 — implementation verification

Дата: 2026-11-03. Base: `9bf449e641818c1bfaa15d8b76a0dd9d3d8a740a`.
Ветка: `feat/hb-017-update-budget`. Текущий статус: **Done по Owner Acceptance с известным Medium**.
Независимое review реализации: **CHANGES REQUESTED**, Critical 0 / High 0 / Medium 1 / Low 0,
со слов владельца. HB17-A03 частично реализован; отдельное публичное сообщение для
достоверного OAuth failure не реализовано полностью и принято владельцем без исправления.
Commit/push/PR/merge/deploy не выполнялись.

## Owner Acceptance — 2026-11-03

Владелец явно принял HB-017 в текущем состоянии и разрешил публикацию в принципе.
Результат независимого ChatGPT review остаётся **CHANGES REQUESTED**, с одним Medium
по HB17-A03 и без Critical/High/Low. Owner Acceptance не меняет этот результат на
APPROVED и не означает устранения finding.

**Принятое исключение:** отдельное публичное сообщение для достоверно установленного
OAuth failure реализовано не полностью. Владелец сознательно принимает существующий
нейтральный fallback без исправления. HB17-A03 не объявляется полностью реализованным
или прошедшим все критерии. Прежние PASS callback/session/защитных проверок доказывают
их фактический scope, но не наличие отсутствующего публичного OAuth-сообщения.

Fail-closed, OAuth/JWT, CSRF/Origin, ownership, безопасные сообщения/логи и отсутствие
account-enumeration oracle не ослабляются. Финансовые правила, ADR и остальные scope
решения сохраняются. [Решение владельца](../DECISIONS.md#hb-017-owner-acceptance-with-known-medium--2026-11-03).
Ранняя planning-оценка APPROVED и прежний статус Review ниже являются исторической
evidence до этой приёмки. Эта финализация меняет только документы и нормативные хэши;
commit/push/PR/merge/deploy в данном задании запрещены и не выполняются.

Результаты свежего manifest/finance gate после финализации приведены в дополнении
«Documentation finalization checks» в конце отчёта. Предыдущие executed evidence и
review ZIP сохранены как исторический implementation snapshot; ZIP не перепаковывался.

## Scope и сохранение исходных файлов

Реализованы `/update-budget`, dashboard CTA, typed aggregate draft, pure candidate,
coherent load/preview, одно явное подтверждение/commit, status/history, memory-only
form и отдельный обязательный auth diagnostics change set. Существующие domain
selectors/lifecycles/forecast и один commitBatch переиспользованы. Схема, миграции,
dependencies/config, Accepted ADR0001–0003, BR и D36–D39 не изменены.

Четыре утверждённых документа **уже были локально изменены до реализации**:
DECISIONS, OPEN_QUESTIONS, HB-017 plan и scenarios. Их исходные bytes/status/diff
сохранены в ignored `tmp/hb017-preparation/original` и baseline manifest. DECISIONS
и OPEN_QUESTIONS не дописывались на этапе кода; plan/scenarios получили отдельные
исторически обозначенные implementation sections. `.vscode/` не затронута.

| Первоначальный файл | SHA-256 до реализации |
| --- | --- |
| docs/DECISIONS.md | 94B23305D49A56A3D6C18EB25E7C741F0188C0D29FB9918161AD7DEFC2C36532 |
| docs/OPEN_QUESTIONS.md | A40FBF08E9213B612758FE638DEC8FBFD56B55CF688675FE562B6A44F4F26B7A |
| docs/planning/hb-017-update-budget.md | 0A154D7A5E7147EB8F7FE7E39998699D8236F5532EE05FA3936DEBDD4F59CC58 |
| tests/scenarios/phase-01/hb-017-update-budget.md | DA794176EFE14A83755803D989523BA12F8EA2F334D189CCD777606767678842 |

## Financial evidence

Aggregate planning uses checked bigint EUR cents and Berlin civil dates. Actual
checks create one C/V even for an equal balance; reuse creates V without C/freshness
reset. Payments reference the shared actual C and never subtract from B. Full unpaid
reserves and savings remain authoritative, negative F is valid; safe guidance uses
existing ALL_PERIOD_MAX_V1. Expected receipts and checkpoint deltas do not become
cash/operations. No ledger explanation is required.

Same-identity overlap is detected from the original funding set before lifecycle
edits. Different identities compose in U15/U16; same identity receives typed refusal
at preview and direct confirm without partial rows or automatic split. Financial
SQL guards and historical ordering are unchanged.

The real-PG aggregate suite compares full rows across 18 scoped financial/control
tables plus the account. BEFORE savings/audit INSERT and deferred audit COMMIT
failures roll back complete state/counters/receipt. Two actual waiting connections
are observed via pg_stat_activity before the lock is released. A real COMMIT followed
by a synthetic lost acknowledgement resolves by original request status/replay.
Repeatable-read load keeps old B/R/S while a concurrent writer commits; the next load
returns the complete new state. Nonempty closing bytes/refs stay immutable; only an
affected report head becomes pending. Invalid original report manifests refuse.

Original aggregate replay rebuilds at original H/K/date, validates canonical command,
receipt, copied review, full vector and lifecycle/funding evidence, proposal/decision/
transfer mapping. FRESH_START source periods come from the original pure affectedPast
union; later nonfinancial period controls do not change replay proof. Historical C7
insertion preserves the later C10 active head and shows both bank bases honestly.

## Isolated auth evidence

`auth-callback-diagnostics.test.ts` exercises actual exported Auth.js GET/POST routes,
CSRF/state/PKCE/nonce, signed synthetic OIDC JWT/JWKS, real encrypted session cookies
and callback/session revalidation. Only provider HTTP transport and repository
failure points are injected; signIn itself is not mocked. Policy deny, binding
collision and identity-specific storage failure have the same refusal response
class/status/redirect/cookie names. Safe category/stage/time/correlation logs exclude
synthetic private sentinels, email/subject, tokens and SQL/URL. Positive callback and
subsequent failed session revalidation are separate controls.

The aggregate PG suite exercises an actually unavailable loopback PostgreSQL
connection, safe AUTH_STORAGE_UNAVAILABLE logs and identity-independent public
classification. Actual login pages were opened for RU/DE/EN with AccessDenied,
Configuration and HTML-like arbitrary queries: 9 cases, one neutral class per locale,
no query echo. Cookie-free direct financial Server Action returns a refusal body;
wrong Origin is rejected by actual Next.js (HTTP 500 in the installed production
runtime). Neither response permits a financial write. AccessDenied never establishes
that Google denied admission. No global lastError or account-specific error cookie.

These tests do **not** establish live Google availability, real deployed credentials,
constant-time behaviour or remote-target correctness. A responsive wrong DB target
remains a neutral fallback unless independent evidence proves a service failure.

## Browser QA

Installed headless Chrome with a separate empty profile, loopback debugging and the
isolated production build; no Playwright/new package or existing browser profile.
The in-app browser Node REPL tool was unavailable after discovery, so this fallback
was stated before use. All sessions/owners/amounts are synthetic; private cookies,
request bodies, DB credentials and profiles are excluded from the review archive.
Session fixtures exercise actual JWT/session/ownership validation against real PG,
and are not presented as a live Google login.

Actual U08 preview/save: B45000,R15000,S3000,F17000; two-tab stale conflict retains
the losing 460.00 input. A response-stage network reset after actual COMMIT shows
unknown outcome; explicit original-key status resolves success without another save.
U15 CARRY+disjoint PAID saves safe53000; U16 FRESH_START+disjoint release saves safe1900.
Before/after amounts, full reserves, funding months and copied evidence are visible.

[Geometry record](hb-017-browser/geometry.json): 36 combinations RU/DE/EN ×
light/dark/system × 320/375/768/1280 CSS px, no page horizontal overflow, form buttons
at least44px. Locale/theme changes retain raw `89,00` in the mounted form. Dirty link
navigation was explicitly declined and retained input. Invalid balance focuses its
field; Tab moves to observedDate. AX tree exposes the h1 and labelled amount input;
reduced-motion media was exercised. Negative-F preview remains valid without saving.
Only the nonfinancial theme preference key is persisted; sessionStorage, IndexedDB
and Cache Storage inventories are empty. No financial persistence/recovery after
reload/crash/OAuth redirect is promised.

Representative images: [U15](hb-017-browser/disjoint-C-en-1280.png),
[U16](hb-017-browser/disjoint-F-en-1280.png),
[DE320 light](hb-017-browser/form-de-light-320.png),
[RU375 dark](hb-017-browser/form-ru-dark-375.png),
[unknown outcome](hb-017-browser/unknown-en-375.png),
[auth matrix](hb-017-browser/auth-copy.json).
320px layout covers the CSS reflow width corresponding to1280px at400%; native OS
screen reader, physical mobile keyboard and browser-toolbar zoom were not claimed.
Contrast was visually inspected in the included light/dark images; this is not a
formal automated WCAG audit.

Cold restart of the final production build also loaded the confirmed90.00 form
and original19.00 result/history, with before/after and recorded Berlin time,
without automatic resubmit. [Final cold-read image](hb-017-browser/final-cold-history-en-1280.png).

## 51 scenario IDs: executable mapping

U = tests/budget-update-planning.test.ts; P = tests/integration/update-budget.test.ts;
C = tests/update-budget.test.tsx; B = tests/hb017-budget-boundary.test.ts;
A = tests/auth-callback-diagnostics.test.ts; L = tests/auth-error-message.test.ts.
Existing HB-008–016 regressions supplement the focused cases, rather than being
mislabelled as new exact HB-017 scenario execution.

| ID | Primary evidence and limits |
| --- | --- |
| HB17-U01 | U exact47000/12000/428/r16; pure input unchanged |
| HB17-U02 | U zero/one/MAX; existing projection no-observation/known-earmark regressions |
| HB17-U03 | U equal actual creates C; P exact replay |
| HB17-U04 | P allocation-only REUSE retains C/date/earmarks; U CARRY reuse |
| HB17-U05 | U sum/sign/range rejection; existing checkpoint duplicate/sum regressions |
| HB17-U06 | U unavailable expected cash rejected; actual received future cash protected |
| HB17-U07 | U one-cent/MAX; C localized exact codec; existing calendar/money UTC/LA |
| HB17-U08 | U exact17000/daily607/r4; P all-stream evidence; real browser save |
| HB17-U09 | U unchanged payment acknowledgment; C payment/reuse; existing HB-011 payment suite |
| HB17-U10 | U outside-card conservative rejection; existing HB-011 evidence regressions |
| HB17-U11 | U cancellation+increase32000; existing possible/full-reserve lifecycle tests |
| HB17-U12 | U CARRY reuse; P U15 transition proof; existing HB-013 actual/negative-F cases |
| HB17-U13 | U FRESH_START; P U16; existing HB-013 future edits/preserved cash refusals |
| HB17-U14 | U8 parameterized same-identity actions; P preview+direct confirm NONE; C draft refusal |
| HB17-U15 | U/P exact53000; real Chrome CARRY+different PAID save |
| HB17-U16 | U/P exact1900; real Chrome FRESH_START+different release save |
| HB17-P01 | P one aggregate/counters/shared C/V/position/receipt, real browser U08 |
| HB17-P02 | P exact replay, no new scoped rows; immutable original proof |
| HB17-P03 | P same-key payload conflict/cross-key compound identity; existing HB-013 replay suite |
| HB17-P04 | P identical real lock waiters, one receipt |
| HB17-P05 | P distinct waiters one stale loser; real browser two-tab retained input |
| HB17-P06 | P savings/audit INSERT and deferred COMMIT failure, complete row baseline |
| HB17-P07 | P real lost COMMIT ack; real Chrome response loss/status; rollback retry |
| HB17-P08 | P foreign scope receipt/status; B five separately authorized operations; actual no-cookie action |
| HB17-P09 | U obsolete K; P lock race stale revision; existing history/head guards |
| HB17-P10 | P real REPEATABLE READ snapshot across concurrent writer |
| HB17-P11 | P historical C7 preserves C10 and dual bank labels; existing suffix-conflict suite |
| HB17-P12 | P nonempty report unchanged/pending, invalid manifest; existing original-drift regressions |
| HB17-P13 | P cancellation/new action refusal; original replay at pinned date; existing HB-013 terminal races/calendar |
| HB17-P14 | B input capture/freeze before auth await; P missing proof; existing limits/audit/identity tests |
| HB17-X01 | C initial form; actual no-account browser and account-scoped route |
| HB17-X02 | U exact gap; C preview/confirm split; real server preview |
| HB17-X03 | C edit invalidates review; late preview/pending state guarded |
| HB17-X04 | C REUSE cannot pay; U ack contract; actual browser fresh-payment consent |
| HB17-X05 | C no preselected modes/consents; actual U15/U16 explicit choices |
| HB17-X06 | C double click once; P same-key backend proof; browser separate confirm |
| HB17-X07 | C safe refusal, input retained; real field focus/negative-F preview |
| HB17-X08 | C receipt survives history read failure; real saved result after async read |
| HB17-X09 | P immutable copied review/history; browser original result; original H/K proof |
| HB17-X10 | C retained memory input; real locale/theme/dirty decline; storage inventory |
| HB17-X11 | C original-key status; real response loss/status; no offline recovery promise |
| HB17-X12 | C3 locales/exact codec; real3 locale matrix; existing early-year/leap regressions |
| HB17-X13 | 36 real geometry cases, targets/AX/focus/keyboard/reduced motion; physical AT/toolbar zoom not performed |
| HB17-X14 | Existing financial/calendar UTC/LA; P REUSE no freshness reset; browser current civil date only |
| HB17-A01 | P real unavailable local PG; L3 locale copy; identity-independent classification |
| HB17-A02 | A actual callback policy/binding denial; existing real-PG auth repository tests |
| HB17-A03 | Частично: A actual callback cancel/state/nonce/PKCE/token failure; отдельное публичное сообщение known OAuth failure не полностью реализовано. Medium принят владельцем без исправления; полный scenario PASS не заявляется; no live Google |
| HB17-A04 | A/L invalid-config vs ambiguous query; actual browser Configuration fallback |
| HB17-A05 | A actual session storage exception fail-closed; B authorization denial; existing auth ownership suite |
| HB17-A06 | A safe log sentinels/no global state; actual browser9 spoofed query cases |
| HB17-A07 | A actual callback/session positive/no-enumeration class; real no-cookie/Origin action checks and PG ownership |

The original51-ID acceptance inventory is retained. HB17-A03 is partially met with
the explicit owner-accepted Medium exception above, not a full scenario PASS. The table distinguishes exact newly
executed cases, reused equivalent guarantees and browser/physical-environment limits;
it does not claim an exhaustive cross-product of every alternative in the prose.

## Commands, current-run results and integrity

Environment: Windows PowerShell, Node22.23.0, pnpm12.16.1, installed
Next16.4.3/React19.3.1/Auth.js5.0.0-beta.32/Vitest5.0.5, PostgreSQL18 in the
explicitly owned HB-017 disposable loopback container. No package installation.
All local URL values/session fixtures remain in ignored private preparation files.

The complete verification copy had no `.env*`; child processes received a clean
environment. Before each DB invocation the driver rechecked exact container ID,
task/run labels and127.0.0.1 binding, then set all three DATABASE_URL,
DATABASE_URL_UNPOOLED, TEST_DATABASE_URL plus both local-target markers. Remote
destinations were never used. Existing migration chain was applied twice via
the direct script, avoiding the package command's optional .env.local loader.

| Executed command in isolated copy | Result |
| --- | --- |
| pnpm.cmd --config.verifyDepsBeforeRun=false lint | PASS |
| pnpm.cmd --config.verifyDepsBeforeRun=false typecheck | PASS (next typegen + tsc; repeated after final test assertions) |
| pnpm.cmd --config.verifyDepsBeforeRun=false build | PASS, all9 routes including /update-budget |
| node scripts/check-finance-coverage.mjs init `<evidence>` | PASS, new current-run identity |
| pnpm.cmd --config.verifyDepsBeforeRun=false test --reporter=default --reporter=json --outputFile.json=`<evidence>/unit.json` | TZ=UTC:828/828,37 files |
| node scripts/check-finance-coverage.mjs record `<evidence>` unit | PASS |
| node --conditions=react-server --import tsx scripts/db-migrate.ts | PASS ×2, all targets independently checked before each call |
| pnpm.cmd --config.verifyDepsBeforeRun=false test:integration --reporter=default --reporter=json --outputFile.json=`<evidence>/integration.json` | 325/325,9 files |
| node scripts/check-finance-coverage.mjs record `<evidence>` integration | PASS |
| node scripts/check-finance-coverage.mjs timezone `<evidence>` | 509/509,14 files, America/Los_Angeles |
| node scripts/check-finance-coverage.mjs record `<evidence>` timezone | TZ=America/Los_Angeles:PASS |
| node scripts/check-finance-coverage.mjs check `<evidence>` | PASS:498 scenarios,680 obligations,951 runtime references |

`--config.verifyDepsBeforeRun=false` is a process-only flag for the already installed
pnpm tree, not a config/dependency change. The finance gate retains its existing
foundation inventory:442 required/54 partial/2 deferred. It does **not** automatically
add the51 HB-017 IDs; their separate matrix above and focused test records are
required evidence. Existing manifest associations/assertions remain intact; only
hashes for changed normative contexts were refreshed.

The final implementation-stage current-run ID was `43ce7f1b-f0d3-496b-a89e-813edcd102db`, fingerprint
`2987f4b1ea0ffe4f6d0f7690e5dd5ef3832812d4f1e0ab3c92cfc1476d54582d`.
See [per-test results and raw-report digests](hb-017-evidence/executed-tests.json)
and [source integrity](hb-017-evidence/source-integrity.json). Source integrity proves
241 source/test/migration/script files byte-identical to the tested copy,34 existing
normative contexts consistent, historical tests unchanged, schema/config/deps/ADR/BR
unchanged and index empty. The previous complete passing run is retained separately;
the final run adds explicit advanced-head replay and changed-lifecycle same/cross-key
refusal assertions, with unchanged overall test counts.

Tracked `git diff --check`, separate no-index whitespace checks for new text files,
local links/anchors,51-ID completeness and private QA password/cookie sentinel scans
are checked before packaging. No real secrets were read for scanning. Archive and
per-source SHA-256 are supplied as companion artifacts; an archive cannot contain
its own final digest without changing that digest.

After preserving evidence and verifying the tested source copy, only the created
HB-017 QA server/container/profile and temporary runtime copies were removed.
Temporary executable helpers were preserved in a task-specific OS temp directory,
so they do not interfere with the repository's normal lint scan. Initial document
snapshots, baseline patch, private synthetic setup and raw evidence remain ignored.
The original project node_modules and every other container were retained. Root
`pnpm.cmd --config.verifyDepsBeforeRun=false lint` was then actually run:PASS.

Final Git state: branch `feat/hb-017-update-budget`, HEAD unchanged at the stated
base; index empty;23 tracked modified files plus new implementation/tests/docs/
synthetic browser evidence. No deletions, commits or publication. The exact complete
changed-file list and SHA-256 for each source/artifact are included with the ZIP.
Historical implementation-handoff status was **Review**, before the later Owner
Acceptance above; current HB-017 status is **Done with the accepted Medium exception**.

Final document checks:156 existing local link targets,17 anchors,51 unique complete
scenario IDs; separate whitespace checks for32 new text files; tracked diff check,
original owner-document preservation and private QA sentinel scan all PASS. Synthetic
screenshots/evidence are included; DB dumps, .env*, sessions/cookies, private setup,
build/dependency trees, .git and .vscode are excluded from the review ZIP.

## Corrections discovered during verification

Initial transition persistence lacked sourcePeriodIds in its manifest; existing SQL
guards rejected it and the manifest was corrected. Original vector proof first
compared DB metadata with pure fields; it now explicitly compares immutable semantic
coordinates/allocations. Direct same-identity confirm without proposal initially
reached a SQL UUID error before candidate refusal; ordering was corrected. Later
nonfinancial period controls exposed a replay source-union risk; the existing pure
affectedPast result is now shared by writer/proof, with real-PG regression.

A new boundary test accidentally replaced the existing HB9-U18 filename during
development; the original was restored byte-for-byte and the new tests moved to
hb017-budget-boundary.test.ts before final verification. No historical test identity
or assertion is intentionally removed. Root lint encountered nested temporary
verification copies; final lint uses the clean isolated copy. One full unit run
failed because that copy initially omitted .github/workflows/ci.yml required by the
HB-015 fingerprint; the copy helper was corrected, without changing product config.
QA-driver selector/timing errors were corrected before browser success claims.

## Remaining risks and review focus

Known accepted Medium: HB17-A03 lacks the fully implemented separate public message
for reliably known OAuth failure. Owner Acceptance does not resolve this finding.

One deliberately unsupported MVP action is same-identity lifecycle+funding transfer;
multi-source CARRY and risky historical suffix corrections retain existing refusals.
Memory-only drafts may be lost on reload/crash/OAuth redirect. History/projection
bounds can conservatively refuse a large account; no partial/truncated finance is
displayed. Preview controls can leave unused immutable proposal/period rows, without
financial writes. Review the replay proof, original report drift handling, actual
auth no-enumeration classification and financial source/test integrity independently.
Live Google/production/deploy and real data are outside the performed local evidence.

## Documentation finalization checks — 2026-11-03

Only four files changed relative to the preserved start of this documentation turn:
`docs/TASKS.md`, `docs/DECISIONS.md`, this verification report and
`tests/finance/coverage.json`. The other429 existing tracked/untracked files are
byte-unchanged; prior decisions are preserved. No source, test assertions, financial
formulas, schema, dependencies/config, ADR or existing evidence was edited.

Exactly two existing normative context SHA-256 values were refreshed, for TASKS
and DECISIONS. The manifest passed the existing `validateManifest` checks. Earlier
implementation fingerprints/context records above describe their original snapshot;
they were not reused as current-documentation gate evidence.

A fresh current-run gate was executed after updating the normative hashes:
`init`; UTC `pnpm.cmd --config.verifyDepsBeforeRun=false test` with JSON reporter;
`record unit`; existing migration script twice; local PostgreSQL
`pnpm.cmd --config.verifyDepsBeforeRun=false test:integration` with JSON reporter;
`record integration`; `timezone`; LA `record timezone`; final `check`.
Results: **828/828 unit/component (37 files), 325/325 PostgreSQL integration
(9 files), 509/509 America/Los_Angeles (14 files)**. Final checker: **PASS**,
498 foundation scenarios (442 required /54 partial /2 deferred),680 obligations,
951 runtime references. No tests were changed to obtain these results.

The PostgreSQL run used a newly created, explicitly labelled own disposable container
from the already installed postgres:18 image, verified Docker local context,
127.0.0.1 binding, all three URL overrides and both target markers. Ownership/port
were rechecked before every DB invocation. Only that container and its own volume
were removed afterwards. No Neon/production/live OAuth or other container was used.
Raw current-run JSON/receipts/logs are retained in the local evidence directory
identified by ignored `tmp/hb017-preparation/acceptance-location.json`.
Current documentation runId: `f8c2dbfe-3c4e-4670-b517-b76c4de72183`; fingerprint:
`24685b395828f6d8ee2ad6e72efd0b2d2fae1554dc801c5a4a27799a237a7e86`.

The normal tracked `git diff --check` and the separate no-index whitespace check
for this untracked report passed. Local links/anchors in all three edited documents
were checked (83 targets /12 anchors). The index remains empty; no commit, push,
PR, merge, deploy or publication was performed.

**The passing manifest/gate validates its executed scope; it does not prove the
missing separate public OAuth-failure message or full HB17-A03 acceptance-criteria
PASS. That Medium remains explicitly accepted without a fix.**
