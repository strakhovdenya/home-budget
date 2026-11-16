# HB-021 E — recurring templates

Real Chromium → built Next.js → existing Server Actions → owned disposable PostgreSQL 18. No successful action responses are mocked. Offline synthetic Auth.js session is application-session proof only; Google login/relogin is NOT EXECUTED and Q-HB21-AUTH remains open.

Run from the repository with Node/tsx:

```text
node --import tsx scripts/e2e/recurring-run.ts --case=E-01
node --import tsx scripts/e2e/recurring-run.ts --case=E-07,E-09,E-12
node --import tsx scripts/e2e/recurring-run.ts --verify
node --import tsx scripts/e2e/recurring-run.ts --fail-after-database
```

`--verify` runs all E cases once, scoped recurring unit/PG suites, E lint, clean typecheck and build. It never runs A–D browser suites, full unit/integration, DB17, timezone suite or Finance Gate. Each case has its own migrated/seeded database and fresh loopback Next server; retries=0, no skips or expected failures. Focused runs still build their own checkout.

| Cases | Browser proof |
|---|---|
| E-01/02 | T01/T02 full reserve 5400/edited5000, B/A/C/V unchanged, original receipt replay; open/Later/review cancel exact no-write |
| E-03/04 | Terminal DECLINE, renewed synthetic session, next context, disable/re-enable control-only evidence, no automatic acceptance |
| E-05/06 | T03 old M debt untouched; P ACCEPT safe59200 or DECLINE safe64600; independent integer R/F/D36 |
| E-07/08 | Two browser tabs, two actual blocked PG backend PIDs and owned-lock graph; one ACCEPT/DECLINE or ACCEPT/ACCEPT winner; original replay |
| E-09/10 | Real committed ACCEPT response discarded vs unsent DECLINE; UNKNOWN/status/original retry, exact no duplicate writes |
| E-11/12 | Stale configuration/revision, pending context guard, foreign template/account/request, expired/missing session, malformed and changed commands |

All read/no-write checks compare full canonical rows in all20 public tables. Every successful mutation checks an explicit write whitelist, retained history and foreign/users immutability. ACCEPT checks identity/event/position/order, shared recorded K, actual confirmation-day H, ordinary full reserve and source mapping. Oracles read persisted facts independently of production projection functions; the browser dashboard and reload must agree. M is a previous proposal context, accepted during privileged synthetic setup on the actual current confirmation day, never a fake clock or backdated template event.

E-09 discards the actual browser response after the server commits; it does not claim lost PostgreSQL COMMIT acknowledgement. The existing scoped recurring PG suite separately injects driver acknowledgement loss and verifies original status/replay over fresh connections, rollback and deterministic lock orders. Likewise E tab races prove actual overlap but do not prescribe which tab wins; existing PG cases cover both lock orders. Full H/K/history navigation, locale/responsive/accessibility and closing flows belong to later authorized parts and are not executed here.

The E launcher reuses approved A safety primitives and adds no production path, auth hook or grant change. Fresh internal Docker network, pinned images, tmpfs, clean environment/config, no host published ports, separate provisioning/runtime secrets and owned-ID cleanup remain enforced. E role has SELECT, seven required INSERT tables, account counter UPDATE and users.theme UPDATE solely for existing owner FOR UPDATE; no schema, DELETE, identity, bank-head, C/V, savings, closing or account creation writes. Verifier credentials stay only in setup/coordinator/PG-verification processes. Existing B SELECT-only role remains unchanged. Only installer has external package acquisition; it has neither source nor DB namespace/secrets.
