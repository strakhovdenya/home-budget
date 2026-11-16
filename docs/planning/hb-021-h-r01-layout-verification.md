# HB-021 H-R01 correction / H continuation — 2026-11-16

**H-R01: FAIL → PASS. H: BLOCKED / OWNER DECISION (новый HB21-H-R02).**
Ветка `feat/hb-021-e2e-harness`, HEAD `f8bfca7f836271cff87858c04be2cbf3643ce4e9`.
I–J не начаты; HB-021 не Done. Commit/push/PR/deploy и main sync не выполнялись.

## Исправление H-R01

Единственный production-diff:
`src/features/onboarding/first-run-screen.tsx` — `useId`, связанный `FormLabel`
над input с обычным переносом и исходным размером шрифта. Required, accessible
name, decimal input, EUR/cents, consent, preview/confirm/status сохранены.
Тела финансовых обработчиков совпадают с исходными. Другие production-файлы
не менялись. Схема, Server Actions, auth, финансовые формулы и правила сохранены.

Исходный [FAIL](hb-021-h-layout-verification.md): RU/320, подпись 255 px в 230 px,
`overflow:hidden`, ellipsis. Тот же clipping predicate сохранён; новые assertions
дополнительно требуют полной ширины текста, видимости над input, label/id,
required, accessible name, click→focus, локализованного ввода и реального preview.

`node --import tsx scripts/e2e/layout-run.ts --case=H-LABELS` → **exit 0, 9/9 PASS**:
RU/DE/EN × 320×800 / 375×812 / 1280×900. На RU/320 теперь **254/254 px**,
`whiteSpace:normal`, полная подпись с EUR видима над input. Каждый подслучай —
отдельный browser test; реальный preview, exact **20-table no-write**, SELECT-only
runtime. Confirm в этой узкой regression не выполняется.
Run `baf824c36e16c79fedf55ef68b7fd6cb`; повторные 9/9 в общем H-прогоне.
SHA-256 production-компонента после исправления:
`e41d49011d10200619580e25ff848dabaf2b210007edc7e8e163a75f6c7523ae`.

## Новый дефект и остановка

**HB21-H-R02:** Chromium 158.0.8127.18, RU, **1280×900**, `/history`:
видимая подпись «Месяц изменений (пусто: вся история)» обрезана ellipsis внутри
month-input. Page width/scrollWidth **1280/1280**, но label имеет clipping:
`overflowX=hidden/clip` и `scrollWidth > clientWidth+1`.
`H_NO_CLIPPED_TEXT history-index` — **FAIL**, screenshot подтверждает обрезку.
Accessible name остаётся полным; это не доказывает визуальную полноту подписи.

Причина: [history-screen.tsx:101](../../src/features/financial-history/history-screen.tsx)
использует длинный плавающий label в узком поле desktop-row. Риск: подсказка о
значении пустого фильтра видна не полностью. **Файл не исправлялся.**

Минимальное предложение для отдельного согласования: полная переносимая подпись
над month-input с label/id и корректным responsive layout. Сохранить filter state,
очистку/refresh, actions, pagination, H/K и read-only semantics. Production scope:
только этот UI-компонент и узкая regression; без изменения данных/формул/auth/schema.
После разрешения проверить RU/DE/EN на 320/375/1280 и exact no-write.
По условию владельца дальнейшая зависимая H-матрица остановлена.

## Семь групп и фактическая матрица

| Группа | Результат |
|---|---|
| Locale | Частичный PASS: RU/DE/EN read routes, EUR/cents/Berlin dates, переключения locale. Локализованные confirm/error/UNKNOWN/status recovery и zero/F<0 cases — NOT EXECUTED |
| Mobile | H-R01 все 3 языка × 320/375 PASS; read routes Chromium RU/DE/EN 320 и RU375 PASS в общем прогоне. Успешные финансовые journeys — NOT EXECUTED |
| Desktop | H-R01 все 3 языка ×1280 PASS. Read routes трёх языков выполнены; новая полная label-проверка RU1280 **FAIL H-R02** |
| Native 200% | **NOT EXECUTED**, нужен оператор реального browser UI. CSS zoom/deviceScaleFactor не использовались |
| Themes | light/dark/system + system light/dark, неизменность финансового текста и no-write — PASS в выполненных read routes. Полная приёмка группы и negative-F branches не завершены |
| Firefox | **159.0**, RU desktop+375 read/session/update-form/history/closing PASS; подтверждённые update journeys — NOT EXECUTED |
| WebKit | **27.2**, desktop history/reports/themes выполнены, RU→DE **FAIL**; 375 — NOT EXECUTED. Это Playwright WebKit, не Safari |

| Chromium комбинация | H-R01 focus/input/review | Read routes в общем H-прогоне | First/update/templates, transition/payment |
|---|---|---|---|
| RU 320×800 | PASS | PASS | NOT EXECUTED |
| DE 320×800 | PASS | PASS | NOT EXECUTED |
| EN 320×800 | PASS | PASS | NOT EXECUTED |
| RU 1280×900 | PASS | Выполнены; финальный clipping-check **FAIL** | NOT EXECUTED |
| DE 1280×900 | PASS | Выполнены; новая label-проверка NOT EXECUTED | NOT EXECUTED |
| EN 1280×900 | PASS | Выполнены; новая label-проверка NOT EXECUTED | NOT EXECUTED |

Предыдущие read PASS не выдаются за PASS усиленной финальной проверки label.
Выполнены три перспективы истории, v1/v2, chunk/reload, Next/Previous и другие
read routes. Во всех завершённых read scopes exact census 20 таблиц совпал.
Общая автоматизированная H-матрица **не PASS**. Keyboard/axe/physical AT — I,
NOT EXECUTED. Native 200% для всех языков/перспектив также NOT EXECUTED.

## Прогоны и evidence

| Команда `node --import tsx scripts/e2e/layout-run.ts …` | Run | Exit / результат |
|---|---|---|
| `--case=H-LABELS` | `baf824c3…` | **0**, 9/9 |
| `--verify` | `7969410c…` | **1**, 18 PASS / 1 FAIL / 20 NOT EXECUTED; skip/flaky 0 |
| `--case=H-WK-DESKTOP` | `9476f67c…` | Exit не восстановим; build log TS7053, browser не запущен, report повреждён (NUL bytes) |
| `--case=H-RU-DESKTOP --checks` | `88dbaa9a…` | **1**, H-R02 regression FAIL; lower checks PASS |

WebKit RU→DE failure остаётся **OPEN**: исходный тест не ожидал конкретный locale
Server Action/окончание transition и повторно выбирал уже активную locale.
В H-тест добавлены ожидания реального ответа, cookie, lang, heading и enabled-state;
assertions сохранены. Повторный browser proof этого изменения не получен:
диагностика остановилась на TS7053; типизация затем исправлена, typecheck PASS.
Не заявляется FIXED или production-причина WebKit failure.

Финальный frozen run `88dbaa9af2247227f9e2017214a21d29`, **16 ноября 00:38–00:43 CET**:
444 файла, SHA-256 inventory
`6ee33aa9e35f13d53054d6a9c53dab8e375af5bf03b15ada653a301a09b28a56`.
Host Node22.23.0; runner Node26.13.1/pnpm12.16.1/Playwright1.65.0/Next16.4.3;
PostgreSQL18.6. Pinned image digests и полные argv/exits — в evidence/report.json.

| Проверка на финальном source | Результат / exit |
|---|---|
| H ESLint (`scripts/e2e/layout*.ts`, support/layout*.ts, tests/layout-e2e, layout config), `--max-warnings=0` | PASS / 0 |
| Next typegen; `tsc --noEmit`; `next build` | PASS / 0, 0, 0 |
| Vitest: i18n, financial-history-ui, onboarding-boundary | **32/32** (7+23+2), pending0 / 0 |
| Isolated PG: integration/financial-history, integration/onboarding | **45/45** (17+28), pending0 / 0 |
| Browser `--grep "H-RU-DESKTOP "` | **0 passed / 1 failed**, skip/flaky0 / 1 |
| Два применения локальных Drizzle migrations | PASS / 0,0; 6 journal entries неизменны |
| `git diff --check` + whitespace новых файлов | См. evidence/patch-check.json; ошибок whitespace нет |

R01 production-компонент, label.spec и проверенные imports/config после 9/9 не изменены;
hash-сверка приложена. Позже менялись только другие H assertions/synchronization.
Прежние A–G E2E, весь unit/integration, DB17, timezone и Finance Gate не запускались.
Gate/checker/fingerprints/CI/release scripts не менялись; полный прогон — J.

## Сохранность, cleanup и review

Проверены **446 неизменных A–G source files** и одно разрешённое UI-исправление;
финансовые обработчики совпадают. **7 прежних ZIP / 992 payload files** сохранены
по SHA. Нормативные документы, tests A–G и финансовые source не переписывались.
Изменены только H harness/tests/docs и разрешённый onboarding UI-компонент.

Для трёх завершённых correction-прогонов: **15/15 собственных Docker resources
удалены**, remaining0 по точным labels. Из прерванного запуска отдельно удалён
оставшийся PG после проверки name/label/ID/image/ports; containers/networks/volumes
по его label отсутствуют. Повреждённый report сохранён; его полная автоматическая
cleanup-квитанция/exit не восстановимы и не объявляются PASS.
No-write финального reproduction: **20-table exact equality**, financial Confirm
не выполнялся; render errors/external browser requests0. Fixture setup отдельно.
Секреты migrator/verifier/runtime независимы, browser получает только runtime;
прежние fail-closed/namespace/owned cleanup механизмы сохранены. Только synthetic
PG, без Neon/production/OAuth-секретов. Ветка не синхронизировалась с main.

Компактный ZIP содержит H-diff, production fix отдельно, текущие H source,
минимальное sanitized evidence и SHA-256 manifest. Старые ZIP, full snapshots и
большие журналы не упакованы. Передача — **R01 fixed / H blocked by H-R02**, для
независимого ревью и решения владельца; H не объявляется завершённой.
