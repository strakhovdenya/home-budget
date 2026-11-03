# HB-015 — Finance domain tests and CI gate

Дата: 2026-11-03. **Утверждённый контракт; реализация принята владельцем 2026-11-03, HB-015 — Done** в [TASKS](../TASKS.md). По сообщению владельца повторное независимое ревью ChatGPT R1: **APPROVED**, открытых замечаний Critical/High/Medium/Low: **0/0/0/0**. Исполненные проверки Codex и приёмка разграничены в [verification](hb-015-verification.md). Публикация требует отдельного разрешения владельца; GitHub Actions run и branch protection не подтверждены.

G1/G2/G3 и финансовые границы контракта сохранены. В принятом R1 manifest v2 добавлены whole-file context hashes и уточнены составные обязательства, включая F-009; эквивалентные гарантии не выдаются за точный original oracle, HB-019 workflow остаётся deferred. Ниже сохранён аудит исходного этапа планирования: утверждения «не запускалось» относятся к тому этапу, а не к последующей реализации. Фактический CLI protocol в разделе команд уточнён по существующему checker/CI; новых требований или изменений CI это не вводит.

## Цель и границы

HB-015 консолидирует уже существующие тесты HB-006–HB-014 и добавляет проверяемую связь нормативных сценариев с результатами исполнения до использования финансовых projections в UI. Runner, PostgreSQL integration и CI уже существуют. План не вводит новую финансовую функцию.

Нормативная база: [BR-01–BR-11](../BUSINESS_RULES.md), принятые [ADR0001](../adr/0001-checkpoints-and-allocations.md), [ADR0002](../adr/0002-month-closing-and-corrections.md), [ADR0003](../adr/0003-daily-forecast-and-liquidity.md), актуальные D32–D39 в [DECISIONS](../DECISIONS.md). Архивные signed-A примеры не разрешают отрицательные новые A. H — историческая дата, K — граница знания по recordedSeq; K в H/K не является суммой известных операций в reconciliation D/K/U.

Прочитаны AGENTS.md, PRD, IMPLEMENTATION_PLAN, TASKS, ARCHITECTURE, DATA_MODEL, architecture.json, conventions, AGENT_FACTORY, CODEX_WORKFLOW; сценарии и существующие unit/DB suites, package.json, оба Vitest configs, ci.yml, migration script и local-target guard. Исторические verification-отчёты используются как опубликованное свидетельство прошлых запусков, отдельно от статического аудита этой сессии.

Применены project-local skills create-planning-doc, create-scenarios, verify-financial-invariants, define-architecture, security-best-practices и configure-project. Для security прочитаны релевантные рекомендации Next.js server authorization/runtime validation и границ React/frontend. Приоритет имеют принятые ADR и существующие API проекта: новый validation framework и реорганизация слоёв не нужны. Сценарии будущих проверок ниже пока находятся в плане; отдельный scenario-файл появится только при разрешённой реализации.

Не входят: UI, Playwright/E2E, live OAuth, новые endpoints, closing use case HB-019, operation/PDF persistence, recurring templates, multi-source CARRY, overdraft, historical overspend. Нет оснований менять production code, архитектуру, schema/migrations, стек или зависимости. В ходе планирования не запускаются тесты, PostgreSQL, Docker, миграции или build; не читаются реальные environment files/секреты и не используются Neon/production. `.vscode/` и любые локальные изменения сохраняются.

## Что уже покрыто и не требует изменений

Ниже «покрыто» означает наличие конкретных исполняемых assertions при статическом чтении, а не новый PASS.

| Гарантия | Существующее доказательство | Решение HB-015 |
|---|---|---|
| B>=0, каждый A>=0, sum(A)=B, одна выбранная полная revision | `tests/checkpoints.test.ts`; integration `persistence.test.ts` DB05–07/23; `bank-checkpoints.test.ts` first confirmation, invalid cash cases; `forecast.test.ts` HB14-032–035 | Сохранить, сопоставить; не писать второй валидатор |
| F=A-R-S, полный unpaid remainder, возможные требования только 0/full, S не ограничивается cash | `obligations.test.ts`, `savings.test.ts`; integration одноимённые suites; `forecast.test.ts` numeric cases, HB14-010/011/049, finite sweep | Уже есть unit и DB proof; не добавлять partial-reserve API |
| Paid/partial/cancel/release не списывают банк; свежая проверка и unchanged affirmation | integration `obligations.test.ts` HB11-01/06/07/16–19 и Medium-A–F; `savings.test.ts` S08–10/S20–22; `budget-projection.test.ts` HB14-013/012 partial/paid/release | Сохранить разные paid/cancelled semantics и evidence |
| Будущие деньги не повышают текущий forecast, split detail не reposts cash | `transitions.test.ts` F-004/F-015; `forecast.test.ts` HB14-006/051/062; `forecast-oracles.test.ts` | Не добавлять income/expense ledger |
| D36: max(A,E), все периоды, отдельные shortages, текущий safe limit | `forecast.test.ts` HB14-018/019/020–026; 27 000 состояний HB14-058; `forecast-oracles.test.ts`; integration persisted owner oracle | Основная формула уже проверяется; узкое усиление см. G3 |
| D37–39: старый валидный estimate остаётся, реальные даты, группировка предупреждений, reminder age>=7 | `forecast.test.ts` HB14-024/025/028–031/037–040/047; exact HBL-019–024 в `forecast-oracles.test.ts` | Числовой DTO покрыт; визуальное отображение относится к HB-016 |
| bigint/int64/JSON без number coercion; overflow и 1-cent floor | `tests/domain/money*.test.ts`; integration `persistence.test.ts` DB17/22; obligation HB11-33, saving S40; forecast limits/codec/quotient/remainder | Сохранить отдельный Isolated DB17 test в CI |
| Berlin civil days, leap years, DST 23/25h, microseconds, month/year boundary | `tests/shared/pure/*.test.ts`, `domain/period.test.ts`, `checkpoints.test.ts`; DB19, HB10-DB08, HB11-34, HB12-S41; HB14-038/039/057 | Тесты есть; автоматизация host TZ — G2 |
| H/K: corrections до фильтра H, старые K, позднее внесение не заменяет chronological head | `checkpoints.test.ts`; integration bank HB10-DB06/10–13/25; obligation HB11-20a/b/21/22a/b; saving S23–28/E08–09; projection HB14-043/056 | Не создавать другой history engine |
| Funding identity/origin/полное состояние сохраняются один раз при CARRY/FRESH_START/DEFER/REDISTRIBUTE | integration `transitions.test.ts` T13–28/T39–43/T51–53/T64–65, PG-F и PG-R cases; projection HB14-061 | Есть реальные write→read projections, missing-funding-evidence и A=0 earmark cases |
| Оригинальные closing snapshots, refs и версии immutable; только затронутый pending flag | DB15/16/20; bank HB10-DB22/23; obligation HB11-31; saving S37–39; transition T44/45/47; projection HB14-054 | Хранение/защита есть; полноценный close/correct workflow остаётся HB-019 |
| Серверная авторизация, foreign/unknown account, actor/owner spoofing, auth до replay | `auth-policy/config/boundaries/routes.test.ts`, `budget-update-boundary.test.ts`, `transition-boundary.test.ts`, `forecast-boundary.test.ts`; integration `auth.test.ts`, DB04/18, HB9-014/022, HB10-DB16, HB11-30, HB12-S36, HB13 PG-P09, HB14-045 | Не дублировать OAuth или ownership слой |
| Atomicity, stale revision, idempotency, same key/different payload, unknown COMMIT outcome | integration `audit-idempotency.test.ts` HB9-001–022; bank HB10-DB05/14/15/20/21; obligation HB11-24–29; saving S30–34; transition PG-P01–15/T47/T59 | Есть реальные PostgreSQL connections и lock barriers, не только Promise mocks |
| Coherent concurrent projection | integration `budget-projection.test.ts` HB14-059 останавливает реальное чтение, выполняет concurrent commit, проверяет old/new snapshot | REPEATABLE READ READ ONLY уже реализован; новая isolation scheme не нужна |
| Некорректные DTO/evidence/refs, hostile getters, границы размеров, rollback после реальных вставок | `canonical-payload.test.ts`, `updates-validation.test.ts`, domain validators, `forecast-boundary.test.ts`; SQL bypass/audit failure/deferred constraint cases во всех DB suites | Не путать typed Result.error с rollback; действующие проверки сохранить |
| Нет скрытых финансовых writes при чтении, preview, refusal и replay | projection integration `baseline/read` сравнивает account и полные rows 18 scoped tables; transition baseline/prepare/cancel/replay и lifecycle rollback baselines | Гарантия уже есть; не добавлять DB-only no-op тесты |
| Архитектурные границы | `tests/architecture.test.ts` HBU-004, статические negative type assertions через typecheck | Не менять architecture.json/allowlists |

CI сейчас: один job **Node 24 / PostgreSQL 18**, pnpm 12.16.1, frozen install; lint → typecheck → unit → build → migrations → повторные migrations → PostgreSQL integration → отдельный DB17. Service password синтетический, порт loopback динамический, все три URL явно заданы и masked, permissions contents:read, checkout без сохранённых credentials. Vitest unit исключает `tests/integration/**`; integration config явно включает их, `fileParallelism:false`, собственные timeouts. Нет основания создавать второй общий CI workflow, повторять install/build/DB suites или менять конфигурацию runners.

Последние записанные HB-014 результаты: 639 unit, 302 PostgreSQL, timezone subset 503 в каждом TZ, lint/typecheck/build/migrations PASS ([источник](hb-014-verification.md)). Это данные предыдущей реализации; текущая сессия их не воспроизводила и не подтверждает удалённый CI run.

## Доказанные пробелы и точные изменения

### G1 — Нет проверяемой сквозной связи scenario → реально прошедший test

1. **Гарантия/риск.** Markdown mappings существуют, но CI не сверяет их с выполненными assertions. Удалённый, переименованный или skipped тест может оставить нормативный сценарий формально «покрытым». Совпадение текстовых ID тоже не доказывает правильное сопоставление.
2. **Основание.** Acceptance HB-015 и `tests/scenarios/README.md`: scenario IDs должны быть связаны с исполняемыми тестами и evidence. BR-10/11 требуют доказательства финансовых инвариантов.
3. **Имеющееся/недостаточность.** HB-013/HB-014 имеют подробные ручные mapping tables; HB-010 и HB-011 используют более общие ссылки. Реальная коллизия: [нормативный HB10-DB02](../../tests/scenarios/phase-01/hb-010-bank-checkpoints.md) — lock/concurrency, но `tests/integration/bank-checkpoints.test.ts:70` с названием HB10-DB02 проверяет initial confirmation; concurrency находится в HB10-DB20 (`:338`). Нормативный HB10-DB03 — lost COMMIT acknowledgment, а исполняемый HB10-DB03 (`:79`) — int64 endpoint; нужный тест HB10-DB21 (`:350`). Нельзя считать это отсутствием concurrency/COMMIT tests, но поиск одинакового ID даёт ложное доказательство. package scripts, configs и ci.yml не содержат checker или связи с runtime report.
4. **Изменение.** Ввести небольшой versioned manifest `tests/finance/coverage.json` и dependency-free Node checker `scripts/check-finance-coverage.mjs`. Для каждого нормативного scenario ID: source path + устойчивый locator определения, BR/ADR, scope/disposition, обязательства сценария, suite + path + точное полное runtime test name для каждого обязательства, краткое описание проверяемого assertion. One-to-many обязательно поддержать: финансовый пример, rollback и auth могут доказываться разными тестами. `it.each` связывать с конкретными развёрнутыми именами/вариантами, без неограниченных regex и поиска ID во всём файле. Не переименовывать нормативные IDs ради совпадения с тестами. В manifest явно отобразить обе HB10 коллизии; в существующий scenario-документ добавить пояснение различия normative ID и executable label.
5. **Проверка/приёмка.** Checker читает свежие JSON reports unit/integration и требует status=passed для каждого обязательного test reference; проверяет существование нормативных определений, уникальность ID и полноту scope inventory. Удаление ссылки/сценария/теста, missing report, skipped/todo/failed case, ошибочный suite/path/name и неизвестный disposition должны завершаться ненулевым exit. Reviewer проверяет соответствие GIVEN/WHEN/THEN assertions вручную: checker доказывает исполнение ссылки, не смысл теста.

**Scope inventory для G1.** Включить core F-001–018, HB1-001–020, HB2-001–046, HB3-001–035/C01–C08, HBA-001–016, HBL-001–028, HB9, HB10, HB11 (включая a/b, metadata и Medium cases), HB12 S/E/O, HB13 T/PG-R/PG-F/PG-P и HB14. DB01–23 из HB-006 verification и AUTH cases из HB-007 — поддерживающие executable references; не выдавать их за отсутствующие самостоятельные scenario-файлы HB-006/007. HB-008 также связывается через money/date tests, а не через выдуманный scenario-файл.

Определения извлекать из нормативных заголовков/таблиц/списков каждого файла, с явными file-specific правилами, не из всех упоминаний ID и архивных evidence paragraphs. Сокращённые S01/T01 нормализовать с namespace файла; диапазоны развернуть. Для каждого ID допускаются:

- `required`: все реализованные в HB-006–014 обязательства должны иметь конкретные passed references;
- `partial`: реализованная часть обязательна к исполнению; каждое остальное обязательство явно deferred с owner task и причиной;
- `deferred`: только функция вне этого gate, с конкретным будущим HB task/открытым решением; не засчитывается как passed.

Например F-012 PDF и соответствующие части HB1/HB2 — HB-025/026; F-014 operation/category persistence — HB-024 и последующие соответствующие use cases; F-016 recurrence — HB-020/Q-HB1-03; HB2-008/022 close-version workflow — HB-019. Для F-013 storage immutability/pending flag уже required, но пользовательское создание исправленной версии deferred HB-019. Нельзя пометить весь составной сценарий deferred, если реализованные гарантии уже входят в gate. Приписывание существующему сценарию численно иного эквивалентного fixture должно быть объяснено; в отчёте не утверждать выполнение точного original oracle, если проверена только эквивалентная часть. Все исключения reviewable в manifest и отчёте, без wildcard exemption для целого HB-префикса.

**Runtime evidence.** Использовать встроенный JSON reporter установленного Vitest 5.0.5 параллельно default reporter в существующих основных запусках. Формат доступен локально в Vitest declarations (`JsonTestResults`, `JsonTestResult`, `JsonAssertionResult`); точные поля адаптера проверить при реализации. Проверять suite provenance, нормализованный relative path, full name, статус и число найденных cases; неоднозначная ссылка запрещена. Type assertions отмечать отдельным gate `typecheck`, не как Vitest passed case. Reports создаются в новом временном каталоге CI run, не читаются из versioned fixtures/старых запусков. Не перезапускать suite ради JSON. Сырые сообщения/assertion values не печатать в summary; summary содержит IDs, test references, counts и статусы. Артефакты локальной проверки не коммитить.

### G2 — Host timezone independence проверена локально, но не закреплена CI

1. **Гарантия/риск.** CI не проверяет одну и ту же календарную/историческую математику в разных host TZ. Случайное использование локальной Date-арифметики может пройти default CI и изменить Berlin month/day, age>=7 или inclusive divisor на другой машине.
2. **Основание.** BR-01/04/10, ADR0002/0003, D39; HB3-023–026, HBL-025/026, HB14-038/039/057.
3. **Имеющееся/недостаточность.** Уже есть DST/leap/month-boundary unit и PostgreSQL тесты. HB-008–014 verification фиксируют UTC и America/Los_Angeles, но ci.yml не задаёт TZ и не содержит такой subset step. Это пробел автоматизации, не отсутствие календарных тестов.
4. **Изменение.** Основной unit step явно запускать с `TZ=UTC`. Добавить в тот же job один дополнительный DB-free unit subset step с `TZ=America/Los_Angeles` и явным перечнем 14 файлов последнего HB-014 subset (ниже). UTC subset уже включён в полный unit run, повторять его отдельно не нужно. TZ задавать через step env, не через mutation process.env внутри Vitest worker. Не создавать второй PostgreSQL service, полный CI matrix или повторный build.
5. **Проверка/приёмка.** Те же subset cases присутствуют и passed в UTC full-unit JSON и в отдельном TZ JSON; expected Berlin результаты одинаковые по детерминированным assertions, не по duration/output bytes. Checker проверяет паритет списка runtime identities subset и отсутствие skipped cases. Отсутствующий timezone report или missing case блокирует gate. Не фиксировать число 503 как вечный threshold: состав должен следовать manifest и реальной коллекции.

### G3 — Узкий пробел в monotonicity assertion HB14-058

1. **Гарантия/риск.** Тест с названием monotonicity не вызывает production projection для соседнего изменённого состояния. Нет прямой парной проверки, что увеличение полного R/S при неизменных B/A/days не увеличивает safeAvailable/mainDaily, особенно на границе other-period A=E и вне малой сетки значений.
2. **Основание.** D36/ADR0003: T=E[current]+sum(max(A[p],E[p])), safe=max(0,B-T); следствие — усиление защиты не повышает безопасный лимит. HB14-058 уже заявляет эту область.
3. **Имеющееся/недостаточность.** `tests/forecast.test.ts:195–218` выполняет 27 000 production states и проверяет эквивалентный L, conservation, bounds, quotient/remainder; это сильное существующее покрытие. Но `nextT` в `:206–207` строится вручную и сравнивается с исходным l.safeAvailable, без второго вызова estimate. Отдельный divisor/split/permutation sweep тоже не проверяет projection соседнего увеличенного состояния. Это ограничение assertion; ошибка реализации не обнаружена. Полный finite sweep уже косвенно доказывает монотонность внутри проверенной сетки через точное равенство формуле — не заявлять отсутствующей всю математическую проверку D36.
4. **Изменение.** Усилить существующий файл небольшим `it.each` из максимум шести пар, два реальных `projectAccount` на пару; не расширять 27 000-state Cartesian sweep и не добавлять property-testing library. Проверять ожидаемые safeAvailable и q/r обеих сторон плюс nonincrease; B/A, observation date и исходные fixture-объекты неизменны. R и S проверять отдельно в текущем/другом периоде; порог max покрыть по обе стороны.
5. **Проверка/приёмка.** Все шесть пар из следующей таблицы исполняются production domain API с exact bigint expected values. Усиленный тест ловит замену max на sum и рост лимита после увеличения E. Существующие numeric oracles, finite sweep и DB suites остаются обязательными, их успех не заменяется этим тестом.

Все G3 суммы — синтетические cents; H/asOf=2026-11-28, observation=2026-11-20, n=3, обычные selected UNPAID, если не указано иначе. Никаких writes или ожидаемых доходов. AFTER — альтернативный вход того же pure test, не скрытая финансовая операция.

| Будущий ID | GIVEN → WHEN | THEN safeAvailable; daily/remainder до → после |
|---|---|---|
| HB15-M01 | B=10000,A Nov10000,R Nov1000→1001,S0 | 9000;3000/0 → 8999;2999/2 |
| HB15-M02 | B=10000,A Nov10000,S Nov1000→1001,R0 | 9000;3000/0 → 8999;2999/2 |
| HB15-M03 | B=10000,A Nov5000/Dec5000,R Dec4999→5000,S0 | 5000;1666/2 → 5000;1666/2 (overlap, без double reserve) |
| HB15-M04 | Та же A,R Dec5000→5001 | 5000;1666/2 → 4999;1666/1 |
| HB15-M05 | B=10000,A Nov5000/Dec5000,R Dec4000,S Dec1000→1001 | 5000;1666/2 → 4999;1666/1 |
| HB15-M06 | B=A Nov=9223372036854775807,R Nov=B-1→B,S0 | 1;0/1 → 0;0/0; bigint/int64 boundary, без overflow |

## Матрица BR/ADR/scenario → test → CI gate

Это обзор гарантий для ревью. Полный развернутый inventory с точными runtime names — результат G1; диапазон в строке ниже не утверждает, что один тест выполняет все сценарии целиком.

Gate labels: **U** — существующий full unit с UTC; **P** — существующий full integration PG18; **T** — существующий typecheck; **Z** — новый LA subset; **M** — новый checker по результатам U/P/Z. Lint/build/migrations/DB17 остаются обязательными прежними gates.

| Норма / сценарии | Executable proof | Gate / предел |
|---|---|---|
| BR-01/05/11; ADR1; HB1-001/002/011/012/020; HB10-V01–04 | checkpoints complete-cash; bank first confirmation + invalid vectors; forecast HB14-032–035 | U/P/M; optional detail не требуется |
| BR-02/03/06/11; F-001/002/007/017; HB11-06/07/08/16–19, Medium-A–F | obligations lifecycle; PG payment/acknowledgment/cancel/rollback | U/P/M; точные F fixtures и эквивалентные HB11 cases различать |
| BR-03/07; F-006/008; HB11-02–05/12–14/33; HB12-S01–18/S40 | obligations/savings unit и PG; forecast numeric cases/HB14-010/011/049/052/053 | U/P/M |
| BR-04/05; D32–36; ADR1/3; F-003–005/015; HB13-T08–12/T54–55 | transitions F-004/F-015; forecast HB14-006/051/062, exact oracles | U/P/M; receipt persistence не предполагается |
| BR-04/11; ADR3/D36; HB3-C01–08, HBL-001–018, HB14-018–027/058 | forecast.test finite sweep и exact numeric cases; forecast-oracles; persisted owner oracle | U/P/M + G3 six pairs |
| BR-01/04; ADR3/D37–39; HBL-019–028; HB14-028–042/047/057 | forecast freshness/unavailable/grouping/DST; Berlin/calendar tests | U/Z/M; UI labels пока вне gate |
| BR-10; ADR1–3; HB10-T01–03, HB11-33/34, HB12-S40/41 | money/codec/period/calendar/berlin-date; DB17/19/22, PG microseconds | U/Z/P/T/M; отдельный DB17 остаётся |
| BR-01/08/11; ADR2; F-010/018; HB10-H01–07/R01–06 | checkpoints/history/reconciliation; bank chronological head/correction/order | U/P/M; production K/U остаются unavailable |
| BR-06/07/08; ADR2; HB11-20a/b/21/22a/b; HB12-S23–28/E/O; HB14-043/056 | lifecycle history unit/PG; projection oldH/oldK/correction-reposition | U/P/M |
| BR-05/07/11; ADR1/2; HB2-010/011/031–046; HB13-T13–28/T39–43/T51–53/T64–65 | transitions PG CARRY/FRESH_START/DEFER, full funding refs, PG-F/R; projection HB14-061 | U/P/M; multi-source CARRY refusal required, policy не изобретается |
| BR-08; ADR2; F-009/013; HB2-001–009/022/026–030/036/040 | persistence DB15/16/20; lifecycle/transition report impact; projection immutable report | P/M; storage/unknown/immutability required, HB-019 workflow deferred |
| BR-10/11; HB9-014/022/026; HB10 normative DB05; HB11-30; HB12-S36; HB13-P09; HB14-045 | auth policy/routes/boundaries; owned scope/forged actor/replay PG assertions | U/P/T/M; live provider login не симулируется как DB proof |
| BR-02/10; ADR1/2; HB9-001–019/025; HB10 normative DB02–04; HB11-24–29; HB12-S30–34; HB13-T33–38/T47/T58–59 | audit-idempotency; bank **executable DB20/21/14/15**, obligation/saving concurrency; transition lock barriers | U/P/M; explicit semantic mapping ID collisions |
| BR-01/05/08/10; D27/38; HB12-S12–15; HB13-T29/30/T68; HB14-044/054/059/060 | preview/replay/rollback baselines; projection 18-table baseline; real repeatable-read interleaving and malformed evidence | U/P/M; отсутствие финансовых writes уже tested |
| ARCHITECTURE/architecture.json; HB9-027, HB11 type contracts, HB14 readonly DTO | architecture.test.ts + tests/types и *-types.ts через tsc | U/T; архитектуру не менять |
| F-012/014/016 и operation/PDF/close UI части HB1/HB2 | reviewed deferred obligations в manifest с HB-019/020/024–026 | M проверяет явность исключения; не превращает deferred в passed |

## Порядок реализации после разрешения

Один HB-015, небольшие reviewable изменения; самостоятельные HB-* issues сейчас не создаются.

| Часть | Изменение | Критерии приёмки (не более пяти) | Проверки (не более семи групп) |
|---|---|---|---|
| A — inventory и mapping | G1 manifest, уточнение HB10 labels, новые HB15 scenario definitions | Все normative IDs учтены; obligations разделены; точные references; scoped deferrals с задачей; независимая semantic review | Definition parsing; namespaces/ranges; duplicate IDs; missing ID; collision DB02/03; partial/deferred policy; exact each variants |
| B — runtime evidence gate | G1 checker + JSON reporter в существующих CI commands | Fresh U/P reports; required cases passed; отсутствие/skip/ref mismatch блокируют; safe summary; старые CI gates сохранены | Passed baseline; missing report/ref; failed/skipped/todo; duplicate/ambiguous identity; invalid disposition; path normalization; stale/mismatched run evidence |
| C — TZ | G2 UTC full unit + LA subset | Отдельные процессы/env; один исходный список subset; same cases passed; parity проверяется; без повторного DB/build | UTC baseline; LA baseline; missing Z report; missing/extra case; skipped case; DST/year-boundary assertions |
| D — domain assertion и финальная evidence | G3 six pairs, итоговый verification doc | Два production projections на пару; exact q/r; inputs неизменны; все существующие gates выполнены; review и owner acceptance отдельно | HB15-M01–M06 (шесть case groups); полный regression/CI (седьмая группа) |

Unit tests checker оправданы: он принимает решение о допуске финансовых projections к UI. Использовать синтетические минимальные JSON reports, не запускать из этих тестов вложенный Vitest или PostgreSQL. Не писать тесты, которые лишь сравнивают manifest с его копией.

## Необходимые файлы

Только после одобрения плана:

| Файл | Предлагаемое действие |
|---|---|
| `tests/finance/coverage.json` | Новый reviewed machine-readable inventory/obligations/runtime references, включая timezone subset list |
| `scripts/check-finance-coverage.mjs` | Новый bounded local report/inventory checker на Node built-ins; экспортируемая чистая validation function и CLI |
| `tests/finance-coverage.test.ts` | Новый unit contract checker на синтетических reports и normative fragments |
| `tests/scenarios/phase-01/hb-015-finance-tests-ci.md` | Новые HB15 gate scenarios и шесть точных G3 pairs, без переписывания старых oracle |
| `tests/scenarios/phase-01/hb-010-bank-checkpoints.md` | Только пояснение correspondence normative DB02/03 → executable DB20/21 |
| `tests/forecast.test.ts` | Узкое усиление парных monotonicity assertions; сохранить finite sweep |
| `.github/workflows/ci.yml` | Reporter flags у существующих unit/integration steps, UTC env, LA subset, checker step; остальные gates сохранить |
| `docs/planning/hb-015-verification.md` | После фактических запусков: exact commands, exit codes/counts, environment/run/commit refs, failures, limitations, review |

`package.json`, lockfile, vitest configs не требуют изменений: reporter CLI и прямой `node` command достаточны. Не нужны coverage/V8 package, процентный coverage threshold, новый service/workflow или новая библиотека. Temporary reports не добавлять в Git; для CI достаточно `$RUNNER_TEMP/hb015`, без изменения `.gitignore`. ARCHITECTURE/DATA_MODEL/architecture.json остаются прежними, потому что слои и storage не меняются.

## Команды и итоговый CI gate

Ни одна команда этого раздела не выполнена при подготовке плана. Bash-пример ниже — предлагаемая интеграция в существующие отдельные CI steps; catalog paths задаёт reviewed manifest. Для Windows использовать `pnpm.cmd` и `$env:TZ` в отдельных дочерних процессах, не оставляя override родительской среды.

Сохранить `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, два `pnpm db:migrate`, `pnpm test:integration -t DB17`. Основные тестовые команды только расширить reporter flags, без дополнительных полных запусков:

```sh
node scripts/check-finance-coverage.mjs init "$RUNNER_TEMP/hb015"

# Unit tests step: env TZ=UTC; output в свежем RUNNER_TEMP/hb015.
TZ=UTC pnpm test --reporter=default --reporter=json --outputFile.json="$RUNNER_TEMP/hb015/unit.json"
TZ=UTC node scripts/check-finance-coverage.mjs record "$RUNNER_TEMP/hb015" unit

# PostgreSQL integration tests step: уже существующий PG18 service/guards.
pnpm test:integration --reporter=default --reporter=json --outputFile.json="$RUNNER_TEMP/hb015/integration.json"
node scripts/check-finance-coverage.mjs record "$RUNNER_TEMP/hb015" integration
# Один LA subset из manifest (сам runner задаёт TZ); report: timezone.json.
TZ=America/Los_Angeles node scripts/check-finance-coverage.mjs timezone "$RUNNER_TEMP/hb015"
TZ=America/Los_Angeles node scripts/check-finance-coverage.mjs record "$RUNNER_TEMP/hb015" timezone
node scripts/check-finance-coverage.mjs check "$RUNNER_TEMP/hb015"
```

Перед запусками CI создать свежий каталог под `$RUNNER_TEMP` обычным `mkdir -p`; reports не должны переживать run. При реализации сверить pnpm forwarding/reporter options с установленным Vitest и зафиксировать actual commands; отсутствие reports не должно давать успешный checker. Для локального targeted G3: `pnpm.cmd exec vitest run tests/forecast.test.ts -t HB15-M`; для checker tests: `pnpm.cmd exec vitest run tests/finance-coverage.test.ts`. Targeted runs не заменяют финальные full U/P.

DB-команды разрешены только на этапе реализации и только против проверенного disposable local PG18: `HB_DATABASE_TARGET=isolated-development`, `HB_TEST_DATABASE_TARGET=disposable-local-container`, **все три** DATABASE_URL/DATABASE_URL_UNPOOLED/TEST_DATABASE_URL — явно 127.0.0.1 с проверенными портом/DB. Сохранить `requireLocalDatabaseTargets`, password auth и existing full migration/reapply. Не брать значения из `.env.local`, Neon или production; URL/секреты не включать в evidence.

Результат: прежний job **Node 24 / PostgreSQL 18** блокирует изменение при любом прежнем failure, при нарушении обязательного scenario mapping/исполнения либо при timezone subset regression. Локальный verification содержит точные outputs/counts без суммирования overlapping subsets и без выдачи 27 000 внутренних state checks за 27 000 Vitest test cases. CI logs дают фактическое исполнение; JSON status не заменяет review assertions. Repository branch-protection/required-status settings не видны из локального ci.yml: не утверждать, что merge технически запрещён настройками GitHub. Их проверка/изменение — отдельное действие владельца; новый remote check сейчас не выполняется.

## Риски, вопросы и критерий остановки

- **Semantic mapping — основной риск.** Нужен независимый review полного manifest, особенно составных HB1/HB2 и namespace/ranges. Автоматизация не докажет, что assertions реализуют GIVEN/WHEN/THEN; нельзя ослаблять existing required obligations ради зелёного gate. Если inventory обнаружит дополнительный реальный пробел, сначала дополнить план, а не молча добавить финансовую функцию.
- **Deferred scope прозрачен.** HB-019 closing workflow, HB-020 recurrence и HB-024–026 operations/PDF не становятся блокирующими «отсутствующими тестами» HB-015. Их уже реализованные storage/refusal/no-double-debit части остаются required. Область gate следует acceptance HB-015, не обещанию полного продукта.
- **Clock-sensitive DB fixtures.** Старый текст HB-013 scenarios ещё описывает fixed Nov02 и требование пересмотра; актуальный helper `tests/fixtures/transition-calendar.ts` и `transition-calendar.test.ts` уже поддерживают civil shifts, включая month-start. Не предлагать заново чинить fixed calendar без воспроизводимого failure. Actual runtime в новом запуске всё равно требуется; запрещены обход guards и отключение future-date validation.
- **Время CI.** Дополнительный LA subset повторяет лишь DB-free часть. Измерить job duration в пределах существующего 20-minute timeout; не менять timeout/parallelism без фактической необходимости. Порог test counts не должен замораживать развитие suites.
- **Совместимость reporter.** Checker должен fail closed при неожиданной JSON схеме, а не считать пустой result успехом; upgrade Vitest потребует пересмотра адаптера. Не коммитить driver messages или финансовые snapshots в reports.
- **Открытые продуктовые вопросы уже зарегистрированы** в [OPEN_QUESTIONS](../OPEN_QUESTIONS.md): Q-HB2-02 multi-source CARRY, Q-HB3-02 overdraft, Q-HB3-03 historical overspend, Q-HB1-03 recurrence scope. План их не решает; существующие typed refusals остаются. Нового рискованного продуктового предположения для HB-015 не требуется, поэтому новый вопрос/изменение реестра сейчас не добавляется.
- **Решение владельца:** реализация A–D с R1 принята 2026-11-03 после owner-reported APPROVED, 0/0/0/0. Внешняя CI evidence и политика required status требуют отдельно доступного фактического run; исторические локальные PASS этого не доказывают.

Исходный этап планирования создал только этот план; последующая реализация и R1 описаны в verification. Финализация меняет acceptance metadata и соответствующие нормативные хеши. **HB-015 Done; остановиться для проверки финализации и отдельного разрешения на публикацию.** Commit/push/PR/merge/deploy не выполняются.
