# HB-021 — Owner Acceptance and publication record

Owner Acceptance: **2026-11-16**. The owner confirms independent review of all
parts A–J; J is **APPROVED with no findings**. HB-021 is **Done** under
[D58](../DECISIONS.md#hb-021-owner-acceptance--2026-11-16).
Commit, ordinary push and a PR to main are authorized. Merge, local-main update
and deployment require a separate instruction.

## Accepted evidence and retained history

| Part | Accepted scope / result | Preserved report |
|---|---|---|
| A | Fail-closed harness, owned isolation/cleanup, credential separation; 38 harness checks and two browser smoke tests in the later B+C run | [A, including A-R01](hb-021-a-harness-verification.md) |
| B | 17 session/ownership/CSRF/logout tests; corrections retained | [B](hb-021-b-auth-verification.md), [correction](hb-021-b-correction-verification.md) |
| C | 10 onboarding tests: UNKNOWN/zero, atomic confirmation, replay/UNKNOWN, retained accounts/history | [B maintenance + C](hb-021-b-maintenance-c-verification.md) |
| D | 17 financial browser cases; B/A/R/S/D36, no duplicate debit, full reserve and explicit CARRY/FRESH_START/DEFER | [D](hb-021-d-finance-verification.md) |
| E | 12 recurring cases: ACCEPT/DECLINE/EDIT, concurrency/idempotency and retained old debt | [E](hb-021-e-recurring-verification.md) |
| F | 10 saved-history cases: complete census, H/K, original/later/report, no-write and paging | [F](hb-021-f-history-verification.md) |
| G | Original 8/10 blocked run retained; corrected G run `c7ce56820b827ec73f062bf9605ad2b5` passed all10 after G-R01, separately published in hotfix#27 | [original G finding](hb-021-g-closing-verification.md), [final lineage in J](hb-021-j-verification.md) |
| H | 48/48 locale/responsive/theme/Firefox/WebKit checks, including H-R01/H-R02 | [H+I final](hb-021-hi-verification.md); [original H](hb-021-h-layout-verification.md), [H-R01](hb-021-h-r01-layout-verification.md) |
| I | Reduced MVP Accessibility Smoke2/2; no exhaustive compliance claim | [H+I final](hb-021-hi-verification.md), [manual limitations](hb-021-hi-manual-checks.md) |
| J | Unit UTC1170/1170; PG544/544; LA552/552; DB17 two selected tests; lint/types/build and Finance Gate passed | [J](hb-021-j-verification.md) |

J Finance Gate:596 scenarios,803 obligations,1171 references; dispositions
required552 / partial31 / deferred2 / verification11 are historical facts,
not newly promoted statuses. J runId `1cf82f39-3cef-42e3-8ab5-e82e4f75aadc`,
runtime root `/work`, job `local`; financial source fingerprint
`ca00404ab8fb57c5bbb39316795de3425b83253d79fe809a4e007609c31e28e6`.
The first unit run's ten timeouts and the successful repeat with the previously
verified two-worker cap are retained; assertions and timeouts were not changed.

J checked all449 final H+I source files,121 quality-skill files and1,799 archive
checksum references. The verified local review ZIP is
`tmp/hb-021-j-review-20261116-1cf82f39.zip`, SHA-256
`fcf93cad76845d93c280fb95cc9abfd3dc87ece65b48fe650f8e4283797a7ddc`.
Original A–J reports, FAILs, receipts, inventories and local review packages are
preserved. Large raw evidence, archives and frozen snapshots remain local and
are deliberately excluded from Git; this record does not manufacture new receipts.

## Accepted limitations and dependencies

- Google OAuth provider login/relogin: **NOT EXECUTED**. Accepted offline
  Auth.js session E2E is application/session proof, not Google exchange proof.
- Native browser zoom200%: **NOT EXECUTED**.
- Full WCAG/AT/NVDA/VoiceOver: outside mandatory personal-MVP acceptance and
  **NOT EXECUTED**; the reduced I smoke is the accepted scope.

The owner accepts these limitations without further checks. They are not PASS
and do not block HB-021 publication. These current exceptions supersede the
earlier HB-021/D54/provider/zoom/AT planning blockers only for this acceptance;
financial, authorization, privacy and history requirements remain unchanged.
Q07 remains NOT REPRODUCED rather than FIXED.

The owner accepts integrated dependency runtime/HBH/HB20 paths through A–I.
This decision does not independently grant HB-019.2/HB-020 Owner Acceptance or
mark those tasks Done. Their separate task records and unexecuted branches
remain explicit; no new HB task is created.

## Final-source Finance Gate and publication boundary

TASKS, DECISIONS and the current OPEN_QUESTIONS disposition are protected
contexts. Their finalization changes the financial source fingerprint. Only
the necessary normalized `contexts[].sha256` values in coverage.json are
maintained; scenario definitions, dispositions, assertions, bindings and checker
remain unchanged. The old J PASS and receipts apply to the recorded old source,
and are not a fresh Gate PASS for this publication commit.

The PR's GitHub Actions execution is the authority for fresh final-source
lint/types, unit UTC, build, migration replay, PG, LA, DB17 and Finance Gate.
Actual run/commit/check URLs and results belong to the PR; this record does not
predict a PASS. Mandatory CI must be green before the PR is reported ready.

Main hotfixes#26/#27 remain required. At publication preflight their three
production files already match the accepted local versions byte-for-byte.
The proposed merge must also preserve main's additional regression tests;
mergeability and merged-tree content are checked without updating local main.
A conflict stops publication for an owner decision rather than a guessed fix.
No production code or test is edited by this documentation-finalization step.
