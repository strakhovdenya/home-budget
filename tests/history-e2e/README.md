# HB-021 F — saved financial history browser proof

Execution status belongs to the verification report, not this source document. No test is skipped, expected-failed or retried. Browser/session proof uses the approved synthetic Auth.js session; it does not prove Google provider login/relogin.

```text
node --import tsx scripts/e2e/history-run.ts --case=F-02
node --import tsx scripts/e2e/history-run.ts --case=F-01
node --import tsx scripts/e2e/history-run.ts --case=F-06
node --import tsx scripts/e2e/history-run.ts --verify
```

The standalone F launcher preserves A–E. It uses approved safety/copy/target/container/namespace/cleanup primitives, pinned PostgreSQL18 and Chromium images, clean environment/Docker config, a fresh checkout/build/internal network, no published ports/default route, tmpfs and independent secrets. Every case has a new migrated database and Next server (`reuseExistingServer:false`). Only the dependency installer acquires public pinned packages externally; it has no source, DB namespace or secrets. No env/private configuration or user Docker credentials are copied. No production initializer or cloud/provider connection is used.

The F runtime has **SELECT only**, with no DML, schema or migrator membership. Browser writes are neither needed nor granted. Fixtures use existing real writers/closing repositories in a separate verifier process ending before the browser. F-06 alone starts a separate privileged coordinator, waits for an explicit marker after the first browser page and commits one genuine same-bank redistribution with an explicit title-only obligation amendment, preserving B/A/R/S totals. The app/Playwright never receive that process's credentials. This fixture append is checked separately; browsing before and after it is exact no-write. Each completed case drops only its own generated database; ID/label checks precede removal of run resources, including on failure.

| Tests | HBH proof |
|---|---|
| F-01 | HBH-001: independent physical registry and all13 source families, exactly45 batches/pages20/20/5, legacy transition without aggregate review, superseded checkpoint correction, lifecycle/report, Previous returns the original page |
| F-02 | HBH-002: same completed H, real original source K versus later index K; 80000/60000/F30000/end UNKNOWN versus76000/56000/F26000/end76000; current B100000 untouched |
| F-03 | HBH-003: daily and immutable v1/v2 are separate; whole persisted report documents, predecessor/H/K and displayed amounts; explicit `/months?period=M&version=1`, real chunk read and reload |
| F-04a/b/c | HBH-004: incomplete end with last-known80000, observed0/full R2000/S1000/F-3000, and no C/V with known R/S but unknown cash/A/F/end |
| F-05 | HBH-005: original identity/lineage/order, funding once, PAID, B80000 not60000, retained S, old completed-M reserve/report unchanged; actual source evidence, not invented intra-day state |
| F-06 | HBH-006: explicit independent append45→46 between pages, pinned cut/index and Previous/Next, filter/refresh; foreign/tampered/16384-byte-bound requests and detail bounds; genuine different owned basis rejected by UI; pinned source excludes the newly amended live title |
| F-07 | HBH-007: EN desktop main navigation, original/later/report captions, date/cut, honest error/reload, no financial URL/browser persistence/logs, no live past daily guidance, exact no-write |
| F-08 | HBH-001/006: synthetic missing-source batch remains visibly invalid; filtered request safely refuses rather than reporting empty complete history |

All browser operations use real Chromium → built Next.js → existing Server Actions → owned local PostgreSQL. Server Action identifiers come from actual requests. The F-06 basis test forwards an actually modified valid request to the real server and relays its unchanged successful response; it never fabricates a success payload. Invalid/oversized requests also reach actual Server Actions. The entire echoed basis must be rejected before combining pages.

Independent oracles read physical tables using the SELECT-only role. For daily expectations they resolve correction tips at K before filtering H, then compare bank/vector IDs, full integer A/R/S/F/end and rendered values. No production assembler/projection is used as its own oracle. All20 public tables, users/foreign rows, receipts, counters/pointer, immutable report bytes and source IDs are compared. Confirmed same-day positions/order remain evidence; no through-position picker or HB-027 reconstruction is introduced.

H is the end of the previous **completed** Berlin month M, derived from PostgreSQL, with no fake server clock. K0 comes from the retained original batch; later K/index and report-specific cuts come from real rows/anchors. Legacy funding/payment source facts use the real eligible current-month first day and actual confirmation day, as required by the existing current-target writer, while historical H/K assertions use completed M. Their source dates are not relabelled as M-end or arbitrary intermediate daily states. Payment/amend/redistribution use the actual current day with explicit existing day-order placement, including on day01; no future fixture date is introduced. Calendar rollover invalidates a case rather than changing the oracle.

`--verify` runs all F E2E, only the four financial-history unit/component files and `tests/integration/financial-history.test.ts`, plus F lint/typecheck/build. It does not rerun A–E E2E, full unit/integration, DB17, timezone suite or Finance Gate. Full RU/DE/EN × responsive × native200% and physical AT remain **NOT EXECUTED**, explicitly deferred to H/I; calendar midnight/DST is not simulated by browser clock. No commit/push/PR/merge/deploy, G–J work or Done.
