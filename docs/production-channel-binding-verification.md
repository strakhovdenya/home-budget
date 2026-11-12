# Production channel binding â€” correction verification

2026-11-12. Owner authorized a narrow reviewed fix after the approved production initializer refused Neon's channel_binding=require URL before connecting/DDL. That refusal preserved the empty production schema, absent runtime role and no deployment. This correction is preparation only; no production retry until review. No new HB task ID or acceptance/status change.

Worktree D:/projects_js/home-budget-channel-binding, branch fix/production-init-channel-binding, base main b301cfdecad1422b9740996d0125835869124400. Six files: operator.ts, new transport.ts, production-init.test.ts, new production-channel-binding.test.ts, updated runbook, this new report. Earlier initializer verification and receipts remain historical and unchanged. Existing worktrees/manual :3007 process10048 and PostgreSQL hb020-codex-20261112 preserved.

## Behavior and security self-review

Exact direct production URL now permits channel_binding at most once and only require. sslmode remains mandatory, exactly once, require or verify-full; unknown/redirection/pooled/weak/duplicate options still refuse. Security URL flags translate into explicit pg certificate verification and channel policy instead of a parameter being silently ignored. Provider identity, reviewed source/GO checks, original migration hash/catalog and all transaction/admission/UNKNOWN safeguards remain unchanged.

Installed pg8.23.1 enableChannelBinding prefers PLUS but can fall back. New isolated transport guard observes its pinned connection/session events before driver handlers, requires advertised/selected PLUS on trusted TLS, expected SASL phases, final verified server signature (session cleared by pg), and complete authentication before ReadyForQuery/SQL. Downgrade closes the socket before pg can transmit fallback credentials/proof; tests verify peer received zero auth packets/SQL. Unsupported contract refuses. Driver retains all SCRAM cryptography. This private adapter needs re-review on a pg upgrade; no dependency upgrade or replacement auth stack.

Legacy URLs without channel_binding retain existing verified-TLS behavior. Actual provider require is enforced, not removed to bypass refusal. No changes to runtime application DB client/auth, src, six migration SQL/journal, transactional core/schema/manifest, package/lock, local-only migrator/guard, CI, TASKS/DECISIONS, Finance Gate manifest/checker/pins/thresholds/bindings or old receipts.

## New proof

Targeted40 operator/transport tests PASS. Existing operator suite grows24â†’31: Neon require URL mapping; optional legacy behavior; prefer/disable/empty/duplicate/injected channel options and duplicate SSL refusal. Nine additional real-wire tests use real TLS and actual pg parsing/SCRAM: valid PLUS with tls-server-end-point certificate binding and server-signature verification before first query; plain-only/cleartext/MD5/trust/ReadyForQuery-only downgrades receive no fallback auth packets or SQL; invalid server signature and untrusted certificate reject; unsupported/missing driver/session state refuses.

The peer is a local synthetic PostgreSQL protocol fixture, NOT a live Neon or real PostgreSQL channel-binding acceptance claim. Ephemeral self-signed certificate/key generated outside repo with existing Git OpenSSL (Windows)/openssl(CI), deleted after tests. No production credentials, API key, remote endpoint or env files read in tests. TLS source reasoning checked installed pg and https://node-postgres.com/features/ssl#channel-binding . No secrets/certificates/keys added to Git.

## Final actual results

Run ID: 91a0ebcb-ede1-4912-8c32-eded6395aefe.

Source fingerprint: fe1dad2c5df598b6264a23eae26b46eaca7fa93dc92ccbdd2b46519453a7c37c.

| Suite | Passed | Files | JSON SHA256 |
| --- | --- | --- | --- |
| unit | 1122 / 0 failed | 59 | 248d2f044e0add9a2e45e74759f486879b760748e9b5616f43d15bd6ce1fd4d2 |
| integration | 540 / 0 failed | 15 | bd84ca7876f523a1d5d00156c3f72b2446cf9dab0a03fa3ccb6d9e17004f88b6 |
| timezone | 552 / 0 failed | 16 | 2f2c5958a8bb046094412550375133a8aae053253a7a8c1f8c40e53f75d7d84b |

- TZ=UTC; pnpm test --maxWorkers=2 --reporter=default --reporter=json --outputFile.json=DIR/unit.json; record DIR unit: exit0,1122 tests/59 files,102.63s.
- Explicit separate disposable-local-container and all three loopback URL overrides; pnpm test:integration --maxWorkers=2 --reporter=default --reporter=json --outputFile.json=DIR/integration.json; record DIR integration: exit0,540 tests/15 files,506.56s. Includes unchanged15 initializer PG cases, rollback/concurrency/UNKNOWN and scoped runtime-role proof.
- TZ=America/Los_Angeles; node scripts/check-finance-coverage.mjs timezone DIR; record DIR timezone: exit0,552 tests/16 files,6.36s.
- pnpm lint, pnpm typecheck, standard pnpm build (Turbopack compile + TypeScript +9 routes): exit0.
- Fresh node scripts/check-finance-coverage.mjs check DIR: exit0, PASS. Original scope596 scenarios,required552/partial31/deferred2/verification11,803 obligations/1171 refs. Existing pending/out-of-runtime dispositions remain pending; no new binding or browser PASS claimed. All three run-bound report receipts and hashes independently checked.

Local temporary evidence, not committed: C:\Users\Denys\AppData\Local\Temp\hb-channel-binding-855e9d6029294514a3d98b3dd4d51a99. No previous receipt was reused. Final source frozen before init and remains unchanged; report/new nonnormative docs do not modify fingerprint policy.

## Isolation and publication boundary

Dedicated local PostgreSQL18 container hb-channel-binding-tests-20261112, ID c6c1e1f3c20f6f007292360b6ae6ef074967f596bfce5b40a12b5e6f041fed3c, label task=channel-binding-review/purpose=disposable-synthetic-tests,127.0.0.1:52903. Full PG tests use synthetic unique child DBs/roles only. Only this new container stopped after all verification, exact identity rechecked. No Neon branch, manual budget/DB, local source/config/secrets or original server stopped/changed. Locked offline dependency install reused370 cached packages, downloaded0, changed no package/lock/workspace.

Self-review only; independent review/CI remain separate. No production operator retry, runtime role creation, DDL, seeds, cloud provisioning, deployment, merge, Owner Acceptance or Done. Actual Neon PLUS connectivity, production Google/browser/mobile/AT and restore remain NOT EXECUTED. After independent review, select exact reviewed operator SHA and preserve explicitly approved application deploy SHA; do not blindly resume on an unreviewed commit.
