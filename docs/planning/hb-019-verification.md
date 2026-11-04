# HB-019 — MINIMAL R03 acceptance correction: verification

Status: **Review, not Done**. The owner authorized ONLY the R03 test-acceptance amendment after R2. Automated final gate passes on the fingerprint below; browser/AT, independent repeat review and Owner Acceptance remain pending. No APPROVED claim.

## Minimal scope and owner decision

Exact8MiB PostgreSQL persistence is no longer required. Two independent synthetic profiles exceeded the unchanged source budget before report construction. Stop exact-boundary research and do not reinterpret the old failed/unexecuted stages as PASS. No new8MiB fixture or new PostgreSQL test was added. The former failing case was converted to an expected source-limit refusal using the already measured R2 profile and its historical fixed8246626-byte padding, without calibration/search.

Relative to the delivered R2 snapshot, only the plan, scenario document (R03 plus its R07 cross-reference), integration test, finance mapping and this non-normative verification report change. Superseded additions from the interrupted broader correction were removed; their execution is not used as final acceptance evidence. All previous unrelated local files and artifacts remain.

Production code/formulas, source/report/wire/work/audit limits, generic required-verification guard, schema/migrations and accepted BUSINESS_RULES/ADRs remain byte-identical to R2. production-unchanged.json verifies185 source/normative files against the R2 ZIP manifest. No task status change, staging, commit, push, PR, merge or deploy.

## Revised R03 proof by layer

| Layer | Actual revised evidence | Result |
| --- | --- | --- |
| Production PG large-report round-trip | Existing1MiB and1MiB+1 reports: production close, validated historical source/manifest/audits, chunks, <=1MiB wire, exact bytes/length/SHA-256 and cross-instance reads | PASS in the final suite |
| Independent atomic/audit/manifest proof | Existing B01 atomic commit and C12/E02 digest-bound audit/manifest/history proofs; no duplicate fixtures | PASS |
| Codec/protocol boundary | Existing exact8MiB codec and complete64-chunk reassembly, including multibyte boundary; existing8MiB+1 codec refusal | PASS, U/C only |
| Source overflow | Converted existing measured R2 profile: production preview and confirm refuse;20 scoped table/user/account baselines remain identical | PASS, expected refusal |
| Previous exact8MiB PG persistence | Retired by explicit owner amendment; original failure remains historical | Never PASS; no longer required |

Exact converted test: `HB19-R03 measured R2 source overflow refuses preview and confirm with complete PostgreSQL rollback`.
It asserts actual source bytes>8388608, zero materialized roots, REPORT_LIMIT_EXCEEDED from production preview/confirm and complete before/after baselines. The negative confirm uses the current H/K/revision and syntactically valid consent input; source admission refuses before digest acceptance or writes can commit. It does not claim a source-admissible oversized report reaches report encoding.

Current full-suite source measurement: **8474355 bytes**, cap8388608; roots0. All20 scoped baselines unchanged. The targeted check ran only this changed negative case (1 PASS /102 not selected), not the previously passed R2 round-trip/unit checks. They ran again only as part of the one required final gate.

Report budget remains8MiB, wire1MiB, chunk128KiB, depth32/nodes100000, work4000000 and all existing source/audit/chain bounds. Codec8MiB+1 fails before use. PostgreSQL source-overflow rollback is a separate guarantee; no invented report-budget PG persistence proof is claimed.

## Finance mapping and guard

Preserved589 definitions,91 HB19 scenarios,46 HB2 mappings, F-009/F-013 and every older obligation/deferral. Added only the actually passed converted negative identity; references=1157. R03 now also explicitly cites existing independent atomic/audit evidence. Normative definition/context hashes were refreshed for the owner-approved wording.

Only two obsolete R03 blockers were removed from blockingVerification. The generic guard implementation and its95 regression tests are unchanged; any remaining required FAILED/NOT_EXECUTED blocker would still reject. The retired exact8MiB PG name was never entered as a passing test reference. The finance gate validates current-run receipts, all registered executed identities, source fingerprint and exact UTC/LA subset parity.

## One definitive automated final gate

Source fingerprint: `42b103d3f62e353701f2f8b1c7ae9ec92d2b21e33f97def4771d5ab9fa05d101`.
Run context, full safe raw logs/JSON, exit codes and SHA-256 manifest are included in the ZIP. Exact commands/cwd/environment are in evidence/current/commands.json. All final commands ran once after the last source/test/mapping/normative-context edit. This report is outside the gate normative context set.

| Check | Actual result |
| --- | --- |
| Full source lint | PASS exit0 |
| Next typegen / TypeScript / build | PASS / PASS / PASS, exit0 |
| UTC unit/component | 931 PASS, 44 files |
| Real PostgreSQL migrations / reapply | PASS / PASS; fresh integration databases migrate existing0000-0005 |
| Full PostgreSQL integration | 435 PASS, 11 files; no failed/skipped assertions |
| Separate DB17 | 1 PASS /18 not selected |
| America/Los_Angeles timezone subset | 552 PASS, 16 files; exact identity parity with UTC subset |
| Finance coverage CLI | PASS exit0, all current receipts verified |

The positive v1/v2/v3 historical chain and negative999/1000/1001 metadata/count/rollback proofs remain in the full PG suite. H02 same-money/ref-change UI/PG checks and all independent PostgreSQL/DST/race/rollback/replay guarantees are retained. No admitted999/1000-version chain is newly claimed.

## Isolation and qualifications

Only the owned synthetic local container hb019-20261104-isolated was used, ID b1321b930576dcc8c84f10f1644fd2be99dbbb00752464b71c163c612b0ca0d7, bound127.0.0.1:52676. Explicit DATABASE_URL/DATABASE_URL_UNPOOLED/TEST_DATABASE_URL and local-target markers were supplied; no .env loader, Neon, other containers or real financial data/identities.

Lint/typegen/typecheck/build ran in a fresh allowlisted copy without .env or tmp directories, using existing installed dependencies and synthetic build-only auth values. All337 copied inputs matched workspace SHA-256 before this report update. Exact direct equivalents and working directories are recorded, not misreported as root package-command execution. No local files were deleted and no config was changed to exclude old tmp copies. Migration uses the direct command without the package script .env.local loader.

## NOT EXECUTED / pending

- Retired exact8MiB PG creation/confirm/stored manifest/audit/digest/64-chunk/new-reader stages: not executed successfully, never PASS; no longer required by the owner-amended R03. Do not confuse this with the passing8MiB U/C stream.
- Browser E08-E14: required in-app browser/node_repl execution tool is unavailable (tool discovery returned none). No fallback installation/auth bypass/real OAuth configuration access. Existing server-relative completed fixtures and all calendar checks remain.
- Physical screen reader. Component results do not substitute for browser/device proof.
- Independent repeat implementation review and Owner Acceptance. F05 remains outside runtime gate, F06 pending independent review, F07 historical planning-only proof. HB-019 remains Review.

## Artifact and Git handoff

The new ZIP contains full changed/new repository files and supporting source/spec/configs, this report, current safe logs/JSON/receipts/commands, source integrity, Git status/diff and a path/size/SHA-256 manifest. External delivery.json records ZIP/manifest/report hashes and source fingerprint. Every ZIP entry/length/hash is checked. .env, secrets, real data, node_modules, caches/build copies, .git and unrelated local files are excluded. Prior ZIPs/logs are preserved locally; historical failed exact8MiB evidence is not relabelled current PASS.

Branch feat/hb-019-month-closing-versions-rollover; baseline HEAD3288ce91ba197d52ac51de036e1bccea55420a4f remains unchanged. Deliver to the owner for independent review; no publication or acceptance is implied.
