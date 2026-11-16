# HB-021 H — verification, 2026-11-15

**BLOCKED: HB21-H-R01. H не завершена.** Production-компонент не изменён;
по требованию владельца дальнейшая зависимая реализация/матрица остановлена.
Ветка `feat/hb-021-e2e-harness`, HEAD `f8bfca7f836271cff87858c04be2cbf3643ce4e9`.

## Reproduction и минимальное предложение

Chromium **158.0.8127.18**, RU, **320×800**, новый синтетический пользователь:
открыть `/`, дождаться hydration поля первого остатка, оставить его пустым.
Подпись `Фактический остаток карты, EUR *` визуально обрезана многоточием:
`clientWidth=230`, `scrollWidth=255`, `overflow=hidden`, `whiteSpace=nowrap`,
`textOverflow=ellipsis`. Screenshot и DOM annotation совпадают.
Регрессия `H_FIRST_BANK_LABEL_NOT_CLIPPED` — **FAIL**, 1/1, exit **1**;
skipped/flaky/retries — **0**. Это локальное воспроизведение production-компонента,
а не обращение к production.

Причина: [first-run-screen.tsx:66](../../src/features/onboarding/first-run-screen.tsx)
использует обычный длинный outlined TextField label без переноса. Стандартный
MUI InputLabel обрезает подпись в неактивном состоянии. Page-wide overflow нет
(`320/320`); одной проверки ширины страницы для этого дефекта недостаточно.
Риск: часть назначения/единицы поля скрыта на узком экране до взаимодействия.
Accessible name содержит полную подпись; это не доказательство её визуальной полноты.

**Предложение для отдельного решения владельца, не применено:** только в этом
поле показать полную переносимую подпись над input с корректной связью label/id;
сохранить доступное имя и required, обработку cents, consent и Server Actions.
Ожидаемый production scope — `src/features/onboarding/first-run-screen.tsx` и
узкая UI/browser regression. Проверить RU/DE/EN на 320/375/desktop, focus/input/review.
Не скрывать overflow и не ослаблять assertion ради PASS. Финансовые правила,
schema/auth и формулы не требуют изменения.

## Семь proof groups и обязательная матрица

| Группа | Фактический результат |
|---|---|
| Locale | Частичный DEV PASS: RU/DE saved-history/report routes. Полная locale/cents/UNKNOWN/status матрица финального H source — NOT EXECUTED |
| Mobile | **FAIL RU/320: HB21-H-R01**. Ранее RU/DE read-only routes без page overflow. 375 — NOT EXECUTED |
| Desktop | NOT EXECUTED |
| Native 200% | NOT EXECUTED: нужен оператор реального browser UI; CSS zoom/deviceScaleFactor не использовались |
| Themes | NOT EXECUTED: light/dark/system checks подготовлены, но не достигнуты |
| Firefox | NOT EXECUTED; версия не измерялась |
| WebKit | NOT EXECUTED; версия не измерялась; не заявляется Safari |

| Chromium | Read routes | Успешный first/update/templates | Transition → payment |
|---|---|---|---|
| RU 320×800 | DEV PASS, более ранний H source | **FAIL на первом label; Confirm не достигнут** | NOT EXECUTED |
| DE 320×800 | DEV PASS, более ранний H source | NOT EXECUTED | NOT EXECUTED |
| EN 320×800 | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED |
| RU/DE/EN 1280×900 — каждая из 3 комбинаций | NOT EXECUTED | NOT EXECUTED | NOT EXECUTED |

Ранний DEV PASS не переносится на изменённый H source. Он включал три перспективы
истории, v1/v2 и chunk, dashboard/update/obligations/savings/settings, exact no-write.
Расширенная матрица из 30 случаев подготовлена как **draft**, её общий PASS не заявляется.
Новые темы, переключение locale, cents/zero и desktop recovery остаются непроверенными.
Keyboard/axe/physical AT отложены в I. Полная регрессия/Finance Gate — в J.

## Frozen source: команды и результаты

Финальный run `e34563f8e6edd2092904ae4be8e35c3b`, 20:17:57–20:22:04 UTC.
443 файла чистого checkout, SHA-256 inventory:
`624ccf97801ae3269d8b2c8c4f0c1934263e963aa344dd24a29873f3c5339f0a`.
Host Node 22.23.0; runner Node 26.13.1, pnpm 12.16.1, Playwright 1.65.0,
Next 16.4.3, PostgreSQL **18.6** (`180006`). Image digests — в evidence/report.json.

Внешняя команда:
`node --import tsx scripts/e2e/layout-run.ts --case=H-RU-320-FIRST --checks` → **exit 1**.
Внутренние команды выполнялись в `/work` с чистым окружением:

| Команда (`node` + argv) | Результат / exit |
|---|---|
| `node_modules/eslint/bin/eslint.js scripts/e2e/layout*.ts tests/e2e/support/layout*.ts tests/layout-e2e playwright.layout.config.ts --max-warnings=0` | PASS / 0 |
| `node_modules/next/dist/bin/next typegen` | PASS / 0 |
| `node_modules/typescript/bin/tsc --noEmit` | PASS / 0 |
| `node_modules/next/dist/bin/next build` | PASS / 0 |
| `node_modules/@playwright/test/cli.js test --config playwright.layout.config.ts --grep "H-RU-320-FIRST "` | **FAIL clipping**, 0 passed / 1 failed / 0 skipped / 1 |
| `node_modules/vitest/vitest.mjs run tests/i18n.test.ts tests/financial-history-ui.test.tsx tests/onboarding-boundary.test.ts --reporter=json --outputFile=/work/test-results/h-lower/unit.json` | **32/32 PASS** (7+23+2), pending 0 / 0 |
| `node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts tests/integration/financial-history.test.ts tests/integration/onboarding.test.ts --reporter=json --outputFile=/work/test-results/h-lower/pg.json` | **45/45 PASS** (17+28), pending 0 / 0 |
| `--conditions=react-server --import tsx scripts/db-migrate.ts`, два применения | 0 / 0, journal 6 migrations неизменен |
| `node tmp/hb021-h/preserve.mjs` | 447 source files и 960 archived payload files / 0 |
| `node --import tsx tmp/hb021-h/cleanup-check.ts` | 40/40 Docker resources удалены, remaining 0 / 0 |

`git diff --check` и проверка whitespace новых H-файлов — см. evidence/patch-check.json.
Полная автоматизированная H-матрица, прежние A–G E2E, весь unit/integration,
DB17, timezone и Finance Gate — **NOT EXECUTED**. Gate/fingerprints не менялись.

Сохранены также ранние реальные FAIL harness: JSON import attribute; ambiguous
alert locator; TypeScript unknown calendar; ambiguous hidden UNKNOWN text.
Их исправления ограничены H. Run IDs, source fingerprints, команды/exits и причины
в `evidence/development-results.json`; они не выдаются за production-дефекты или PASS.

## Изоляция, сохранность и ресурсы

Новые H-файлы: `playwright.layout.config.ts`; `scripts/e2e/layout-{run,harness}.ts`;
`tests/e2e/support/layout-{server,reporter,seed,history,journey}.ts`;
`tests/layout-e2e/{layout.spec.ts,journey.spec.ts,README.md}`; этот отчёт.
Production source, package/lockfile и все прежние A–G файлы сохранены по SHA.
Проверены **447 файлов**, **6 approved ZIP** и **960 файлов** их payload.
Включён только вектор hashes/проверка сохранности, прежние ZIP/snapshots не упакованы.

H переиспользует fail-closed admission/clean checkout/собственный build и start,
без reuseExistingServer. PG и HTTP — loopback внутри собственного Docker namespace,
host ports не публикуются, сеть internal. Setup использует approved synthetic C/D/F
factories. SELECT-only роль отделена от flow-specific writer; секреты migrator,
verifier, read runtime и writer независимы. Browser/Next получают только свой runtime.
Production grants не менялись. Успешные ответы не подменялись.

В финальном reproduction полный census **20 таблиц совпал**; браузерный Confirm
не достигнут. Foreign/identity rows сохранены; external requests и render errors — 0.
Fixture setup учтён отдельно. Ошибочный browser тест также прошёл owned cleanup:
child DB DROP, удаление своего PG/runner/installer/network/volume и checkout.
Всего 8 H-запусков: **40 созданных / 40 удалённых Docker resources**, по 5 на запуск;
read-only запросы по точным run labels подтвердили remaining **0**. Чужие ресурсы
не удалялись. Production/Neon/OAuth-секреты не использовались; main не синхронизирована.

Review ZIP: `hb-021-h-review-20261115-e34563f8.zip`, только H-diff/new files,
sanitized evidence и SHA-256 manifest. Статус передачи — **BLOCKED / OWNER DECISION**.
Зависимая H-матрица остановлена; I–J не начаты; HB-021 не Done.
