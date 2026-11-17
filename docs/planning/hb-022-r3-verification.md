# HB-022-R3 — verification and ZIP handoff, 2026-11-17

**Current status: Done / Owner Accepted — 2026-11-17, D65.** Владелец подтверждает независимое ZIP-ревью **APPROVED (0 Critical / 0 High / 0 Medium / 0 Low)** и принимает R3 целиком. Это отдельный follow-up HB-022, а не повторная приёмка базовой реализации по D63. Публикация разрешена только через gates; фактический release PASS не предполагается. Прежний Review, D64, ошибки, ограничения и NOT EXECUTED ниже — сохранённая история.

## База и сохранение локальной работы

Начало: локальная `main`, HEAD `1092835` (`feat(hb-022): add read-only analytics and record owner acceptance (#29)`). Создана локальная `feat/hb-022-r3-chart-readability` без reset/stash/checkout файлов; HEAD прежний. Удалённый main не проверялся и не обновлялся. Создание ветки потребовало разрешённого выхода из файловой песочницы для Git refs; после этого выполнено штатно.

До изменений сохранены SHA-256 **828** tracked/non-ignored untracked файлов в `tmp/hb22-r3/baseline.json` и исходные четыре документа R3/Tasks/Open Questions/Hooks MD для сравнения. Из исходных файлов изменены только 10 разрешённых путей ниже; остальные **818** побайтно сохранены. Добавлены только новый UI-тест и этот отчёт. Финальный machine-readable результат — `tmp/hb22-r3/preservation.json`.

Предшествующий dirty scope `eslint.config.mjs`, `.codex/`, `scripts/codex-quality/`, `tests/tooling/` сохранён без изменений. Предшествующие planning-правки Tasks/Open Questions и исходные R3-план/Code Quality Hooks MD не терялись; в ZIP есть полные текущие версии, исходные четыре документа и отдельный R3 diff. Не выполнялись auto-fix/format-all, изменения Git config или зависимости.

## Изменённые файлы и причина

| Файл | Изменение |
|---|---|
| `src/features/analytics/charts.tsx` | Подписанные SVG-оси, EUR-деления/сетка; фактический диапазон Y для точек; точная последняя показанная проверка без hover; opt-in отрезки; локальные hover/details/cluster-list и отдельное сравнение; легенда, нулевая линия/отметка, signed F, точные столбцы/карточка, локальные окна месяцев со стабильным Y. |
| `src/features/analytics/analytics-screen.tsx` | Только импорт/вызовы графиков и передача прежних форматтеров; ключи сбрасывают локальные детали при смене данных/базы/страницы. Старая текстовая A/R/S/F-подпись заменена цветовой легендой в графике. Загрузка, таблицы/карточки, filters, H/K, actions и сравнение не переписаны. |
| `src/shared/i18n/messages/ru.json`, `de.json`, `en.json` | По 14 новых analytics-ключей; все существующие значения рекурсивно сравнены с HEAD и неизменны (`locale-preservation.json`). |
| `tests/analytics-chart-readability-ui.test.tsx` | 14 новых синтетических UI-тестов; прежние тесты не изменены. |
| `docs/DECISIONS.md` | D64: approval, узкое исключение D60, scoped QA, ZIP-review/commit boundary. |
| `docs/OPEN_QUESTIONS.md` | Q-HB22-R3-01 RESOLVED; исходный вопрос сохранён как история. |
| `docs/TASKS.md` | R3 — Review; базовый HB-022 остаётся Done/Owner Accepted. |
| `docs/planning/hb-022-r3-chart-readability.md` | Текущее разрешение и решение вопроса, пункт 7 заменён scoped проверками; прежние planning-записи сохранены как история. |
| `docs/CODE_QUALITY_HOOKS.md` | Завершён текущим R3 audit/addendum с наблюдаемыми hooks, границами evidence и обязательным включением в будущий коммит. |
| Этот отчёт | Фактические проверки, ограничения, preservation и handoff. |

## Реальные UI-тесты — PASS 33/33

```powershell
node node_modules/vitest/vitest.mjs run tests/analytics-chart-readability-ui.test.tsx tests/analytics-read-ui.test.tsx tests/analytics-corrections-ui.test.tsx tests/analytics-mobile-filters-ui.test.tsx --maxWorkers=1 --reporter=default --reporter=json --outputFile=tmp/hb22-r3/ui-verified.json
```

**Exit 0; 4 files, 33/33, zero skipped; 55.04s.** Новые R3 — 14/14, неизменённые analytics UI/comparison/corrections/mobile — 19/19. Evidence: `tmp/hb22-r3/ui-verified.json`, `ui-verified.log`.

Новые тесты проверяют RU/DE/EN-подписи, последнюю дату/точную сумму без hover, отсутствие принудительного нуля для узкого диапазона; детали отдельно от сравнения; список совпадающих проверок; default без линии и только допустимые соседние отрезки (включая микросекунды, неизвестное/равное время); пустую выборку, одну точку, ноль и int64 maximum; легенду, ноль/отрицательный F, стабильный Y и равные высоты между mobile-окнами, UNKNOWN без подстановки нулевых A/F и точные подписи при достаточном пространстве. Существующие tests проверяют сравнение по прежним ID/read path, смену H/K, ошибку/throw/retry и отсутствие старых значений.

История неудачных итераций не скрывается: первый existing-UI прогон имел missing-message diagnostics из-за ошибочного места добавления новых ключей и один timeout; исправлены только новые переводы. Следующий прогон выявил неоднозначность **новых** селекторов (SVG title и карточка); новые селекторы уточнены. При одновременной тяжёлой handler-проверке промежуточный прогон дал timeout старого H/K-теста и вторичное pointer-events failure следующего теста. Старые assertions, mocks, timeouts и fixtures не менялись. После завершения конкурирующих проверок тот же scoped набор прошёл 33/33 с прежними тестовыми лимитами. Ранние `existing-ui.json`, `ui.json`, `ui-final.json` и логи сохранены; это не PASS окончательного дерева.

## TypeScript, ESLint, hooks и self-review

```powershell
node --max-old-space-size=4096 node_modules/typescript/bin/tsc -p tmp/hb22-r3/tsconfig.json --pretty false
node node_modules/eslint/bin/eslint.js src/features/analytics/charts.tsx src/features/analytics/analytics-screen.tsx tests/analytics-chart-readability-ui.test.tsx --max-warnings=0
node --test --test-reporter=tap tests/tooling/codex-quality-hooks.test.mjs
```

- **Scoped TypeScript PASS, exit 0**, `typecheck-final.log`: extends неизменённый project tsconfig, incremental=false, includes только два изменённых UI-файла и новый тест с их обычными импортами. Конфигурация только в ignored tmp. Первые диагностики optional `theme.vars` и отсутствующих MUI system-props исправлены локальными palette fallback и `sx`; проектный config не менялся.
- **Scoped ESLint PASS, exit 0, zero warnings**, `eslint.log`; без `--fix`.
- **Unchanged hooks tests PASS 28/28, zero skipped**, `hooks-tests.tap`; disposable fixtures, 111.25s. Механизм/config/зависимости hooks не менялись. Все четыре lifecycle definitions в `.codex/hooks.json` совпадают с существующим candidate `scripts/codex-quality/hooks.json` по SHA-256; baseline подтверждает их неизменность.
- Фактические PreToolUse reminders и PostToolUse **PASS, 3 TS/TSX** видны в этой сессии; full skills с SHA-256 загружены. `skills-verified.json` подтверждает обе версии: clean-code `0d2e46b140b32b198a9bfbd68eb2d29bbbecdf83cd1dd7158ec3ae272c87da43`, simplifier `9247f7cac9cd368b821ec5c1b43d65c90afc069a74b2619f60e6d31a21a44eec`.
- Свежий отдельный запуск **того же** `changedSources`/`checkChanges` на исходной session baseline: **PASS, 3 files, zero findings**, `quality-gate.json`, с hash/ranges. Это не вымышленный native Stop receipt; runtime Stop проверяет автоматически при handoff. Механические правила не доказывают typecheck/tests или субъективное качество.
- **Self-review clean-code-ts-react + code-simplifier выполнен** только по новым/directly edited hunks: явные guards для отсутствующих значений/неизвестного времени, readonly входы, чистые вычисления координат, state только для UI, осмысленные функции масштаба/допустимости соединения/осей, без новых универсальных слоёв. CheckDots сохранил существующий низкоуровневый callback/keyboard contract; CheckChart разделяет детали и сравнение. Общие оси вынесены ради двух реальных графиков, остальной JSX не раздроблен на одноразовые абстракции. Соседний код и старые тесты не чистились. Это self-review, не независимое одобрение.

## Реальный браузер — PASS 3/3 выбранных сценария

Установленный Playwright **1.65.0**, существующий образ `mcr.microsoft.com/playwright:v1.65.0-noble`, Chromium **158.0.8127.18**, `--pull=never`; без установки зависимостей. Node REPL встроенного браузера недоступен среди инструментов, поэтому использован локальный Vite harness с фактическим `AnalyticsScreen`, MUI/theme, переводами и синтетическими async analytics responses. Запросы браузера ограничены loopback-harness host; реальные аккаунты, OAuth, БД/Neon и production не использовались. Это component UI evidence, не full Next/auth/DB staging.

| Width / input | Locale / theme | Фактические действия и результат |
|---|---|---|
| 320px / emulated touch | RU / dark | Отрезки opt-in, плотный кластер четырёх реальных проверок → список → детали, отдельное сравнение доступно; mobile месяц/точная signed F-карточка и Next без смены Y. PASS. |
| 375px / emulated touch | DE / light | Те же действия с длинными DE-подписями и touch. PASS. |
| 1280px / mouse | EN / dark | Click/hover, точные значения, легенда/подписи столбцов, отрицательный F, окно месяцев без смены Y. PASS. |

Финальный runner `tmp/hb22-r3/browser/run.mjs`, server/harness/index рядом; команда воспроизведения сохранена в ZIP README. `browser-final.log`: **exit 0, PASS 3/3**; `browser/results.json`: no page/console errors, no horizontal page overflow, SVG-текст совпадает с текущим цветом body. Calls counter не меняется при деталях/режиме/локальном перелистывании; масштаб на всех локальных окнах `[-11000, 900000]` cents, negative F ниже zero axis.

**Визуально осмотрены все шесть финальных PNG** (не только DOM):

- [320 RU dark — checks](../../tmp/hb22-r3/browser/320-ru-dark-checks.png), [months](../../tmp/hb22-r3/browser/320-ru-dark-months.png).
- [375 DE light — checks](../../tmp/hb22-r3/browser/375-de-light-checks.png), [months](../../tmp/hb22-r3/browser/375-de-light-months.png).
- [1280 EN dark — checks](../../tmp/hb22-r3/browser/1280-en-dark-checks.png), [months](../../tmp/hb22-r3/browser/1280-en-dark-months.png).

Вывод: последние точные дата/сумма видны сразу; оси/деления и EUR читаемы; легенда переносится, карточки/управление помещаются, минус и валюта не обрезаны. На общей шкале маленькие суммы закономерно дают низкие столбцы рядом с большим месяцем; точные значения сохраняются в карточке/таблице. Полная ширина/все суммы не сжимаются в 12 mobile-групп.

Неудачные browser attempts: локатор пустого центра SVG-дуги перехватывался предусмотренной полной touch-областью; runner переведён на эту реальную область, без force-click и изменения поведения. После прерывания разговора прежний Vite server остановился, повтор дал `ERR_CONNECTION_REFUSED`; стенд перезапущен, финальный 3/3 прогон выполнен на последнем дереве. Неудачные попытки не считаются PASS.

## Финансовые границы и Code Quality Hooks MD

Preservation сравнивает все начальные файлы, а не только `git diff`. Все `src/domain/**`, `src/infrastructure/**`, `src/app/**` (включая Server Actions), engine/formulas/selectors/readers/verifiers/contracts, DB/schema/migrations, auth/writers, финансовые manifest/gates и **каждый existing test/scenario** побайтно неизменны. Без финансового пересчёта/записи; только BigInt-координаты/деления и форматирование исходных сумм. H/K/report versions и UNKNOWN не заменяются новыми состояниями. Таблицы/карточки и существующие источники данных сохранены. Hooks implementation/config, ESLint override и dependencies тоже неизменны относительно исходного dirty tree.

`docs/CODE_QUALITY_HOOKS.md` проверен по фактическим handler/scope/lint/candidate и свежему TAP/receipts; addendum отличает текущие наблюдения от старых ограничений активации. Он отсутствует в main baseline и **обязательно включён в ZIP и будущий commit scope R3**. Сейчас остаётся незакоммиченным по прямому требованию владельца ждать ZIP-ревью/приёмки; это не исключение документа из финализации. Остальной предшествующий tooling dirty scope не включён в будущий R3-коммит.

## NOT EXECUTED и оставшиеся gates

- Полный `pnpm test`, финансовый/PostgreSQL suite, full-app lint/typecheck/build, полная браузерная матрица — **не запускались** по ограниченному тестовому решению владельца; отдельного технического основания расширять scope нет.
- WCAG/screen reader/zoom200%/специальные keyboard/ARIA/physical-AT/OS-theme suites — **не запускались**, не являются R3 gates; существующая семантика/keyboard support и старые тесты сохранены.
- Настоящее физическое устройство и full Next/OAuth/DB browser flow не проверялись; touch эмулировался Chromium. Непосредственные UI, comparison/error/retry проверены выбранными unchanged tests; для R3 нет заявления о новой auth/DB корректности.
- Исторические native offline-model/startup/resume/compaction проверки hooks не повторялись. R3 не меняет механизм hooks.
- Независимое ZIP-ревью и приёмка R3, финальный коммит, push/PR/полный CI/merge/deploy — **NOT EXECUTED**. Полный CI будущего PR обязателен; публикация сейчас не разрешена.

Неразрешённых продуктовых вопросов R3 нет; Q-HB22-R3-01 закрыт D64. В проверенной узкой области незакрытых функциональных дефектов self-review не выявил. Независимое ревью ещё может добавить findings; этот отчёт их не предрешает.

## Review package

Архив `tmp/hb22-r3/hb-022-r3-review.zip` и отдельный `hb-022-r3-review.zip.sha256`. Внутри: 12 полных текущих R3-файлов по repository paths, COMMIT_SCOPE, R3-only diff, исходные четыре документа, scoped evidence/6 PNG/browser harness, SHA-256 manifest. Неизменённые hooks scripts приложены только как явно помеченный context для аудита MD, **не commit scope**. Нет `.env`, профиля/trust settings, исходных TS snapshots, зависимостей, реальных банковских данных или exports. Хеш архива хранится снаружи, чтобы не создавать самоссылку. Остановиться в Review до решения владельца.

## Minimal correction after review — 2026-11-17

Независимое ревью: **CHANGES REQUESTED — 1 Medium, 1 Low**. Исправлены только два замечания: в `docs/CODE_QUALITY_HOOKS.md` явно обозначены локальная незакоммиченная доступность scripts/config/hooks tests, исключение их из R3 commit scope и невоспроизводимость установки из опубликованной main; в `charts.tsx` единственная календарная X-подпись получила X центральной точки и `textAnchor="middle"`. Сами точки, денежный масштаб, формат дат, другие оси, линии и сравнение не менялись. Добавлен один тест в существующий новый R3 UI-файл: одна проверка и несколько проверок одной даты, подпись под их общим X. Предыдущие результаты выше сохранены как исторические, не объявлены повторно выполненными.

- **PASS 11/11, 4 намеренно отфильтрованы:** `node node_modules/vitest/vitest.mjs run tests/analytics-chart-readability-ui.test.tsx --maxWorkers=1 -t 'shows axes|opens point|first opens|connects only|keeps one|renders no plot|centers the' --reporter=default --reporter=json --outputFile=tmp/hb22-r3-correction/ui-final.json` (exit 0). Только новый тест и связанные R3-тесты точечного графика; четыре теста столбцов не запускались. Первый запуск нового теста ожидал полную дату вместо существующего короткого формата оси; исправлен только его новый селектор, затем тот же набор прошёл.
- **Scoped TypeScript PASS, exit 0:** `node --max-old-space-size=4096 node_modules/typescript/bin/tsc -p tmp/hb22-r3-correction/tsconfig.json --pretty false`; include только charts TSX и R3-тест, без screen entry. **ESLint PASS, exit 0:** `node node_modules/eslint/bin/eslint.js src/features/analytics/charts.tsx tests/analytics-chart-readability-ui.test.tsx --max-warnings=0`. Финальные логи в `tmp/hb22-r3-correction/`.
- Обычный уже активный автоматический changed-code gate — **PASS** (три изменённых TS/TSX всей сессии, включая прежний screen; screen в этой коррекции не менялся). Self-review обоими code-quality skills ограничен новой подписью и новым тестом; дополнительные рефакторинги не выполнялись.
- Документ hooks перечитан и проверен по формулировкам, без запуска application/tooling tests ради документа. Механизм hooks и его тестовый набор не запускались повторно и не менялись. Полный pnpm test, finance/PG, Next build, остальные analytics regressions, браузер/скриншоты/accessibility не запускались; прежние изображения и evidence в пакете остаются историческими до этой коррекции.
- Изменены ровно четыре файла: Hooks MD, charts TSX, новый R3 UI-тест, этот append-only отчёт. Другой dirty scope сохранён. Исправления передаются в **Review**, не Done; commit/push/PR/merge/deploy не выполнялись.

Обновлённый ZIP: `tmp/hb22-r3-correction/hb-022-r3-review-correction.zip`, SHA-256 рядом в `.sha256`; отдельный diff четырёх файлов — `tmp/hb22-r3-correction/correction-only.diff`. Предыдущий ZIP сохранён. Новые результаты находятся в `evidence/minimal-correction/` обновлённого архива; прежние 33/33 и 28/28 не выдаются за прогоны этой коррекции. `docs/CODE_QUALITY_HOOKS.md` остаётся обязательной частью будущего R3-коммита, hooks scripts/config/tests — только context, вне commit scope.

## Owner Acceptance and release preparation — 2026-11-17

Владелец явно принимает R3 целиком после independent ZIP **APPROVED (0/0/0/0)**, [D65](../DECISIONS.md#hb-022-r3-owner-acceptance-and-gated-release--2026-11-17). Принятый correction ZIP SHA-256: `3c7200de25d6836d6b870f3f1b9b10b130fe79a4573fb5f9e9303b37dc411d26`. Статус R3 **Done / Owner Accepted** не означает опубликованный production release.

Работа продолжается из прежней `feat/hb-022-r3-chart-readability`, HEAD/main `10928350a457659166e5b9ce75c84725f9fa9402`, без восстановления из ZIP, stash/reset/rebase/clean. Read-only `git ls-remote` подтвердил origin/main на том же SHA; remote — `https://github.com/strakhovdenya/home-budget.git`, R3-ветка до push отсутствует. До финализации сохранены hashes всех 830 локальных путей и исходного index; исходные dirty ESLint/hooks/config/tooling файлы вне scope сохраняются без изменений. Только 12 review-approved путей, включая Hooks MD; runtime/tests не дорабатываются при финализации.

Локальные полные suites/build/finance/PG и браузерная матрица повторно не запускались по прямому решению владельца; прежние scoped evidence выше остаются фактическими результатами своих этапов. Новые обязательные доказательства — полный штатный CI на точном PR SHA и проверка Vercel release gates до merge. GitHub legacy branch protection endpoint на main вернул **404 Branch not protected**; это не PASS защиты и не основание обходить gate. Vercel metadata подтвердили Home Budget project/team, но production-branch/check/promotion параметры пока не доказаны. Их отсутствие в ответе не трактуется как безопасная конфигурация.

На этапе подготовки этой записи commit/push/PR/CI/preview/squash merge/R3 production verification ещё не выполнены. Реальные SHA, ссылки и результаты последующих действий приводятся в финальном release handoff/PR, без подмены исторических результатов и без дополнительного коммита только ради самоссылки на SHA. При CI failure или неподтверждённом обязательном gate соответствующий шаг останавливается.
