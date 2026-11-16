# HB-021 — B maintenance + C verification

Техническая проверка исправленного frozen source — PASS. Первый полный FAIL и
все промежуточные отказы сохранены отдельно. Независимое ревью и Owner Acceptance
не подменяются результатом тестов; HB-021 не Done.

Ветка `feat/hb-021-e2e-harness`, исходный HEAD
`f8bfca7f836271cff87858c04be2cbf3643ce4e9`. Все 25 исходных локально изменённых
файлов A/B сохранены побайтово. Закрытые замечания B R01/R02 не переоткрываются
и не рефакторятся; их прежние отчёты и ZIP сохранены. HB-021 не Done.

## Разрешённая B-maintenance

Владелец отдельно разрешил только замену `contexts[].sha256` записи
`docs/OPEN_QUESTIONS.md` в `tests/finance/coverage.json`:

```text
d044072ef27adada42fe4e574067db3dde9f97f0e64ba874c588ec013fa297aa
→ 758986d08cf92c4221bb316873b4292a71ad3b55e59e31d917cd84bcc37c822f
```

После обратной подстановки одного значения deep equality всего JSON совпадает
с сохранённой копией до maintenance. Нормализация CRLF для context hash —
существующий протокол checker, без его изменения. Сам OPEN_QUESTIONS.md сохранён
побайтово. Checker, сценарии, bindings, thresholds, CI и остальные manifest
значения не менялись. Быстрый admission:

```text
node scripts/check-finance-coverage.mjs init tmp/hb021-c/admission
exit 0; runId bbbb55c8-6c77-4ac3-a8a8-04f77cfcf127
fingerprint a5f74fe66427bbb4ebe2e7396d00e41b2790bf993e7a625f5f024c562530ccc2
```

Это предварительный receipt до C, не evidence итогового Gate и не переиспользуется.

## C scope и файлы

Основание — [утверждённый план §6/§9](hb-021-browser-e2e-a11y-responsive.md),
существующие HB20-A01–A09/B01–B04; новые финансовые правила не вводились.
Новые файлы C:

- `playwright.onboarding.config.ts`;
- `scripts/e2e/onboarding-run.ts`, `scripts/e2e/onboarding-harness.ts`;
- `tests/e2e/support/onboarding-{seed,server,proof,control,reporter}.ts`;
- `tests/onboarding-e2e/onboarding.spec.ts`,
  [инструкция и матрица](../../tests/onboarding-e2e/README.md);
- этот отчёт.

Production-файлы, domain, schema/migrations, auth policy, release scripts и CI
в этом цикле C не менялись. Все унаследованные изменения A/B входят в полный
локальный ZIP отдельно от нового C diff. D–J не начинались.

## Изоляция и права

Отдельный C runner использует неизменённые A safety primitives и pinned images.
Новый internal Docker network, PostgreSQL 18 с tmpfs, loopback 127.0.0.1:5432,
собственный Next build/start на 127.0.0.1:3000 внутри namespace, без host port
publication/default route. Перед действиями проверяются точные container/image
IDs, labels, network, URL/порт/база. `reuseExistingServer:false`. Входящие URL
overrides запрещены. Чистая source-копия и allowlisted child env; `.env*`,
`.vercel`, пользовательские секреты/конфигурации не читаются и не копируются.
Полный Gate получает исходники своих checker/tests для fingerprint. Production
operator/CLI и cloud-команды не запускаются; существующие unit/integration tests
initializer core остаются в полном наборе и работают только с synthetic isolated
PostgreSQL. Harness применяет миграции через существующий Drizzle script, без
использования initializer для provisioning. Единственный внешний доступ — получение
закреплённых зависимостей отдельным installer без исходников/БД/секретов и с
отключёнными lifecycle scripts; installer удаляется до выполнения приложения.

Для каждого C case создаётся отдельная новая синтетическая база, применяются
существующие Drizzle-миграции, privileged fixture seed завершается до браузера.
`hb_c_runtime` получает SELECT, INSERT только в девять необходимых таблиц и
UPDATE трёх счётчиков/head account. UPDATE(theme) на users нужен PostgreSQL для
существующего owner FOR UPDATE; identity/verification UPDATE запрещён. Проверки
сравнивают все users и foreign rows точно, без изменений. DELETE, schema CREATE,
O/S/report writes не выдаются. C grants действуют только в disposable C bases;
`hb_runtime` части B остаётся SELECT-only. Production grants не менялись.

Пароли migrator/runtime/verifier/C-runtime генерируются независимо. Browser и
Next не получают пароли migrator/verifier. Privileged coordinator получает только
локальные constant markers: C-05 восстанавливает одну заранее отозванную audit
INSERT privilege; C-09 удерживает реальную owner-row lock и через отдельное
autocommit-соединение наблюдает два backend PID. Никаких test-login routes,
app fault flags, mock successful replies или отключения проверок нет.

No-write phases сравнивают полный канонический census 20 public tables. После
каждого case проверяются все чужие строки/все users/нецелевые таблицы, ошибки
браузера, отсутствие чужого текста и финансового browser storage. Данные census,
финансовые command payloads, request IDs, cookies и drafts не сохраняются: в evidence только hash,
закрытые диагностические маркеры и безопасные backend PID. Trace/video/screenshot
отключены. Berlin midnight делает case недействительным; финансовые формулы не
подменяются. Повторы тестов автоматически не разрешены: retries 0, skipped/flaky
не принимаются C runner, final требует smoke2/Auth17/C10.

## Матрица и границы доказательств

Точные case names и assertions находятся в README и Playwright JSON каждого
case. C-01 UNKNOWN/cancel/invalid/first real B100000→P70000,Q30000/current-safe;
C-02 known0; C-03 empty account/name/debt; C-04 established C/V/O/S/v1/v2;
C-05 real transaction rollback/original retry; C-06 real commit then browser
response loss/status; C-07 unsent UNKNOWN/anonymous no-write/original retry;
C-08 double click/original replay; C-09a/b independent real PG overlap and
different/same key outcomes. First-commit checks link C/V/position/order/batch,
full period vector, pointer, six exact audit types and original receipt.

C-06 не выдаётся за потерю driver COMMIT acknowledgement: последняя отдельно
проверяется существующим PostgreSQL HB20-A06 integration test. NULL status при
заблокированном in-flight commit не трактуется как доказанный rollback.

| HB20 scenario | Session-authenticated application proof | Provider-login proof |
|---|---|---|
| B01 | PASS: C-01 | BLOCKED / NOT EXECUTED |
| B03 | PASS: C-01/C-02/C-03 | BLOCKED / NOT EXECUTED |
| B04 | PASS: B17 + C-04/C-07 | BLOCKED / NOT EXECUTED |

Cookie — synthetic encrypted Auth.js JWE через реальные callbacks/DB ownership,
без Google exchange. Полный B01/B03/B04 PASS не заявляется без независимого
provider proof; Q-HB21-AUTH остаётся открытым. Для внешнего OAuth нужна отдельно
согласованная изолированная проверка без production secrets/data. RU/DE/EN,
responsive/AT и остальные D–J сценарии этим C suite не закрываются.

## Выполненная разработческая проверка

Все команды запускались на синтетических отдельных Docker namespace.
Точечный PostgreSQL:

```text
node --import tsx scripts/e2e/onboarding-run.ts --focused-db
run b89fa47ba9fbc07ef7d878e82486486c; exit 0; onboarding integration 28/28
```

Предыдущие неуспешные C-прогоны сохранены, не перезаписаны. Это реальные FAIL:
первоначальный anchored grep не выбирал tests; затем незавершённые UI selectors
захватывали hidden SSR/Activity DOM, требуемый MUI month label с adornment и
Next route announcer. Seed C-04 ошибочно повторял first bind в уже созданном
realm с forbidden identity; исправлен только fixture lookup с реальным matches.
Первые C-09 не подтвердили overlap: монитор ошибочно требовал прямого blocker
для обоих waiters. Реальный PG evidence показал цепи 418→410 и 422→418,
а для same-key 448→439 и 451→448. Теперь отдельный autocommit observer
проверяет полный путь блокировки к собственному owner-lock PID; browser тест
независимо проверяет два Lock backend и прямую/очередную связь. Наблюдение
вынесено из удерживающей lock транзакции, application locks/timeouts не менялись.
Все raw FAIL reports, их source inventories и cleanup receipts входят в evidence.
Локальные ранние TS syntax/type ошибки исправлены до browser proof; они не PASS.

## Итоговый frozen run

Первый полный frozen run `08d6577e0914682e29aabbc7ca225976`,
команда `node --import tsx scripts/e2e/onboarding-run.ts --final --auth`, exit 1:

| Проверка | Реальный результат первого полного прогона |
|---|---|
| A harness / smoke | 38/38 + 2/2, exit 0 |
| B / C browser | 17/17 + 10/10, exit 0, skipped/flaky 0 |
| Lint / typegen / typecheck / build | каждый exit 0 |
| Unit / record-unit | 1163/1163, оба exit 0 |
| Integration | 525 passed / 4 failed / 15 pending, exit 1 |
| DB17 | 0 executed / 544 pending из-за setup failure, exit 1; НЕ PASS |
| LA timezone / record-timezone | 552/552, оба exit 0 |
| record-integration / Gate check | оба exit 1, HB015_GATE_REJECTED |

Причина integration/setup отказов — `No space left on device` в собственном
tmpfs: измерено 536870912/536870912 bytes. После браузерных доказательств runner
удерживал десять завершённых C databases перед существующей полной integration.
Все FAIL/pending, команды и receipts сохранены. Прежний fingerprint
`0a10360edf646b53ffd1fdd3270aaa477c2b665a72791d1a8de5fda54eca3f56`;
393-file inventory SHA-256
`7686c487aea93ce5f88363e55333b578d0648b7d25ac364cff48a8847734bf72`.
Freeze metadata дополнена сохранённым B auth config, который focused snapshot
не включал; hash доказан равным исходному B baseline, код не менялся.

Узкое исправление C harness: после завершения всех browser/control процессов и
копирования evidence выполнить DROP только точных успешно созданных текущим
runner child DB из собственного receipt. Проверить nonce и запрет parent;
перед SQL повторно проверить собственный Docker container/network identity.
Никаких row reset, новых runtime privileges или увеличения A tmpfs. Parent B
database сохраняется; finally по-прежнему удаляет только свои Docker resources.

Точечная проверка исправления:

```text
node --import tsx scripts/e2e/onboarding-run.ts --focused-c --case=C-09a
run 90492bcabe844cc753e84d7690a887ee; exit 0
C-09a browser exit 0; exact own child database cleanup exit 0; removed:true
```

Новое frozen source зафиксировано 2026-11-14T00:55:39.167Z:

```text
financial fingerprint 641bb9decb4846a82392712a5c8fb34b6684e5754c125b53732de30d2d3ca822
393-file inventory SHA-256 53afe497f1b7be7bd4d4cabc53f3ab773674a439b9b585a71dfd0ee407a8c90c
```

Повторный итоговый run `b97be35416f1e10b09b567df32822905` — PASS, exit 0.
Новые receipts обязательны: доказательства первого source не переиспользуются.
Повтор полного набора необходим после реального FAIL и изменения harness;
во время остальных малых исправлений запускались только точечные проверки C.

## Ресурсы, ограничения и передача

Создаются только собственные run-labelled network, tmpfs PostgreSQL container,
dependency volume/installer и browser runner. После browser/control exit и
копирования evidence адресно удаляются только созданные текущим C runner child DB
из creation receipt (строгий nonce, запрет parent); container finally остаётся
fallback. Это удаление disposable test resources, без SQL reset/delete immutable
строк и без изменения schema/migrations. Cleanup проверяет точный ID/label и
удаляет только creation receipt текущего run; глобального prune/reset нет.
Подробные IDs, removed flags и cleanupFailures находятся в report.json.

Docker daemon/host — доверенная административная граница. SIGKILL, отказ daemon
или потерянный create acknowledgement могут оставить ресурсы: это не PASS и
требует адресного разбора по receipt. Browser-only lost response не моделирует
все сетевые отказы. Результат зависит от стабильной Berlin даты и локальных
pinned images; installer network может быть медленным. Production release не
проверялся и не изменялся. Коммитов, push, PR, merge, deploy нет.

ZIP содержит отдельные `b-maintenance.patch`, `c.patch`, полный diff,
все локальные source changes, точный выполненный snapshot, verification evidence
и SHA-256 manifest. После передачи — остановка для независимого ChatGPT review;
никакого перехода D–J или утверждения Done.

## Финальные результаты

Команда: `node --import tsx scripts/e2e/onboarding-run.ts --final --auth`, exit 0.
Run b97be35416f1e10b09b567df32822905; 2026-11-14T00:55:42.569Z → 2026-11-14T01:07:42.194Z.
Host Node v22.23.0; isolated versions: {"node":"v26.13.1","pnpm":"pnpm@12.16.1","playwright":"1.65.0","next":"16.4.3"}; PostgreSQL 18.6
(real server_version_num 180006). Pinned images остаются исходными A digest.
Все команды Node с точными argv, exit codes и именами env keys записаны в
report.json.commands; значения env не экспортированы.

| Проверка | Результат | Exit |
|---|---|---|
| 38 A harness | 38 passed | 0 |
| Chromium A smoke | 2 passed; skipped/flaky 0 | 0 |
| B Auth.js | 17 passed; skipped/flaky 0 | 0 |
| C onboarding | 10 passed; skipped/flaky 0 | 0 |
| Existing migrations | 2 применения root; тот же 6-row journal | 0/0 |
| lint / next typegen / typecheck / next build | каждый PASS | 0/0/0/0 |
| Unit UTC | 1163/1163; failed 0, pending 0 | 0 |
| Isolated PostgreSQL integration | 544/544; failed 0, pending 0 | 0 |
| DB17 selection | 2 passed, 542 не выбраны фильтром; failed 0 | 0 |
| America/Los_Angeles | 552/552; failed 0, pending 0 | 0 |
| Finance init / record unit / record integration / timezone / record timezone / check | каждый PASS, новые receipts | 0/0/0/0/0/0 |
| C exact database cleanup | 10/10 removed:true; parent не является DROP target | 10 × 0 |

DB17 pending — явная выборка `-t DB17`, остальные тесты не выдаются за
выполненные в этой команде; полный integration выше выполнил все 544.
Gate runId `dc9d5d83-6d0b-4658-b63f-5f0eb629feea`, root /work, job local. SHA-256 каждого
unit/integration/timezone JSON совпадает с digest его собственного свежего
receipt; run IDs совпадают. Ни preliminary admission, ни failed-run receipt
не переиспользовались. Finance Gate проверяет свой существующий scope и не
закрывает оставшиеся browser/provider/manual D–J обязательства.

Точные основные child commands (внутри собственного runner):

```text
node node_modules/vitest/vitest.mjs run tests/e2e-harness.test.ts
node node_modules/eslint/bin/eslint.js . --max-warnings=0
node node_modules/next/dist/bin/next typegen
node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build
node node_modules/@playwright/test/cli.js test
node node_modules/@playwright/test/cli.js test --config playwright.auth.config.ts
node node_modules/@playwright/test/cli.js test --config playwright.onboarding.config.ts --grep <C-case-and-space>
node scripts/check-finance-coverage.mjs init /work/test-results/finance
node node_modules/vitest/vitest.mjs run --maxWorkers=2 --reporter=default --reporter=json --outputFile.json=/work/test-results/finance/unit.json
node scripts/check-finance-coverage.mjs record /work/test-results/finance unit
node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts --reporter=default --reporter=json --outputFile.json=/work/test-results/finance/integration.json
node scripts/check-finance-coverage.mjs record /work/test-results/finance integration
node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts -t DB17 --reporter=default --reporter=json --outputFile.json=/work/test-results/finance/db17.json
node scripts/check-finance-coverage.mjs timezone /work/test-results/finance
node scripts/check-finance-coverage.mjs record /work/test-results/finance timezone
node scripts/check-finance-coverage.mjs check /work/test-results/finance
```

C-case grep values, migration/seed/control commands и все exit codes без
placeholder находятся в commands[]/steps[]. UTC и LA передаются ровно по
действующему протоколу; повторный fallback LA в этом успешном run не запускался.
Unit/integration JSON содержат имена и статус каждого фактического теста;
Playwright JSON — все 17 B и 10 C cases. Existing readonly receipt/foreign
scope/no-write/snapshot и concurrency/replay/history regressions входят в
неизменённый integration suite и прошли.

Final-source failure-cleanup:

```text
node --import tsx scripts/e2e/onboarding-run.ts --final --auth --fail-after-database
run 69297489c421be9d5ba8b298a298eabe; expected exit 1
E2E_INJECTED_STARTUP_FAILURE; own 2 created / 2 removed; cleanupFailures []
node tmp/hb021-c/check-final-cleanup.mjs after 69297489c421be9d5ba8b298a298eabe
exit 0; exact IDs of other-run PG/runner still running; source equals final freeze
```

Ранний аналогичный failure run 4e56bbc00adbeee9ac2224cf85469748 также сохранён.
Его первоначальный PowerShell wrapper check дал exit 1; последующая прямая
execFileSync Docker проверка exact ID/state дала exit 0 и подтвердила сохранность
обоих контейнеров. Этот диагностический отказ не скрыт и не является PASS
PowerShell-команды. На final source повторная проверка выполнена Node helper
без этого wrapper, до/после exit 0.

После окончания тестов изменялись только этот административный отчёт и review
artifacts в tmp; применимые проверки — побайтовое сравнение 393 executed files,
financial fingerprint, сохранность 25 A/B files, единственная разрешённая
manifest замена, protected diff, UTF-8/local links/whitespace, resource receipts
и SHA-256 ZIP verification. Новых source/test изменений после freeze нет.

Финальный audit: exit 0. Все 393 executed files побайтово совпали с final
snapshot/freeze, financial fingerprint совпал; все 25 исходных A/B files
сохранены, в coverage.json только одна разрешённая SHA замена. Protected diff
и git diff --check — exit 0; UTF-8/whitespace новых файлов и 25 local links
проверены. HEAD/ветка прежние. За 13 зарегистрированных попыток создано и удалено
59 Docker resources: 35 containers, 13 networks, 11 volumes; remaining 0/0/0,
cleanupFailures во всех receipts пустые. В последнем полном run — собственные
5 Docker resources и 10 child DB (каждая removed:true перед integration).
Остальные synthetic integration DB/roles уничтожены с PostgreSQL tmpfs container;
точные Docker IDs и C DB names записаны в соответствующих report.json. Общие
image caches и посторонние ресурсы не удалялись. Локально остаются только исходники,
отчёты/review tools/ZIP; shared host build/dev server не использовались.

Отдельный C runner сохраняет approved A без правок ценой повторения части
orchestration; риск расхождения снимается текущими A38/smoke2 и baseline hash
проверками, но требует внимания при будущих изменениях harness. PostgreSQL tmpfs
лимит по-прежнему 512 MiB; завершённые C realms обязательно освобождаются до
нижнего набора. Изменение финансовых сценариев или новых maintenance manifests
для получения PASS не потребовалось.
