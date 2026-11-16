# HB-021 H — locale/layout/browser proofs

Run a development slice with `node --import tsx scripts/e2e/layout-run.ts --case=H-RU-320-FIRST`.
Run the final automated H matrix and targeted lower checks with
`node --import tsx scripts/e2e/layout-run.ts --verify`.
The focused H-R01 check is `--case=H-LABELS` (nine independent browser tests,
RU/DE/EN × 320/375/1280, real preview, SELECT-only no-write).
Use only the generated isolated namespace; never supply database URL overrides.

The primary matrix is RU/DE/EN × Chromium 1280×900 / 320×800. Each combination
has a read-only history/report route, first confirmation → ordinary update →
template ACCEPT/DECLINE, and FRESH_START → separate payment. Extra cases cover
Chromium 375×812, three localized known-zero/negative-free histories, and
Firefox/WebKit desktop/375px session/update/history/closing smoke.

Setup reuses approved synthetic C/D/F factories. The read role has SELECT only.
The separate writer has per-database, flow-specific INSERT/column UPDATE grants;
it cannot change identity, schema or reports. No migration/verifier secret reaches
the server/browser. Successful responses are real Server Actions. The desktop
locale recovery test discards a real commit response and reads its actual receipt.

These are presentation proofs; financial formulas/oracles remain owned by A–G.
Navigation/preferences/history/report reads require an exact 20-table no-write
census. Explicit Confirm actions are checked against persisted request receipts.
Traces/HAR/storage state/cookies are not exported. Screenshots contain synthetic
data only. Test retries are zero.
The driver stops at the first failing case after owned cleanup; remaining cases
are recorded as NOT EXECUTED for diagnosis and an owner decision on production defects.

Native browser zoom 200% needs a real browser operator and remains NOT EXECUTED
until browser/OS/zoom/viewport and form/review/error/history evidence are recorded
for each language. CSS zoom/deviceScaleFactor are not substitutes. Playwright
WebKit is not real Safari. Keyboard/axe/physical AT belong to I; full regression
and Finance Gate belong to J. Actual PASS/FAIL counts come from the verification
report, not from this coverage inventory.
