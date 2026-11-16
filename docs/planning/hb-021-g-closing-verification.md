# HB-021 G — blocked by a reproduced closing UI defect

2026-11-14. G is **not complete**. Dependent implementation stopped for owner decision;
no production correction applied. Branch `feat/hb-021-e2e-harness`, HEAD
`f8bfca7f836271cff87858c04be2cbf3643ce4e9`; no main synchronization.

**HB21-G-R01:** valid late-point preview cannot reach Confirm v2. Twice reproduced
with real Chromium → Next.js → Server Actions → disposable PG18: G-04 runs
`20dd87417800f381a1d98afd4968cc14` and `af0d04003de153304c4854390b4c9ef4`.
Server preview succeeds; UI says “The complete readable comparison could not be
verified. Confirmation is unavailable.” Consent stays disabled. Diagnostic: both
Before/After detail sections1/1, evidence1/1, no unvisited Next page. No v2 commit.

Cause: `src/features/month-closing/review-content.ts:128` identifies coverage by
`[oldPath,path,part]`. Logical-identity matching of source evidence treats a removed
source and a newly added source at the same array index as two distinct rows,
but emits identical coverage identities. `grouped-review.ts` correctly refuses
duplicates (`REPORT_PROOF_INVALID`); `EvidenceReview` catches this and blocks consent.
New minimal unit reproduction **FAILS** with that error, independently of browser timing.

Proposal only, **not applied**: append before/after presence bits to the internal
coverage identity, retaining the first two path arrays and existing grouping/
coverage/consent guards. See archive `proposal/production-not-applied.patch`.
This proposes one production file/line, no report bytes/digest, financial formulas,
auth, schema or stored evidence changes. Production file SHA256 remains
`0428abff506120a297aaac852eee323c2e7b65c935d9606108aa03e89f17db67`.
Proposal is unverified, requires owner scope approval before application. After
approval: reproduce/pass source replacement and genuine-duplicate rejection,
closing content/UI/PG regressions, G-04/G-09 then applicable G checks. Do not modify
Finance Gate/fingerprints; request separate maintenance permission if admission requires it.

| Scenario ID / test | Executed result |
|---|---|
| HB19-E08/B01 / G-01 | PASS: incomplete UNKNOWN v1, original H/K/receipt/audit/digest/full report, reload/replay, invalid chunks refused |
| HB19-A01 / G-02 | PASS: final-day observed80000, distinct from current100000 |
| HB19-A04/HBUX-028 / G-03 | PASS: observed0, A0/R2000/S1000/F−3000, persisted source, current100000 not substituted |
| HB19-E09 closing/version subset / G-04 | **FAIL** twice: review blocked; v2 Confirm/cancel/reload tail **NOT EXECUTED** |
| HB19-B/C stale/no-change / G-05 | PASS: reviewed rival stale; wrong/foreign head, wrong version, no-change, foreign input; exact no-write |
| HB19-B08 / G-06 | PASS: real SQL audit failure, exact20-table rollback, no partial report/head |
| HB19-E12/R02 recovery subset / G-07 | PASS: durable save then response loss, original status/foreign request isolation, exact receipt/replay, one commit |
| HB19-E12/R01 recovery subset / G-08 | PASS: independent response loss, original-key/payload retry, one receipt/report |
| HB19-Q06/HBUX-035 / G-09 | **FAIL**: test expected “Report version1 saved”; actual i18n says “Version1 saved”. Test corrected to i18n key; corrected case **NOT EXECUTED** after stop |
| HB19-Q07 / G-10 | Navigation PASS; defect **NOT REPRODUCED**, not FIXED: actual savings→months, completed-month v1/v2, chunk/reload/render, no page errors/writes |

G-01/G-04 use BN R30000/S0, B80000/A60000/F30000/endUNKNOWN; late end76000/A56000/F26000.
Current100000 is a separate genuine observation; G does not repeat D's CARRY75000/R30000/F45000 journey.
Other ordinary G cases use R20000/S10000 with the same F. G-10 reuses approved F funding/v1/v2 fixture.
All months/dates come from actual PostgreSQL Berlin calendar, H=2026-10-31 here;
no fake server clock or arbitrary intra-day reconstruction. Full E/R/HBUX matrices
are not claimed by these scoped browser cases; locale/responsive/AT remain H/I.

| Exact command | Exit / evidence |
|---|---|
| `node --import tsx scripts/e2e/closing-run.ts --verify` | **1**, run20dd…: browser8/10 PASS, G-04/G-09 FAIL; scoped unit93/93 and PG104/104 PASS (child exits0); lint-G/typegen/types/build0 |
| `node --import tsx scripts/e2e/closing-run.ts --case=G-04` | **1**, runaf0…: diagnostic reproduction; own build0; no skipped/retried tests; cleanup0 |
| `node --import tsx scripts/e2e/closing-run.ts --case=G-01` | Initially1 (TS error, browser not run), then1 (test Flight text-reference decoder), then0 runc13…; all failures retained |
| `node --import tsx tmp/hb021-g/flight-check.ts` | 0; five new transport decoder unit tests PASS in a clean checkout |
| `node --import tsx tmp/hb021-g/reproduction-check.ts` | **1**; `tests/closing-review-source-replacement.test.ts`, one regression FAIL (`REPORT_PROOF_INVALID`) |
| `node --import tsx tmp/hb021-g/static-check.ts --types-only` | 0 on final source: full eslint0, Next typegen0, tsc0; clean environment/checkout removed, no DB access |
| `node tmp/hb021-g/audit.mjs` | 0; 433 approved A–F files and four original archives/manifests byte-identical |
| `node --import tsx tmp/hb021-g/docker-audit.mjs` | Final0; five exact run-label checks, no leftovers. Earlier premature audit1: report absent while G-04 still running; no mutation |
| `git diff --check` | 0 |
| `git apply --check --unidiff-zero tmp/hb021-g/production-proposal.patch` | 0, check only; initial check without `--unidiff-zero`1 (zero-context patch); never applied |

Scoped unit invocation in run20dd…: `node node_modules/vitest/vitest.mjs run tests/closing.test.ts tests/closing-boundary.test.ts tests/closing-ui.test.tsx tests/closing-page.test.tsx tests/closing-review-content.test.ts tests/closing-review-difference.test.ts tests/closing-e2e-flight.test.ts --reporter=json --outputFile=/work/test-results/g-lower/unit.json` (exit0).
PG: `node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts tests/integration/month-closing.test.ts --reporter=json --outputFile=/work/test-results/g-lower/pg.json` (exit0).
PG includes real COMMIT-ack-loss/fresh-instance status/replay, independent connection
barriers/concurrency, SQL rollback and large reports. Browser response loss is not
mislabelled lost PG acknowledgement. New failing unit is additional to the93;
the updated G driver includes it, but that full command has not been rerun.

Full-run source fingerprint: `3c8a322c47d1f6b95119cd74946487eea2928a1d7f436be11d9a0e80ea057e9c` (432 files).
Final review source: `70dbaeb35e657cbe7b473f7ff40fab1e37c07565c58071383c09bec7c8830426` (433 files).
After the full run only G diagnostics, the G-09 label expectation and failing
regression/driver were changed. Existing production and lower sources unchanged;
per-run hashes retained. Final lint/types PASS; **final-source browser/build/full
related unit/PG NOT EXECUTED after stop**. No aggregate final-source PASS claim.
Versions: Docker Node26.13.1, pnpm12.16.1, Next16.4.3, Playwright1.65.0,
Chromium158.0.8127.18, PG18.6/180006; host Node22.23.0. Original command exits in evidence.

Added14 files: `playwright.closing.config.ts`, `scripts/e2e/closing-{run,harness}.ts`,
`tests/e2e/support/closing-{server,reporter,seed,control,proof,flight}.ts`,
`tests/closing-e2e/{closing.spec.ts,README.md}`, `tests/closing-e2e-flight.test.ts`,
`tests/closing-review-source-replacement.test.ts`, this report. Exact additions in `G-only.patch`.

Separate minimal runtime role: SELECT; closing/control/audit INSERT; column-scoped
account/head UPDATE. `users.theme` UPDATE permits existing writer's owner-row lock,
not a user modification; all users remain unchanged. No bank/vector/lifecycle
writes or DDL/DELETE/migrator membership. B stays SELECT-only; independent secrets,
clean env/build, pinned internal Docker namespace, loopback/no published ports,
no default route. Privileged seed ends before browser; G-04 coordinator only adds
one real late paired fact; G-06 fault trigger is disposable setup. Completed close
checks whitelist all20 tables/counters/pointers, old report bytes, receipts and
original command identity; browse/preview/refusal/replay compare exact no-write.

Five Docker runs: 25 resources created/removed (15 containers,5 networks,5 volumes),
13 child databases explicitly dropped; parent/lower-test DBs and the G-06 trigger
removed with owned tmpfs PG containers. All owned checkouts removed; no foreign
resource deletion. Synthetic data only, no private env, cloud/Neon/Vercel/production
or real OAuth. No schema/migration/financial/Auth/Finance Gate/CI/release change.
NOT EXECUTED: A–F E2E, full unit/integration, DB17, timezone, Finance Gate (J),
Google provider login/relogin, full locale/responsive/native200%/physical AT (H/I).
No commit/push/PR/merge/deploy; H–J not started; HB-021 not marked Done.
