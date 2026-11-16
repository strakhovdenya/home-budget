# HB-021 D — financial browser proof

```text
node --import tsx scripts/e2e/finance-run.ts --case=D-02
node --import tsx scripts/e2e/finance-run.ts
node --import tsx scripts/e2e/finance-run.ts --verify
```

First command selects one new/changed case; second runs D only. `--verify` runs
all 17 D cases, the listed D financial unit/PG files, B-01/B-12 browser and the
existing read-only PG boundary, C-03 browser and two onboarding PG boundaries.
It does not execute full A/B/C, full unit/integration, DB17, LA suite or Finance
Gate. Next build/start is required to exercise actual Server Actions. No library
or production code changes. Incoming URL overrides are refused.

The new launcher repeats C's owned Docker namespace setup using unchanged A
safety primitives: pinned PG18/browser images, empty Docker config/allowlisted
env, isolated source/dependency volume, installer without source/DB/secrets,
internal network/no default route/host ports, PG and Next on namespace loopback,
strict container/image/nonce/URL identity, own server with reuse disabled.
Original A/B/C source is kept byte-identical to the approved baseline.

Each case gets a new migrated synthetic DB. Privileged seed finishes before
browser tests. Independent `hb_d_runtime` gets SELECT and INSERT only into the
15 budget/fact/funding/audit tables needed by D, UPDATE only three account head/
counter columns, users.theme and transfer_proposals.id for PostgreSQL row locks.
No account INSERT, identity update, DELETE, DDL, closing/report/template/config
write grants. B remains SELECT-only. Runtime/Playwright never get migrator or
verifier passwords. Exact registered child DB is dropped after browser exit and
evidence copy; parent target is forbidden; only owned Docker resources are removed.

| Case | Oracle / proof |
|---|---|
| D-00 | Existing technical account UNKNOWN then explicit observed0, no recreation |
| D-01 | HBUX-006/014/F-003 full A, cancel no-write, future isolation, same B new check |
| D-02 | F-001 B90000 R14600 F75400; subsequent full payment, no double debit |
| D-03 | F-002 unchanged B50000 warning/affirmation, R14600 F35400 |
| D-04 | F-007 cancellation releases R, B50000 unchanged, distinct CANCELLED |
| D-05 | F-006/BR-03 unelected possible R0 vs elected full20000, F-5000 safe0 |
| D-06 | F-008 B40000 R20000 S5000→3000→4000→0, explicit release/increase |
| D-07 | HBUX-001/002/005/007 FRESH B80000 R20000 S15000 F45000; separate PAID B60000 F45000 |
| D-08a/b | HBUX-011/012 CARRY actual/reuse, B90000, R30000 S5000, target once, funding lineage |
| D-09 | HBUX-013/015 explicit DEFER B80000 M40000/P40000, old O/S unchanged |
| D-10 | HBUX-008/009 moving same O/S edit refuses; disjoint CARRY+PAID B88000 R30000 S5000 F53000 |
| D-11 | HBUX-023 stale revision exact no-write and original receipt replay |
| D-12 | F-010 backdated B48000, current45000; same H at K before/after50000→48000; retained history |
| D-13 | ADR0003 B20000 P15000/Q5000 R[Q]10000: F[P]15000, safe10000, integer daily; Berlin vs LA device |
| D-14 | F-005/HBUX-024 negative/future/malformed refusal, anonymous writable confirm denial, cancel |
| D-15 | HBUX-018/021 missed-period FRESH B8000 R9000 S2000 F-3000, full protections retained |

All happy confirmations are actual browser form→Next→Server Action→PostgreSQL,
not mocked APIs. Only negative/replay requests use captured real action packets;
one unsent confirm is deliberately aborted to test anonymous denial. D36 oracle
uses independent integer arithmetic/PG facts, not the production forecast engine.
Read-only/cancel/rejected phases compare all 20 public tables; existing transition
preview may persist one owned technical transfer_proposals record and its missing
current calendar budget_periods row (ADR0002 optional calendar opening). These
exact added records/ownership/current period are checked, all previous rows and
every other table must remain equal. Financial facts/counters/audits/receipts are
unchanged. Abandoning that preview itself must not write anything.

Snapshots verify foreign users/rows unchanged and existing facts retained bytewise.
Actual dates/relative P/Q/M are retained as safe annotations. Berlin midnight
invalidates a run. Real DST/midnight events, provider OAuth, E–J are NOT EXECUTED.
No cookies/HAR/trace/video/screenshots, raw drafts or request payloads are exported;
sanitized evidence records booleans/counts, safe annotations and source hashes.
