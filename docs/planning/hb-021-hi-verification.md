# HB-021 H + I — verification, 2026-11-16

Automated result: **PASS (H 48/48, I MVP smoke 2/2)**. Native 200% H: **NOT EXECUTED**, operator unavailable. No WCAG compliance or screen-reader testing is claimed. Ready for independent review; HB-021 is not Done.

Branch: feat/hb-021-e2e-harness; HEAD f8bfca7f836271cff87858c04be2cbf3643ce4e9. Final run 4dc1cb83b5e708fa095e7abf661cafc6; source inventory 449 files, fingerprint 9da674b158174f4c4c0b013915966218708938cc1c63da3fa013fa0c77e23454. Final commands and exits are in evidence/final-report.json.

## Owner scope change

The owner reduced I on 2026-11-16 to keyboard/names/required/visible-focus/error and compact axe smoke. The local plan and criteria are updated explicitly. Only two RU/320 I flows are mandatory. Exhaustive locale/theme/browser/WCAG/ARIA and NVDA/VoiceOver/physical AT are excluded from I acceptance; AT was NOT EXECUTED. H retains its full matrix. No new dependency was added after this change; pinned axe 4.14.0 was already available.

## H

| Group | Result |
|---|---|
| Locale | PASS RU/DE/EN, EUR/cents/Berlin dates, UNKNOWN/0, negative F, H/K/versions; six primary combinations |
| Mobile | PASS Chromium 320x800, additional RU 375x812; labels RU/DE/EN at 320/375/1280 |
| Desktop | PASS Chromium 1280x900; first/update/templates/transitions/history/report routes |
| Native 200% | NOT EXECUTED; no CSS zoom or deviceScaleFactor substitution |
| Themes | PASS real light/dark/system controls and no-write for all three locales |
| Firefox | PASS desktop +375 read and financial-journey smoke; actual version in evidence |
| Playwright WebKit | PASS desktop +375 read and journey smoke; not real Safari |

H-R02: original clipped-label FAIL fc68bb48451f88bcb7eaee569eb45c9d; external wrapping label/id preserves filter/refresh/pagination/H/K/no-write. Final nine regression tests PASS. H-R01 wrapping-label implementation and nine tests preserved.

WebKit: production Secure locale cookie was not accepted by the HTTP-only fixture; loopback test-only HTTPS preserves production cookie/auth policy. Later prefetch teardown errors required draining real network activity before hard navigation/reload. Failed runs retained; no suppressed page errors, requests, or retries. Final WebKit passes RU→DE→EN→RU, chunks/reload and no-write.

## I — MVP smoke

| Check | Result |
|---|---|
| Keyboard onboarding/update | PASS Tab/Shift+Tab, Enter/Space, real review/cancel/confirm and persisted receipts |
| Keyboard history/month-closing | PASS history paging/refresh/detail, modal Escape/focus return, saved report/version navigation |
| Main names/required/focus/error | PASS role/name locators, required bank field, visible focus, readable validation and focus recovery |
| Compact axe | PASS five core screen states; no disabled rules; incomplete color-contrast and label-content-name-mismatch remain limitations |
| NVDA/VoiceOver/full WCAG | Excluded by owner; NOT EXECUTED; no compliance claim |

Financial close-commit oracles remain G/H evidence; the I closing smoke exercises keyboard access to saved reports/versions. I does not repeat the financial oracle suite.

## UI corrections and evidence

Seven production UI files only: budget-review semantic dl grouping; update-budget wrapping reason/source labels; period-navigation visible names; history external filter label; onboarding error/review/cancel focus; template review/cancel focus; shell navigation list semantics. Financial handlers, payloads, rules, schema, auth and Server Actions unchanged.

Before I reduction, template focus ripple contrast failed twice (cd63b1d375050399cd564f387e66ca5e and diagnostic 84e305f8490c2599004eb1b8e2d35caa: 4.01 then 3.83 vs4.5). Completed narrow disableFocusRipple correction on template review/history controls passed b97b05b085865c43fb3774d08f0991d7, exit0; existing keyboard outline retained. No further production edits after scope reduction. Expanded I run a2a40720c9301a3b748a0390f80da70e was deliberately stopped during installation following the owner change; raw FAIL retained, owned cleanup succeeded. Other development FAILs are listed separately in evidence/development-runs.json.

## Commands and boundaries

Final command: node --import tsx scripts/e2e/layout-run.ts --verify — exit0. Scoped lint, next typegen, tsc --noEmit and production next build — exit0. Related unit 79/79; isolated PostgreSQL 45/45; all exit0. Exact lower-level commands, environment key names, durations and image pins are in final-report.json. Browsers: Chromium158.0.8127.18, Firefox159.0, Playwright WebKit27.2. Versions: {"node":"v26.13.1","pnpm":"pnpm@12.16.1","playwright":"1.65.0","next":"16.4.3"}. PostgreSQL identity: "{\"postgres\":180006}".

Full A–G E2E, full unit/integration, DB17, timezone-LA and Finance Gate: NOT EXECUTED in this stage, deferred to J. Previous receipts are not presented as fresh Gate proof; checker/fingerprints/manifests/CI unchanged.

Preservation: 15860 prior files checked; 15842 byte-identical; 18 specifically authorized existing-file changes; missing0/unexpected0. Full changed-file list and protected-source/archive SHA proof are in the ZIP. A–G tests, fixtures, archives, H-R01 tests, AGENTS and installed skills preserved. No main synchronization or publication.

Isolation: clean checkout/env; pinned owned Docker namespace; independent migrator/runtime/writer/verifier secrets; SELECT-only read role retained; no host-published ports; runtime never receives migrator password. Two migrations retain identical six-entry journal. Final 5 Docker resources removed; 34 case DBs removed; cleanup failures0. Fixture setup and explicit confirmed financial writes are accounted separately from read/preview/cancel no-write checks across20 tables. Failed runs and two network-none TLS probes cleaned only owned resources. No Neon/Vercel/production/user data/OAuth secrets used.

Both clean-code-ts-react and code-simplifier were discovered and read; scoped readability self-review completed on new/directly changed H/I hunks. No style refactor of old tests or neighboring code. Package contains only this task's diff/files and sanitized minimal evidence, no previous ZIP/snapshots/raw credentials/traces.

Packaging checks: git diff --check exit0; reverse application of H-I.diff against the exported final files exit0; relative plan/manual file links checked (4, exit0). Harness temporary checkout removed; review evidence/staging retained locally.
