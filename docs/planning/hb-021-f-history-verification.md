# HB-021 F — Financial History verification

2026-11-14. Scope F only; ready for independent review, not HB-021 Done.
Branch `feat/hb-021-e2e-harness`, HEAD `f8bfca7f836271cff87858c04be2cbf3643ce4e9`; no main synchronization.

Added 14 files: `playwright.history.config.ts`; `scripts/e2e/history-{run,harness}.ts`;
`tests/e2e/support/history-{server,reporter,fixture,seed,control,proof,census,report-oracle}.ts`;
`tests/history-e2e/{history.spec.ts,README.md}`; this report. Exact additions: archive `F-only.patch`.
No existing A–E, production, domain, auth, schema/migration, grants, Finance Gate, CI or release file changed.

| Scenario | Final result | Independent proof |
|---|---|---|
| HBH-001 / F-01, F-08 | PASS | Physical census45, pages20/20/5, source families, legacy/correction/lifecycle/reports, no gaps/duplicates; invalid source visibly rejected |
| HBH-002 / F-02 | PASS | Same completed H: B80000/A60000/F30000/end UNKNOWN versus76000/56000/26000/observed76000 at retained real K; current B100000 separate |
| HBH-003 / F-03 | PASS | Daily versus immutable v1/v2; full persisted report envelope/snapshot/manifest/digest; explicit v1, chunk and reload; no publication |
| HBH-004 / F-04a/b/c | PASS (3 tests) | Unknown, observed zero with R2000/S1000/F−3000, and no C/V with known R/S remain distinct |
| HBH-005 / F-05 | PASS | Original identity, funding once, payment order, confirmed B80000 without second debit, retained S, immutable old reports |
| HBH-006 / F-06 | PASS | Real append45→46, pinned K/index, Previous/Next/filter/refresh, genuine mismatched response basis rejected, foreign/tampered/oversized requests refused |
| HBH-007 / F-07 | PASS, EN desktop scope | Three perspectives, H/K labels, navigation/errors/reload/privacy and no-write |
| HBH-007 H/I matrix | NOT EXECUTED | Full RU/DE/EN × responsive × native200% and physical AT deferred to H/I |

Real Chromium → independently built Next.js → existing Server Actions → disposable PostgreSQL18.
Each case uses a fresh migrated database/server and SELECT-only `hb_f_runtime`, no DML/DDL or migrator membership.
Independent secrets, clean environment/checkout/Docker config, own internal namespace, no published ports/default route;
only package installation has external access, with no source/DB/secrets. No private env files or cloud/provider access.
Privileged fixture seeding ends before browsing; F-06 alone has a separate marker-controlled fixture append process.
App/browser never receive its credentials. Actual Server Action replies are used, including the basis-mismatch test.
All20 public tables, foreign/user rows and retained receipts/reports are compared; fixture writes are accounted separately.

H is the previous completed Berlin month end, derived from PostgreSQL, with real source K/ordering anchors.
Funding/payment source dates remain the eligible current month/actual day required by existing writers, not invented past dates.
No arbitrary intra-day reconstruction (HB-027), fake server clock, inferred movements or financial formula changes.

Final source fingerprint (421 executed files): `de9a44d46eb9c3124650530e87c99a46d8512230494d269b4489e48bd43c4f42`.
Final run `149ff2d536ca257a8ba293cb8a4e59b4`: 10/10 PASS, 0 skipped/flaky, retries0; build exit0; cleanup exit0.
Final full lint/typecheck inventory matches this fingerprint exactly. Report/README packaging is outside the executed inventory.

| Command / evidence | Exit | Result |
|---|---|---|
| `node --import tsx scripts/e2e/history-run.ts` | 0 | Final10 Chromium E2E; own `node node_modules/next/dist/bin/next build` exit0; migrations twice unchanged, per-case migrations/cleanup exit0 |
| `node --import tsx scripts/e2e/history-run.ts --verify` | 1 | Earlier run `784095d88c03c2168814b21b1d659f5e`: browser9/10, F-03 oracle FAIL; scoped unit29/29 and PG17/17 PASS, each child exit0; lint/typegen/types/build exit0 |
| `node --import tsx scripts/e2e/history-run.ts --case=F-03` | 0 | Corrected oracle targeted PASS, run `0ee255271ad9561a37927e29069b7326` |
| `node --import tsx tmp/hb021-f/static-check.ts --types-only` | 0 | Final clean checkout: Next typegen, full `eslint . --max-warnings=0`, `tsc --noEmit`, all exit0; checkout removed |
| `node tmp/hb021-f/audit.mjs` | 0 | 419 approved files byte-identical; original three ZIPs and792 manifest entries preserved |
| `node tmp/hb021-f/oracle-binding.mjs` | 0 | Lower-test reuse proved by hashes: only F-03 test oracle changed after scoped unit/PG run; no production/lower source changed |
| `node --import tsx tmp/hb021-f/docker-audit.mjs` | 0 | Exact own-run label checks across13 runs: 0 remaining containers/networks/volumes |

Scoped lower commands (inside isolated runner, both exit0):

```text
node node_modules/vitest/vitest.mjs run tests/financial-history-boundary.test.ts tests/financial-history-feasibility.test.ts tests/financial-history-ui.test.tsx tests/history-summary-boundary.test.ts --reporter=json --outputFile=/work/test-results/f-lower/unit.json
node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts tests/integration/financial-history.test.ts --reporter=json --outputFile=/work/test-results/f-lower/pg.json
```

Versions: Docker Node26.13.1, pnpm12.16.1, Next16.4.3, Playwright1.65.0, Chromium158.0.8127.18,
PostgreSQL18.6 (180006); host Node22.23.0. Pinned image identities, per-command exits and durations accompany evidence.

Earlier FAILs remain in evidence, not reclassified: two seed ENOENT failures; one Docker Desktop/WSL unavailable before resource creation;
one schema-unqualified privilege probe; one DOM locator incorrectly assuming root batch ID is displayed;
one TypeScript event overload error; one alert locator also matching Next route announcer;
one F-03 oracle incorrectly equating the entire report document with its snapshot-only DB column.
The corrected oracle independently reconstructs the full persisted envelope and checks snapshot/manifest/original digest.
These were fixture/harness/oracle failures; no production defect or financial behavior change was required.
There were13 runs: 5 PASS, 8 FAIL, including the environment failure; all actual failed reports are retained.

Resources across13 runs: 60 created/60 removed (owned PG/runner/installer containers, networks, build volumes).
Final run: own5 Docker resources and10 child databases removed. Failed seed databases disappeared with their own tmpfs PG container;
they are not claimed as explicit successful DROP operations. Temporary checkouts removed; no foreign resources deleted.

NOT EXECUTED here: A–E E2E, full unit/integration, DB17, timezone suite, Finance Gate (deferred J),
Google provider login/relogin and H/I matrix above. Prior Gate PASS is not a new result.
Calendar rollover fails closed; no midnight/DST simulation or physical AT claim. Synthetic Auth.js sessions prove session-authenticated browsing only.
No commit/push/PR/merge/deploy, main sync, G–J implementation or task completion. Stop after F for independent review.
