# HB-021 G — month closing browser proof

Run one case while developing:

```text
node --import tsx scripts/e2e/closing-run.ts --case=G-01
```

Final G plus scoped lower checks:

```text
node --import tsx scripts/e2e/closing-run.ts --verify
```

Standalone launcher reuses approved A safety primitives without modifying A–F.
Fresh clean checkout/build, pinned PG18/Chromium, internal Docker namespace with no
published ports/default route, guarded exact targets/container IDs, owned cleanup.
Only package acquisition has external access and receives no source, DB or secrets.
No env/private config copied. Actual Berlin calendar, previous completed month,
real source ordering and K; never fake server clock or bypass future guards.

New disposable-only `hb_g_runtime`: SELECT plus INSERT on budget_periods,
budget_updates, month_closings, report_heads, audit_events; UPDATE only account
aggregate_revision/recorded_seq and report_heads closing_id/correction_pending.
`users.theme` UPDATE is required solely for the existing writer's owner-row
`FOR UPDATE` admission (as in E); every user row remains byte-identical.
No bank/vector/lifecycle writes, DDL, DELETE or migrator membership. Independent
random secrets. Privileged synthetic setup ends before browser. G-04 alone uses
a separate coordinator for one real late paired checkpoint/vector; its credential
is absent from app/browser. G-06 installs a disposable-only trigger to reject an
actual audit insert, so all preceding report/head/receipt writes must roll back.
No production grants/schema/migrations/auth change. B remains SELECT-only.

| Case | Scope |
|---|---|
| G-01 | HB19-E08/B01: incomplete v1, UNKNOWN, actual older bank date, source H/K, CLOSE whitelist, complete document/digest/receipt, reload/replay |
| G-02 | HB19-A01: observed final-day nonzero versus later current balance |
| G-03 | HB19-A04/HBUX-028: observed zero, R2000/S1000/F−3000, current100000 cannot replace0 |
| G-04 | HB19-E09: late final-day paired fact, correctionPending, explicit reason, cancel/review/v2 Confirm, immutable v1, predecessor/current head, chunks/reload |
| G-05 | HB19-B/C: two independently reviewed tabs, stale rejection; wrong head/version, no change, foreign owner refusal, all-table no-write |
| G-06 | HB19-B08: real PostgreSQL audit failure, exact20-table rollback, no partial report/head |
| G-07 | HB19-E12/R02: real saved commit, browser response loss, status exact original receipt, foreign request non-disclosure |
| G-08 | HB19-E12/R01: independent response-loss branch, explicit original-key/payload retry, one receipt/report |
| G-09 | HB19-Q06/HBUX-035: known saved receipt followed by failed history reread; saved message retained, safe refresh without recommit |
| G-10 | HB19-Q07: /savings → /months → completed month v1/v2, actual chunks/reload/render; NOT REPRODUCED if no exception, never claim FIXED |

Real Chromium → Next.js → Server Actions → PostgreSQL. Preview/confirm/status
identities come from actual browser traffic. Review reads every evidence page and
uses normal consent; no handler injection or fabricated happy-path response.
Fault routes forward the original request to the real server, verify durable
success, then drop only its response; the independent saved/read-failure case
delivers commit success and drops the subsequent read. Browser transport loss is
not a claim of lost PostgreSQL COMMIT acknowledgement: scoped existing PG tests
exercise real COMMIT then a connection error and fresh-instance status/replay.

Independent full report oracle reuses approved F physical scalar/snapshot/manifest
reconstruction and canonical digest; no production projection used as its oracle.
Close write whitelist compares every old row in all20 public tables, pointer,
counters, reports/heads/audits/receipts. Read/preview/cancel/refusal/replay are exact
no-write. Fixture setup/late append and synthetic fault trigger are separate.

BN cases G-01/G-04 use HB19-E08 R30000/S0, B80000/A60000/F30000/endUNKNOWN;
late end76000/A56000/F26000. Other ordinary cases use the approved HBH fixture
R20000/S10000 with the same F. Current real observation100000 is not historical
cash; no artificial carry is added just to close. G-10 reuses approved F v1/v2
funding fixture. No financial rule or schema change.

No retries/skips/xfail, auth traces/storageState, real/customer data or cloud/OAuth
provider access. Synthetic Auth.js session proves session-authenticated browsing,
not Google login. EN desktop only here: locale/responsive/native200%/physical AT
remain H/I. Full A–F/unit/integration, DB17, timezone and Finance Gate remain J.
Status/results belong to the verification report; no test name claims execution.
