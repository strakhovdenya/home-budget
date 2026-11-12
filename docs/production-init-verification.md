# Production initializer — actual verification

Date: 2026-11-12. Separate operator-tool preparation authorized by owner. No production execution, merge, deployment or new HB task status.

Worktree D:/projects_js/home-budget-production-init, branch chore/production-init-review, base fde8f629a071c745b2a02859208df1f3986eea5e (main after merged PR23). All pre-existing worktrees, :3007 process10048 and manual synthetic PostgreSQL preserved. No secrets/env files/OAuth settings, cloud resources, roles or schema were modified. Neon was not a test target.

## Scope and self-review

Eight new files only: docs/production-initialization.md; this report; scripts/production-init/{core.ts,operator.ts,manifest.json,schema.json}; tests/production-init.test.ts; tests/integration/production-init.test.ts. App src, six original SQL/journal files, package/lock/workspace, local migrator/guard, auth and finance rules, TASKS/DECISIONS, Finance Gate manifest/checker/thresholds/bindings/old receipts are unchanged.

The guarded operator pins exact reviewed source, original Git SQL hashes/journal, explicit project/branch/endpoint/database/owner, direct certificate-verified TLS, online read-only Neon identity and explicit target/commit-bound production GO. One transaction includes admission, journal, all six original SQL migrations, deferred checks, whole catalog and zero application rows before COMMIT. Refuses partial/unknown state and concurrent initializer; COMMIT/rollback acknowledgement loss retains uncertainty and requires read-only inspection. No repair, auto-retry, startup hook, public endpoint, credentials retrieval or financial seed.

Catalog reference derived independently using installed Drizzle migrate on original SQL in an isolated local reference DB. Captures20 tables/229 columns,374 constraints,46 explicit triggers,72 indexes,24 functions/92 relations, full definitions/enforcement flags. Windows CRLF in definition strings normalized only; original migration blobs pinned by normalized-LF Git hashes. Full catalog mismatch refuses rather than weakening constraints. Reference/catalog format differences on another PostgreSQL patch/platform remain a fail-closed operational limitation to review.

New24 unit cases: direct endpoint/TLS/parameter refusal; exact explicit approval/current SHA; no-mode refusal; six original hashes/journal/function-body preservation; altered SQL/journal/extra migration refusal; reference self-hash/counts; valid and mismatching provider identity. Real15 PG cases: full original atomic initialization and no rows; repeat/nonempty/partial object refusal; SQL identity/TLS/schema refusal; actual DDL rollback; journal corruption/disabled trigger/one identity row refusal; two backend admission; real successful COMMIT with lost acknowledgement and read-only resolution; rollback-acknowledgement uncertainty. A scoped non-owner role executes real auth binding and required row/table locks while DDL/DELETE/TRUNCATE/journal reads refuse. This is local proof, not production provisioning or full OAuth/runtime financial acceptance.

Self-review checked provider mapping through project.proxy_host plus exact endpoint ID/branch, certificate verification unaffected by pg sslmode URL override, no live calls on import, sanitized CLI failures, journal inside transaction, unchanged financial SQL, clean/source/GO checks, and close errors not overwriting COMMIT uncertainty. No sub-agent or independent reviewer was used; independent review of this PR remains required.

## Final fresh run-bound evidence

Run ID: 282b48c6-0a3e-45be-879d-bff6922607c1.

Source fingerprint: 10a442034a12c6cec0c65cbb2065be63b7bc250b37bdfcc97b7a2ec5e4b7d5cd.

| Suite | Result | Files | JSON report SHA-256 |
| --- | --- | --- | --- |
| unit | 1106 passed / 0 failed | 58 | 9ebce2ad767f3bfaf42111cecbb56b839550ce3d369741b7dd734cd4df508784 |
| integration | 540 passed / 0 failed | 15 | 938bb0722932860b44d2f71a93a50f407f82ad2b5ebf9f70e2422ea51975c816 |
| timezone | 552 passed / 0 failed | 16 | bb1b56b8c53be4b1abd0f33354dc4f09a92287f572a3961259bc5260a24acfc0 |

Commands on final frozen source:

- TZ=UTC; pnpm test --maxWorkers=2 --reporter=default --reporter=json --outputFile.json=DIR/unit.json; record DIR unit: exit0 (1106 tests,111.75s).
- Explicit local three-URL overrides; pnpm test:integration --maxWorkers=2 --reporter=default --reporter=json --outputFile.json=DIR/integration.json; record DIR integration: exit0 (540 tests,510.07s).
- TZ=America/Los_Angeles; node scripts/check-finance-coverage.mjs timezone DIR; record DIR timezone: exit0 (552 tests,7.20s).
- node scripts/check-finance-coverage.mjs check DIR: exit0, fresh Finance Gate PASS. All report SHA/run receipts independently verified. Same unchanged foundation scope:596 scenarios, required552/partial31/deferred2/verification11;803 obligations/1171 refs. Existing pending browser/independent/out-of-runtime entries remain pending, not PASS; no new gate binding claimed.
- pnpm lint: exit0. pnpm typecheck: exit0. Final standard pnpm build: exit0 (Turbopack compile, TypeScript, all9 generated routes).

Evidence directory (local temporary reports, not committed): C:\Users\Denys\AppData\Local\Temp\hb-production-init-4abb4224e38048bb84e1cf97ce0eb517. All accepted reports/receipts are from this one final fingerprint; no older receipt was repurposed.

Initial development checks found a PL/pgSQL wording assertion, CRLF-only catalog mismatch and Client-versus-Pool test typing; corrected before final run initialization. Initial build with dependency junction failed Turbopack's workspace-root boundary. After tests finished the junction alone was removed (main dependencies preserved); pnpm install --offline --frozen-lockfile reused370 cached packages, downloaded0, preserved all dependency/config files. Build repeated using normal local dependencies. No root/config override or dependency version change. A preliminary gate init before typing fix had no accepted report/receipt; only final run above is evidence.

## Isolated database and local preservation

Fresh dedicated container hb-release-init-tests-20261112, ID eb231fadd5c8b27154334522381418a344c61eaa301737dfaa931f15b1fff5f7, postgres18, labels task=release-init-review/purpose=disposable-synthetic-tests,127.0.0.1:49346. All three URL overrides and HB_TEST_DATABASE_TARGET=disposable-local-container supplied. Original tests use unique child DBs; new initializer tests create only uniquely named child DBs in this dedicated container. Synthetic non-owner roles/passwords only. Existing Neon branches and manual hb020-codex-20261112/:50986 not used. No local real/synthetic budget imports or exports. Only this new test container stopped after all final verification, with exact ID/labels rechecked; manual DB/server retained.

## Remaining production gates

This PR is review preparation, not production GO or Owner Acceptance. No production DDL/roles/grants/password handoff, Neon connection strings, Vercel project/domain/env, Google callback, production build/promotion or production smoke was executed. Runtime grants are reviewed in runbook and tested locally; initializer does not provision roles/passwords. Actual provider target/TLS, grants, backup/PITR suitability/cost, exact Vercel host/env/callback and Preview isolation must be concretely verified and approved before use. No actual Google OAuth, full browser/mobile/zoom/physical AT, HB021 or restoration test run. No claims of Done.
