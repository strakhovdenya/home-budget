# HB-021 C — synthetic onboarding browser proof

Run from the repository with Docker Engine and the pinned A images already
available. Do not supply any database URL override or application secret.

```text
node --import tsx scripts/e2e/onboarding-run.ts --focused-c --case=C-01
node --import tsx scripts/e2e/onboarding-run.ts --focused-c
node --import tsx scripts/e2e/onboarding-run.ts --focused-db
node --import tsx scripts/e2e/onboarding-run.ts --final --auth
node --import tsx scripts/e2e/onboarding-run.ts --final --auth --fail-after-database
```

The last command intentionally fails before dependency installation; inspect
its cleanup receipt. Final mode requires all B tests and refuses case filtering.
Focused modes do not constitute final regression evidence. Results and exact
source inventory are under `tmp/hb021-bc-reports/<runId>/`.

The separate C runner preserves the approved A launcher and B SELECT-only role.
It uses A's pinned images, clean snapshot/environment, loopback namespace,
container identity checks and owned-resource cleanup. Each C case receives a
new database inside that run's disposable PostgreSQL, existing migrations and
synthetic fixtures provisioned before the browser starts. Fixtures never reuse,
reset or SQL-delete immutable financial rows. After every browser/control process exits and
evidence is copied, the runner drops only its recorded generated child databases
before the full lower-layer suite, preserving A's fixed 512 MiB tmpfs limit.
The owned tmpfs container cleanup remains the fallback. Dependencies are acquired separately, before
the offline application runner starts.

`hb_c_runtime` has SELECT on the 20 public tables; INSERT only on accounts,
periods, budget batches, historical positions/orderings, checkpoints, allocation
revisions/rows and audits; UPDATE only on the three account counters/head fields.
PostgreSQL additionally requires UPDATE on some users column for the existing
owner `FOR UPDATE` lock: UPDATE(theme) grants that lock capability without
granting identity/verification writes. All user rows must remain exactly equal.
There is no DELETE, schema CREATE or obligation/savings/report write grant.
These grants exist only in disposable C databases, never in production or B.
Runtime, migrator and provisioning/control roles use independent random secrets.
Neither Next nor Playwright receives a provisioning/migration password.

| Case | Existing scenario oracle | Browser + PostgreSQL assertions |
|---|---|---|
| C-01 | HB20-A01–04/A07/A08/B01/B02 | UNKNOWN, cancel/reload, invalid full vector, malformed amounts/date, real first B100000 with A(P70000,Q30000), six audits, coherent receipt, independent current/future/daily display, original replay/conflict |
| C-02 | HB20-A07/B03 | Explicit confirmed zero, persisted known zero, preview/reload no-write |
| C-03 | HB20-A08/A09 | Existing empty account ID/name/debt retained; ordinary update confirms actual bank, full reserve retained |
| C-04 | HB20-A09/B04 | Established C/V/O/S and immutable v1/v2 retained through session entry/navigation/reload/history; exact 20-table no-write |
| C-05 | HB20-A06 | Real audit INSERT permission failure rolls back account and every fact; same original UI command retries after isolated permission restoration |
| C-06 | HB20-A06/B02 | Actual server commit then lost browser response; original status/replay finds the one receipt, no duplicate |
| C-07 | HB20-A03/A04/A08/B02 | Confirm aborted before delivery remains UNKNOWN; anonymous action with writable runtime refuses exactly without writes; original frozen retry succeeds |
| C-08 | HB20-B02 | Double click delivers once; original replay is idempotent |
| C-09a/b | HB20-A05/B02 | Two independent PG backends really overlap on the owner lock; different-key winner / same-key receipt equality; status null while in flight does not prove rollback |

The privileged fault coordinator receives only constant local file markers.
It restores the one revoked audit privilege for C-05 or temporarily holds the
existing owner-row lock for C-09. It cannot be invoked through an application
route. Existing PostgreSQL onboarding integration tests independently cover
driver-level COMMIT acknowledgement loss, deferred rollback and further races;
browser transport loss is reported as its own distinct boundary.

Every case verifies unchanged foreign rows and all users, unchanged unrelated
tables, no browser errors/disclosure, no financial browser storage, and stable
Berlin calendar day. An exact whole-database census surrounds no-write phases.
Retries are zero; traces, screenshots and videos are off. Evidence retains
hashes/closed markers, not commands, cookies or drafts. Auth.js cookies are
synthetic encrypted sessions through the real callbacks, not Google login.
HB20-B01/B03/B04 provider-login proof remains BLOCKED / NOT EXECUTED independently
of session proof; this suite cannot close Q-HB21-AUTH. D–J remain outside scope.
