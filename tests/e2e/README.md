# HB-021 part A: isolated anonymous browser harness

Scope: infrastructure and one anonymous smoke only. This is not HB20/HBH/HBUX,
Google login, session injection, financial acceptance, accessibility or part B.
Q-HB21-AUTH remains open. No OAuth credentials are needed or accepted.

Prerequisites: Node per package.json, pnpm 12.16.1, trusted local Docker Engine
(Linux containers), cached PostgreSQL 18 digest and matching Playwright image.
Acquire public dependencies/images before the offline application run:

```text
docker pull postgres@sha256:3a4264520e121176619f54ff867d12774bc81e95e7b84db58d63bccdb6144b81
docker pull mcr.microsoft.com/playwright@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe
pnpm test:e2e
```

On Windows use `pnpm.cmd`. pnpm 12 may synchronize host dependencies before
running a script; to avoid this, invoke `node --import tsx scripts/e2e/run.ts`
directly using an existing pinned tsx. The harness itself never reinstalls host
node_modules. The frozen Linux
dependencies are installed in a new Docker volume by a disposable acquisition
container. Only package.json, lockfile and workspace configuration enter this
container: no application code, database, private environment or user config.
Its external access is solely for npm/pnpm acquisition, with lifecycle scripts
disabled. It is removed before application execution; images are never pulled
implicitly by application steps (must already exist).

The application/test container shares the new PostgreSQL container's network
namespace on a new `--internal` network. It has no default external route or
user credentials, and uses 127.0.0.1:5432 and 127.0.0.1:3000 internally. PostgreSQL
and Next both bind only loopback in that fresh namespace. No host ports are
published (the internal Docker network does not provide host publication).
The browser runs inside the namespace, not against a host dev server.
The runner verifies exact container IDs, image IDs, run labels, DB name and port
and absence of host port bindings before migrations/test actions. Exact internal
ports are checked in all DB URLs and the live PostgreSQL connection. Direct unisolated Playwright invocation
is refused. No existing server/container/database is discovered as a test target.

All three incoming database URL overrides are refused, even local ones. New
internal URLs are validated by the existing project local-target guard and a
stricter exact DB/user/port/password/no-query contract. PostgreSQL identity is
checked over a real connection. The six existing migrations are run twice;
journal identity must remain unchanged. A separate SELECT-only role reads the
20 empty application tables. Smoke asserts no writes, denial of INSERT/DDL and
the actual anonymous login/history redirect in Chromium. Google button remains
disabled: no real or synthetic auth configuration is supplied.

Source is copied through an explicit allowlist into a separate temporary
checkout snapshot and Docker volume. No .git, .env*, .vercel, root node_modules,
production initializer or user secret files are copied/read. Nested private
paths, symlinks and special files refuse the snapshot. The shared host .next
and development listener are untouched. Snapshot hashes identify the actual
dirty source used, in addition to the base Git SHA.

Useful infrastructure checks:

```text
node node_modules/vitest/vitest.mjs run tests/e2e-harness.test.ts
pnpm test:e2e --fail-after-database
```

The second command intentionally exits 1 after a new isolated PostgreSQL becomes
ready. Its report must show owned resources removed and no cleanupFailures.
It never installs dependencies or starts the application. Unknown CLI arguments
and injected database targets fail before provisioning. Safety tests also check
a live foreign listener survives refusal and a failed server launcher exits 1.

Outputs: `tmp/hb021-reports/<runId>/{report.json,source-inventory.json,playwright.json}`.
Only the completed browser run has playwright.json. Reports include step exit
codes, source hashes, image IDs, versions, exact resource IDs and cleanup result;
no database credentials/cookies/env dumps. Browser trace/video/screenshots are
off. These artifacts are local and ignored by Git. Review exports must inspect
contents before packaging. No cloud upload, CI edit or Finance Gate change.

Finally removes only resources in the current run's in-memory creation receipt,
after rechecking exact ID and label, and only its resolved temporary directory.
Failure cleanup does not stop/remove foreign resources. SIGINT/SIGTERM request
cleanup after the current bounded operation; SIGKILL, daemon/host failure or lost
Docker create acknowledgement can leave resources. Such failures are not PASS:
retain the report/ID, inspect privately and remove only proved owned resources.
No global prune, broad name-pattern deletion, role reset or immutable-row cleanup.
Downloaded image cache is retained; no shared image is removed.

Docker Engine is a trusted local administrative boundary, not an adversarial
daemon. The internal network contains only this run; it is not a sandbox for
untrusted source code or a replacement for an independently authorized future
external Google provider test. Never add production credentials to this harness.
