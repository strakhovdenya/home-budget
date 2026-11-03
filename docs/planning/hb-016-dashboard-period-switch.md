# HB-016 — Dashboard and period switch

Дата анализа: **2026-11-03**. **PLANNING ONLY — план для независимого ревью ChatGPT. Реализация не разрешена и не начата.** HB-016 остаётся Planned. Будущая feature-ветка: `feat/hb-016-dashboard-period-switch`; в этой сессии ветка не создаётся. После плана остановиться до независимого ревью и отдельного разрешения владельца.

## 1. База и зависимости

Проверены локальные `main`, `origin/main` и удалённая `main` через GitHub connector: все указывают на **`32d1ad56490656a95fdd74d749a4734ed61070e0`**, `HB-015: Finance domain tests and CI gate (#16)`. Shell `git ls-remote origin refs/heads/main` не смог подключиться; read-only `fetch_commit(main)` через connector подтвердил SHA. Это проверка актуальности базы, не запуск CI. Исходный `git status --short --branch` — `main...origin/main`, без изменений; staged diff отсутствует. Будущей HB-016 ветки нет; локальная HB-015 ветка сохранена. `.vscode/` игнорируется Git и остаётся нетронутой. Предупреждения Git о недоступном глобальном ignore-файле зафиксированы; настройки Git не менялись.

Зависимости [TASKS](../TASKS.md): HB-005, HB-007, HB-014, HB-015 — **Done в текущем реестре**. HB-014 принят 2026-11-02; HB-015 принят 2026-11-03 после owner-reported независимого R1 APPROVED, 0/0/0/0. Историческая evidence HB-015: 729 unit / 302 PostgreSQL / 509 LA, finance gate и остальные проверки; **здесь они не перезапускались**. Старые Review/pending фразы в HB-005/007 verification и заголовки «finance unimplemented» в обзорных документах — исторический контекст, не основание отменять текущий TASKS или заново реализовывать M1. Live OAuth acceptance имеет ограничения из HB-007 verification; production OAuth и GitHub required-status policy этим планом не проверены.

Прочитаны AGENTS.md, PRD, BUSINESS_RULES, DECISIONS, принятые ADR0001–0003, IMPLEMENTATION_PLAN, TASKS, ARCHITECTURE, architecture.json, DATA_MODEL, conventions, AGENT_FACTORY, CODEX_WORKFLOW, AUTH, OPEN_QUESTIONS, PROJECT_CONFIG; контракты/verification HB-005/007/014/015, core-rules, HB14/HB15 scenarios и относящиеся к ним HB3/HBL oracle/tests. Актуальная норма D32–D39 имеет приоритет над архивными signed-A примерами и ранними статусами.

Повторно прочитаны все восемь project-local SKILL.md:

| Skill | Применение к этому плану |
|---|---|
| `create-planning-doc` | Один HB-016; ниже небольшие части с максимум пятью критериями и семью группами проверок на часть; явные non-goals и остановка |
| `create-scenarios` | Синтетические GIVEN/WHEN/THEN, exact cents/даты, отрицательные утверждения; пока внутри плана, без изменения tests |
| `verify-financial-invariants` | BR/ADR → UI → assertions; сохранять HB-015 gate, не выдавать статический анализ за PASS |
| `define-architecture` | Существующие app → features → domain и infrastructure ports; никаких изменений архитектуры/allowlist/schema |
| `security-best-practices` | Next server auth/input/cache/error, React/general frontend trust boundaries; ownership при каждом чтении, безопасные DTO/errors |
| `configure-project` | Изучены package/lock, Vitest, CI, migration entry point и PROJECT_CONFIG; использовать установленные средства, не запускать env loaders |
| `vercel-react-best-practices` | Прочитаны server-auth-actions, server-serialization, server-no-shared-module-state, async-parallel; один financial read, узкие client props, без shared financial cache |
| `web-design-guidelines` | Получены [актуальные рекомендации](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md); семантика, focus, URL-state, responsive, locales, reduced motion. Применены как checklist будущего UI, не как выполненный визуальный аудит |

Общие советы skills не требуют новой библиотеки, изменения русской default locale, auth framework, финансовой формулы или архитектуры. Сценарный файл и executable assertions создаются только после разрешения реализации.

## 2. Цель и строгие границы

Дать владельцу read-only обзор подтверждённого состояния карты и выбранного финансового месяца. Главный текущий лимит — **D36**, обычный бюджетный ориентир — вторичный. Карта показывает **последний наблюдённый** баланс и реальную дату, не вычисленный «остаток сегодня».

HB-016 не включает HB-017 Update Budget, ввод/редактирование checkpoint, обязательств/накоплений, оплату, release, выбор или подтверждение CARRY/FRESH_START/DEFER, закрытие, версии отчётов, операции/PDF, onboarding/provisioning счёта. Не добавлять финансовый endpoint/action, polling, фоновые задания, PWA/service worker/offline storage или демонстрационные деньги в production. Не менять D36, БД, зависимости, import boundaries или stack. Чтение и навигация создают **ноль** финансовых/audit/report/period записей, не меняют counters/pointers.

Новый текущий календарный месяц доступен виртуально; никаких `INSERT budget_periods` при открытии сайта. Дефицит не превращается в новый долг, частичный резерв, расход, скрытое списание или автоматическое освобождение S.

## 3. Что уже реализовано и переиспользуется

| Код/контракт | Фактическое состояние и повторное использование |
|---|---|
| `src/app/page.tsx`, `src/app/months/page.tsx` | Сейчас session guard + PlaceholderScreen. Заменить только содержимое этих двух страниц |
| `src/features/shell/app-shell.tsx` | Общие main/skip link, desktop sidebar, mobile Drawer/Escape/focus return, пять маршрутов и preferences; сохранить |
| `src/shared/ui/*`, `src/shared/i18n/*` | MUI 9.5 CSS variables, SSR cache/init script, light/dark/system persistence; RU default, DE/EN cookie/refresh и Berlin timezone; сохранить механизм и тему |
| HB-007 auth | `currentOwner`/`requireOwner`, `requirePageOwner`, verified allowlist, server session identity, `requireOwnedAccount`; сохранить OAuth/session/ownership policy |
| `src/app/budget-projection-boundary.ts` | Private server-only `readBudgetProjection`, account/period/liquidity wrappers; selector обязателен. Нет публичного финансового handler/action |
| `src/features/budget-projection/read-account.ts` | Нормализация запроса до await, authorization, только `{targetPeriod}`, typed Result и exact wire encoder |
| `src/infrastructure/db/projection-reader.ts` | REPEATABLE READ READ ONLY; повторный owner/account check, единые K/revision/server Berlin date, bounded completeness/evidence/size checks; переиспользовать без изменений |
| `src/domain/forecast/*` | Account/period DTO, A/R/S/F/deficit, D36, обычный current/future daily, freshness, grouped warnings, unavailable/error branches; без изменения формул |
| HB-008 money/date/period | Canonical cents codecs, bigint/int64, Berlin civil dates, `parsePeriod`, `shiftPeriod`, month lengths; никаких новых финансовых вычислений в UI |
| Tests/CI | Vitest 5.0.5, Testing Library/react + user-event + jsdom, SSR/hydration, domain/DB/auth suites, architecture fitness и HB-015 evidence gate; сохранить |

Нет готового локализованного exact-money formatter для dashboard, resolver существующего accountId из owner, dashboard UI или period controls. Нет public historical/report read-контракта для этого экрана. Эти пробелы нельзя маскировать данными placeholder.

## 4. Минимальный безопасный путь accountId и данных

### 4.1. Почему нельзя просто вызвать projection

`requirePageOwner()` возвращает `{id, email}` доверенного **пользователя**. Это не UUID счёта. HB-007 создаёт при первом входе только users; автоматическое создание accounts запрещено. `accounts` не имеет флага primary и не ограничена одним счётом на owner. Нельзя использовать owner.id как accountId, выбрать первый счёт всей таблицы, `LIMIT 1` без проверки неоднозначности, UUID из env, браузерного storage или демонстрационный ID.

Предлагается узкий private server-only resolver `resolveDashboardAccount()` в app composition:

1. Самостоятельно вызывает `requireOwner()`; layout/page guard остаётся UX-защитой, но не единственной авторизацией. Никаких owner/account параметров от клиента.
2. Через существующий lazy identity repository выполняет только `SELECT id FROM accounts WHERE owner_user_id = trustedOwner.id LIMIT 2`. Добавить метод вроде `findAccountIdsForOwner(ownerId)` с runtime UUID validation. Возвращать только необходимые IDs; не вызывать `bind` и не создавать счёт/период.
3. 0 строк → отдельное `NO_ACCOUNT`, 1 → внутренний selector, 2 → `ACCOUNT_SELECTION_REQUIRED` (без автоматического выбора). Ошибка storage → отдельный безопасный error, а не «счёта нет». Названия этих состояний принадлежат UI composition, не расширяют ForecastError/финансовый API.
4. Выбранный ID передать **существующему** `readBudgetProjection(selector, {targetPeriod})`. Он снова вызывает `requireOwnedAccount`; repository ещё раз проверяет scope внутри read-only snapshot. Изменение ownership между lookup и чтением должно дать отказ, никогда чужие данные.

При нескольких счетах показать нейтральное «Не удалось однозначно выбрать счёт» без IDs/имён/сумм. Multi-account UX и назначение primary вне HB-016. Нулевой счёт — честное пустое состояние, без неработающей кнопки создания. Это техническое fail-closed поведение в рамках v1 с одной картой, не новый финансовый выбор владельца.

### 4.2. Одно чтение на экран

Поток: page guard → parse URL → server resolver → существующий projection boundary → HB-007 ownership → HB-014 read-only repository → wire DTO → чистый presentation mapper → MUI screen.

- Без `period` вызывать `readBudgetProjection(id, {targetPeriod:null})` один раз и брать `ACCOUNT_ESTIMATE.currentPeriod`, его `periods`/`currentLiquidity`/bank/freshness.
- При явном `period=YYYY-MM` — один вызов с этим target, получая `PERIOD_ESTIMATE`. Текущий режим определить относительно `asOfDate.slice(0,7)` **этого ответа**; clock не брать из браузера.
- Не вызывать account + period + liquidity параллельно: они могут захватить разные K/даты. Summary, warning и выбранный период должны происходить из одного ответа. Для переключателя достаточно выбранного YYYY-MM и prev/next; отдельный запрос списка периодов не нужен.
- `ACCOUNT_ESTIMATE` и `PERIOD_ESTIMATE` адаптировать к одному discriminated view model без пересчёта денег. Для current брать уже выданную Liquidity; для future/past её недоступность сохранять.
- На server/client границе передавать только нужные display fields, без полного provenance, immutable source graphs, account/owner IDs, email и технических SQL details. Provenance хранится в серверном результате для согласованности, на экране — реальная дата проверки/дата расчёта и при необходимости allocation effective date.
- Защищённый request-time render; не добавлять `use cache`, `unstable_cache`, global mutable DTO, SWR или financial localStorage. Существующий request-scoped auth cache допустим. Сохранить dynamic behavior cookies/session/searchParams; проверять отсутствие shared/static financial responses. `prefetch={false}` для period links, чтобы не выполнять лишние фоновые DB-чтения.
- Локаль/переводы можно загружать независимо; финансовые auth → lookup → projection зависимости последовательны. `redirect('/login')` не ловить в общем catch как storage failure.

В Next 16 `searchParams` — Promise; это сверено с установленным `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`. Чтение H/K/clock из URL не разрешать; internal repository `readAt` не экспортировать в UI. Новых финансовых endpoints/Server Actions не требуется.

## 5. Экран, периоды и состояния

### 5.1. Структура

1. Один h1 («Обзор» либо «Месяцы»), выбранный месяц и текстовый признак «Текущий» / «Будущий — предварительный прогноз» / «Прошлый — активное распределение».
2. Навигация: предыдущий/следующий месяц, подписанные месяц/год, ссылка «Текущий месяц». Прямой выбор месяца/года через MUI native selects и переход по кнопке; никаких financial submits. Названия месяцев локализованы.
3. Карта **«Подтверждённый остаток карты»**, bank.balance + bank.observedDate, отдельно «Расчёт на DATE» (asOfDate). Она относится ко всей карте, не к выбранному месяцу. На future/past явно «Последняя проверка карты; не остаток на конец выбранного месяца».
4. Только current: главный блок «Дневной лимит по данным проверки DATE», `safeDailyLimit`; рядом `safeAvailable` — «Безопасно доступно для свободных расходов». Количество оставшихся дней уже из DTO, включая сегодня. Дата и оговорка о наблюдённых данных обязательны даже при age0.
5. Карточки **выбранного периода**: «Выделено месяцу» A, «Свободный бюджет месяца» signed F, «Полные резервы месяца» R, «Накопления месяца» S, «Дефицит бюджета месяца» deficit. На current отдельный менее заметный «Бюджетный ориентир месяца» ordinaryGuideline. Не называть F безопасными деньгами. All-period totals из Liquidity при необходимости поясняют защиту, с явной областью «Все месяцы»; не смешивать их с R/S выбранного периода.
6. Информационные warning groups и freshness notices. Не показывать денежные графики расходов/доходов или guessed bank activity. Ссылки на существующие разделы допустимы как навигация, без обещания работающего редактирования.

### 5.2. URL и переходы

`/` и `/months` открывают текущий Berlin месяц при новом server read. `/?period=2026-12` и `/months?period=2026-12` закрепляют выбранный месяц; оба маршрута используют общие компоненты/loader и одинаковую семантику. Все controls сохраняют свой base path. «Текущий месяц» снимает period. Link между Обзором/Месяцами внутри экрана может сохранять валидный period; глобальная AppShell navigation остаётся прежней и ведёт к default current. Это не скрытая синхронизация двух client stores.

`period` принимает ровно одну canonical строку из `parsePeriod`, годы 0001..9999. Массив/repeated query, пустая строка, 0000, 2026-13, неверный формат — локализованное invalid-period состояние со ссылкой на текущий месяц, без финансового чтения. Параметры `accountId`, `ownerUserId`, `H`, `K`, `asOfDate` не передавать в boundary; попытки использовать их как управление чтением отклонять. Не отражать непроверенное значение в HTML/redirect. Разрешённые href строятся только из fixed local path + validated period.

Использовать `shiftPeriod`; на 0001-01/9999-12 соответствующая стрелка недоступна с доступным объяснением. Direct input не ограничивать искусственным горизонтом или наличием DB period row. В complete state HB-014 умеет виртуальный нулевой период; это не повод создавать запись. URL остаётся источником выбранного периода; reload, deep link и browser back/forward сохраняют выбор. При переходе показывать pending/loading без подмены старых денег новым заголовком; skeleton или старый блок целиком со старой датой и явным pending. Новый результат заменяет весь связанный блок атомарно.

### 5.3. Три разных смысла месяца

| Выбор | Какие данные и ориентир | Что запрещено |
|---|---|---|
| Current | Последний coherent active state, текущий A/R/S/F; safe D36 главный, ordinary вторичный; inclusive remaining days от server asOfDate | Брать будущий free/ordinary вместо safe; добавлять прошлый F или будущий A к текущим деньгам |
| Future | A/R/S/F выбранного будущего месяца из того же подтверждённого active state; `ordinary.mode=FUTURE_PREVIEW`, весь календарный месяц | Название «безопасный лимит сегодня», SAFE_ESTIMATE будущего месяца, ожидаемые поступления, изменение H на будущую дату |
| Past | **Доля прошлого месяца в активном подтверждённом распределении на asOfDate**, A/R/S/F из public HB-014 period projection; daily=`HISTORICAL_PERIOD`, liquidity=`NOT_CURRENT_PERIOD`; обе числовые daily-карточки отсутствуют | Называть это историческим state(H=endOfMonth,K), закрытым отчётом, наблюдённым end balance или историческим долгом; выводить daily0 вместо unavailable |

**Критическое ограничение:** `projectPeriod(snapshot, asOfDate, target)` меняет target/divisor, не historical H. После CARRY активный A прошлого месяца может быть0; это не означает, что в прошлом он был0. Показать постоянное пояснение: «Это текущее распределение денег за выбранный месяц. Исторический отчёт здесь пока недоступен». Не обозначать период CLOSED/AWAITING_CLOSE по одному сравнению дат — report lifecycle не входит в DTO. Настоящий исторический/версионированный экран — HB-019 и последующие history tasks; не вводить второй read API ради HB-016. Текущий safe блок в past/future скрыт целиком; ссылка возвращает к нему. Общая bank card остаётся явно датированным последним наблюдением.

На смене месяца заново прочитанный server asOfDate определяет current; virtual current A0 допустим при старом полном состоянии, `CURRENT_UNFUNDED`/`MONTH_REVIEW_REQUIRED` видимы. Никаких переноса, fresh start, report close или fake checkpoint при navigation/refresh.

### 5.4. Полная матрица состояний

| Вход/событие | Представление и доступные факты |
|---|---|
| Нет session | Redirect `/login` до account lookup/projection, включая direct URL/RSC requests |
| NO_ACCOUNT | «Счёт пока не настроен»; нет B/A/F/daily и примеров денег, нет автоматического provisioning |
| Неоднозначный account / storage lookup error | Разные безопасные error states, без account identifiers/values; не выдавать за пустой бюджет |
| Loading/navigation | Skeleton с доступным status, `aria-busy`; не озвучивать skeleton как нули |
| `UNAVAILABLE/NO_OBSERVATION` | «Нет подтверждённой проверки карты»; B/A/F/deficit/daily unavailable. `knownEarmarks` можно вывести отдельно как известные полные R/S, с областью/пояснением «покрытие деньгами неизвестно», без вычисления F и без частичного резерва |
| `UNAVAILABLE/INCOMPLETE_STATE` | «Недостаточно подтверждённых данных для расчёта»; missing-component labels из allowlist, не raw strings; не рисовать B/A/F/limit, которых нет в DTO |
| `UNAVAILABLE/OVERDRAFT_POLICY_REQUIRED` | Показать **отрицательный наблюдённый** bank.balance и его дату; бюджетирование этого состояния недоступно. Никаких A/F/deficit/safe, кредитного лимита или clamp B к0 |
| `ok:false` | Локализованный отказ: UNAUTHORIZED → login; FORBIDDEN → нейтральный доступ запрещён без определения существования чужого счёта; STORAGE_ERROR → повторить чтение; PROJECTION_LIMIT_EXCEEDED → расчёт слишком велик, без частичного результата; integrity/range/unknown codes → безопасное «Не удалось рассчитать» |
| Complete zero | Настоящие B/A/R/S/F/deficit/daily0 отображаются как деньги; это отличается от unavailable «Нет данных»/«—» |
| Complete negative F | Signed F, full R/S, отдельный deficit; zero safe/ordinary допустим только из соответствующего numeric branch. Не показывать «долг банку» |
| Age0 / age1..6 / age>=7 | Реальная дата всегда; EARLIER_OBSERVATION при age>0; мягкое напоминание при >=7. Валидные числовые прогнозы остаются видимыми |

INCOMPLETE_STATE и отрицательный bank branch должны иметь component fixtures, хотя production loader не скрывает corrupt storage за incomplete, а текущий SQL запрещает отрицательный checkpoint. Ради демонстрации этих ветвей не менять БД/write workflows.

Reminder/freshness берутся из HB-014 (`ageDays`, `showReminder`, notices). Не считать возраст через миллисекунды, elapsed24h, allocation effective date или дату transfer. Текст напоминает проверить карту; до HB-017 можно объяснить, что ввод новой проверки появится в следующем обновлении. Не создавать фиктивную рабочую кнопку «Обновить бюджет», пустую форму или маршрут. D37 будущий update action подключится в HB-017; его финансовая реализация явно отложена границами текущей задачи.

D38: отрисовывать готовые `coverageGroups` с суммой один раз и **всеми** meanings; использовать `comparisonsAreNonAdditive` и budgetExplanation. Разные значения показывать как пересекающиеся сравнения с текстом «Эти суммы не складываются». Deficit выбранного месяца не прибавлять к coverage shortage; budgetSafeGap — пояснение, не дополнительная нехватка. Никаких «Понятно», mandatory acknowledgment, блокирующих модалок или повторного consent при входе. Дата источника общая и видима. Нулевые warnings отсутствуют; положительные равные amounts не теряют разные значения смысла.

## 6. Точное форматирование, локализация и доступность

Wire money — canonical **decimal integer cents string**, не decimal EUR float. `"12345"` = 123.45 EUR. Прочитать через существующий codec в bigint; не использовать `Number`, `parseFloat`, `amount/100` в Number или ICU number interpolation для money. `formatEuroDecimal` уже выдаёт exact machine decimal EUR, но сам по себе не локализует валюту.

Предлагаемый formatter в feature presentation: bigint quotient/remainder на100, `Intl.NumberFormat(locale,{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).formatToParts(bigint)` для whole/group/currency/sign layout; подставлять точные две fractional digits из cents. Для отрицательных значений меньше1 EUR нужен отдельный negative-layout template, чтобы -1 cent не потерял знак. Разбор знака/модуля через строку также позволяет форматировать MIN_INT64 без вызова checked negate вне диапазона. Не преобразовывать всю сумму в Number; bounded calendar/count numbers допустимы. Для RU/DE/EN учитывать NBSP/group/decimal/currency placement, `-0.01`,0 и MAX/MIN int64. Не ограничиваться safe-integer диапазоном JavaScript. Реализацию части formatter покрыть exact string/parts assertions перед UI.

Dates/month names форматировать через Intl/next-intl с явной Berlin/calendar semantics, не `new Date('YYYY-MM-DD')` с timezone по умолчанию. Date-only не получает выдуманного времени; years0001..0099 не превращать в1901..1999. SSR и hydration должны получать ту же asOf/date, не запускать второй клиентский clock для финансов.

Новые namespace keys `dashboard.*`/`periodNavigation.*` добавить синхронно RU/DE/EN, включая accessible names, все reasons/notices/meanings, loading/error/empty и пояснения области сумм. ICU interpolation только для уже отформатированных money/date strings; dates/counts имеют свои типы. Проверить существующий `tests/i18n.test.ts`: сейчас `translate(key) === raw value` для всех keys; при новых ICU placeholders понадобится узко обновить этот assertion с корректными synthetic arguments, сохранив key parity/nonempty/ошибки, а не отключить проверку. Никакой смены locale URL policy или auto-detection вместо RU default.

На телефоне — одна колонка, важные bank/safe/date выше breakdown; на desktop — MUI grid/flex с тем же DOM reading order. CSS breakpoints вместо JS resize calculations. Не обрезать финансовые суммы/минусы/даты; длинные DE labels и int64 amounts должны переноситься и помещаться без горизонтального скролла. `tabular-nums`, min-width0, явные text labels/signs вместе с цветом. Сохранить цветовые tokens MUI и system mode без flash/hydration suppression для финансов.

Один h1, h2 для блоков; `dl/dt/dd` для metrics, навигация через Link, кнопки только для действий, label у selects; aria-label у стрелок с названием соседнего месяца, `aria-current`/selected state. Touch targets>=44px, видимый focus, keyboard/Enter/Escape, skip link и Drawer focus не ломаются. Обновление периода озвучивать одним polite status (не весь денежный блок несколько раз); информационные предупреждения не должны автоматически перехватывать focus или иметь assertive alert на каждом render. Контраст WCAG AA, zoom/reflow, отсутствие зависимости от цвета; reduced-motion. Theme и locale controls остаются работающими при empty/error.

## 7. Предлагаемые файлы и небольшие части реализации

Это **будущий** список, сейчас меняется только данный Markdown.

| Файл | Планируемое изменение после разрешения |
|---|---|
| `src/infrastructure/auth/repository.ts` | Bounded owner-scoped SELECT method + lazy wrapper; bind/matches/ownsAccount policy сохранить |
| `src/app/dashboard-account-boundary.ts` (новый) | Private resolver из session; no account / ambiguous / safe storage failure; server-only |
| `src/app/dashboard-loader.ts` (новый) | Private composition resolver + existing readBudgetProjection; page auth/period validation, error mapping; без SQL/financial math |
| `src/app/page.tsx`, `src/app/months/page.tsx` | Await searchParams, guard, loader, common screen; route metadata/title по locale |
| `src/features/dashboard/presentation.ts`, `format-money.ts` (новые) | Discriminated view model, exact localized formatting, period href/parser helpers; не новый finance service |
| `src/features/dashboard/dashboard-screen.tsx` (новый) | BankObservationCard, current SafeLimitCard, PeriodBudgetSummary, ForecastNotices, ProjectionState; сначала локальные небольшие функции, выносить в файлы по необходимости |
| `src/features/dashboard/period-navigation.tsx` (новый) | Links и небольшой client month/year picker; только URL-state, ни DB/auth imports, ни финансовых writes |
| `src/shared/i18n/messages/{ru,de,en}.json` | Новые dashboard/period/error/accessibility keys; старые auth/preferences механизмы сохранить |
| `tests/dashboard-presentation.test.ts`, `tests/dashboard.test.tsx`, `tests/dashboard-boundary.test.ts` (новые) | Pure mapper/formatter, jsdom UI, app composition с injectable/mocked ports |
| `tests/auth-boundaries.test.ts`, `tests/i18n.test.ts` | Адаптировать actual pages mocks и ICU assertions; не подменять авторизацию успешным default mock |
| `tests/integration/auth.test.ts`, `tests/integration/budget-projection.test.ts` | Узко проверить owner lookup и реальную lookup→projection композицию/no writes на disposable DB; не дублировать domain suite |
| `tests/scenarios/phase-01/hb-016-dashboard-period-switch.md` (будущий) | Перенести утверждённые сценарии ниже, exact runtime mapping после появления тестов |
| `docs/planning/hb-016-verification.md` (будущий) | Только фактические команды/результаты/QA/review/limitations |

App/features не должны импортировать друг друга в обратную сторону; feature UI не импортирует infrastructure. Existing `read-account.ts`, forecast domain/repository, DB migrations, financial writers, AppShell/theme и архитектура **не требуют изменений**. Если статическая архитектурная проверка выявит реальное препятствие, пересмотреть узкий placement, не расширять allowlist ради удобства.

| Часть | До пяти критериев приёмки | До семи групп сценариев/проверок |
|---|---|---|
| A — auth/read composition | Session-only owner; scoped bounded lookup; 0/1/multiple/error различимы; HB-014 reauthorization; no writes/leaks | A01–A06 (6) |
| B — presentation и exact money | DTO exhaustive mapping; bank/period scope подписаны; safe/ordinary раздельны; exact formatter; unavailable не0 | B01–B07 (7) |
| C — routes/period navigation | URL validated; default server current; три смысла периода; единый read; back/deep link/boundaries | C01–C06 (6) |
| D — notices и качество UI | Freshness без скрытия; nonadditive groups; RU/DE/EN+themes; keyboard/semantics; responsive QA evidence | D01–D07 (7) |

Порядок: утвердить сценарии → auth/formatter/presentation assertions → narrow composition/UI → regression → self-review → независимое ревью и owner acceptance. Не начинать следующий HB-* и не отмечать Done только за подготовленный UI или зелёные mocks.

## 8. Сценарии будущих проверок

Синтетические EUR cents, Europe/Berlin; C=checkpoint, V=полная allocation revision, K=knowledge cut. Если не сказано иначе: observed/effective2026-11-20, asOf2026-11-28, n3, один owner/account, ACTIVE_COMPLETE, только названные A/R/S. Обычные R — full selected UNPAID. WHEN всегда **чтение/рендер/навигация**, не update. THEN во всех случаях: C/V/R/S/period funding, audit, account counters и любые original reports не меняются, никаких inferred income/expenses. Это спецификации, **не выполненные тесты**.

| ID | GIVEN → WHEN → THEN |
|---|---|
| HB16-A01 | Нет server session → прямой `/` или `/months?period=2026-12` → login; account lookup/projection не вызваны |
| HB16-A02 | Trusted owner, accounts0; либо только foreign accounts → load → NO_ACCOUNT, без INSERT и чужих refs/сумм |
| HB16-A03 | Один свой account, другой foreign; client пытается передать чужой selector/owner/H/K → load → ввод отклонён, а обычный load берёт только свой server selector и проходит ownership внутри HB-014 |
| HB16-A04 | Два своих account → load → ACCOUNT_SELECTION_REQUIRED, без произвольного выбора и без вызова projection |
| HB16-A05 | Lookup бросает private driver details; отдельно HB-014 возвращает STORAGE_ERROR/PROJECTION_LIMIT_EXCEEDED/integrity error → безопасные разные UI branches, никаких partial money/error stack |
| HB16-A06 | Ownership изменилось после lookup; отдельно UNAUTHORIZED/FORBIDDEN от boundary → отказ без утечки. В успешном lookup→projection полный DB baseline до/после равен, включая nonempty report fixtures |

| ID | GIVEN → WHEN → THEN |
|---|---|
| HB16-B01 | B10000,A Nov10000,R Dec20000 → current → bank100.00 поNov20; safeAvailable/daily0, ordinary3333 cents/day; R Dec не становится Nov expense. Coverage10000 показан один раз со всеми тремя meanings |
| HB16-B02 | B50000,A Nov40000/Dec10000,R Nov30000/S Nov5000,R Dec2000/S Dec1000 → current → F5000, full R30000/S5000 выбранного месяца; safe5000, daily1666/r2; будущий funded overlap не вычитается повторно |
| HB16-B03 | B8000,A Nov8000,R Nov9000,S Nov2000 → current → F-3000/deficit3000,R9000,S2000, main0/ordinary0, без capping и automatic release |
| HB16-B04 | NO_OBSERVATION с known R20000/S5000 → render → B/A/F/deficit/safe отсутствуют; отдельно известные earmarks с неизвестным покрытием, не bank0 |
| HB16-B05 | INCOMPLETE_STATE с missing ALLOCATIONS; отдельно NEGATIVE_BANK_OBSERVATION B-100 → render → в первом нет numeric forecast, во втором видны -1.00 и observedDate, нет A/F/credit/daily/deficit |
| HB16-B06 | Complete B=A=0,R=S=0 → render → реальные money0, CURRENT_UNFUNDED; отсутствующий virtual future period в COMPLETE также0, но помечен preview |
| HB16-B07 | Canonical cents0,1,-1,100,101,9007199254740993,MAX9223372036854775807 и MIN-9223372036854775808 → format RU/DE/EN → exact fractional digits/group/sign/currency; MAX EUR92233720368547758.07, MIN EUR-92233720368547758.08; неверная/oversize строка не становится0 |

| ID | GIVEN → WHEN → THEN |
|---|---|
| HB16-C01 | F-003: B123000,A Nov3000/Dec120000,R Dec90000 → Nov→Dec→Nov поURL → current safe1000/day; future F30000/preview967/r23 на31день, liquidity unavailable; current возвращается без прибавления Dec денег |
| HB16-C02 | После подтверждённого December transfer active Nov0/Dec75000,R Dec30000,bank Dec2; immutable Nov report fixture отдельно содержит прежние данные → выбратьNov → активные Nov A/R/S/F0, daily unavailable, пояснение о неисторическом срезе; Dec bank не назван Nov30 balance; report bytes прежние |
| HB16-C03 | Last Nov20 B10000,A Nov4000/Dec6000,R Nov2000 → новый server asOf Dec1 → default Dec, safe6000/daily193/r17, age11, review/reminder; Nov cash не переносится. НаJan5 без новых checks ни Dec31 observation, ни fresh start не создаются |
| HB16-C04 | Valid selected future period, deep link/reload/back/forward и смена RU→DE → тот же YYYY-MM/суммы; смена темы не меняет selection/forecast; «Текущий месяц» удаляет period |
| HB16-C05 | repeated/empty/malformed/out-of-range period; boundary0001-01/9999-12; годы0001/0099 и Feb2026/2028 → invalid не читает finance; стрелки bounded; month/date labels без1900 offset; future divisor28/29 из DTO |
| HB16-C06 | Navigation на новый period, ответы задержаны/ошибка, отдельно concurrent financial commit → ни старые деньги под новым заголовком, ни смешанный K; один projection read на render; повторное чтение показывает coherent новый state, errors не показывают прежний success как свежий |

| ID | GIVEN → WHEN → THEN |
|---|---|
| HB16-D01 | ObservedNov20, asOfNov20/21/26/27/28 → age0/1/6/7/8 → older label iff>0, reminder iff>=7; все валидные limits/date видимы. Transfer-only с новой allocation date не освежает bank date |
| HB16-D02 | Spring observedMar22, asOfMar28/29/30; autumn observedOct18, asOfOct24/25/26 2026 → ages6/7/8 через DST; UTC/LA host TZ не меняют reminder; server Berlin month boundary определяет period |
| HB16-D03 | B10000,A Nov10000,R Nov12000,S Nov2000 → warnings O2000,E/P4000 → две суммы20.00/40.00 с полными meanings и «не складываются», без total60.00; budget gap не третий shortage |
| HB16-D04 | Complete stale/deficit и noncurrent views RU/DE/EN × light/dark/system → локализованы все labels/reasons/date/money; preferences сохраняются, ICU/catalog и SSR hydration без errors; D36 визуально главный только current |
| HB16-D05 | Keyboard-only → skip, links, selects, выбор месяца, возврат к current и Drawer Escape/focus → предсказуемый focus, accessible names, polite update; warnings не требуют согласия и не блокируют |
| HB16-D06 | 320/375/768/1280px, длинные DE labels и MAX/MIN amounts, zoom200% и reflow400% → нет horizontal page overflow/скрытого minus/обрезанных сумм, порядок чтения и 44px targets сохранены; reduced-motion и контраст обеих тем |
| HB16-D07 | Перезагрузка, повторный вход, GET/prefetch/navigation/retry всех состояний → нет acknowledgment/новых financial rows или audit reads; отсутствуют update/pay/release/carry/close controls и demo money; logout/direct return не отдаёт защищённые данные без server auth |

## 9. Матрица норм → UI → доказательства

| Норма/принятый контракт | UI обязанность | Будущие проверки и сохраняемая база |
|---|---|---|
| BR-01/11, ADR1 checkpoint authority | Подтверждённый B/date вместо reconstructed cash; observation != allocation date | B01/B04/B05/C02/D01; HB10 chronological/H-K, HB14-037/041/042 |
| BR-02/06/11, ADR1/2 | Read-only status amounts; не дебетовать B по paid/cancel; без financial controls | A06/D07; существующие F-001/002/007/017 и HB11/HB14 partial/paid assertions |
| BR-03/07/11, ADR1/3 | Full R/S, signed F, отдельный deficit; selected possible only; no auto release | B02/B03/B04; HB14-009–014/049/052/053 и HB11/12 lifecycle regressions |
| BR-04/05/11, D32–36, ADR3 | Safe current главный, ordinary вторичный; other-period protection учитывается ровно один раз | B01/B02/C01; HB3 C01–08, HBL001–018, HB14-018–027/051/058, HB15-M01–06 |
| BR-01/04, D37/D39 | Старые valid limits видимы, exact Berlin age>=7 | D01/D02; HB14-037–042/057, HBL019–028 |
| D38/ADR3 | Equal amounts+all meanings, разные comparisons не складывать; no consent/view block | B01/D03/D05/D07; HB14-024/025 |
| BR-05/08/11, ADR2 | Period navigation не carry/close; active past != historical report; UNKNOWN end balance не угадывать | C02/C03/D07; F-009/013, HB14-043/046/054/056, storage report immutability |
| BR-10, HB-008 codecs | Exact cents strings/bigint, даты Berlin, overflow/error !=0 | B07/C05/D02; existing money/calendar/codec tests и DB17 |
| HB-007 auth, BR-10/11 | Session-derived owner; scoped read, reauthorization, no foreign IDs/SQL | A01–A06/D07; auth boundaries/AUTH-DB01–03, HB14-045/063 |
| HB-014 coherent DTO/errors/no writes | Один K/date на экран, exhaustive Result branches, resource refusal | A05/A06/C06; HB14-028–036/044/047/059/060 |
| HB-005/PRD UI | Responsive/theme/locale/semantics вместо hardcoded finance markup | B07/C04/D04–D06; HBU001–005, shell/i18n/architecture tests |
| HB-015 execution gate | Сохранить все required foundation assertions и fresh evidence | Full existing U/P/Z reports + checker; новые HB16 UI tests обычным Vitest glob, без ослабления manifest |

## 10. Проверки после отдельного разрешения реализации

**Сейчас runtime checks не запускались:** никакого PostgreSQL/Docker/migrations, Vitest, dev server, Next build/typegen, `.env.local`/секретов или Neon/production. Для плана достаточно статического анализа и проверки Markdown/diff. Команды ниже — будущие, не PASS evidence.

- **Unit:** `pnpm.cmd exec vitest run tests/dashboard-presentation.test.ts tests/dashboard-boundary.test.ts`; тестировать реально используемые mapper/formatter/resolver, hostile query, failures и вызовы ports. Не писать зеркальную копию D36. Авторизацию проверить через actual guards с mocked auth/DB ports, не только через утверждение «authorize был вызван».
- **Component:** `pnpm.cmd exec vitest run tests/dashboard.test.tsx tests/shell.test.tsx tests/i18n.test.ts tests/auth-boundaries.test.ts`; jsdom Testing Library/user-event, реальные MUI/providers/catalogs, все branches, labels/roles/focus/URL intent и no-write-control assertions. Async pages проверить вызовом фактических server page функций с injected/mocked boundary, отрендерить полученный element; не выдавать это за браузерный RSC E2E.
- **Domain regression до UI:** существующие forecast/forecast-boundary/forecast-oracles, money/calendar и architecture tests; затем full `pnpm.cmd test`. Сохранить UTC full и существующий LA subset, HB15 six paired projections/finite sweep без переписывания финансовых oracles.
- **Integration:** существующий `pnpm.cmd test:integration` с auth lookup→projection additions и полным baseline no writes. Реальные ownership SQL predicates, zero/one/multiple own accounts + foreign, отсутствие auto-provision, одна coherent projection и immutable report bytes. Реальная HB14-059 concurrency уже есть; не создавать второй transaction engine. БД только disposable local после отдельного разрешения соответствующего этапа, существующие guards и synthetic fixtures; не использовать Neon/production или пользовательские env files.
- **Static/build:** existing lint, typecheck, build/architecture. Next typegen/build может автоматически загружать `.env.local`: выполнять только в изолированной проверочной копии без env files, не перемещая/редактируя оригинал. Не считать очистку process.env гарантией, что env loader не прочитает файл. Inspect scripts/installed API before execution.
- **HB-015 gate:** неизменный init → fresh UTC unit JSON/record → fresh integration JSON/record → manifest LA subset/record → check в одном current-source run. Следовать существующему CI, не менять workflow/checker. Новый scenario-файл HB16 не входит автоматически в hardcoded HB15 normative sources; UI tests попадают в обычный Vitest glob, traceability пока в HB16 scenario/verification. Если при разрешённой реализации потребуется TASKS metadata, это меняет context hash в coverage.json: обновлять только соответствующий hash с явной evidence, не references/dispositions и не checker. Сейчас TASKS/manifest не меняются.
- **Browser QA:** реальная геометрия/contrast/zoom/system-theme и back/forward/RSC/logout проверяются в браузере на локальном target с синтетическими данными. Не добавлять test-only auth bypass или fixture page в production. Playwright и axe не установлены, нет `test:e2e`; не создавать фиктивный зелёный command. Использовать доступный browser/manual QA, записать версии/viewport/locale/theme и результат; автоматизацию Playwright оставить HB-021 либо отдельно обосновать/согласовать dependency. jsdom не доказывает layout, contrast или screen-reader behavior.

Финальный implementation verification обязан разделить unit/component/integration и browser QA, перечислить exact commands/exit/counts, реальные limitations и independent review отдельно. Исторические HB-015 числа не заменяют новый текущий запуск. Запреты этой planning-сессии сохраняются; приведённый future test plan не является разрешением запуска БД или реализации.

## 11. Риски, вопросы и gate приёмки

Основные риски: смешать account/user UUID; замаскировать DB error как NO_ACCOUNT; выбрать arbitrary account; выдать текущий past allocation за исторический отчёт; future preview за доступные сегодня деньги; потерять cents при Intl/ICU; скрыть старый valid safe; сложить shortages; смешать два K при нескольких reads; забыть server auth при navigation; случайно загрузить `.env.local` через build.

Меры и детерминированные проверки находятся в A/B/C/D и матрице. Для нового account lookup достаточно расширить существующий auth repository read method; foundational change не нужен. Account provisioning остаётся отдельной будущей работой: после первого входа пустой экран в HB-016 ожидаем и честен. Доступность денег в существующей БД этим анализом не проверялась.

**Новых продуктовых вопросов, требующих решения владельца, не обнаружено в выбранных границах.** Q-HB2-02 (multi-source CARRY), Q-HB3-02 (overdraft budgeting), Q-HB3-03 (historical overspend), Q-HB1-03 (recurrence scope) остаются вне HB-016. UI отрицательного observation — уже принятый unavailable контракт, не решение overdraft policy. Если независимое ревью потребует настоящий as-closed/historical report или provisioning/primary-account workflow прямо в HB-016, сначала зафиксировать новый scope/question в OPEN_QUESTIONS и получить решение; не расширять этот план молча. Пока OPEN_QUESTIONS не меняется.

Пять общих критериев будущей приёмки:

1. Current dashboard показывает авторитетные B/date, period A/R/S/F/deficit, главный D36 safe и отдельно ordinary по одному согласованному read без финансовых writes.
2. Account выбирается только из trusted session owner, 0/multiple/error fail closed; чужие данные/идентификаторы/driver details не раскрываются ни прямым запросом, ни навигацией.
3. Current/future/past различаются по описанным контрактам; URL-state воспроизводим; past не выдаёт active state за историю, future не выдаёт preview за today cash.
4. Все unavailable/negative/zero/error/freshness/grouped-warning состояния честные; exact money и Berlin dates сохраняются в RU/DE/EN, theme, responsive и keyboard UI.
5. Выполнены соответствующие runtime и реальные browser проверки, сохранён HB-015 gate, recorded evidence прошла независимое ревью и owner acceptance; только затем обсуждать Done/публикацию.

**Результат текущей сессии — только этот план. Остановиться, ждать независимого ревью ChatGPT и отдельного разрешения владельца на реализацию.** Никаких commit/push/PR/merge/deploy, удаления/перезаписи локальных изменений или изменения статуса HB-016.
