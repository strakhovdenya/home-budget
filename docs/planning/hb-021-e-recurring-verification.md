# HB-021 E — Recurring Payment Templates: verification

Локально готово к независимому ревью; HB-021 не Done. Ветка `feat/hb-021-e2e-harness`, HEAD `f8bfca7f836271cff87858c04be2cbf3643ce4e9`, без синхронизации с main. Только 11 новых E-файлов; production/domain/auth/schema/migrations, A–D и Finance Gate не изменены.

## Файлы и архитектура

- `scripts/e2e/recurring-run.ts`, `scripts/e2e/recurring-harness.ts` — отдельный E-launcher на утверждённых safety primitives A, собственная namespace/checkout/build, новая БД и Next server для каждого случая, owned cleanup.
- `playwright.recurring.config.ts` — Chromium, workers1, retries0, forbidOnly, reuseExistingServer:false; никаких skip/xfail.
- `tests/e2e/support/recurring-seed.ts` — privileged synthetic setup заканчивается до браузера; B100000, A P70000/Q30000, template5400; для T03 отдельный долг M5400 и foreign sentinels.
- `tests/e2e/support/recurring-server.ts`, `recurring-reporter.ts` — чистое runtime-окружение и sanitized evidence.
- `tests/e2e/support/recurring-control.ts` — независимый privileged coordinator; два реальных заблокированных backend PID и граф до своего owner lock. Секрет координатора не передаётся Next/Playwright.
- `tests/e2e/support/recurring-proof.ts` — независимые bigint R/F/D36, полный 20-table census, whitelist writes, original receipts, H/K/identity/order/source mapping.
- `tests/recurring-e2e/recurring.spec.ts`, `README.md`; этот новый отчёт.

Только disposable PostgreSQL18/127.0.0.1, internal Docker network без default route и опубликованных host ports, pinned images, tmpfs512m, clean env/Docker config; env/private files и пользовательские секреты не копируются. E-role: SELECT, INSERT семи нужных таблиц, UPDATE двух account counters и users.theme для существующего owner lock. Нет DDL/DELETE/head/identity/C/V/savings/closing/account-create прав и членства migrator. Реальное подключение migrator с E-password отклонено `28P01` в каждом E-тесте. B SELECT-only и отдельные A-секреты сохранены; production-grants не менялись.

## Результат на финальном source

Run `fc5ca2308a488ada7b8baa8c5ef7d8a0`: **12/12 Chromium PASS**, 0 skipped/flaky/retries. Snapshot 409 файлов, source fingerprint SHA-256 `8f0fa1187da63e33ab934d9341bac0478968dba784cacab336a8bcb34d307998`; E-source hashes и inventory digest — в evidence. Нижние suites связаны с неизменными исходниками; после первого общего прогона изменён только callback E-10, что проверяет `test-wait-correction.json`.

| Сценарии | Результат / оракул |
|---|---|
| E-01 / T01 | PASS: Later/open/reload/cancel no-write; ACCEPT5400, один CREATE, origin=funding=P, dueDate=null, R5400,F/safe64600; original replay |
| E-02 / T02 | PASS: edited5000, F/safe65000; config5400 и B/C/V/A сохранены |
| E-03 / T02 | PASS: DECLINE terminal, финансовые строки неизменны, только batch/audit/counters; reload/renewed synthetic session, same/new-key replay и запрет ACCEPT |
| E-04 | PASS: Later no-write; disable/re-enable — только config evidence; следующий context предлагает, но автоматически не подтверждает |
| E-05/06 / T03 | PASS: старое M5400 цело; ACCEPT P5400 → Rtotal10800,F[M]-5400,F[P]64600,safe59200; DECLINE → safe64600 |
| E-07/08 | PASS: реальные overlapping ACCEPT/DECLINE и ACCEPT/ACCEPT, два PG backend/lock graph; один terminal winner и точный original-key replay |
| E-09–12 | PASS: реальный COMMIT с отброшенным ответом/status/replay; unsent UNKNOWN/null/status/original retry; stale config/revision, frozen context, foreign template/account/request, expired/missing session, changed-command no-write |

Все подтверждения идут через настоящий Chromium → Next → существующие Server Actions → PG. Успехи не мокируются. Старые строки/история и foreign/users неизменны; B/C/V/full A не меняются от шаблонов, ΣA=B, полный R учитывается один раз. ACCEPT создаёт одну связанную identity/event/position/order/receipt; DECLINE/CONFIG не создают финансовых фактов. Dashboard/reload сверены с независимым integer oracle. E-09 — потеря browser response после реального server COMMIT; потерю PG COMMIT acknowledgement отдельно проверяет существующий scoped PG suite.

## Команды и exit codes

Все launcher-команды: `node --import tsx scripts/e2e/recurring-run.ts` с указанными аргументами; точные child commands/exit/durations находятся в `evidence/runs/`.

| Аргументы / команда | Exit / результат |
|---|---|
| `--case=E-01`; `--case=E-07,E-09,E-12` | 0; точечные PASS |
| `--verify` (run f6bba1b5…) | **1**: 11/12 E PASS, E-10 FAIL; unit10/10, PG37/37, lint/typecheck/build отдельно exit0 |
| `--case=E-10` (c6175c49…) | 0; исправленное ожидание, original command и write assertions сохранены |
| без аргументов (финальный run) | 0; все12 E PASS, собственный next build exit0; unit/PG повторно не запускались |
| `--fail-after-database` | ожидаемый **1**, E2E_INJECTED_STARTUP_FAILURE; owned cleanup PASS |
| `node node_modules/vitest/vitest.mjs run tests/recurring.test.ts tests/recurring-boundary.test.ts --reporter=json --outputFile=/work/test-results/e-lower/unit.json` | 0, 10/10, TZ=UTC |
| `node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts tests/integration/recurring.test.ts --reporter=json --outputFile=/work/test-results/e-lower/pg.json` | 0, 37/37, isolated PG; race lock orders, driver ack loss, rollback, original replay/history и D57 |
| `node node_modules/eslint/bin/eslint.js . --max-warnings=0`; `node node_modules/typescript/bin/tsc --noEmit` | 0/0, полный lint и typecheck отдельного финального source-verified clean checkout с чистым окружением, без БД; checkout удалён |
| `node node_modules/next/dist/bin/next build`; `git diff --check` | 0/0; patch/source/ZIP manifest checks отдельно зафиксированы |

Первичный E-10 FAIL сохранён: ожидание любого POST могло принять ещё завершающийся status за retry. Исправлен только тест: дождаться настоящего null-status и enabled Retry, затем фильтровать ответ по исходному commit Action ID; добавлена проверка actual null. Production не менялся. Начальный lint с двумя unused imports (exit1), host tsc OOM (exit1), остановленный host tsc6144 (exit1/ABORTED) и два preflight FAIL одноразового static helper (sandbox os_get_passwd / mkdir-ENOENT, до проверок) также сохранены в host-checks; они не объявлены PASS. Итоговые typegen/lint/typecheck выполнены в чистом checkout без ignored tmp-копий, каждый exit0.

Версии: host Node v22.23.0; container Node v26.13.1, pnpm@12.16.1, Next 16.4.3, Playwright 1.65.0, Chromium 158.0.8127.18, PostgreSQL18.6 (180006). Image IDs/digests — в evidence.

## Сохранность, ресурсы, ограничения

408 approved A–D файлов и обе прежние ZIP/manifest entry sets проверены побайтно; исходники, evidence и protected-context/coverage manifest сохранены. Созданы и удалены **27/27 Docker resources**, 29/29 child databases прошли owned DROP. Parent DB/roles/tmpfs удалены с PG-контейнерами; build volumes/временные checkouts удалены. Внешняя проверка по каждому run label: 0 оставшихся containers/networks/volumes. Новые E-файлы, отчёт, evidence и review ZIP оставлены для ревью.

**NOT EXECUTED:** неизменённые A–D suites, full unit/integration, DB17, timezone suite и Finance Gate — отложены до J по заданию. Реальный Google login/relogin/provider proof не выполнялся; renewed synthetic Auth.js session не закрывает Q-HB21-AUTH. Calendar rollover не симулирован: M — предыдущий proposal context с current-day seed confirmation, тесты проверяют неизменность фактического Berlin day. Полные history/closing/locale/responsive/a11y части F–J не начинались. Commit/push/PR/merge/deploy, обращения к Neon/Vercel/production и реальные данные отсутствуют.
