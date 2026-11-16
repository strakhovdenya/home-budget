# HB-021 D — financial E2E

**Заключительный D-only прогон: 17/17 PASS, skipped/flaky 0, exit 0.**
Run `356441276f6e9f36b3a13f50aab1f271`; 2026-11-14T11:54:07.759Z → 2026-11-14T12:01:42.210Z.
Source inventory SHA-256 `e912012f42db65aaa26642dc3a891fce684e2fa9b8d07cc363785a41bd363945`; 401 файлов
в изолированном checkout. Это hash inventory, не повтор Finance Gate.

Ветка `feat/hb-021-e2e-harness`, HEAD `f8bfca7f836271cff87858c04be2cbf3643ce4e9`.
Pull/merge/rebase/reset/sync с main не выполнялись. Hotfix-файлы сохранены.

**Новые файлы (10):** `playwright.finance.config.ts`;
`scripts/e2e/finance-{run,harness}.ts`;
`tests/e2e/support/finance-{seed,server,proof,reporter}.ts`;
`tests/finance-e2e/{finance.spec.ts,README.md}`; этот отчёт.
Матрица оригинальных ID и описание прав — [README](../../tests/finance-e2e/README.md).

| D | Результат / основное доказательство |
|---|---|
| 00/01 | PASS: UNKNOWN→confirmed0; ΣA=B; cancel no-write; future isolation; equal fresh check |
| 02/03 | PASS: F-001 B90000/R14600/F75400; F-002 B50000/R14600/F35400 + affirmation; full payment no double debit |
| 04/05 | PASS: CANCELLED отдельно от PAID; possible R0→полные20000, F-5000/safe0 |
| 06 | PASS: B40000/R20000/S5000→3000 (F17000)→4000→0, explicit release/increase |
| 07 | PASS: FRESH B80000/R20000/S15000/F45000; затем отдельная PAID B60000/R0/S15000/F45000 |
| 08a/08b | PASS: CARRY actual/reuse; B90000/R30000/S5000, target once, funding lineage, original replay |
| 09/10 | PASS: explicit DEFER сохраняет old funding; same-identity O/S compounds отказ/no-write, disjoint CARRY+PAID atomic |
| 11/12 | PASS: stale отказ/no-write; original receipt; H fixed/K before-after B50000→48000, current45000 сохранён |
| 13 | PASS: D36 B20000/P15000/Q5000/R[Q]10000 → safe10000; integer daily, Berlin/LA device parity |
| 14/15 | PASS: negative/future/malformed refusal; anonymous writable confirm denial; missed FRESH B8000/R9000/S2000/F-3000 |

Happy paths: реальный Chromium→Next build/start→Server Actions→PostgreSQL18.6.
Независимый integer oracle читает один active C/V, полные R/S, F и D36;
проверяются actual observation date/amount, linked batch/audit/original receipt,
funding predecessor/identity/metadata, неизменность существующих фактов и чужих
строк. Captured actions используются только для отрицательных запросов/replay;
успешные API replies не мокируются. Runtime DML только в disposable DB; B
SELECT-only сохранён. Раздельные credentials, loopback/internal network,
fail-closed URL/container guards и cleanup A–C переиспользованы без их правки.

**Команды / exits:**

```text
node --import tsx scripts/e2e/finance-run.ts --case=D-02
  abdb0242… exit 1 (selector); f5f6ced6… exit 0
node --import tsx scripts/e2e/finance-run.ts --verify
  6fa904b4… exit 1: 14 D PASS / 3 test-expectation FAIL; lower checks PASS
node --import tsx scripts/e2e/finance-run.ts
  95ce3cd4… exit 1: 15 D PASS / 2 test-helper TypeError
node --import tsx scripts/e2e/finance-run.ts --case=D-07,D-09
  d71c3f85… exit 0: 2/2 PASS
node --import tsx scripts/e2e/finance-run.ts
  35644127… exit 0: заключительные 17/17 PASS
```

В каждом запуске targeted lint, typegen, typecheck и собственный Next build —
exit 0. Node v26.13.1 / pnpm12.16.1 / Playwright1.65.0 / Next16.4.3 внутри
pinned A image; host Node v22.23.0. Точные argv/exit codes и полные run IDs
сохранены в compact evidence (значения env не сохраняются).

В `6fa904b4…`: D-unit **139/139**, D-PG **209/209**, B browser **2/2**
(B-01/B-12), C browser **1/1** (C-03), C PG **2 selected PASS / 26 filtered**;
каждая команда exit 0. SELECT-only receipt/foreign/snapshot boundary включён в
D-PG. Список точных unit/PG файлов — в command evidence. После этого изменялись
только D assertions/selection; production и эти lower/boundary test sources
побайтово сохранены, поэтому их повтор не выполнялся.

FAIL сохранены: неверный selector декоративного MUI fieldset; ожидание отсутствия
технического calendar period при transition preview; чтение decisions из
неполного C helper. Успешный transition preview по существующему ADR0002 может
сохранить ровно owned proposal и отсутствующий current calendar period: теперь
проверяются exact IDs/ownership/current period, сохранность старых строк и всех
других таблиц. Для cancelled/rejected phases exact 20-table no-write не ослаблен.

**NOT EXECUTED:** полный A/B/C, полный unit/integration, DB17, LA suite,
Finance Gate на новом D source, provider OAuth, real midnight/DST, E–J.
Сохранённый C Gate PASS относится к прежнему approved frozen source, не к D.
Fixed 3-day/1-cent boundaries проверены выбранными pure forecast oracles;
browser использует настоящий Berlin day, без server clock mocks.

398 файлов A–C и 695 entries approved manifest проверены по SHA-256; исходные
evidence/ZIP сохранены. Compact ZIP содержит только D-diff/10 новых файлов,
минимальные sanitized PASS/FAIL/command evidence, preservation/selectivity
certificates и SHA-256 manifest. Временные child DB и Docker resources удалены
только по собственному receipt. Детальные counts/IDs — в preservation/evidence.
Ограничения: trusted Docker daemon; inherited installer network; технические
period/proposal preview writes не являются financial confirmation. Полная
комплексная регрессия и синхронизация main остаются отдельными работами/J.
Без commit/push/PR/merge/deploy. HB-021 не Done; после D — остановка для ревью.
